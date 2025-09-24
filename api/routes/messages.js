//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

//fonctions
const { generateSalt, hash, compare } = require("../../functions/pass");
const { generateIdWithQueue } = require("../../functions/idGen");
require("dotenv").config();
const { selectQueryBuilder } = require("../../functions/sqlquerybuilder");
const {
  authentifierToken,
  verifierAccesConversation,
} = require("../../functions/authenticate");
const FactoriserTimestamp = require("../../functions/factoriserTimestamp");

//PDO
let { pool } = require("../../PDO");
const envoyerNotification = require("../../functions/envoyerNotification");

// Récupérer tous les messages d'une conversation avec limite et offset
router.get(
  "/:id_conversation",
  authentifierToken,
  verifierAccesConversation,
  async (req, res) => {
    const limite = parseInt(req.query.limite, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const sqlMessages = `
        SELECT m.id, m.message, m.temps_envoi, m.id_auteur, c.titre
        FROM messages_texte m
        INNER JOIN conversations c ON m.id_conversation = c.conversation_id
        WHERE m.id_conversation = ?
        LIMIT ? OFFSET ?
    `;

    try {
      const [resultats] = await pool.query(sqlMessages, [
        req.params.id_conversation,
        limite,
        offset,
      ]);

      const reponse = resultats.map((r) => {
        return {
          id: r.id,
          message: r.message,
          temps_envoi: r.temps_envoi,
          id_auteur: r.id_auteur,
        };
      });

      res.status(200).json({
        cacheable: true,
        id_conversation: req.params.id_conversation,
        messages: reponse,
      });
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de données est survenue",
        erreur: {
          message: err.message,
          sql: err.sql,
        },
      });
    }
  }
);

// Créer un nouveau message
router.post("/", authentifierToken, async (req, res) => {
  const { id_conversation, message, temps_envoi } = req.body;
  const id_auteur = req.membre.id;

  try {
    const [result] = await pool.query(
      "INSERT INTO messages_texte (id_conversation, id_auteur, message, temps_envoie) VALUES(?, ?, ?)",
      [id_conversation, id_auteur, message, temps_envoi]
    );

    res.status(201).json({ id: result.insertId, ...newMessage });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: {
        message: err.message,
        sql: err.sql,
      },
    });
  }
});

// Modifier un message existant
router.patch("/:idmembre_publique", authentifierToken, async (req, res) => {
  const idMessage = req.params.id;
  const { message } = req.body;
  const idMembre = req.membre.id;

  try {
    const [auteur] = await pool.query(
      "SELECT id_auteur FROM messages_texte WHERE id = ?",
      [idMessage]
    );

    if (auteur.id_auteur !== idMembre) {
      res
        .status(401)
        .json({ message: "Vous n'êtes pas l'auteur de ce message" });
    }

    const [resultat] = await pool.query(
      "UPDATE messages_texte SET message = ? WHERE id = ?",
      [message, idMessage]
    );
    if (resultat.affectedRows === 0)
      return res.status(404).json({ message: "Message non trouvé" });

    res.status(200).json({ message: "Message mis à jour avec succès" });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: {
        message: err.message,
        sql: err.sql,
      },
    });
  }
});

// Supprimer un message
router.delete("/:idmembre_publique", authentifierToken, async (req, res) => {
  const idMessage = req.params.id;
  const idMembre = req.membre.id;

  try {
    const [message] = await pool.query(
      "SELECT id_auteur FROM messages_texte WHERE id = ?",
      [idMessage]
    );

    if (message.id_auteur !== idMembre) {
      res.status(401).json[
        { message: "Vous n'êtes pas l'auteur de ce message" }
      ];
    }

    const [result] = await pool.query(
      "DELETE FROM messages_texte WHERE id = ?",
      [idMessage]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Message non trouvé" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: {
        message: err.message,
        sql: err.sql,
      },
    });
  }
});

// Récupérer toutes les conversations avec limite et offset
router.get("/conversations", authentifierToken, async (req, res) => {
  const limite = parseInt(req.query.limite, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const idMembre = req.membre.id;

  const sqlConversations = `
        SELECT c.conversation_id, c.title, c.couverture_url, pc.role
        FROM conversations c
        INNER JOIN participants_conversations pc ON c.conversation_id = pc.id_conversation
        WHERE pc.id_membre = ?
        ORDER BY c.conversation_id DESC
        LIMIT ? OFFSET ?
      `;

  try {
    const [resultats] = await pool.query(sqlConversations, [
      idMembre,
      limite,
      offset,
    ]);

    const reponse = resultats.map((r) => {
      return {
        conversation_id: r.conversation_id,
        titre: r.titre,
        couverture_url: r.couverture_url,
      };
    });

    res.status(200).json({
      cacheable: true,
      conversations: reponse,
    });
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: {
        message: err.message,
        sql: err.sql,
      },
    });
  }
});

