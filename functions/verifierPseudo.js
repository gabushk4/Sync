//PDO
let { pool } = require('../PDO');

const verifierPseudo = async (req, res, next)=>{
    try{
        const pseudo = req.body.pseudo || null;
        if(!pseudo)
            return next()
        
        const [rows] = await pool.execute(
            'SELECT id FROM membres WHERE pseudo = ?',
            [pseudo]
        )

        const idConnecte = req.membre?.id || req.membreId
        const existeDeja = rows.find((r) => r.id !== idConnecte)

        if(existeDeja){
            return res.status(400).json({message:'Ce pseudo est déjà pris'})
        }
        
        return next()
    }catch(e){
        console.log(e)
        return res.status(500).json({
            message:'Erreur côté serveur lors de la vérification du pseudo.',
            erreur:e.message
        })
    }
}

module.exports = verifierPseudo