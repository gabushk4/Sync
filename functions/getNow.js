const { DateTime } = require("luxon");
const { pool } = require('../PDO.js'); // ton pool de connexion MySQL

async function getNow(membreId) {
    try {
        if(membreId){            
            const [rows] = await pool.query(
                "SELECT fuseau_horaire FROM membres WHERE id = ?",
                [membreId]
            );

            const fuseau = rows[0]?.fuseau_horaire || "UTC"; // Valeur par défaut

            //console.log('fuseau horaire du membre', fuseau)

            return DateTime.now().setZone(fuseau);
        }
        else
            return DateTime.now().toUTC()
    } catch (err) {
        console.error("Erreur dans getNowHeureLocal:", err);
        return DateTime.now().toUTC(); // fallback en cas d'erreur
    }
}

module.exports = {getNow};