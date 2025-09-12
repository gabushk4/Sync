const {getNow} = require('./getNow.js');
const { DateTime  } = require('luxon');
let {pool} = require("../PDO.js"); // ton pool MySQL

/* export default async function ajouterEvenementFactice(req, res, next) {
    console.log('ajouter factice')
    try {
        const membreId = req.membre.id; // supposé déjà extrait par un middleware d'authentification
        const now = await getNow(membreId); // now est un DateTime Luxon
        const date = now.toISODate().split('T')[0]; // format YYYY-MM-DD

        const [rows] = await pool.query(
            `SELECT id, debut, fin 
            FROM evenements e 
            INNER JOIN participants p ON e.id = p.id_evenement 
            WHERE (p.id_membre = ?) AND DATE(debut) = ? 
            ORDER BY debut ASC`,
            [membreId, date]
        );

        console.log('rows', rows, 'membreId', membreId, 'date', date)

        let peutAjouterFactice = rows.some(e => e.fin !== `${date}T23:59:00`) || rows.length == 0;

        console.log('peut ajouter factice', peutAjouterFactice)

        if (rows.length === 0 || peutAjouterFactice) {
            const factice = {
                id: `factice-${membreId}`,
                debut: `${date}T23:59:00`,
                fin: `${date}T23:59:00`,
            };
            rows.push(factice);
        }

        req.evenementsAvecFactice = rows;
        next();
    } catch (err) {
        console.error("Erreur dans le middleware ajouterEvenementFactice :", err);
        res.status(500).json({ erreur:err.message,
            message: "Erreur lors de la récupération des événements." });
    }
}   */

    async function ajouterEvenementFactice(req, res, next) {
        //console.log('ajouter factice');
        try {
            const membreId = req.membre.id;
    
            // 1. Récupérer la timezone depuis la BDD
            const [timezoneRows] = await pool.query(
                'SELECT fuseau_horaire FROM membres WHERE id = ?',
                [membreId]
            ); 
            if (timezoneRows.length === 0 || !timezoneRows[0].fuseau_horaire) {
                throw new Error("Timezone introuvable pour ce membre.");
            }
            const timezone = timezoneRows[0].fuseau_horaire;
    
            // 2. Obtenir la date actuelle dans cette timezone
            const now = await getNow(membreId); // DateTime déjà avec la bonne timezone ?
            const date = DateTime.fromSQL(req.query.debut).toISODate(); // YYYY-MM-DD
    
            // 3. Récupérer les événements du jour
            const [rows] = await pool.query(
                `SELECT id_publique, debut, fin 
                FROM evenements e 
                INNER JOIN participants_evenements p ON e.id = p.id_evenement 
                WHERE p.id_membre = ? AND DATE(debut) = ? 
                ORDER BY debut ASC`,
                [membreId, date]
            );
    
            // 4. Vérifier si on peut ajouter un événement factice
            let peutAjouterFactice = rows.every(e => !e.fin.endsWith('T23:59:59')) || rows.length === 0;
    
            //console.log('peut ajouter factice', peutAjouterFactice);
    
            if (peutAjouterFactice) {
                // 5. Créer 23:59:59 locale dans timezone du membre
                const finLocale = DateTime.fromISO(date, { zone: timezone }).set({
                    hour: 23,
                    minute: 59,
                    second: 59,
                    millisecond: 999
                });
    
                // 6. Convertir en UTC pour stocker/renvoyer au même format que les vrais événements
                const finUTC = finLocale.toUTC().toSQL(); // format ISO UTC
    
                const factice = {
                    id:`factice-${membreId}`,
                    id_publique: `factice-${membreId}`,
                    debut: finUTC,
                    fin: finUTC
                };

                console.log('factice créé', factice)
                req.evenementFactice = factice;
                return next()
            }
    
            req.evenementFactice = undefined;
            return next();
        } catch (err) {
            console.error("Erreur dans le middleware ajouterEvenementFactice :", err);
            res.status(500).json({
                erreur: err.message,
                message: "Erreur lors de la récupération des événements."
            });
        }
    }

    module.exports = {ajouterEvenementFactice}