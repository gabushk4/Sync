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
const { formaterDateVersClient } = require("../../functions/formaterDateVersClient");
const { DateTime } = require("luxon");

// Créer un nouveau message
router.post("/", authentifierToken, async (req, res) => {
  const { id_conversation, message, temps_envoi } = req.body;
  const id_auteur = req.membre.id;
  console.log('body', id_conversation, message, temps_envoi)
  try {
    const idPubliqueMessTexte = await generateIdWithQueue(10, true, true,'T', 'messages_texte')
    const [idPriveConv] = await pool.query('SELECT id FROM conversations WHERE id_publique = ?', [id_conversation])
    console.log('id privé conversation', idPriveConv[0].id)
    const [insertMessage] = await pool.query(
      "INSERT INTO messages_texte (id_conversation, id_auteur, id_publique, message, temps_envoi) VALUES (?, ?, ?, ?, ?)",
      [idPriveConv[0].id, id_auteur, idPubliqueMessTexte, message, temps_envoi]
    );
    console.log('message insere')
    const [responseParticipantsConversation] = await pool.query(
      `SELECT push_token, m.id, m.pseudo, c.titre
       FROM membres m
       INNER JOIN participants_conversations pc ON m.id = pc.id_membre
       INNER JOIN conversations c ON pc.id_conversation = c.id
       WHERE c.id = ?`,
      [idPriveConv[0].id]
    );

    const [resultPseudoAuteur] = await pool.query(
      "SELECT pseudo FROM membres WHERE id = ?",
      [id_auteur]
    );
    const pseudoAuteur = resultPseudoAuteur[0]?.pseudo || "quelqu'un";
    console.log('reponse participants', responseParticipantsConversation)
    const participantsMap = [];
    responseParticipantsConversation.forEach(ligne => {
      if (!ligne.pseudo) return;
      participantsMap.push({ id: ligne.id, pseudo: ligne.pseudo });
    });
    console.log('participants', participantsMap)
    const titre =
      (responseParticipantsConversation[0]?.titre?.trim()) ||
      participantsMap.filter(p => p.id !== id_auteur).map(p => p.pseudo).join(", ") ||
      "toi";
    console.log('titre', titre)
    
    for (const ligne of responseParticipantsConversation) {
      if (ligne.id == id_auteur) continue;
      await envoyerNotification(
        ligne.push_token,
        "messages",
        pseudoAuteur,
        `${pseudoAuteur}: ${message}`,
        id_auteur,
        ligne.id,
        {
          destination: "conversation",
          conversation_id: id_conversation,
          titre: titre
        },
        insertMessage.insertId
      );
    }
    console.log('notifs envoyés')
    return res.status(201).send();

  } catch (err) {
    return res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: err,
    });
  }
});

