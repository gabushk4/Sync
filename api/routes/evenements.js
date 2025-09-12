//paquets npm
const express = require("express");
const router = express.Router();
require("dotenv").config();

//fonctions
const { authentifierToken, verifierAccesEvenement } = require("../../functions/authenticate");
const { generateIdWithQueue } = require("../../functions/idGen");
const FactoriserTimestamp = require("../../functions/factoriserTimestamp");

//PDO
let { pool } = require("../../PDO");
const { ajouterEvenementFactice } = require("../../functions/ajouterFactice");
const { getNow } = require("../../functions/getNow");
const { DateTime } = require("luxon");
const { formaterDates } = require("../../functions/verifierEtFormaterDateUTC");
const {
  formaterDateVersClient,
} = require("../../functions/formaterDateVersClient");
const {
  verifierDisponibilite,
} = require("../../functions/verifierDisponibilite");
const envoyerNotification = require("../../functions/envoyerNotification");
const {
  default: genererSlugAvecQueue,
} = require("../../functions/genereSlugAvecQueue");
const GenererOccurences = require("../../functions/genererOccurences");
const AppliquerExceptions = require("../../functions/appliquerExceptions");

///retourne plusieurs objets 'evenement' selon un idmembre donné par un JWT
/// res.json: {compte|evenement[id|titre|description|debut|fin|reccurence]}
/// req.query: {limite=5|offset=0|debut|fin}
router.get(
  "/",
  authentifierToken,
  ajouterEvenementFactice,
  async (req, res, next) => {
    let idProprietaire = req.membre.id;
    let limite = req.query.limite || 20;
    let offset = req.query.offset || 0;
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    let debut = req.query.debut || FactoriserTimestamp(now.toISOString());
    now.setHours(now.getHours() + 24);
    let fin = req.query.fin || FactoriserTimestamp(now.toISOString());
    console.log("get evenements/", debut, fin);
    const evFactice = req.evenementFactice;
    const sqlEvenements = ` SELECT e.* 
        FROM evenements e INNER JOIN participants_evenements p ON e.id = p.id_evenement 
        WHERE (p.id_membre = ?) 
        AND (debut >= ?) AND (fin <= ?)
        AND (regle_recurrence IS NULL)
        ORDER BY e.debut
        LIMIT ? OFFSET ?`;
    const sqlEvenementsRecc = ` SELECT e.* 
        FROM evenements e INNER JOIN participants_evenements p ON e.id = p.id_evenement 
        WHERE (p.id_membre = ?)
        AND (fin <= ?) 
        AND (regle_recurrence IS NOT NULL)
        ORDER BY e.debut
        LIMIT ? OFFSET ?`;
    const sqlExceptions = ` SELECT *
        FROM evenements_exceptions 
        WHERE id_parent IN (?)`;

    try {
      const [resultatsSansRecc] = await pool.query(sqlEvenements, [
        idProprietaire,
        debut,
        fin,
        limite,
        offset,
      ]);
      const [resultatsRecc] = await pool.query(sqlEvenementsRecc, [
        idProprietaire,
        fin,
        limite,
        offset,
      ]);
      let occurencesEx = [];

      const occurences = GenererOccurences(
        DateTime.fromSQL(debut, { zone: "utc" }),
        DateTime.fromSQL(fin, { zone: "utc" }),
        resultatsRecc
      );
      const idsParents = occurences.map((occurence) => occurence.id);
      if (idsParents.length > 0) {
        const [resultatsExceptions] = await pool.query(sqlExceptions, [
          idsParents,
        ]);
        occurencesEx = AppliquerExceptions(occurences, resultatsExceptions);
      }
      const resultatFinal = [...resultatsSansRecc, ...occurencesEx];
      console.log("evFactice", evFactice);
      if (evFactice != undefined) resultatFinal.push(evFactice);

      //filtrer les possibles doublons
      const uniques = new Map();

      resultatFinal.forEach((evenement) => {
        const key = evenement.id + evenement.debut;
        if (!uniques.has(key)) {
          uniques.set(key, evenement);
        }
      });

      const reponse = Array.from(uniques.values()).map((r) => ({
        id_publique: r.id_publique,
        titre: r.titre,
        description: r.description,
        debut: formaterDateVersClient(r.debut),
        fin: formaterDateVersClient(r.fin),
        recurrence: r.regle_recurrence,
        url: r.url
          ? r.url
          : {
              method: "GET",
              string: `/evenements/${r.id_publique}`,
            },
      }));
      res.status(200).json({
        compte: reponse.length,
        evenements: reponse,
      });
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: err.message,
      });
    }
  }
);
///Insert un objet 'evenement' dans la table 'evenements' et permet la redirection vers '/evenements/:idevenement' pour une éventuelle modification
///req.body: {participants}
router.post(
  "/",
  authentifierToken,
  formaterDates,
  verifierDisponibilite,
  async (req, res, next) => {
    const createurId = req.membre.id;
    const debut = req.debutSQL;
    const fin = req.finSQL;
    const titre = req.body.titre || null;
    const description = req.body.description || null;
    const prive = req.body.prive !== undefined ? req.body.prive : true;
    const regleRecurrence = req.body.regle_recurrence || null;

    const idPubliqueEvenement = await generateIdWithQueue(10, true, true, "E");
    const idPriveEvenement = await generateIdWithQueue(
      10,
      true,
      true,
      `${titre.substring(0, 3)}`
    );
    const slug = await genererSlugAvecQueue(titre, idPubliqueEvenement);

    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO evenements(id_publique, id, debut, fin, titre, description, prive, regle_recurrence, createur_id, slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idPubliqueEvenement,
          idPriveEvenement,
          debut,
          fin,
          titre,
          description,
          prive,
          regleRecurrence,
          createurId,
          slug,
        ]
      );

      await conn.execute(
        `INSERT INTO participants_evenements (id_evenement, id_membre, privilege) VALUES (?, ?, ?)`,
        [idPriveEvenement, createurId, "editeur"]
      );

      let participants = Array.isArray(req.body.participants)
        ? req.body.participants
        : [];
      console.log("post evenements participants", participants);
      let insertIds = [];
      if (participants.length > 0) {
        const idsPubliques = participants.map((p) => p.id_publique);
        const [rMembres] = await conn.query(
          "SELECT id, id_publique, push_token FROM membres WHERE id_publique IN (?)",
          [idsPubliques]
        );

        const mapMembres = {};
        for (let m of rMembres)
          mapMembres[m.id_publique] = { id: m.id, push_token: m.push_token };
        console.log("map membres", mapMembres);
        let insertsInvitation = [];
        let valuesInvitation = [];

        for (let p of participants) {
          const membre = mapMembres[p.id_publique];
          console.log("membre", membre);
          if (!membre || membre.id === createurId) continue;

          insertsInvitation.push("(?, ?, ?)");
          valuesInvitation.push(idPriveEvenement, createurId, membre.id);
          console.log("values", valuesInvitation);
        }

        if (insertsInvitation.length > 0) {
          const sqlInsertInvitations =
            "INSERT INTO invitations_evenement (id_evenement, id_invitant, id_invite) VALUES " +
            insertsInvitation.join(", ");
          const [rInvitations] = await conn.execute(
            sqlInsertInvitations,
            valuesInvitation
          );

          for (let i = 0; i < rInvitations.affectedRows; i++) {
            insertIds.push(rInvitations.insertId + i);
          }
        }

        let notifIndex = 0;
        for (let p of participants) {
          const membre = mapMembres[p.id_publique];
          if (!membre || membre.id === createurId) continue;
          const data = {
            onPress: {
              type: "fetch",
              method: "GET",
              string: `/evenements/${idPubliqueEvenement}`,
            },
            actions: [
              {
                label: "accepter",
                method: "PATCH",
                url: `/evenements/invitations/${insertIds[notifIndex]}`,
                body: {
                  id_evenement: idPriveEvenement,
                  statut: "accepter",
                },
              },
              {
                label: "refuser",
                method: "PATCH",
                url: `/evenements/invitations/${insertIds[notifIndex]}`,
                body: {
                  id_evenement: idPriveEvenement,
                  statut: "refuser",
                },
              },
            ],
          };
          envoyerNotification(
            membre.push_token,
            "evenements",
            "On t'invite à partager un moment",
            `${req.membre.pseudo} t'invite à ${titre} le ${DateTime.fromSQL(
              debut
            ).toFormat("dd LLL", { locale: "fr" })} à ${DateTime.fromSQL(
              debut
            ).toFormat("HH:mm")}`,
            createurId,
            membre.id,
            data,
            insertIds[notifIndex]
          );

          notifIndex++;
        }
      }

      await conn.commit();

      return res.status(201).json({
        message: "évènement créé",
        url: { method: "GET", string: `/evenements/${idPubliqueEvenement}` },
      });
    } catch (err) {
      await conn.rollback();
      return res.status(500).json({
        erreur: err,
        message: err.message,
      });
    } finally {
      conn.release();
    }
  }
);

