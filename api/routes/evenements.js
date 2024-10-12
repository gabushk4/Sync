//paquets npm
const express = require('express')
const router = express.Router()
require('dotenv').config()

//fonctions
const authentifierToken = require('../../functions/authenticate')
const { generateId } = require('../../functions/idGen')
const { json } = require('body-parser')


//PDO
let { pool } = require('../../PDO')
const FactoriserTimestamp = require('../../functions/factoriserTimestamp')

//Pour developpement seulement
router.get('/all', async (req, res, next) => {
    let sql = `SELECT * FROM evenements`
    try {
        
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        })
    }
})
///retourne plusieurs objets 'evenement' selon un idmembre donné par un JWT 
/// res.json: {compte|evenement[id|titre|description|debut|fin|reccurence]}
/// req.query: {limite=5|offset=0|debut|fin}
router.get('/', authentifierToken, async (req, res, next) => {
    let idProprietaire = req.membre.id
    console.log(idProprietaire)
    let limite = req.query.limite || 5
    let offset = req.query.offset || 0
    let debut = req.query.debut || FactoriserTimestamp(new Date(Date.now()).toISOString())
    let fin = req.query.fin || FactoriserTimestamp(new Date(Date.now() + 2).toISOString())
    var sql = `SELECT * 
        FROM evenements 
        WHERE (idproprietaire = ?) 
        AND (debut >= timestamp?)
        AND (fin <= timestamp?)
        LIMIT ? OFFSET ?`
    try {        
        const [resultats] = await pool.query(sql, [idProprietaire, debut, fin, limite, offset])
        const compte = resultats.length
        const reponse = resultats.map((r) => {
            return {
                id_evenement: r.id,
                titre: r.titre,
                description: r.description,
                debut: r.debut,
                fin: r.fin,
                recurrence: r.regle_recurrence,
                url: {
                    method: get,
                    string: `/evenements/${idevenement}`
                }
            }
        })
        res.status(200).json({
            compte: compte,
            evenements: {
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
///Insert un objet 'evenement' dans la table 'evenements' et redirect vers '/evenements/:idevenement'
///req.body: {titre|description|debut|fin|participants|reccurence}
router.post('/', authentifierToken, async (req, res, next) => {
    try {
        let inserts, values = []

        let idevenement = await generateId(6,true,true,`E`)
        console.log(idevenement)
        let sql = `INSERT INTO evenements(id) VALUES(?)`
        await pool.query(sql, idevenement)

        let [participants] = req.body.participants /*participants: [{ id: x, privilege:x }]*/

        if(participants.length > 0){
            sql = 'INSERT INTO participants(id_evenement, id_membre, privilege) VALUES'
            for(let i = 0; i < participants.length; i++){
                inserts.push('(?, ?, ?)')
                values.push(idevenement, participants[i].id, participants[i].privilege)
            }
            sql += inserts.join(', ')
            await pool.query(sql, values)
        }

        res.status(201).json({
            message: "évènement créé", 
            url: {
                method: "GET",
                string: `/evenements/${idevenement}`
            }
        })
    } catch (err) {   
        res.status(500).json({
            reponse: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: {
                message: err.message,
                sql: err.sql
            }
          })
    }
})

router.get('/amis', authentifierToken, async (req, res, next) => {
    try {
        let idMembre = req.params.id_membre 
        let limite = req.query.limite || 20
        let offset = req.query.offset || 0
        let debut = req.query.debut
        let fin = req.query.fin
        var sql = 
        `SELECT p.id_membre, p.id_evenement, e.debut, e.fin, e.regle_recurrence
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
        const [resultats] = await pool.query(sql, [idMembre, idMembre, debut, fin, limite, offset])
        const reponse = resultats.map((r) => {
            return{
                    id_ami: r.id_membre, 
                    evenement: {
                        debut: r.debut,
                        fin: r.fin, 
                        regle_recurrence: r.regle_recurrence, 
                        couleur: "à venir",
                        url: 
                            {
                                method: get,
                                string: `/evenements/${r.id_evenement}`
                            }
                    }
                }
        })
        res.status(200).json({
            compte: resultats.length,
            cacheable: true,
            evenements: {
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

router.get('/:idevenement', authentifierToken, async (req, res, next) => {
    const sqlEvenement = `SELECT * FROM evenements e 
    INNER JOIN participants p ON e.id = p.id_evenement 
    WHERE id_membre IN (SELECT id_membre FROM participants WHERE id_evenement = ?)`
    try {
        const resultat = await pool.query(sqlEvenement, [req.params.idevenement])

        if(resultat.id_membre != req.params.id_membre){
            res.status(401).json({
                message: "vous n'avez pas accès à cet évènement"
            })
        }
        else{
            const participants = resultat.map((r) => {
                return{
                    pseudo: r.pseudo,
                    droit: r.droit,
                    fp_url: r.fp_url
                }
            })
            res.status(200).json({
                titre: resultat.titre,
                description: resultat.description,
                debut: resultat.debut,
                fin: resultat.fin,
                participants: participants
            })
        }
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
              erreur: err.message
          })
    }
    
})

router.patch('/:idevenement', async (req, res, next) => {
    const id = req.params.idevenement;
    const updates = req.body;
  
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Aucun champ à mettre à jour" });
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
    const values = Object.values(updates);

    try {
        //Mettre à jour l'évènement
        values.push(id)
        let sql = `UPDATE evenements SET ${fields} WHERE id = ?`;
        await pool.query(sql, values)
    
        //Retourner l'évènement mis à jour
        sql = `SELECT * FROM evenements WHERE id = ?`
        const [resultat] = await pool.query(sql, [id])
        const r = resultat[0]
        res.status(201).json({
          message: 'Évènement mis à jour',
          mises_à_jours: updates,
          evenement: {
            titre: r.titre,
            description: r.description,
            debut: r.debut,
            fin: r.fin, 
            regle_recurrence: r.regle_recurrence
          }
        })
      }
      catch(err){
        res.status(500).json({
          message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        })
      }
})

router.delete('/:idevenement', async (req, res, next) => {
    const id = req.params.idevenement
    var sql = "DELETE FROM evenements WHERE id = ?";
  
    try {
      await pool.query(sql, [id])
      res.status(200).json({
        message: 'Évènement supprimé'
      })
    } catch (err) {
      res.status(500).json({
        message: 'Une erreur au niveau de la base de donnée est survenue',
        erreur: err.message
      })
    }
})

router.get('/:idevenement/participants', authentifierToken, async (req, res, next) => {
    try {
        const limite = req.query.limite || 10
        const offset = req.query.offset || 0
        const sqlParticipants = `
            SELECT m.pseudo, m.fp_url, p.privilege, e.id
            FROM evenements e
            INNER JOIN participants p ON e.id = p.id_evenement
            INNER JOIN membres m ON p.id_membre = m.id
            WHERE e.id = ?
            LIMIT ? OFFSET ? 
        `
        const [resultats] = await pool.query(sqlParticipants, [req.params.idevenement, limite, offset])  
        const reponse = resultats.map((r) => {
            return{
                pseudo: r.pseudo,
                droit: r.privilege,
                fp_url: r.fp_url
            }  
        })
        res.status(200).json({
            id_evenement: req.params.idevenement,
            participants: [
                reponse
            ]
        })
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur:{
                message: err.message,
                sql: err.sql
            } 
        })
    }
})

router.post('/:idevenement/participants', async (req, res, next) =>{
    try {
        
    } catch (error) {
        
    }
})

router.patch('/:idevenement/participants', async (req, res, next) => {
    const idMembre = req.params.id_membre;
    const updates = req.body;
  
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Aucun champ à mettre à jour" });
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
    const values = Object.values(updates);
    
    try{
        //Mettre à jour la liste de participants
        values.push(id)
        let sql = `UPDATE participants SET ${fields} WHERE id_membre = ?`;
        await pool.query(sql, values)

        //Retourner la liste de participants mise à jour
        sql = `SELECT * FROM membres WHERE id = ?`
        const [resultat] = await pool.query(sql, [idMembre])
        const r = resultat[0]
        res.status(201).json({
            message: 'Un participant mis à jour',
            mises_à_jours: updates,
            Participant: {
                idMembre: r.id_membre,
                droit: r.droit
            }
        })
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        })
    }
})

router.delete('/:idevenement/participants', async (req, res, next) => {
    const idMembre = req.params.id_membre
    var sql = "DELETE FROM participants WHERE id_membre = ?";
  
    try {
      await pool.query(sql, [idMembre])
      res.status(200).json({
        message: 'Participant supprimé'
      })
    } catch (err) {
      res.status(500).json({
        message: 'Une erreur au niveau de la base de donnée est survenue',
        erreur: err.message
      })
    }
})

module.exports = router