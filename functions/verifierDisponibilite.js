let {pool} = require('../PDO.js')
 
async function verifierDisponibilite(req, res, next){
    const debut = req.debutSQL
    const fin = req.finSQL
    const sql = `SELECT e.*, m.fuseau_horaire
        FROM evenements e
        LEFT JOIN participants_evenements p ON p.id_evenement = e.id
        LEFT JOIN membres m ON m.id = p.id_membre
        WHERE (
            e.createur_id = ?
            OR p.id_membre = ?
        )
        AND (
            (e.debut <= ? AND e.fin > ?)
            OR (e.debut < ? AND e.fin >= ?)
            OR (e.debut >= ? AND e.fin <= ?)
        )`
    try {
        const [reponse] = await pool.query(sql, [req.membre.id, req.membre.id, debut, debut, fin, fin, debut, fin])
        //console.log(reponse)
        if(reponse.length > 0){
            return res.status(409).json({
                message: 'Un évènement existe déjà',
                evenement:{
                    id_publique: reponse[0].id_publique,
                    fuseau_horaire: reponse[0].fuseau_horaire
                }
              })
        }
            
        next()
    } catch (err) {
        return res.status(500).json({
            erreur: err,
            message: err.message
        })
        
    }
}  

module.exports = {verifierDisponibilite}