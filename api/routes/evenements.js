//paquets npm
const express = require('express')
const router = express.Router()
require('dotenv').config()

//fonctions
const {authentifierToken} = require('../../functions/authenticate')
const { generateId } = require('../../functions/idGen')
const FactoriserTimestamp = require('../../functions/factoriserTimestamp')


//PDO
let { pool } = require('../../PDO')


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
    let limite = req.query.limite || 5
    let offset = req.query.offset || 0
    const now = new Date()
    let debut = req.query.debut || FactoriserTimestamp(now.toISOString())
    now.setHours(now.getHours() + 2)
    let fin = req.query.fin || FactoriserTimestamp(now.toISOString())
    var sql = ` SELECT * 
        FROM evenements e INNER JOIN participants p ON e.id = p.id_evenement 
        WHERE (p.id_membre = ?) 
        AND (debut >= ?)
        AND (fin <= ?)
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
///Insert un objet 'evenement' dans la table 'evenements' et permet la redirection vers '/evenements/:idevenement' pour une éventuelle modification
///req.body: {participants}
router.post('/', authentifierToken, async (req, res, next) => {
    let idevenement = await generateId(6,true,true,`E`)
    console.log(idevenement)
    let sql = `INSERT INTO evenements(id) VALUES(?)`
    try {
        await pool.query(sql, idevenement)

        let participants = req.body.participants /*participants: [{ id: x, privilege:x }]*/
        console.log(participants.length)

        if(participants.length > 0){
            let inserts = []
            let values = []
            sql = 'INSERT INTO participants(id_evenement, id_membre, privilege) VALUES'
            for(let i = 0; i < participants.length; i++){
                inserts.push('(?, ?, ?)')
                values.push(idevenement, participants[i].id_membre, participants[i].privilege)
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
        let idMembre = req.membre.id 
        let limiteAmis = req.query.limiteAmi || 3
        let offsetAmis = req.query.offset || 0
        let debut = req.query.debut || '1978-01-01 00:00:00'
        let fin = req.query.fin || '2035-12-31 23:59:59'
        
        // Récupérer les amis du membre
        const amisSql = `
        SELECT a.id_ami AS id_ami 
        FROM amis a 
        WHERE a.id_membre = ? 
        UNION
        SELECT a.id_membre AS id_ami 
        FROM amis a 
        WHERE a.id_ami = ? 
        LIMIT ? OFFSET ?
        `;

        const [resultatsAmis] = await pool.query(amisSql, [idMembre, idMembre, limiteAmis, offsetAmis]);
        const idsAmis = resultatsAmis.map((ami) => ami.id_ami);

        // Vérifiez s'il y a des amis avant de continuer
        if (idsAmis.length > 0) {
            const idsAmisPlaceholders = idsAmis.map(() => '?').join(',');
            const evenementsSql = `
                SELECT 
                    p.id_membre, 
                    p.id_evenement, 
                    e.debut, 
                    e.fin, 
                    e.regle_recurrence 
                FROM evenements e 
                INNER JOIN participants p ON e.id = p.id_evenement 
                WHERE p.id_membre IN (${idsAmisPlaceholders}) 
                AND e.debut >= ? 
                AND e.fin <= ? 
                ORDER BY e.debut
            `;
            const [resultatsEvenements] = await pool.query(evenementsSql, [...idsAmis, debut, fin]);
            const evenements = resultatsEvenements.map((r) => {
                return {
                    id_ami: r.id_membre,
                    evenement: {
                        debut: r.debut,
                        fin: r.fin,
                        regle_recurrence: r.regle_recurrence,
                        couleur: "à venir",
                        url: {
                            method: 'GET',
                            string: `/evenements/${r.id_evenement}`
                        }
                    }
                };
            });

            // Retourner les résultats au client
            res.status(200).json({
                compte: resultatsEvenements.length,
                cacheable: true,
                evenements: evenements
            });
        } else {
            // Aucun ami trouvé
            res.status(200).json({
                compte: 0,
                cacheable: true,
                evenements: []
            });
        }
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
              erreur: err.message
          })
    }
})

router.get('/:idevenement', authentifierToken, async (req, res, next) => {
    const sqlEvenement = `SELECT e.*, p.* 
                      FROM evenements e 
                      INNER JOIN participants p ON e.id = p.id_evenement 
                      WHERE e.id = ?`; // Modifier la requête pour récupérer un événement par son ID

    try {
        const resultat = await pool.query(sqlEvenement, [req.params.idevenement]);

        // Vérifie si des résultats ont été retournés
        if (resultat.length === 0) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }

        // Vérifie si l'utilisateur a accès à l'événement
        const participant = resultat.find(r => r.id_membre === req.params.id_membre);
        
        if (!participant) {
            return res.status(401).json({
                message: "Vous n'avez pas accès à cet évènement"
            });
        }

        // Extraction des détails de l'événement
        const evenement = resultat[0]; // Puisque nous avons trouvé au moins un événement

        const participants = resultat.map((r) => ({
            pseudo: r.id_membre,
            droit: r.privilege,
            fp_url: r.fp_url
        }));

        res.status(200).json({
            titre: evenement.titre,
            description: evenement.description,
            debut: evenement.debut,
            fin: evenement.fin,
            participants: participants
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la récupération des événements." });
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
                privilege: r.privilege,
                fp_url: r.fp_url
            }  
        })
        res.status(200).json({
            cacheable: true,
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
        const idEvenement = req.params.idevenement;
        const { idMembre, privilege } = req.body; 

        // Validation des données d'entrée
        if (!idMembre || !privilege) {
            return res.status(400).json({ message: 'idMembre et privilege sont requis.' });
        }

        // Vérifiez si l'événement existe
        const [evenement] = await pool.query('SELECT * FROM evenements WHERE id = ?', [idEvenement]);
        if (evenement.length === 0) {
            return res.status(404).json({ message: 'Événement non trouvé.' });
        }

        // Ajout du participant
        const sql = `INSERT INTO participants (id_membre, id_evenement, privilege) VALUES (?, ?, ?)`;
        await pool.query(sql, [idMembre, idEvenement, privilege]);

        res.status(201).json({ 
            message: 'Participant ajouté avec succès.',
            liste_participants: {
                method: 'GET',
                url: `/evenements/${req.params.idevenement}/participants`
            } 
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du participant:', error);
        res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout du participant.' });
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