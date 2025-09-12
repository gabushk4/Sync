const axios = require('axios')
let { pool } = require('../PDO');

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
        
        await pool.execute(
            `INSERT INTO notifications (id_receveur, type, message, source, payload, id_metier) VALUES (?, ?, ?, ?, ?, ?)`,
            [
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