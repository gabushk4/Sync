// signalement.js
const express = require('express');
const router = express.Router();
const pool = require('../../PDO'); // ton pool mysql2
const { authentifierToken } = require('../../functions/authenticate');
const { generateIdWithQueue } = require('../../functions/idGen');

// POST /signalements
router.post('/', authentifierToken, async (req, res) => {
    const { message } = req.body;
    const idMembre = req.user.id; // payload depuis ton authentifierToken

    if (!message) {
        return res.status(400).json({ error: "Message requis" });
    }

    try {
        // 1. Vérifier si une conversation de signalement existe déjà
        const [rows] = await pool.query(
            `SELECT pc.id_conversation
                FROM participants_conversations pc
                INNER JOIN participants_conversations pc2 
                    ON pc.id_conversation = pc2.id_conversation
                WHERE pc.id_membre = ? AND pc2.id_membre = ?`,
            [idMembre]
        );

        let conversationId;

        if (rows.length > 0) {
            conversationId = rows[0].id;
        } else {
            // 2. Créer la conversation si elle n’existe pas
            conversationId = generateIdWithQueue(10, true, true, "C", "conversations")
            const [result] = await pool.query(
                `INSERT INTO conversations (id, id_createur) 
                 VALUES (?)`,
                [conversationId]
            );

            // Ajouter les participants (l’utilisateur + admin)
            await pool.query(
                `INSERT INTO participants_conversations (id_conversation, id_membre) VALUES (?, ?), (?, ?)`,
                [conversationId, idMembre, conversationId, /* idAdmin */ 1]
            );
        }

        const messageId = generateIdWithQueue(10, true, true, 'T', "messages_textes")

        // 3. Insérer le message dans la conversation
        await pool.query(
            `INSERT INTO messages_textes (id_conversation, id_auteur, contenu) VALUES (?, ?, ?)`,
            [conversationId, idMembre, message]
        );

        return res.status(201).json({ success: true, conversationId });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur serveur" });
    }
});

module.exports = router;