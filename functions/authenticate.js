const jwt = require('jsonwebtoken')
require('dotenv').config()

function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if(token == null) return res.send(401).json({ message: 'Un token est necéssaire'})
    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, membre) => {
        if(err) return res.send(403).json({message: 'Votre token n\'est plus valide'})
        
        req.membre = membre
        next()
    })
}

module.exports = authenticateToken