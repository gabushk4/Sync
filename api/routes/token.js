const express = require("express");
const jwt = require('jsonwebtoken')
const router = express.Router();
const {pool} = require('../../PDO')
const { authentifierRefreshToken } = require("../../functions/authenticate");
require("dotenv").config();

router.post('/', authentifierRefreshToken, async(req, res, next)=>{
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ message: 'Refresh token requis' });

    try {
        // Vérifie si le refresh token existe et n'est pas révoqué
        const [rows] = await pool.query(
        'SELECT * FROM tokens_rafraichissement WHERE token = ? AND blacklist = 0',
        [refresh_token]
        );

        if (rows.length === 0) return res.status(403).json({ message: 'refresh token invalide ou expiré' });

        const tokenData = rows[0];
        const membre ={
            id:tokenData.id_membre,
            pseudo:tokenData.pseudo,
            type:'access'
        }
        // Génère un nouvel access token (court)
        const accessToken = jwt.sign(
            membre,
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1H' } // access token court
        );

        // Optionnel : rotation du refresh token
        // const newRefreshToken = jwt.sign({ id_membre: tokenData.id_membre, type: 'refresh' }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
        // await pool.query('UPDATE refresh_tokens SET token = ? WHERE id = ?', [newRefreshToken, tokenData.id]);

        res.json({ access_token: accessToken /*, refresh_token: newRefreshToken */ });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
})

module.exports = router