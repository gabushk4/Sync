//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

//fonctions
const { authentifierToken } = require("../../functions/authenticate");

//PDO
let { pool } = require("../../PDO");
const envoyerNotification = require("../../functions/envoyerNotification");
const { generateIdWithQueue } = require("../../functions/idGen");
const { formaterDateVersClient } = require("../../functions/formaterDateVersClient");

// Récupérer la liste des amis d'un membre
router.get("/", authentifierToken, async (req, res, next) => {
  try {
    const idMembre = req.membre.id;
    const sql = `SELECT id_publique, pseudo, i.url, a.temps_creation
                    FROM amis a
                    JOIN membres m ON a.id_ami = m.id
                    LEFT JOIN images i ON m.id_fp = i.id
                    WHERE a.id_membre = ?

                        UNION

                    SELECT id_publique, pseudo, i.url, a.temps_creation
                    FROM amis a
                    JOIN membres m ON a.id_membre = m.id
                    LEFT JOIN images i ON m.id_fp = i.id
                    WHERE a.id_ami = ?`; 

    const [rows] = await pool.query(sql, [idMembre, idMembre]);
    const resultat = rows.map((r, i)=>{
        return{
            id_publique:r.id_publique,
            pseudo:r.pseudo,
            fp_url:r.url,
            temps_amitie:formaterDateVersClient(r.temps_creation)
        } 
    })

    res.status(200).json(resultat);
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

// Ajouter un ami
router.post("/", authentifierToken, async (req, res, next) => {
  try {
    const { idAmi } = req.body;
    const idMembre = req.membre.id;

    const sql = `INSERT INTO amis (id_membre, id_ami) VALUES (?, ?)`;
    await pool.query(sql, [idMembre, idAmi]);

    res.status(201).json({
      message: "Ami ajouté avec succès",
      ami: {
        method: "GET",
        url: `/membres/${idAmi}`,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

router.get("/demandes", authentifierToken, async (req, res, next) => {
  try {
    const idMembre = req.membre.id;

    const sql = `SELECT d.id as id, d.statut, m.pseudo, m.id_publique as id_demandeur
                     FROM demandes_amis d
                     JOIN membres m ON d.id_demandeur = m.id
                     WHERE d.id_destinataire = ?`;
    const [rows] = await pool.query(sql, [idMembre]);

    console.log("/demandes", rows);

    res.status(200).json({
      demandes: rows.map((r, i) => {
        return {
          id: r.id,
          statut: r.statut,
          id_demandeur: r.id_demandeur,
          pseudo_demandeur: r.pseudo,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

// Envoyer une demande d'ami
router.post("/demandes", authentifierToken, async (req, res, next) => {
  try {
    const idDemandeur = req.membre.id;
    const pseudoDemandeur = req.membre.pseudo;
    const idDestinatairePublique = req.body.id_destinataire;
    
    //SELECT idDestinataire privé
    const [resIdDestinataire] = await pool.query(
      "SELECT id FROM membres WHERE id_publique = ?",
      [idDestinatairePublique.toString()]
    );

    if (!resIdDestinataire.length) {
      return res.status(404).json({ message: "Destinataire non trouvé" });
    }
    const idDestinataire = resIdDestinataire[0].id;

    //Verification d'amitié
    if (idDemandeur === idDestinataire)
      return res.status(400).json({
        message: "Impossible de s'ajouter sois-même en ami",
      });

    console.log(
      "post /demandes -> idDestinatairePublique",
      idDestinatairePublique,
      "idDestinatairePrivé",
      idDestinataire
    );
    //INSERT dans la table demandes_amis
    const idDemande = generateIdWithQueue(10, true, true, 'D', "demandes_amis")
    sql = `INSERT INTO demandes_amis (id_publique, id_demandeur, id_destinataire) VALUES (?, ?, ?)`;
    const [resDemande] = await pool.query(sql, [idDemande, idDemandeur, idDestinataire]);

    //Envoyer une notif
    const [reponsePushToken] = await pool.query(
      "SELECT push_token FROM membres WHERE id = ?",
      [idDestinataire]
    );
    const { push_token } = reponsePushToken[0];

    const p = {
        actions:[
            {
                label:'accepter',
                method:'PATCH',
                url:`/amis/demandes/${resDemande.insertId}`,
                body:{
                    statut:'acceptee'
                }
            },
            {
                label:'refuser',
                method:'PATCH',
                url:`/amis/demandes/${resDemande.insertId}`,
                body:{
                    statut:'refusee'
                }
            }
        ]
    }

    const payload = JSON.stringify(p)

    envoyerNotification(
      push_token,
      "amis",
      `une belle rencontre commence`,
      `${pseudoDemandeur} veut devenir ton ami`,
      idDemandeur,
      idDestinataire,
      payload,
      resDemande.insertId
    );

    return res
      .status(201)
      .json({ message: "demande d'ami envoyée; curieux de voir ou ça mènera" });
  } catch (err) {
    return res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message, 
    });
  }
});

router.patch(
  "/demandes/:idDemande",
  authentifierToken,
  async (req, res, next) => {
    try {
      const { statut } = req.body; 
      const idDemande = req.params.idDemande;

      // Vérifiez si le statut est valide
      if (!["acceptee", "refusee"].includes(statut)) {
        return res
          .status(400)
          .json({
            message:
              'Statut invalide, choisissez entre "acceptee" ou "refusee".',
          });
      }

      const sql = `UPDATE demandes_amis SET statut = ? WHERE id_publique = ?`;
      await pool.query(sql, [statut, idDemande]);

      if (statut === "acceptee") {
        const [reponse] = await pool.query(
          "SELECT id_demandeur, id_destinataire FROM demandes_amis WHERE id_publique = ?",
          [idDemande]
        );
        const { id_demandeur, id_destinataire } = reponse[0];

        await pool.query("INSERT INTO amis (id_membre, id_ami) VALUES (?,?)", [
          id_destinataire,
          id_demandeur,
        ]);

        await pool.query('DELETE FROM notifications WHERE id_metier = ?', [idDemande])  
        
      }

      return res
        .status(200)
        .json({
          message: `Statut de la demande mis à jour avec succès. Demande ${statut}`,
        });
    } catch (error) {
      return res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: error.message,
      });
    }
  }
);

router.delete(
  "/demandes/:idDemande",
  authentifierToken,
  async (req, res, next) => {
    try {
      const idMembre = req.membre.id;
      const idDemande = req.params.idDemande;

      const sql = `DELETE FROM demandes_amis WHERE id_publique = ?`;
      await pool.query(sql, [idDemande]);

      res.status(200).json({ message: "demande d'ami supprimée avec succès." });
    } catch (error) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: error.message,
      });
    }
  }
);

// Modifier les informations d'un ami (éventuellement, si vous avez des informations personnalisées pour chaque ami)
router.patch(
  "/:idmembre_publique",
  authentifierToken,
  async (req, res, next) => {
    try {
      const idAmi = req.params.id;
      const idMembre = req.membre.id;
      const { couleur } = req.body;

      const update = `UPDATE membres
                        SET nom = ?, prenom = ?
                        WHERE id = (
                            SELECT id_ami 
                            FROM amis 
                            WHERE id_membre = ? AND id_ami = ?)`;
      await pool.query(update, [nom, prenom, idMembre, idAmi]);

      res.status(200).json({ message: "Ami mis à jour avec succès" });
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de donnée est survenue",
        erreur: err.message,
      });
    }
  }
);

// Supprimer un ami
router.delete("/:idami", authentifierToken, async (req, res, next) => {
  try {
    const idAmi = req.params.idami;
    const idMembre = req.membre.id;
    
    const sql = `DELETE FROM amis WHERE (id_membre = ? AND id_ami = ?) OR (id_membre = ? AND id_ami = ?)`;
    await pool.query(sql, [idMembre, idAmi, idAmi, idMembre]);

    res.status(200).json({
      message: "Ami supprimé avec succès",
      listeAmi: {
        method: "GET",
        url: "amis/",
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de donnée est survenue",
      erreur: err.message,
    });
  }
});

// Récupérer les demandes d'amis

module.exports = router;
