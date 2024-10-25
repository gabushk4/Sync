//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')

//fonctions
const { generateId } = require('../../functions/idGen')
require("dotenv").config();
const { authentifierToken }  = require('../../functions/authenticate')

//PDO
let { pool } = require('../../PDO');

// 1. Endpoint GET pour récupérer les notifications
router.get('/', authentifierToken, async (req, res) => {
    const { type, sous_type } = req.query;
  
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    let params = [req.membre.id];  // On filtre les notifications par l'id de l'utilisateur
  
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
  
    if (sous_type) {
      query += ' AND sous_type = ?';
      params.push(sous_type);
    }
  
    try {
      const [rows] = await pool.query(query, params);
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la récupération des notifications', error });
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
  
  // 3. Endpoint PATCH pour mettre à jour le statut d'une notification
  router.patch('/:notificationId', authentifierToken, async (req, res) => {
    const { notificationId } = req.params;
    const { status, type, sous_type } = req.body;
  
    if (!status || !type || !sous_type) {
      return res.status(400).json({ message: 'Les champs status, type et sous_type sont requis.' });
    }
  
    try {
      const query = 'UPDATE notifications SET status = ? WHERE id = ? AND user_id = ? AND type = ? AND sous_type = ?';
      const params = [status, notificationId, req.membre.id, type, sous_type]; 
  
      const [result] = await pool.query(query, params);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification non trouvée ou type/sous_type incorrect.' });
      }
  
      res.status(200).json({ message: 'Statut mis à jour avec succès.' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la mise à jour du statut', error });
    }
  });
  
  module.exports = router;