// signalement.js
const express = require("express");
const router = express.Router();
const {pool} = require("../../PDO"); // ton pool mysql2
const { authentifierToken } = require("../../functions/authenticate");
const { generateIdWithQueue } = require("../../functions/idGen");
const { DateTime } = require("luxon");
require("dotenv").config();

// POST /signalements
router.post("/", authentifierToken, async (req, res) => {
  const { message, temps_envoi } = req.body;
  const idMembre = req.membre.id; // payload depuis ton authentifierToken
  console.log('temps_envoi'. temps_envoi)
  if (!message) {
    return res.status(400).json({ error: "Message requis" });
  }

  try {
    // 1. Vérifier si une conversation de signalement existe déjà
    const [rows] = await pool.query(
      `SELECT id_conversation as id
        FROM participants_conversations
        WHERE id_membre IN (?, ?) 
        GROUP BY id_conversation
        HAVING COUNT(DISTINCT id_membre) = 2; 
      `,
      [idMembre, process.env.ID_ADMIN]
    );

    let conversationId;

    if (rows.length > 0) {
      conversationId = rows[0].id;
      console.log('conversation existe', rows[0])
    } else {
      console.log('conversation existe pas')
      // 2. Créer la conversation si elle n’existe pas
      let convIdPublique = await generateIdWithQueue(
        10,
        true,
        true,
        "C",
        "conversations"
      );
        const [responseConv] = await pool.query(
          `INSERT INTO conversations (id_publique) VALUES (?)`,
          [convIdPublique]
        )
        conversationId = responseConv.insertId
        // Ajouter les participants (l’utilisateur + admin)
        if(idMembre != process.env.ID_ADMIN){
          await pool.query(
          `INSERT INTO participants_conversations (id_conversation, id_membre) VALUES (?, ?), (?, ?)`,
          [conversationId, idMembre, conversationId, process.env.ID_ADMIN]
          );
        }
        else{
          await pool.query(
          `INSERT INTO participants_conversations (id_conversation, id_membre) VALUES (?, ?)`,
          [conversationId, idMembre]
          );
        }
    }

    const messageId = await generateIdWithQueue(
      10,
      true,
      true,
      "T",
      "messages_texte"
    );

    // 3. Insérer le message dans la conversation
    await pool.query(
      `INSERT INTO messages_texte (id_publique, id_conversation, id_auteur, message, temps_envoi) VALUES (?, ?, ?, ?, ?)`,
      [messageId, conversationId, idMembre, message, temps_envoi]
    );

    return res
      .status(201)
      .json({ message: "Merci de participer à rendre Sync un monde meilleur" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({
        erreur: err,
        message: "une erreur au niveau de la base de donnée est survenue",
      });
  }
});

module.exports = router;
