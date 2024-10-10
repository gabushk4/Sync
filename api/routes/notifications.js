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

router.get('/evenements', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.get('/messages', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.get('/amis', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.post('/evenements', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.post('/messages', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.post('/amis', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})

router.patch('/:idnotification', authenticateToken, (req, res, next) =>{
    const idMembre = req.membre.id
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})