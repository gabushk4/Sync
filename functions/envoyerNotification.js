const axios = require('axios')
let { pool } = require('../PDO');
const { generateIdWithQueue } = require('./idGen');

async function envoyerNotification(token, type, titre, corps, source, destinataire, data='{}', idMetier){
    const message = {
        to: token,
        sound: 'default',
        title: titre,
        data: data,        
    }

    try {
        /* const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {'Content-Type': 'application/json'},
        })
        console.log("Réponse FCM/Expo:", response.data); */
        const notificationId = await generateIdWithQueue(10, true, true, 'N', "notifications")
        await pool.execute(
            `INSERT INTO notifications (id_publique, id_receveur, type, message, source, payload, id_metier) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                notificationId,
                destinataire,
                type, 
                corps,
                source,
                JSON.stringify(data),  
                idMetier
            ]
        );

    } catch (error) {
        console.error("Erreur d'envoi de notification:");
        throw error
    }    
}

module.exports = envoyerNotification