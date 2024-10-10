//paquets npm
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken')
require("dotenv").config();

//fonctions
const authenticateToken  = require('../../functions/authenticate')

//PDO
let { pool } = require('../../PDO');

router.get('/', authenticateToken, (req, res, next) =>{
    try {
        let idMembre = res.membre.id
        let sql = `SELECT * FROM `
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.post('/', (req, res, next) =>{
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.get('/:idami', (req, res, next) =>{
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.post('/:idami', (req, res, next) =>{
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.patch('/:idami', (req, res, next) =>{
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.delete('/:idami', (req, res, next) => {
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.get('/amis/demandes', (req, res, next) => {
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
router.post('/amis/demandes', (req, res, next) => {
    try {
        
    } catch (error) {
        res.status(500).json({
            message: 'Une erreur au niveau de la base de donnée est survenue',
            erreur: err.message
          })
    }
})
