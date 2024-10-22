//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')

//fonctions
const { generateId } = require('../../functions/idGen')
require("dotenv").config();
const authenticateToken  = require('../../functions/authenticate')

//PDO
let { pool } = require('../../PDO');

//pour dev seulement
router.get('/', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.post('/', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.put('/', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.get('/:idconversation', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.post('/:idconversation', authenticateToken,  (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.patch('/:idmessage', (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.get('/inbox', authenticateToken,  (req, res, next) =>{
    const idMembre = req.membre.id
    try { 
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})