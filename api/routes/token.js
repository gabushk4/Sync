const express = require("express");
const jwt = require('jsonwebtoken')
const router = express.Router();
const {pool} = require('../../PDO')
const { authentifierRefreshToken } = require("../../functions/authenticate");
require("dotenv").config();

router.post('/', authentifierRefreshToken, async(req, res, next)=>{
    try {
        const {payload, refreshToken} = req; // injecté par authentifierRefreshToken
        console.log('authentifierRefreshToken', payload)
        const [rows] = await pool.query(
            'SELECT * FROM tokens_rafraichissement WHERE id_membre = ? AND token = ? AND blacklist = 0',
            [payload.id_membre, refreshToken]
        );

        if (rows.length === 0) {
            // Token révoqué ou blacklisté
            return res.status(403).json({ message: 'Refresh token révoqué' });
        }

        const accessToken = jwt.sign(
            { id: payload.id_membre, pseudo:payload.pseudo_membre, type: 'access' },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ access_token: accessToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
})

module.exports = router