router.get("/amis", authentifierToken, async (req, res, next) => {
  const idMembre = req.membre.id;

  const d = (await getNow(idMembre)).startOf("day").toSQL();
  const f = (await getNow(idMembre)).endOf("day").toSQL();

  //console.log("debut", d, "fin", f);

  let limiteAmis = parseInt(req.query.limiteAmi) || 10;
  let offsetAmis = parseInt(req.query.offset) || 0;
  let debut = req.query.debut || d;
  let fin = req.query.fin || f;

  /* console.log(
    "id membre",
    req.membre.id,
    "limite amis",
    limiteAmis,
    "offset amis",
    offsetAmis,
    "debut",
    debut,
    "fin",
    fin
  ); */

  try {
    // Récupérer les amis du membre
    const amisSql = `
            SELECT id_ami FROM (
                SELECT a.id_ami AS id_ami 
                    FROM amis a 
                    WHERE a.id_membre = ? 
                UNION
                    SELECT a.id_membre AS id_ami 
                    FROM amis a 
                    WHERE a.id_ami = ?
            ) AS amis_union
            LIMIT ? OFFSET ?`;

    const [resultatsAmis] = await pool.query(amisSql, [
      idMembre,
      idMembre,
      limiteAmis,
      offsetAmis,
    ]);
    const idsAmis = resultatsAmis.map((ami) => ami.id_ami);

    //console.log("idsAmis", idsAmis);

    // Vérifiez s'il y a des amis avant de continuer
    if (idsAmis.length > 0) {
      const evenementsSql = `
                SELECT 
                    m.id AS ami_id_prive,
                    m.id_publique AS ami_id_publique, 
                    i.url,
                    e.id_publique, e.titre, e.debut, e.fin, e.prive
                FROM membres m
                  LEFT JOIN images i
                    ON i.id = m.id_fp
                  LEFT JOIN participants_evenements p 
                    ON m.id = p.id_membre
                  LEFT JOIN evenements e 
                    ON e.id = p.id_evenement
                  AND e.fin >= ? 
                  AND e.debut <= ?
                  AND e.regle_recurrence IS NULL
                WHERE m.id IN (?)
                ORDER BY e.debut
            `;
      const evenementsRecc = ` 
                SELECT 
                    m.id AS ami_id_prive,
                    m.id_publique AS ami_id_publique, 
                    i.url,
                    e.id_publique, e.titre, e.debut, e.fin, e.prive
                FROM membres m
                  JOIN images i
                    ON i.id = m.id_fp
                    LEFT JOIN participants_evenements p 
                ON m.id = p.id_membre
                    LEFT JOIN evenements e 
                ON e.id = p.id_evenement
                    AND e.debut <= ?
                    AND e.regle_recurrence IS NOT NULL
                WHERE m.id IN (?)
                  AND e.id IS NOT NULL
                ORDER BY e.debut
            `;
      const exceptions = `
                SELECT *
                FROM evenements_exceptions 
                WHERE id_parent IN (?)
            `;

      const [resultatsEvSansRec] = await pool.query(evenementsSql, [
        debut,
        fin,
        idsAmis,
      ]);
      //console.log('evenementsSansRec: ',resultatsEvSansRec.length)
      const [resultatsEvRec] = await pool.query(evenementsRecc, [
        debut,
        idsAmis,
      ]);
      //console.log('evenementsRec:', resultatsEvRec)
      let occurencesEx = [];

      const occurences = GenererOccurences(
        DateTime.fromSQL(debut, { zone: "utc" }),
        DateTime.fromSQL(fin, { zone: "utc" }),
        resultatsEvRec
      );
      const idsParents = occurences.map((occurence) => occurence.id);
      if (idsParents.length > 0) {
        const [resultatsExceptions] = await pool.query(exceptions, [
          idsParents,
        ]);
        //console.log("exceptions", resultatsExceptions.length);
        occurencesEx = AppliquerExceptions(occurences, resultatsExceptions);
      }
      const resultatFinal = [...resultatsEvSansRec, ...occurencesEx];
      const groupes = {};
      const uniques = new Map();
      //console.log('resulatFinal', resultatFinal)
      resultatFinal.forEach((evenement) => {
        const key = evenement.id + evenement.debut;
        if (!uniques.has(key)) {
          uniques.set(key, evenement);
        }
      });

      //console.log('uniques:', uniques)

      for (const evenement of uniques.values()) {
        //console.log("Clés row:", Object.keys(evenement));
        //console.log("Contenu row:", evenement);
        const ami_id = evenement.ami_id_prive;

        if (!groupes[ami_id]) {
          groupes[ami_id] = {
            ami_id_publique: evenement.ami_id_publique,
            fp_url: evenement.url,
            evenements: [],
          };
        }
        if (evenement.id_publique !== null) {
          groupes[ami_id].evenements.push({
            id_evenement: evenement.id_publique,
            titre: evenement.titre,
            url: {
              method: "GET",
              string: `/evenements/${evenement.id_publique}`,
            },
            debut: formaterDateVersClient(evenement.debut),
            fin: formaterDateVersClient(evenement.fin),
            prive: evenement.prive,
          });
        }
      }

      const resultat = Object.entries(groupes).map(([ami_id, data]) => {
        const evenements = data.evenements;
        const existe235959 = evenements.some((ev) => {
          if (!ev.fin) return false;
          const fin = new Date(ev.fin);
          return (
            fin.getHours() === 23 &&
            fin.getMinutes() === 59 &&
            fin.getSeconds() === 59
          );
        });

        if (!existe235959) {
          const dt = DateTime.fromISO(DateTime.fromSQL(debut).toISODate()).set({
            hour: 23,
            minute: 59,
            second: 59,
            millisecond: 999,
          });
          evenements.push({
            id_evenement: "factice_" + ami_id,
            titre: "Fin de journée",
            debut: dt,
            fin: dt,
            regle_recurrence: null,
            prive: 1,
          });
        }
        return {
          id: data.ami_id_publique,
          fp_url: data.fp_url,
          evenements,
        };
      });

      // Retourner les résultats au client
      return res.status(200).json({
        compte: uniques.length,
        cacheable: true,
        resultat: resultat,
      });
    } else {
      // Aucun ami trouvé
      console.log("aucun ami trouvés");
      res.status(200).json({
        message: "aucun amis",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.get("/amis/:idAmi", authentifierToken, async (req, res, next) => {
  const { idAmi } = req.params;
  const { debut, fin } = req.query;

  if (!debut || !fin) {
    return res.status(400).json({ erreur: "Paramètres start et end requis" });
  }

  try {
    // Query événements sans récurrence
    const evenementsSql = `
      SELECT 
        e.id, e.id_publique, e.debut, e.fin, e.prive
      FROM participants_evenements p
        JOIN evenements e ON e.id = p.id_evenement
      WHERE p.id_membre = ?
        AND e.fin >= ?
        AND e.debut <= ?
        AND e.regle_recurrence IS NULL
      ORDER BY e.debut
    `;

    // Query événements avec récurrence
    const evenementsRecc = `
      SELECT 
        e.id, e.id_publique, e.debut, e.fin, e.prive, e.regle_recurrence
      FROM participants_evenements p
        JOIN evenements e ON e.id = p.id_evenement
      WHERE p.id_membre = ?
        AND e.debut <= ?
        AND e.regle_recurrence IS NOT NULL
      ORDER BY e.debut
    `;

    // Query exceptions
    const exceptions = `
      SELECT *
      FROM evenements_exceptions 
      WHERE id_parent IN (?)
    `;

    // Exécuter queries
    const [resultatsEvSansRec] = await pool.query(evenementsSql, [
      idAmi,
      debut,
      fin,
    ]);

    const [resultatsEvRec] = await pool.query(evenementsRecc, [idAmi, debut]);

    let occurencesEx = [];
    if (resultatsEvRec.length > 0) {
      // Générer occurrences avec tes fonctions
      const occurences = GenererOccurences(
        DateTime.fromSQL(debut, { zone: "utc" }),
        DateTime.fromSQL(fin, { zone: "utc" }),
        resultatsEvRec
      );

      const idsParents = occurences.map((o) => o.id);
      if (idsParents.length > 0) {
        const [resultatsExceptions] = await pool.query(exceptions, [
          idsParents,
        ]);
        occurencesEx = AppliquerExceptions(occurences, resultatsExceptions);
      } else {
        occurencesEx = occurences;
      }
    }

    // Fusionner résultats
    const resultatFinal = [...resultatsEvSansRec, ...occurencesEx];

    // Supprimer doublons
    const uniques = new Map();
    resultatFinal.forEach((evenement) => {
      const key = evenement.id + evenement.debut;
      if (!uniques.has(key)) {
        uniques.set(key, evenement);
      }
    });

    res.json(
      Array.from(uniques.values()).map((e) => ({
        debut: e.debut,
        fin: e.fin,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: "Erreur serveur" });
  }
});

router.get("/disponibilites", authentifierToken, async (req, res, next) => {
  try {
    let idMembre = req.membre.id;
    let limite = req.query.limite || 20;

    //get les timestamp des evenements du membre entre maintenant et dans deux semaines

    //get les timestamp des evenements des amis du membre entre maintenant et dans deux semaines (trouver les amis et prendre leurs évènements)

    //prendre la fin de l'évenement n et le début de l'évènement n+1 et mettre ces timestamp dans un objet JSON membreDispos

    //prendre
  } catch (error) {}
});

router.get("/:idevenement", authentifierToken, verifierAccesEvenement, async (req, res, next) => {
  const sqlEvenement = `SELECT e.*, p.*, m.id_publique, m.fuseau_horaire 
                      FROM evenements e 
                      INNER JOIN participants_evenements p ON e.id = p.id_evenement 
                      INNER JOIN membres m ON p.id_membre = m.id
                      INNER JOIN invitations_evenement ie ON e.id = ie.id_evenement
                      WHERE e.id_publique = ? `;

  try {
    const [resultat] = await pool.query(sqlEvenement, [req.params.idevenement]);

    // Vérifie si des résultats ont été retournés
    if (resultat.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    // Vérifie si l'utilisateur a accès à l'événement
    const participant = resultat.find((r) => r.id_membre == req.membre.id);
    let privilege;
    if (!participant) {
      privilege = "lecteur";
    }

    // Extraction des détails de l'événement
    const [evenement] = resultat; // Puisque nous avons trouvé au moins un événement

    console.log("/evenements/:idevenement", resultat[0]);

    const participants = resultat.map((r) => {
      privilege = r.privilege;
      return {
        id_membre: r.id_publique,
        privilege: r.privilege ? r.privilege : "lecteur",
        fp_url: r.fp_url,
      };
    });

    res.status(200).json({
      id: req.params.idevenement,
      titre: evenement.titre,
      description: evenement.description,
      debut: formaterDateVersClient(evenement.debut),
      fin: formaterDateVersClient(evenement.fin),
      prive: evenement.prive,
      participants: participants,
      privilege_membre: privilege,
      fuseau_horaire: evenement.fuseau_horaire,
      regle_recurrence: evenement.regle_recurrence,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des événements." });
  }
});

router.patch("/:idevenement", authentifierToken, verifierAccesEvenement, async (req, res, next) => {
  const id = req.params.idevenement;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Aucun champ à mettre à jour" });
  }

  const fields = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updates);

  try {
    //Mettre à jour l'évènement
    values.push(id);
    let sql = `UPDATE evenements SET ${fields} WHERE id = ?`;
    await pool.query(sql, values);

    res.status(201).json({
      message: "Évènement mis à jour",
      mises_à_jours: updates,
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.delete("/:idevenement", async (req, res, next) => {
  const id = req.params.idevenement;
  var sql = "DELETE FROM evenements WHERE id_publique = ?";

  try {
    await pool.query(sql, [id]);
    res.status(200).json({
      message: "Évènement supprimé",
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.post("/exceptions", authentifierToken, async (req, res) => {
  const { id_parent, date_occurence, type, debut, fin } = req.body;
  const idMembre = req.membre.id;

  if (!id_parent || !date_occurence || !type) {
    return res.status(400).json({
      message: "Champs requis manquants : id_parent, date_occurence, type",
    });
  }

  try {
    // Vérifier que l'évènement parent existe et que l'user y a accès
    const sqlVerif = `
            SELECT e.id, p.privilege
            FROM evenements e
            INNER JOIN participants_evenements p ON e.id = p.id_evenement
            WHERE e.id = ? AND p.id_membre = ?
        `;
    const [verif] = await pool.query(sqlVerif, [id_parent, idMembre]);

    if (verif.length === 0) {
      return res.status(403).json({
        message: "Vous n'avez pas accès à cet évènement parent",
      });
    }

    // Insérer l’exception
    const sqlInsert = `
            INSERT INTO exceptions (id_parent, date_occurence, type, debut, fin)
            VALUES (?, ?, ?, ?, ?)
        `;
    const [result] = await pool.query(sqlInsert, [
      id_parent,
      date_occurence,
      type,
      debut || null,
      fin || null,
    ]);

    const insertedId = result.insertId;

    // Récupérer les infos de l’évènement parent (titre, description, fuseau_horaire, prive)
    const sqlParent = `
            SELECT e.titre, e.description, e.fuseau_horaire, e.prive
            FROM evenements e
            WHERE e.id = ?
        `;
    const [parentInfos] = await pool.query(sqlParent, [id_parent]);

    const parent = parentInfos[0];

    // Construire la réponse finale
    return res.status(201).json({
      id: insertedId,
      id_parent,
      type,
      date_occurence,
      debut,
      fin,
      titre: parent.titre,
      description: parent.description,
      fuseau_horaire: parent.fuseau_horaire,
      prive: parent.prive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Erreur lors de la création de l’exception",
      erreur: err.message,
    });
  }
});

router.get("/exceptions/:id", authentifierToken, async (req, res, next) => {
  const sqlException = `
        SELECT ex.id, ex.id_parent, ex.type, ex.date_occurence, ex.debut AS ex_debut, ex.fin AS ex_fin,
               e.titre, e.description, e.prive, e.fuseau_horaire
        FROM exceptions ex
        INNER JOIN evenements e ON e.id = ex.id_parent
        INNER JOIN participants_evenements p ON p.id_evenement = e.id
        WHERE ex.id = ?;
    `;

  try {
    const [resultat] = await pool.query(sqlException, [req.params.id]);

    if (resultat.length === 0) {
      return res.status(404).json({ message: "Exception non trouvée" });
    }

    // Vérifie si l'utilisateur a accès à l'exception via les participants
    const participant = resultat.find((r) => r.id_membre == req.membre.id);
    if (!participant) {
      return res.status(403).json({
        message: "Vous n'avez pas accès à cette exception",
      });
    }

    const [exception] = resultat;

    res.status(200).json({
      id: exception.id,
      id_parent: exception.id_parent,
      type: exception.type, // 'modifie' ou 'annule'
      date_occurence: exception.date_occurence,
      debut: formaterDateVersClient(exception.ex_debut),
      fin: formaterDateVersClient(exception.ex_fin),
      titre: exception.titre,
      description: exception.description,
      prive: exception.prive,
      fuseau_horaire: exception.fuseau_horaire,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération de l'exception." });
  }
});

router.patch("/exceptions/:id", authentifierToken, async (req, res) => {
  const { debut, fin } = req.body;

  if (!debut && !fin) {
    return res
      .status(400)
      .json({ message: "Au moins 'debut' ou 'fin' doit être fourni" });
  }

  const updates = [];
  const params = [];

  if (debut) {
    updates.push("debut = ?");
    params.push(debut);
  }
  if (fin) {
    updates.push("fin = ?");
    params.push(fin);
  }

  params.push(req.params.id);

  const sql = `UPDATE exceptions SET ${updates.join(", ")} WHERE id = ?`;

  try {
    const [result] = await pool.query(sql, params);
    res.status(200).json({ message: "Exception mise à jour" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour de l'exception" });
  }
});

router.delete("/exceptions/:id", authentifierToken, async (req, res) => {
  const sql = `DELETE FROM exceptions WHERE id = ?`;

  try {
    const [result] = await pool.query(sql, [req.params.id]);
    res.status(200).json({ message: "Exception supprimée" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erreur lors de la suppression de l'exception" });
  }
});

router.get(
  "/:idevenement/participants",
  authentifierToken,
  async (req, res, next) => {
    try {
      const limite = req.query.limite || 10;
      const offset = req.query.offset || 0;
      const sqlParticipants = `
            SELECT m.pseudo, m.fp_url, p.privilege, m.id_publique, e.id
            FROM evenements e
            INNER JOIN participants_evenements p ON e.id = p.id_evenement
            INNER JOIN membres m ON p.id_membre = m.id
            WHERE e.id = ?
            LIMIT ? OFFSET ? 
        `;
      const [resultats] = await pool.query(sqlParticipants, [
        req.params.idevenement,
        limite,
        offset,
      ]);
      const reponse = resultats.map((r) => {
        return {
          pseudo: r.pseudo,
          privilege: r.privilege,
          fp_url: r.fp_url,
          url: {
            method: "GET",
            url: `/membres/${r.id_publique}`,
          },
        };
      });
      res.status(200).json({
        cacheable: true,
        id_evenement: req.params.idevenement,
        participants: [reponse],
      });
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: {
          message: err.message,
          sql: err.sql,
        },
      });
    }
  }
);

router.post(
  "/:idevenement/participants",
  authentifierToken,
  async (req, res, next) => {
    try {
      const idInviteur = req.membre.id;
      const idEvenement = req.params.idevenement;
      const participants = req.body.participants;

      if (!Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          message:
            "le tableau participants est requis et ne peut pas être vide",
        });
      }
      if (participants.length > 15) {
        return res.status(403).json({ message: "limite de 15 invitations" });
      }

      // Vérifier si l'événement existe
      const [evenement] = await pool.query(
        "SELECT * FROM evenements WHERE id = ?",
        [idEvenement]
      );
      if (evenement.length === 0) {
        return res.status(404).json({ message: "Événement non trouvé." });
      }

      // Valider que chaque participant a idMembre et privilege
      for (const p of participants) {
        if (!p.idMembre || !p.privilege) {
          return res.status(400).json({
            message: "Chaque participant doit avoir idMembre et privilege.",
          });
        }
      }

      // Construire la requête INSERT multiple
      const values = participants.map((p) => [
        p.idMembre,
        idEvenement,
        p.privilege,
      ]);
      const sql = `INSERT INTO participants_evenements (id_membre, id_evenement, privilege) VALUES ?`;
      await pool.query(sql, [values]);

      const ids = participants.map((p) => p.idMembre);
      const [membres] = await pool.query(
        `SELECT id, push_token FROM membres WHERE id IN (?)`,
        [ids]
      );

      const [reponsePseudo] = await pool.query(
        "SELECT pseudo FROM membres WHERE id = ?",
        [idInviteur]
      );
      const { pseudo } = reponsePseudo[0];

      // Préparer et envoyer notification à chacun
      for (const membre of membres) {
        if (!membre.push_token) continue; // skip si pas de token

        //insérer l'invitation
        const [res] = await pool.query(
          "INSERT INTO invitations_evenement (id_evenement, id_invitant, id_invite) VALUES (?, ?, ?)",
          [idEvenement, idInviteur, membre.id]
        );
        // 2. Envoyer la notification push via FCM
        await envoyerNotification(
          membre.push_token,
          "évènements",
          "invitation",
          `${pseudo} vous invite à un évènement`,
          idInviteur,
          membre.id,
          { url: { method: "get", url: `/evenements/${idEvenement}` } },
          res.insertId
        );
      }

      res.status(201).json({
        message: "Participants ajoutés avec succès.",
        liste_participants: {
          method: "GET",
          url: `/evenements/${idEvenement}/participants`,
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout des participants:", error);
      res.status(500).json({
        message: "Une erreur est survenue lors de l'ajout des participants.",
      });
    }
  }
);

router.patch("/:idevenement/participants", async (req, res, next) => {
  const idMembre = req.params.id_membre;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Aucun champ à mettre à jour" });
  }

  const fields = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = Object.values(updates);

  try {
    //Mettre à jour la liste de participants
    values.push(id);
    let sql = `UPDATE participants_evenements SET ${fields} WHERE id_membre = ?`;
    await pool.query(sql, values);

    //Retourner la liste de participants mise à jour
    sql = `SELECT * FROM membres WHERE id = ?`;
    const [resultat] = await pool.query(sql, [idMembre]);
    const r = resultat[0];
    res.status(201).json({
      message: "Un participant mis à jour",
      mises_à_jours: updates,
      Participant: {
        idMembre: r.id_membre,
        droit: r.droit,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.delete(
  "/:idevenement/participants",
  authentifierToken,
  async (req, res, next) => {
    const idMembre = req.membre.id;
    var sql = "DELETE FROM participants WHERE id_membre = ?";

    try {
      await pool.query(sql, [idMembre]);
      res.status(200).json({
        message: "Participant supprimé",
      });
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: err.message,
      });
    }
  }
);

router.get("/invitations", async (req, res, next) => {
  const idMembre = req.params.id_membre;
  try {
    const [r] = await pool.query(
      `SELECT 
                i.id,
                i.id_evenement,
                i.id_invitant,
                i.statut,
                i.date_envoi,
                m.pseudo AS pseudo_invitant,
                m.fp_url AS url_profil_invitant
            FROM invitations_evenement i
            JOIN membres m ON i.id_invitant = m.id
            WHERE i.id_invite = ?`,
      [idMembre]
    );
    return res.status(200).json({
      invitations: r.map((invitation, index) => {
        return {
          id: invitation.id,
          pseudo_invitant: invitation.pseudo_invitant,
          evenement_url: {
            method: "GET",
            url: `/evenements/${invitation.id_evenement}`,
          },
          statut: invitation.statut,
          date_envoi: invitation.date_envoi,
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.post("/invitations", authentifierToken, async (req, res, next) => {
  const idMembre = req.membre.id;
  const idPubliqueEvenement = req.body.id_evenement;
  const invitations = req.body.invitations; //[{id_invite: ""}]

  if (!Array.isArray(invitations))
    return res
      .status(400)
      .json({ message: "le champ invitations est invalide" });

  const idsInvites = invitations.map((i) => i.id_invite);

  try {
    const [rEv] = await pool.query(
      "SELECT id, m.pseudo as pseudo, titre, debut, fin FROM evenements e JOIN membres m ON e.createur_id = m.id WHERE e.id_publique = ?",
      [idPubliqueEvenement]
    );
    if (!rEv.length)
      return res.status(404).json({ message: "évènement introuvable" });

    const valuesR = invitations.map((invite) => [
      rEv[0].id,
      idMembre,
      invite.id_invite,
    ]);

    const [rInsert] = await pool.query(
      "INSERT INTO invitations_evenement(id_evenement, id_invitant, id_invite) VALUES ?",
      [valuesR]
    );
    const [rPushToken] = await pool.query(
      "SELECT push_token, id FROM membres WHERE id IN ?",
      [idsInvites]
    );

    rPushToken[0].forEach((i) =>
      envoyerNotification(
        i.push_token,
        "invitation_evenement",
        "un moment à partager t'est proposé",
        `${rEv[0].pseudo} souhaite t'inviter à ${rEv[0].titre} de ${rEv[0].debut} à ${rEv[0].fin}`,
        idMembre,
        i.id,
        {
          evenement_url: {
            method: "GET",
            url: `/evenements/${idPubliqueEvenement}`,
          },
        },
        rInsert.insertId
      )
    );
  } catch (err) {
    return res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.patch(
  "/invitations/:idinvitation",
  authentifierToken,
  async (req, res, next) => {
    const idMembre = req.membre.id;
    const nouvStatut = req.body.statut;
    const { id_evenement } = req.body;

    if (nouvStatut != "refusee" || nouvStatut != "acceptee" || !id_evenement)
      return res.status(400).json({ message: "body passé invalide" });
    try {
      const [r] = await pool.query(
        "UPDATE invitations_evenements SET statut = ? WHERE id = ?",
        [nouvStatut, req.params.idinvitation]
      );
      if (r.affectedRows < 1)
        return res.status(500).json({ message: "aucune ligne affectée" });
      let message;
      if (nouvStatut == "acceptee") {
        message = "ça y'est, ta présence est confirmé";
        const [rPart] = pool.query(
          "INSERT INTO participants_evenements(id_membre, privilege) VALUES(?, 'lecteur') WHERE id_evenement = ?",
          [idMembre, id_evenement]
        );
      } else message = "dire non c'est parfois se dire oui";
      return res.status(200).json({ message: message });
    } catch (error) {
      return res.status(500).json({
        message: "une erreur au niveau de la base de donnée est survenue",
        erreur: error.message,
      });
    }
  }
);

router.delete(
  "invitations/:idinvitation",
  authentifierToken,
  async (req, res, next) => {
    const idMembre = req.membre.id;

    try {
      const [r] = await pool.query(
        "DELETE FROM invitations_evenement WHERE id = ? AND id_invite = ?; DELETE FROM notifications WHERE metier_id = ? AND id_receveur = ?",
        [req.params.idinvitation, idMembre, req.params.idinvitation, idMembre]
      );
      return res.send(200).json({ message: "on l'a enlevé de tes pattes" });
    } catch (error) {
      return res.send(500).json({
        message: "une erreur au niveau de la base de donnée est survenue",
      });
    }
  }
);

module.exports = router;
