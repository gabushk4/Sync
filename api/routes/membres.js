//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')

//fonctions
const {generateSalt, hash, compare} = require('../../functions/pass')
const { generateId } = require('../../functions/idGen')
require("dotenv").config();
const {authentifierToken}  = require('../../functions/authenticate')
const FactoriserTimestamp = require('../../functions/factoriserTimestamp')

//PDO
let { pool } = require('../../PDO');

//Pour developpement seulement
/* router.get("/", async (req, res, next) => {
  var sql = "SELECT * FROM membres";
  
  try {
    const [resultats] = await pool.query(sql)
    const membres = resultats.map((r) => {
        const date = new Date(r.temps_creation / 1)
        return {
          id_membre: r.id,
          pseudo: r.pseudo,
          telephone: r.telephone,
          fp_url: r.fp_url, 
          temps_creation: date.toLocaleString()
        }
    })
    res.status(200).json({
      compte: resultats.length,
      membres
     })
  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message
    })
  }
  
})  */

router.post('/connexion', async (req, res, next) => {
  let sqlMdp = `
    SELECT mot_de_passe, salt  
      FROM membres m 
      INNER JOIN mot_de_passes mp 
        ON m.id = mp.id_membre
      WHERE m.id = ?
  `
  let sqlPseudo = `
    SELECT id FROM membres WHERE pseudo = ?
  `
  const pseudo = req.body.pseudo
  const mdp = req.body.mot_de_passe
  try {
    const  [resultatPseudo] = await pool.query(sqlPseudo, [pseudo])
    if(resultatPseudo[0].length < 1 ) return res.status(401).json({message: 'Authentification échouée'})
    const idMembre = resultatPseudo[0].id
    
    const [resultatMdp] = await pool.query(sqlMdp, [idMembre])
    const hash = {
      hashedPass: resultatMdp[0].mot_de_passe,
      salt: resultatMdp[0].salt
    }
    if(!compare(mdp, hash)) return res.status(401).json({message:'Authentification échouée'})
    
    const membre = {
      id: idMembre,
      pseudo: pseudo
    }
    
    const accessToken = jwt.sign(membre, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "24h"})
    res.json({ 
      cacheable: true, 
      acces_token: {
        token: accessToken,
        timestamp_serveur: Date.now(),
        membre: membre
      }
    })

  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message})
  }
  
})

router.post("/inscription", async (req, res, next) => {
  try {
    let idmembre = await generateId(6,true,true,"M");
    let salt = generateSalt(14);    
    let { hashedPass: mdpHash } = hash(req.body.mot_de_passe, salt);
    let date = new Date(Date.now())
    
    let temps_creation = FactoriserTimestamp(date.toISOString())

    if(temps_creation == undefined)
      throw err
    
    // Sauvegarde du membre
    var sql = "INSERT INTO membres (id, pseudo, mot_de_passe, telephone, temps_creation, decalage_utc) VALUES (?, ?, ?, ?, ?, ?)";
    await pool.query(sql, [idmembre, req.body.pseudo, mdpHash, req.body.telephone, temps_creation, req.body.decalage_utc])

    // Sauvegarde du salt
    sql = "INSERT INTO mot_de_passes (id_membre, salt) VALUES (?, ?)";
    await pool.query(sql, [idmembre, salt]); 

    // Querie pour reponse
    sql = "SELECT * FROM membres WHERE id = ?"
    const [resultat] = await pool.query(sql, [idmembre])
    const r = resultat[0]
    if (resultat.length > 0) {
      res.status(201).json({
        message: "Membre créé",
        membre: { 
          id: r.id,
          pseudo: r.pseudo,
          mot_de_passe: r.mot_de_passe,
          telephone: r.telephone,
          temps_creation_utc: temps_creation,
          decalage_utc: r.decalage_utc
        }
      });
    } else {
      throw new Error("Membre introuvable après sa création");
    }
  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message
    })
  }
})

router.get("/", authentifierToken, async (req, res, next) => {
  const id = req.membre.id
  var sql = `SELECT * FROM membres WHERE id = ?`;
  try {
    const [resultat] = await pool.query(sql, [id])

    if (resultat.length < 1){
      res.status(404).json({
        message: `Rien n'a été trouvé avec le id: ${id}`
      })
    }

    const r = resultat[0]
    const date = new Date(r.temps_creation / 1)
    res.status(200).json({
      pseudo: r.pseudo,
      telephone: r.telephone,
      fp_url: r.fp_url,
      temps_creation: date.toLocaleString()
    })
  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message
    })
  }
}) 

router.patch("/:idmembre", async (req, res, next) => {
  const id = req.params.idmembre;
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Aucun champ à mettre à jour" });
  }

  const fields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
  
  if (fields.includes('mot_de_passe')){
    var mdp = updates.mot_de_passe
    let salt = generateSalt(14);    
    let { hashedPass: mdpHash } = hash(mdp, salt);
    updates.mot_de_passe = mdpHash
    
    try {
      let sql = `UPDATE mot_de_passes SET salt = ? WHERE id_membre = ?`
      await pool.query(sql, [salt, id])
    } catch (err) {
      res.status(500).json({
        message: 'Une erreur au niveau de la base de donnée est survenue',
        erreur: err.message
      })
    }
  }
  
  const values = Object.values(updates);
  try {
    //Mettre à jour le membre
    values.push(id)
    let sql = `UPDATE membres SET ${fields} WHERE id = ?`;
    await pool.query(sql, values)

    //Retourner le membre mis à jour
    sql = `SELECT * FROM membres WHERE id = ?`
    const [resultat] = await pool.query(sql, [id])
    const r = resultat[0]
    res.status(201).json({
      message: 'Membre mis à jour',
      mises_à_jours: updates,
      membre: {
        pseudo: r.pseudo,
        mot_de_passe: r.mot_de_passe,
        telephone: r.telephone,
        fp_url: r.fp_url,
        temps_de_creation: r.temps_de_creation
      }
    })
  }
  catch(err){
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
        erreur: err.message
    })
  }
  
});

router.delete("/:idmembre", async (req, res, next) => {
  const id = req.params.idmembre
  var sql = "DELETE FROM membres WHERE id = ?";

  try {
    await pool.query(sql, [id])
    res.status(200).json({
      message: 'Membre supprimé'
    })
  } catch (err) {
    res.status(500).json({
      message: 'Une erreur au niveau de la base de donnée est survenue',
      erreur: err.message
    })
  }
});

module.exports = router