router.post("/conversations", authentifierToken, async (req, res) => {
  const idCreateur = req.membre.id;
  const idConversation = generateIdWithQueue(10, true, true, "C");
  const sql =
    "INSERT INTO conversations (couverture_url, id, titre) VALUES (?,?,?)";
  const { participants } = req.body;
  const valeursParticipants = participants.map((p) => [
    idConversation,
    p.id,
    p.role,
  ]);

  try {
    pool
      .query(sql, [req.body.couverture_url, idConversation, req.body.titre])
      .then(() => {
        return pool.query(
          "INSERT INTO participants_conversations (id_conversation, id_membre, role) VALUES ?",
          [valeursParticipants]
        );
      })
      .then(async () => {
        const ids = valeursParticipants.map((p) => p.id);
        const [resPushToken] = await pool.query(
          "SELECT push_token, id FROM membres WHERE id IN ?",
          [ids]
        );
        resPushToken.forEach();
        res
          .status(201)
          .json({
            message:
              "nouvelle conversation créée; que les idées circulent librement!",
          });
      })
      .catch((error) => {
        console.error("Erreur lors de l'insertion :", error);
        res
          .status(500)
          .json({ message: "Erreur serveur lors de la création." });
      });
  } catch (error) {
    console.error("Erreur inattendue :", error);
    res
      .status(500)
      .json({
        erreur: error,
        message: "Une erreur au niveau de la base de données est survenue",
      });
  }
});

router.patch(
  "/conversations/:id_conversation",
  authentifierToken,
  verifierAccesConversation,
  async (req, res) => {
    const idMembre = req.membre.id;
    const idConversation = req.params.id_conversation;

    const champs = [];
    const valeurs = [];

    if (req.body.titre != undefined) {
      champs.push("titre = ?");
      valeurs.push(req.body.titre);
    }
    if (req.body.couverture_url != undefined) {
      champs.push("couverture_url = ?");
      valeurs.push(req.body.couverture_url);
    }

    try {
      await pool.query(
        `UPDATE conversations SET ${champs.join(
          ", "
        )} WHERE id_conversation = ?`,
        [valeurs, idConversation]
      );
      const [rows] = await pool.query(
        "SELECT * FROM conversations WHERE id = ?",
        [idConversation]
      );
      return res.status(204);
    } catch (error) {
      return res.status(500).json({
        erreur: error.message,
        message: "une erreur au niveau de la base de données est survenue",
      });
    }
  }
);

router.get(
  "/:id_conversation/participants",
  authentifierToken,
  verifierAccesConversation,
  async (req, res) => {
    const { id_conversation } = req.params;

    try {
      const sqlParticipants = `
        SELECT m.id, m.pseudo, pc.role, pc.date_joined
        FROM participants_conversations pc
        INNER JOIN membres m ON pc.id_membre = m.id
        WHERE pc.id_conversation = ?
        ORDER BY pc.date_joined ASC
      `;

      const [resultats] = await pool.query(sqlParticipants, [id_conversation]);

      res.status(200).json(resultats);
    } catch (err) {
      res.status(500).json({
        message: "Une erreur au niveau de la base de données est survenue",
        erreur: err.message,
      });
    }
  }
);

router.post(
  "/:id_conversation/participants",
  authentifierToken,
  verifierAccesConversation,
  async (req, res) => {
    const idConversation = req.params.id_conversation;
    const nouvParticipants = req.body.participants; //[]
    const valeursParticipants = nouvParticipants.map((p) => [
      idConversation,
      p.id,
      p.role,
    ]);
    const sql =
      "INSERT INTO participants_conversations (id_conversation, id_membre, role) VALUES ?";
    try {
      await pool.query(sql, [valeursParticipants]);
      return res
        .status(201)
        .json({
          message: "de nouveaux participants prennent part à la conversation!",
        });
    } catch (error) {}
  }
);

// Rechercher des messages par contenu
router.get("/search", async (req, res) => {
  const { query } = req.query; // Requête à rechercher
  const limite = parseInt(req.query.limite, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const sqlSearch = `
        SELECT * FROM messages_texte
        WHERE message LIKE ? 
        LIMIT ? OFFSET ?
      `;
    const [resultats] = await pool.query(sqlSearch, [
      `%${query}%`,
      limite,
      offset,
    ]);

    res.status(200).json(resultats);
  } catch (err) {
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: {
        message: err.message,
        sql: err.sql,
      },
    });
  }
});

module.exports = router;
