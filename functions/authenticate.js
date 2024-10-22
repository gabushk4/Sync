const jwt = require('jsonwebtoken')
require('dotenv').config()

function authentifierToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.status(401).json({ message: 'Un token est necéssaire'})
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, membre) => {
        if(err) return res.send(403).json({message: 'Votre token n\'est plus valide'})
        
        req.membre = membre
        return next()
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
  

module.exports = authentifierToken, verifierAccesConversation