const express = require('express')
const router = express.Router()
let { pool } = require('../../PDO')
const authenticateToken = require('../../functions/authenticate')
require('dotenv').config()

//Pour developpement seulement
router.get('/', async (req, res, next) => {
    
})

router.get('/me', authenticateToken, async (req, res, next) => {
    try {
        let idProprietaire = req.membre.id
        let limite = req.query.limite
        let offset = req.query.offset
        let debut = req.query.debut
        let fin = req.query.fin
        var sql = ` SELECT * 
        FROM evenements 
        WHERE (idmembre = ?) 
        AND (debut >= timestamp?)
        AND (fin <= timestamp?)
        LIMIT ? OFFSET ?`
        const [resultats] = await pool.query(sql, [idProprietaire, debut, fin, limite, offset])
        const count = resultats.length
        const reponse = resultats.map((r) => {
            return {
                id_evenement: r.id,
                titre: r.titre,
                debut: r.debut,
                fin: r.fin,
                recurrence: r.regle_recurrence
            }
        })
        res.status(200).json({
            count: count,
            events: {
                reponse
            }
        })
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
              erreur: err.message
          })
    }
})

router.post('/', async (req, res, next) => {

})

router.get('/amis', async (req, res, next) => {
    try {
        let idMembre = 'U001' 
        let limite = req.query.limite || 20
        let offset = req.query.offset || 0
        let debut = req.query.debut
        let fin = req.query.fin
        var sql = 
        `SELECT p.id_membre, e.debut, e.fin, e.regle_recurrence, m.fp_url, m.temps_creation
            FROM evenements e 
            INNER JOIN participants p ON e.id = p.id_evenement
            INNER JOIN membres m ON p.id_membre = m.id
            WHERE p.id_membre IN 
            (
                SELECT a.id_ami as id_membre
                    FROM amis a
                    INNER JOIN membres m ON a.id_ami = m.id
                    WHERE a.id_membre = ?
                UNION 
                SELECT a.id_membre as id_membre
                    FROM amis a 
                    INNER JOIN membres m ON a.id_membre = m.id
                    WHERE a.id_ami = ?
            )
            AND (debut >= timestamp?) 
            AND (fin <= timestamp?)
            ORDER BY m.temps_creation
            LIMIT ? OFFSET ?`
        const [reponses] = await pool.query(sql, [idMembre, idMembre, debut, fin, limite, offset])
        const reponse = reponses.map((r) => {

        })
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
              erreur: err.message
          })
    }
})

router.get('/:idevenement', async (req, res, next) => {

})

router.patch('/:idevenement', async (req, res, next) => {

})

router.delete('/:idevenement', async (req, res, next) => {

})

router.get('/:idevenement/participants', async (req, res, next) => {

})

router.patch('/:idevenement/participants', async (req, res, next) => {

})

router.delete('/:idevenement/participants', async (req, res, next) => {

})

module.exports = router