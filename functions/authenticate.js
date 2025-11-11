const { response } = require('express')
const jwt = require('jsonwebtoken')
const {pool} = require('../PDO')
require('dotenv').config()

function authentifierToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(!token) return res.status(401).json({ message: 'Un token est necéssaire'})
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, membre) => {
        if(err){
          console.log('erreur authentifier acc. token', err.message)
          return res.status(403).json({
          erreur:err,
          message: 'Votre token n\'est plus valide'})
        }
        
        req.membre = membre
        next()
    })
}

async function authentifierRefreshToken(req, res, next){
    const { refresh_token } = req.body
    if(!refresh_token) return res.status(401).json({ message: 'Refresh token requis' })
    
    jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, async (err, payload) => {
        if(err) return res.status(403).json({ message: 'Refresh token invalide' })

        // Optionnel : vérifier en base que le token n'est pas révoqué et correspond au device
        req.payload = payload
        req.refreshToken = refresh_token
        next()
    })
}

// Middleware pour vérifier que l'utilisateur a accès à la conversation
async function verifierAccesConversation(req, res, next) {
    const membreId = req.membre.id; // ID du membre récupéré via authentifierToken()
    const { id_conversation } = req.params;
  
    try {
      const [reponseIdConv] = await pool.query('SELECT id FROM conversations WHERE id_publique = ?', [id_conversation])
      const sqlParticipants = `
        SELECT pc.id_membre
        FROM participants_conversations pc
        WHERE pc.id_conversation = ?
      `;
  
      const [resultats] = await pool.query(sqlParticipants, [reponseIdConv[0].id]);
      const idMembres = resultats.map((row) => row.id_membre);
      
      // Vérification si l'ID du membre fait partie des participants
      if (idMembres.includes(membreId)) {
        req.id_prive_conversation = reponseIdConv[0].id
        next();  // Le membre a accès à la conversation, on passe au middleware suivant
      } else {
        return res.status(403).json({ message: "Accès refusé à cette conversation" });
      }
    } catch (err) {
      res.status(500).json({
        message: 'Une erreur au niveau de la base de données est survenue',
        erreur: {
          message: err.message,
          sql: err.sql,
        },
      });
    }
}

async function verifierAccesEvenement(req, res, next) {
  const membreId = req.membre.id;
  const idEvenement = req.params.idevenement;
  //console.log('verifier acces evenement membreId', membreId, 'id evenement', idEvenement)
  try {
    const [resultats] = await pool.query(`
      SELECT
        e.createur_id,
        CASE
          WHEN e.createur_id = ? THEN 'editeur'
          WHEN pe.id_membre IS NOT NULL THEN 'lecteur'
          WHEN ie.id_invite IS NOT NULL THEN 'lecteur'
          ELSE 'aucun'
        END AS privilege
      FROM evenements e
      LEFT JOIN participants_evenements pe
        ON pe.id_evenement = e.id AND pe.id_membre = ?
      LEFT JOIN invitations_evenement ie
        ON ie.id_evenement = e.id AND ie.id_invite = ?
      WHERE e.id_publique = ?
      LIMIT 1;
    `, [membreId, membreId, membreId, idEvenement]);
    //console.log('verifier acces evenement', resultats[0])
    if (resultats.length === 0 || resultats[0].privilege === 'aucun') {
      return res.status(403).json({
        message: 'Accès à l’évènement refusé'
      });
    }

    // ✅ on injecte les privilèges directement
    req.accesEvenement = {
      privilege: resultats[0].privilege
    };

    next();

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erreur lors de la vérification des privilèges'
    });
  }
}


module.exports = {
  authentifierToken,
  authentifierRefreshToken,
  verifierAccesConversation,
  verifierAccesEvenement
}