const { response } = require('express')
const jwt = require('jsonwebtoken')
const {pool} = require('../PDO')
require('dotenv').config()

function authentifierToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.status(401).json({ message: 'Un token est necéssaire'})
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, membre) => {
        if(err) return res.status(403).json({message: 'Votre token n\'est plus valide', token: token})
        
        req.membre = membre
        //console.log('authentifier token', req.membre)
        next()
    })
}

async function authentifierRefreshToken(req, res, next){
    const { refresh_token } = req.body
    if(!refresh_token) return res.status(401).json({ message: 'Refresh token requis' })
    
    jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET, async (err, payload) => {
        
      
        if(err) return res.status(403).json({ message: 'Refresh token invalide' })

        // Optionnel : vérifier en base que le token n'est pas révoqué et correspond au device
        req.refresh = payload
        next()
    })
}

// Middleware pour vérifier que l'utilisateur a accès à la conversation
async function verifierAccesConversation(req, res, next) {
    const membreId = req.membre.id; // ID du membre récupéré via authentifierToken()
    const { id_conversation } = req.params;
  
    try {
      const sqlParticipants = `
        SELECT pc.id_membre
        FROM participants_conversations pc
        WHERE pc.id_conversation = ?
      `;
  
      const [resultats] = await pool.query(sqlParticipants, [id_conversation]);
      const idMembres = resultats.map((row) => row.id_membre);
  
      // Vérification si l'ID du membre fait partie des participants
      if (idMembres.includes(membreId)) {
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
  const membreId = req.membre.id
  const {idevenement} = req.params

  try {
    const [reponse] = await pool.query(`
      SELECT 1
        FROM evenements e
        WHERE e.id_publique = ?
          AND (
            EXISTS (SELECT 1 FROM participants_evenements pe WHERE pe.id_evenement = e.id AND pe.id_membre = ?)
            OR EXISTS (SELECT 1 FROM invitations_evenement ie WHERE ie.id_evenement = e.id AND ie.id_invite = ?)
          )
        LIMIT 1;`, [idevenement, membreId, membreId])
    if(reponse.length > 0) {
      req.membre = req.membre
      return next()
    }    
  } catch (error) {
    req.membre = undefined
    return res.status(403).json({
      message:'accès a l\'évènement renié'
    })
  }
}

module.exports = {
  authentifierToken,
  authentifierRefreshToken,
  verifierAccesConversation,
  verifierAccesEvenement
}