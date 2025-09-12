//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')

//fonctions
const { generateId: generateIdWithQueue } = require('../../functions/idGen')
require("dotenv").config();
const {authentifierToken}  = require('../../functions/authenticate')

//PDO
let { pool } = require('../../PDO');

// 1. Endpoint GET pour récupérer les notifications
router.get('/', authentifierToken, async (req, res) => {    
    const { type } = req.query;

    let query = 'SELECT id, type, id_metier, statut, date_envoi, message, source, payload  FROM notifications WHERE id_receveur = ?';
    let params = [req.membre.id];  // On filtre les notifications par l'id de l'utilisateur
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
  
    try {
      const [rowsNotifs] = await pool.query(query, [params]);
      
      if(rowsNotifs.length == 0){
        return res.status(200).json({
          compte: rowsNotifs.length,
          notifications:[]
        });
      }
      else{
        const [rowIdPubliqueDemandeur] = await pool.query('SELECT id_publique FROM membres WHERE id = ?', [rowsNotifs[0].source])
        
        return res.status(200).json({
          compte: rowsNotifs.length,
          notifications:rowsNotifs.map((r, index)=>{
            return {
              id: r.id,
              type: r.type,
              id_metier: r.id_metier,
              statut: r.statut, 
              date_envoie: r.date_envoi,
              message: r.message,
              source_url: {
                method:'GET',
                url: `/membres/${rowIdPubliqueDemandeur[0].id_publique}`
              },
              payload:r.payload
            }
          })
        });
      }
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Erreur lors de la récupération des notifications', erreur:error.sql });
    }
  });
  
  // 2. Endpoint POST pour ajouter une nouvelle notification
  router.post('/', authentifierToken, async (req, res) => {
    const { type, sous_type, message, status, destinataires } = req.body;
    
    if (!destinataires || !Array.isArray(destinataires) || destinataires.length === 0) {
        return res.status(400).json({ message: 'Une liste de destinataires est requise.' });
      }

    if (!type || !sous_type || !message || !status) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    const query = 'INSERT INTO notifications (user_id, type, sous_type, message, status, timestamp) VALUES (?, ?, ?, ?, ?, NOW())';

    const values = destinataires.map(destinataireId => [
        destinataireId, type, sous_type, message, status, new Date()  // Crée une ligne pour chaque destinataire
    ]);

    try {      
        const [result] = await pool.query(query, [values]);

        res.status(201).json({ 
            message: 'Notifications ajoutées avec succès', 
            lignes_inserees: result.affectedRows,
            completes: destinataires == result.affectedRows
        });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de l\'ajout de la notification', error });
    }
  });

  router.post('/push_token', authentifierToken, async (req, res)=>{
    const {push_token} = req.body
    if(!push_token)
      return res.status(400).json({message:'push token manquant'})

    const idMembre = req.membre.id
    const sql = 'UPDATE membres SET push_token = ? WHERE id = ?'
    try {
      await pool.query(sql,[push_token, idMembre])
      return res.status(201).json({message:'push token sauvegardé'})
    } catch (error) {
      return res.status(500).json({erreur:error, message:'problème survenu lors de l\'enregistrement du push token'})
    }
  })
  
  // 3. Endpoint PATCH pour mettre à jour le statut d'une notification
  router.patch('/:notificationId', authentifierToken, async (req, res) => {
    const { notificationId } = req.params;
    const { status } = req.body;
  
    if (!status || !sous_type) {
      return res.status(400).json({ message: 'Les champs status et type sont requis.' });
    }
  
    try {
      const query = 'UPDATE notifications SET status = ? WHERE id = ? AND id_receveur = ?';
      const params = [status, notificationId, req.membre.id, type]; 
  
      const [result] = await pool.query(query, params);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'notification non trouvée' });
      }
  
      res.status(200).json({ message: 'statut mis à jour avec succès.' });
    } catch (error) {
      res.status(500).json({ message: 'erreur lors de la mise à jour du statut', error });
    }
  });
  
  module.exports = router;