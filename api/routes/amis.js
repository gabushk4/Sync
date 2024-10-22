//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')
require("dotenv").config();

//fonctions
const authenticateToken  = require('../../functions/authenticate')

//PDO
let { pool } = require('../../PDO');

// Récupérer la liste des amis d'un membre
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const idMembre = req.membre.id;
        const sql = `SELECT a.id_ami, m.pseudo, m.fp_url
                     FROM amis a
                     JOIN membres m ON a.id_ami = m.id
                     WHERE a.id_membre = ?`;
        const [rows] = await pool.query(sql, [idMembre]);

        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Ajouter un ami
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const { idAmi } = req.body;
        const idMembre = req.membre.id;

        const sql = `INSERT INTO amis (id_membre, id_ami) VALUES (?, ?)`;
        await pool.query(sql, [idMembre, idAmi]);

        res.status(201).json({ 
            message: 'Ami ajouté avec succès',
            ami:{
                method: 'GET',
                url:`/membres/${idAmi}`
            }
         });
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Récupérer les détails d'un ami spécifique
router.get('/:idami', authenticateToken, async (req, res, next) => {
    try {
        const idAmi = req.params.idami;
        const idMembre = req.membre.id;

        const sql = `SELECT m.id, m.pseudo, m.fp_url
                     FROM amis a
                     JOIN membres m ON a.id_ami = m.id
                     WHERE a.id_membre = ? AND a.id_ami = ?`;
        const [rows] = await pool.query(sql, [idMembre, idAmi]);

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ message: 'Ami non trouvé' });
        }
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Modifier les informations d'un ami (éventuellement, si vous avez des informations personnalisées pour chaque ami)
router.patch('/:idami', authenticateToken, async (req, res, next) => {
    try {
        const idAmi = req.params.idami;
        const idMembre = req.membre.id;
        const { nom, prenom } = req.body;

        const sql = `UPDATE membres
                     SET nom = ?, prenom = ?
                     WHERE id = (SELECT id_ami FROM amis WHERE id_membre = ? AND id_ami = ?)`;
        await pool.query(sql, [nom, prenom, idMembre, idAmi]);

        res.status(200).json({ message: 'Ami mis à jour avec succès' });
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Supprimer un ami
router.delete('/:idami', authenticateToken, async (req, res, next) => {
    try {
        const idAmi = req.params.idami;
        const idMembre = req.membre.id;

        const sql = `DELETE FROM amis WHERE (id_membre = ? AND id_ami = ?) OR (id_membre = ? AND id_ami = ?)`;
        await pool.query(sql, [idMembre, idAmi, idAmi, idMembre]);

        res.status(200).json({ 
            message: 'Ami supprimé avec succès', 
            listeAmi: {
                method: 'GET',
                url:'amis/'
            }    
        });
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Récupérer les demandes d'amis
router.get('/demandes', authenticateToken, async (req, res, next) => {
    try {
        const idMembre = req.membre.id;

        const sql = `SELECT d.id, m.pseudo,  
                     FROM demandes_amis d
                     JOIN membres m ON d.id_demandeur = m.id
                     WHERE d.id_destinataire = ?`;
        const [rows] = await pool.query(sql, [idMembre]);

        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

// Envoyer une demande d'ami
router.post('/demandes', authenticateToken, async (req, res, next) => {
    try {
        const { idDemandeur } = req.body;
        const idDestinataire = req.membre.id;

        const sql = `INSERT INTO demandes_amis (id_demandeur, id_destinataire) VALUES (?, ?)`;
        await pool.query(sql, [idDemandeur, idDestinataire]);

        res.status(201).json({ message: 'Demande d\'ami envoyée avec succès' });
    } catch (err) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
        });
    }
});

router.patch('/demandes/:idDemande', authenticateToken, async (req, res, next) => {
    try {
        const { statut } = req.body; // Le nouveau statut doit être passé dans le corps de la requête
        const idDemande = req.params.idDemande;
        
        // Vérifiez si le statut est valide
        if (!['acceptée', 'refusée'].includes(statut)) {
            return res.status(400).json({ message: 'Statut invalide, choisissez entre "acceptée" ou "refusée".' });
        }

        const sql = `UPDATE demandes_amis SET statut = ? WHERE id = ?`;
        await pool.query(sql, [statut, idDemande]);

        res.status(200).json({ message: 'Statut de la demande mis à jour avec succès.' });
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: error.message
        });
    }
});

router.delete('/demandes/:idDemande', authenticateToken, async (req, res, next) => {
    try {
        const idDemande = req.params.idDemande;

        const sql = `DELETE FROM demandes_amis WHERE id = ?`;
        await pool.query(sql, [idDemande]);

        res.status(200).json({ message: 'Demande d\'ami supprimée avec succès.' });
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: error.message
        });
    }
});

module.exports = router;