// Modifier un message existant
router.patch("/:idmessage_publique", authentifierToken, async (req, res) => {
  const idMessagePublique = req.params.idmessage_publique;
  const updates = req.body;
  const idMembre = req.membre.id;
  const champsAutorises = ['message', 'statut']
  const updatesFiltrees = Object.fromEntries(
    Object.entries(updates).filter(([key]) => champsAutorises.includes(key))
  );
  try {
    if (Object.keys(updatesFiltrees).length === 0) {
      return res.status(400).json({ message: "Aucun champ à mettre à jour" });
    }

    const [auteur] = await pool.query(
      "SELECT id_auteur FROM messages_texte WHERE id_publique = ?",
      [idMessagePublique]
    );

    if (auteur[0].id_auteur !== idMembre) {
      res
        .status(401)
        .json({ message: "Vous n'êtes pas l'auteur de ce message" });
    }

    const fields = Object.keys(updatesFiltrees).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updatesFiltrees), idMessagePublique]

    const [resultat] = await pool.query(
      `UPDATE messages_texte SET ${fields} WHERE id_publique = ?`,
      values
    );
    if (resultat.affectedRows === 0)
      return res.status(404).json({ message: "Message non trouvé" });

    res.status(200).json({ message: "Message mis à jour avec succès", mises_a_jours: updatesFiltrees});
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
router.delete("/:idmessage_publique", authentifierToken, async (req, res) => {
  const idMessage = req.params.idmessage_publique;
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
router.get("/conversations", authentifierToken, async (req, res) => {7
  const limite = parseInt(req.query.limite, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const idMembre = req.membre.id;
  try {
    const [conversations] = await pool.query(
      `
      SELECT c.id, c.id_publique, c.titre, c.couverture_url
      FROM conversations c
      INNER JOIN participants_conversations pc ON c.id = pc.id_conversation
      WHERE pc.id_membre = ?
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
      `,
      [idMembre, limite, offset]
    );

    if (conversations.length === 0) {
      return res.status(200).json({ message:'aucune conversation trouvée', conversations: [] });
    }

    const conversationIds = conversations.map(c => c.id);

    // 2️⃣ Récupérer les participants pour les titres et couvertures vides
    const [participants] = await pool.query(
      `
      SELECT pc.id_conversation, m.pseudo, m.id_publique, i.url
      FROM participants_conversations pc
      INNER JOIN membres m ON pc.id_membre = m.id
      LEFT JOIN images i ON m.id_fp = i.id
      WHERE pc.id_conversation IN (?) AND pc.id_membre != ?
      `,
      [conversationIds, idMembre]
    );
    // Group participants par conversation
    const participantsMap = {};
    participants.forEach(p => {
      if (!p.id_conversation) return; 
      if (!participantsMap[p.id_conversation]) participantsMap[p.id_conversation] = [];
      participantsMap[p.id_conversation].push({ id:p.id_publique, pseudo: p.pseudo, fp_url: p.url });
    });

    // 3️⃣ Récupérer le dernier message de chaque conversation
    const [lastMessages] = await pool.query(
      `
      SELECT m.id_conversation, m.message, m.temps_envoi
      FROM messages_texte m
      INNER JOIN (
        SELECT id_conversation, MAX(temps_envoi) AS dernier_timestamp
        FROM messages_texte
        WHERE id_conversation IN (?)
        GROUP BY id_conversation
      ) AS last_msgs
      ON m.id_conversation = last_msgs.id_conversation
      AND m.temps_envoi = last_msgs.dernier_timestamp
      `,
      [conversationIds]
    );

    const lastMessagesMap = {};
    lastMessages.forEach(msg => {
      lastMessagesMap[msg.id_conversation] = {
        message: msg.message,
        temps_envoi: formaterDateVersClient(msg.temps_envoi)
      };
    });

    // 4️⃣ Construire la réponse finale
    const reponse = conversations.map(conv => {
      const participants = participantsMap[conv.id] || [];
      const titre = conv.titre || 
        participants
          .filter(p => p.id !== idMembre)
          .map(p => p.pseudo)
          .join(", ") ||
          'toi';
      const couverture_url = conv.couverture_url ?? participants[0]?.fp_url ?? null;

      return {
        id: conv.id_publique,
        titre,
        couverture_url,
        dernier_message: lastMessagesMap[conv.id] || null,
        participants // tu peux aussi renvoyer la liste complète si utile
      };
    });

    res.status(200).json({ cacheable: true, conversations: reponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Une erreur au niveau de la base de données est survenue",
      erreur: { message: err.message, sql: err.sql }
    });
  }
});

// Récupérer tous les messages d'une conversation avec limite et offset
router.get("/:id_conversation", authentifierToken, verifierAccesConversation, async (req, res) => {
    const limite = parseInt(req.query.limite, 25) || 25;
    const offset = parseInt(req.query.offset, 0) || 0;
    const idPriveConv = req.id_prive_conversation
    const dernierTimestamp = req.query.dernier_timestamp || DateTime.now()

    const sqlMessages = `
        SELECT mess.id_publique as message_id_publique, mess.message, mess.temps_envoi, m.id_publique as auteur_id_publique
        FROM messages_texte mess
        INNER JOIN membres m ON mess.id_auteur = m.id
        WHERE mess.id_conversation = ?
        ORDER BY mess.temps_envoi DESC
        LIMIT ? OFFSET ?
    `;

    try {
      const [resultats] = await pool.query(sqlMessages, [
        idPriveConv,
        limite,
        offset,
      ]);

      if (resultats.length === 0) {
        return res.status(200).json({
          cacheable: true,
          messages: []
        });
      }

      if(dernierTimestamp == resultats[0].temps_envoi){
        console.log('aucuns messages retournés')
        return res.status(200).json({
          cacheable: true,
          messages:[]
        })
      }
      console.log('nouv messages!!!')
      const reponse = resultats.map((r) => {        
        return {
          id: r.message_id_publique,
          message: r.message,
          temps_envoi: formaterDateVersClient(r.temps_envoi),
          id_auteur: r.auteur_id_publique,
        };
      });

      return res.status(200).json({
        cacheable: true,
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

router.patch("/conversations/:id_conversation", authentifierToken, verifierAccesConversation, async (req, res) => {
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

router.delete("/conversations/:id_conversation", authentifierToken, verifierAccesConversation, async (req, res, next)=>{
  const idConversation = req.id_prive_conversation

  try {
    await pool.query('DELETE FROM conversations WHERE id = ?', idConversation)
    res.status(200).json({
      message:"conversation supprimée"
    })
  } catch (error) {
    res.status(500).json({
      message:"une erreur au niveau de la base de données est survenue",
      erreur:error
    })
  }
})

router.post( "/:id_conversation/participants", authentifierToken, verifierAccesConversation, async (req, res) => {
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
