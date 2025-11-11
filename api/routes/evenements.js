//paquets npm
const express = require("express");
const router = express.Router();
require("dotenv").config();
const { RRule, rrulestr } = require('rrule');

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
const GenererOccurrences = require("../../functions/genererOccurences");
const AppliquerExceptions = require("../../functions/appliquerExceptions");

///retourne plusieurs objets 'evenement' selon un idmembre donné par un JWT
/// res.json: {compte|evenement[id|titre|description|debut|fin|reccurence]}
/// req.query: {limite=5|offset=0|debut|fin}
router.get( "/", authentifierToken, ajouterEvenementFactice, async (req, res, next) => {
    let idProprietaire = req.membre.id;
    let limite = req.query.limite || 20;
    let offset = req.query.offset || 0;
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    let debut = req.query.debut || FactoriserTimestamp(now.toISOString());
    now.setHours(now.getHours() + 24);
    let fin = req.query.fin || FactoriserTimestamp(now.toISOString());
    //console.log("get evenements/", debut, fin);
    const evFactice = req.evenementFactice;
    const sqlEvenements = ` SELECT e.* 
        FROM evenements e INNER JOIN participants_evenements p ON e.id = p.id_evenement 
        WHERE (p.id_membre = ?) 
        AND (fin >= ?) AND (debut <= ?)
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

      const occurences = GenererOccurrences(
        DateTime.fromSQL(debut, { zone: "utc" }),
        DateTime.fromSQL(fin, { zone: "utc" }),
        resultatsRecc
      );
      const idsParents = occurences.map((occurence) => occurence.id);
      //console.log('idsParents', idsParents)
      if (idsParents.length > 0) {
        const [resultatsExceptions] = await pool.query(sqlExceptions, [
          idsParents,
        ]);
        occurencesEx = AppliquerExceptions(occurences, resultatsExceptions);
      }
      //console.log('occurences ex', occurencesEx)
      const resultatFinal = [...resultatsSansRecc, ...occurencesEx];
      
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
        type:r.type??'evenement',
        url:{
              method: "GET",
              string: r.string??`/evenements/${r.id_publique}`,
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
router.post("/", authentifierToken, formaterDates, verifierDisponibilite, async (req, res, next) => {
    const createurId = req.membre.id;
    const debut = req.debutSQL;
    const fin = req.finSQL;
    const titre = req.body.titre || null;
    const description = req.body.description || null;
    const prive = req.body.prive !== undefined ? req.body.prive : true;
    const regleRecurrence = req.body.regle_recurrence || null;

    const idPubliqueEvenement = await generateIdWithQueue(10, true, true, "E");
    const slug = await genererSlugAvecQueue(titre, idPubliqueEvenement);

    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const [responsePostEv] = await conn.execute(
        `INSERT INTO evenements(id_publique, debut, fin, titre, description, prive, regle_recurrence, createur_id, slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idPubliqueEvenement,
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
      const idPriveEvenement = responsePostEv.insertId
      await conn.execute(
        `INSERT INTO participants_evenements (id_evenement, id_membre, privilege) VALUES (?, ?, ?)`,
        [idPriveEvenement, createurId, "editeur"]
      );

      let participants = Array.isArray(req.body.participants)
        ? req.body.participants
        : [];
      //console.log("post evenements participants", participants);
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
        //console.log("map membres", mapMembres);
        let insertsInvitation = [];
        let valuesInvitation = [];

        for (let p of participants) {
          const membre = mapMembres[p.id_publique];
          //console.log("membre", membre);
          if (!membre || membre.id === createurId) continue;
          const idPubliqueInv = await generateIdWithQueue(10, true, true, 'I', 'invitations_evenement')
          insertsInvitation.push("(?, ?, ?, ?)");
          valuesInvitation.push(idPubliqueInv, idPriveEvenement, createurId, membre.id);
          //console.log("values", valuesInvitation);
        }

        if (insertsInvitation.length > 0) {
          const sqlInsertInvitations =
            "INSERT INTO invitations_evenement (id_publique, id_evenement, id_invitant, id_invite) VALUES " +
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
                  id_evenement: idPubliqueEvenement,
                  statut: "acceptee",
                },
              },
              {
                label: "refuser",
                method: "PATCH",
                url: `/evenements/invitations/${insertIds[notifIndex]}`,
                body: {
                  id_evenement: idPubliqueEvenement,
                  statut: "refusee",
                },
              },
            ],
          };
          envoyerNotification(
            membre.push_token,
            "evenements",
            "On t'invite à partager un moment",
            `${req.membre.pseudo} t'invite à ${titre}`,
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
  const now = await getNow(idMembre);
  const debut = req.query.debut || now.startOf("day").toSQL();
  const fin = req.query.fin || now.endOf("day").toSQL();

  const limiteAmis = parseInt(req.query.limiteAmi) || 10;
  const offsetAmis = parseInt(req.query.offset) || 0;

  try {
    //Récupérer les amis
    const amisSql = `
      SELECT id_ami 
      FROM (
        SELECT a.id_ami AS id_ami FROM amis a WHERE a.id_membre = ?
        UNION
        SELECT a.id_membre AS id_ami FROM amis a WHERE a.id_ami = ?
      ) AS amis_union
      LIMIT ? OFFSET ?`;
    const [resultatsAmis] = await pool.query(amisSql, [
      idMembre,
      idMembre,
      limiteAmis,
      offsetAmis,
    ]);

    const idsAmis = resultatsAmis.map(a => a.id_ami);
    if (!idsAmis.length) return res.status(200).json({ compte: 0, resultat: [] });

    //Récupérer les événements sans et avec récurrence
    const evenementsSql = `
      SELECT m.id AS ami_id_prive, m.id_publique AS ami_id_publique, i.url AS fp_url,
             e.id_publique, e.titre, e.debut, e.fin, e.prive
      FROM membres m
      LEFT JOIN images i ON i.id = m.id_fp
      LEFT JOIN participants_evenements p ON m.id = p.id_membre
      LEFT JOIN evenements e ON e.id = p.id_evenement
      WHERE m.id IN (?) AND e.regle_recurrence IS NULL AND e.fin >= ? AND e.debut <= ?
      ORDER BY e.debut`;

    const evenementsRecSql = `
      SELECT m.id AS ami_id_prive, m.id_publique AS ami_id_publique, i.url AS fp_url,
             e.id_publique, e.titre, e.debut, e.fin, e.prive, e.regle_recurrence
      FROM membres m
      LEFT JOIN images i ON i.id = m.id_fp
      LEFT JOIN participants_evenements p ON m.id = p.id_membre
      LEFT JOIN evenements e ON e.id = p.id_evenement
      WHERE m.id IN (?) AND e.regle_recurrence IS NOT NULL AND e.fin <= ? AND e.id IS NOT NULL
      ORDER BY e.debut`;

    const exceptionsSql = `
      SELECT * FROM evenements_exceptions WHERE id_parent IN (?)`;

    const [evSansRec] = await pool.query(evenementsSql, [idsAmis, debut, fin]);
    const [evRec] = await pool.query(evenementsRecSql, [idsAmis, fin]);

    //Générer les occurrences et appliquer exceptions
    let occurencesEx = [];
    const occurences = GenererOccurrences(DateTime.fromSQL(debut, { zone: "utc" }),
                                          DateTime.fromSQL(fin, { zone: "utc" }),
                                          evRec);
    const idsParents = occurences.map(o => o.id);
    if (idsParents.length > 0) {
      const [resultatsExceptions] = await pool.query(exceptionsSql, [idsParents]);
      occurencesEx = AppliquerExceptions(occurences, resultatsExceptions);
    }

    const resultatFinal = [...evSansRec, ...occurencesEx];

    //Créer les groupes pour tous les amis avec infos depuis membres
    const [infosAmis] = await pool.query(
      `SELECT m.id, id_publique, i.url AS fp_url FROM membres m LEFT JOIN images i ON i.id = m.id_fp WHERE m.id IN (?)`,
      [idsAmis]
    );

    const groupes = {};
    infosAmis.forEach(ami => {
      groupes[ami.id] = { ami_id_publique: ami.id_publique, fp_url: ami.fp_url, evenements: [] };
    });

    //Remplir les événements dans les groupes
    const uniques = new Map();
    resultatFinal.forEach(ev => {
      const key = ev.id_publique + ev.debut;
      if (!uniques.has(key)) uniques.set(key, ev);
    });

    for (const ev of uniques.values()) {
      const ami_id = ev.ami_id_prive;
      if (!groupes[ami_id]) continue;

      if (ev.id_publique !== null) {
        groupes[ami_id].evenements.push({
          id_evenement: ev.id_publique,
          titre: ev.titre,
          url: { method: "GET", string: ev.string??`/evenements/${ev.id_publique}`},
          debut: formaterDateVersClient(ev.debut),
          fin: formaterDateVersClient(ev.fin),
          prive: ev.prive,
        });
      }
    }

    //Ajouter “Fin de journée” si nécessaire
    const resultat = Object.entries(groupes).map(([ami_id, data]) => {
      const evenements = data.evenements;
      const existe235959 = evenements.some(ev => {
        if (!ev.fin) return false;
        const fin = new Date(ev.fin);
        return fin.getHours() === 23 && fin.getMinutes() === 59 && fin.getSeconds() === 59;
      });
      if (!existe235959) {
        const dt = DateTime.fromISO(DateTime.fromSQL(debut).toISODate())
                          .set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
        evenements.push({
          id_evenement: "factice_" + ami_id,
          titre: "Fin de journée",
          debut: dt,
          fin: dt,
          regle_recurrence: null,
          prive: 1,
        });
      }
      return { id: data.ami_id_publique, fp_url: data.fp_url, evenements };
    });

    return res.status(200).json({ compte: idsAmis.length, cacheable: true, resultat });

  } catch (err) {
    res.status(500).json({ message: "Erreur base de données", erreur: err.message });
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
      const occurences = GenererOccurrences(
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
  const {privilege} = req.accesEvenement
  const sqlEvenement = `SELECT e.titre, e.description, e.debut, e.fin, e.prive, e.regle_recurrence, m.fuseau_horaire
                      FROM evenements e 
                      INNER JOIN membres m ON m.id = e.createur_id
                      WHERE e.id_publique = ? `;

  try {
    const [resultat] = await pool.query(sqlEvenement, [req.params.idevenement]);

    if (resultat.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    const [evenement] = resultat; // Puisque trouvé au moins un événement

    //console.log("/evenements/:idevenement", resultat[0]);

    res.status(200).json({
      id: req.params.idevenement,
      titre: evenement.titre,
      description: evenement.description,
      debut: formaterDateVersClient(evenement.debut),
      fin: formaterDateVersClient(evenement.fin),
      prive: evenement.prive,
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
    let sql = `UPDATE evenements SET ${fields} WHERE id_publique = ?`;
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

router.get('/recurrences/:idevenement', authentifierToken, verifierAccesEvenement, async (req, res) => {
  const {privilege} = req.accesEvenement
  const idParent = req.params.idevenement;
  console.log('body', req.query)
  const { debut, fin } = req.query; // venant du client
  console.log('idaprent', idParent)
  try {
    const [rows] = await pool.query(
      'SELECT titre, description, regle_recurrence, m.id_publique, m.fuseau_horaire, prive FROM evenements e INNER JOIN membres m ON m.id = e.createur_id WHERE e.id_publique = ?',
      [idParent]
    );

    if (!rows.length)
      return res.status(404).json({ erreur: 'Événement parent introuvable' });

    const parent = rows[0];

    // Vérifier si la date correspond à une occurrence
    const rule = rrulestr(parent.regle_recurrence);
    console.log('dateDebut', debut)
    const dateDebut = DateTime.fromSQL(debut, {zone:'utc'}).toJSDate();
    console.log('dateDebut', dateDebut)

    // tolérance de +/- 1 seconde pour éviter les erreurs d’arrondi
    const occurrence = rule
      .all()
      .find((d) => Math.abs(d.getTime() - dateDebut.getTime()) < 1000);

    if (!occurrence)
      return res.status(400).json({
        erreur: 'La date fournie ne correspond à aucune occurrence de cette récurrence.',
      });

    // on "projette" le parent dans une occurrence concrète
    const evenement = {
      id: idParent,
      privilege_membre: privilege,
      ...parent,
      debut: debut,
      fin: fin,
      type: 'recurrence',
      url: `/evenements/reccurences/${idParent}`,
    };

    res.json(evenement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur' });
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
            WHERE e.id_publique = ? AND p.id_membre = ?
        `;
    const [verif] = await pool.query(sqlVerif, [id_parent, idMembre]);

    if (verif.length === 0) {
      return res.status(403).json({
        message: "Vous n'avez pas accès à cet évènement parent",
      });
    }

    // Insérer l’exception
    const sqlInsert = `
            INSERT INTO evenements_exceptions (id_parent, id_publique, date_occurence, type, debut, fin)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
    const idPublique = await generateIdWithQueue(10, true, true, 'EX', 'evenements_exceptions')
    const [result] = await pool.query(sqlInsert, [
      verif[0].id,
      idPublique,
      date_occurence,
      type,
      debut || null,
      fin || null,
    ]);

    // Récupérer les infos de l’évènement parent (titre, description, fuseau_horaire, prive)
    const sqlParent = `
            SELECT e.titre, e.description, m.fuseau_horaire, e.prive
            FROM evenements e
            INNER JOIN membres m ON m.id = e.createur_id
            WHERE e.id_publique = ?
        `;
    const [parentInfos] = await pool.query(sqlParent, [id_parent]);

    const parent = parentInfos[0];

    // Construire la réponse finale
    return res.status(201).json({
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

router.get("/exceptions/:idevenement", authentifierToken, verifierAccesEvenement, async (req, res, next) => {
  const sqlException = `
        SELECT ex.id, ex.id_parent, ex.type, ex.date_occurence, ex.debut AS ex_debut, ex.fin AS ex_fin,
               e.titre, e.description, e.prive, e.fuseau_horaire
        FROM exceptions ex
        INNER JOIN evenements e ON e.id = ex.id_parent
        INNER JOIN participants_evenements p ON p.id_evenement = e.id
        WHERE ex.id_parent = ?;
    `;

  try {
    const [resultat] = await pool.query(sqlException, [req.params.idevenement]);

    if (resultat.length === 0) {
      return res.status(404).json({ message: "Exception non trouvée" });
    }

    const [exception] = resultat;

    res.status(200).json({
      id: exception.id,
      id_parent: exception.id_parent,
      type:'exception',
      type_ex: exception.type, // 'modifie' ou 'annule'
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

router.get("/:idevenement/participants", authentifierToken, async (req, res, next) => {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const sqlParticipantsEtInvites = `
      SELECT m.pseudo, i.url, p.privilege, m.id_publique, 'acceptee' as statut, 'participant' AS type
      FROM participants_evenements p
      INNER JOIN membres m ON p.id_membre = m.id
      LEFT JOIN images i ON m.id_fp = i.id
      WHERE p.id_evenement = ?
      
      UNION
      
      SELECT m.pseudo, i.url, NULL AS privilege, m.id_publique, ie.statut as statut, 'invite' AS type
      FROM invitations_evenement ie
      INNER JOIN membres m ON ie.id_invite = m.id
      LEFT JOIN images i ON m.id_fp = i.id
      WHERE ie.id_evenement = ?
      
      LIMIT ? OFFSET ?
    `;

    const [responseIdEv] = await pool.query('SELECT id FROM evenements WHERE id_publique = ?', [req.params.idevenement])

    const [resultats] = await pool.query(sqlParticipantsEtInvites, [
      responseIdEv[0].id,
      responseIdEv[0].id,
      limite,
      offset,
    ]);

    const reponse = resultats.map((r) => {
      return {
        id:r.id_publique,
        pseudo: r.pseudo,
        statut:r.statut,
        privilege: r.privilege||'lecteur', // peut être null si c’est un invité
        type: r.type,           // "participant" ou "invite"
        fp_url: r.url,
        url: {
          method: "GET",
          url: `/membres/${r.id_publique}`,
        },
      };
    });

    res.status(200).json({
      cacheable: true,
      participants: reponse,
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

router.post( "/:idevenement/participants", authentifierToken, async (req, res, next) => {
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
        if (!p.id || !p.privilege) {
          return res.status(400).json({
            message: "Chaque participant doit avoir idMembre et privilege.",
          });
        }

      }

      // Construire la requête INSERT multiple
      const values = await Promise.all(
        participants.map(async (p) => {
          const [rIdP] = await pool.query('SELECT id FROM membres WHERE id_publique = ?', [p.id]);
          if (rIdP.length === 0) throw new Error(`Membre introuvable: ${p.id}`);
          return [rIdP[0].id, idEvenement, p.privilege];
        })
      );
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
      const pseudo = reponsePseudo[0].pseudo;

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

//quitter un evenement
router.delete( "/:idevenement/participants", authentifierToken, async (req, res, next) => {
    const idMembre = req.membre.id;
    const idEvenement = req.params.idevenement
    var sql = "DELETE FROM participants_evenements WHERE id_membre = ?";

    try {
      await pool.query(sql, [idMembre, idEvenement]);
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

router.delete("/:idevenement/participants/:id_publique_membre", authentifierToken, verifierAccesEvenement, async (req, res, next) => {
    const idMembre = req.params.id_publique_membre;
    const idEvenement = req.params.idevenement
    const {statut_demande} = req.query
    const {privilege} = req.accesEvenement
    var sql = "DELETE FROM participants_evenements WHERE id_membre = ? AND id_evenement = ?";
    if(statut_demande == 'en_attente' || statut_demande == 'refusee')
      sql = "DELETE FROM invitations_evenement WHERE id_invite = ? AND id_evenement = ?"

    if(privilege != 'editeur')
      return res.status(400).json({message: 'impossible de modifier un évènement de la sorte'})

    try {
      const rIdPriveMembre = await pool.query('SELECT id FROM membres WHERE id_Publique = ?', [idMembre])
      await pool.query(sql, [rIdPriveMembre[0].id, idEvenement]);
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

router.get("/invitations", authentifierToken, async (req, res, next) => {
  const idMembre = req.membre.id;
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
      "SELECT e.id, m.pseudo as pseudo, titre, debut, fin FROM evenements e JOIN membres m ON e.createur_id = m.id WHERE e.id_publique = ?",
      [idPubliqueEvenement]
    );
    if (!rEv.length)
      return res.status(404).json({ message: "évènement introuvable" });

    const valuesR = await Promise.all(
      invitations.map(async (invite) => {
        const idInvitation = await generateIdWithQueue(10, true, true, 'I', 'invitations_evenements');
        return [
          idInvitation,
          rEv[0].id,
          idMembre,
          invite.id_invite,
        ];
      })
    );

    const [rInsert] = await pool.query(
      "INSERT INTO invitations_evenement(id_publique, id_evenement, id_invitant, id_invite) VALUES ?",
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

router.patch( "/invitations/:idinvitation", authentifierToken, async (req, res, next) => {
    const idMembre = req.membre.id;
    const nouvStatut = req.body.statut;
    const { id_evenement } = req.body;

    if (!nouvStatut || !id_evenement)
      return res.status(400).json({ message: "body passé invalide" });
    try {
      const [r] = await pool.query(
        "UPDATE invitations_evenement SET statut = ? WHERE id_publique = ?",
        [nouvStatut, req.params.idinvitation]
      );
      if (r.affectedRows < 1)
        return res.status(500).json({ message: "aucune ligne affectée" });
      let message;
      if (nouvStatut == "acceptee") {
        const [responseSelectEv] = await pool.query('SELECT id FROM evenements WHERE id_publique = ?', [id_evenement])
        message = "ça y'est, ta présence est confirmé";
        await pool.query(
          "INSERT INTO participants_evenements(id_membre, id_evenement, privilege) VALUES(?, ?, 'lecteur')",
          [idMembre, responseSelectEv[0].id]
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

router.delete("invitations/:idinvitation",  authentifierToken, async (req, res, next) => {
    const idMembre = req.membre.id;

    try {
      const [r] = await pool.query(
        "DELETE FROM invitations_evenement WHERE id_publique = ? AND id_invite = ?; DELETE FROM notifications WHERE metier_id = ? AND id_receveur = ?",
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
