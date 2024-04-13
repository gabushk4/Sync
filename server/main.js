const fs = require('fs')
const path = require('path')

const filePath = path.join('../json/users.json');

let db

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Erreur lors de la lecture du fichier JSON :', err);
        return;
    }

    try {
        db = JSON.parse(data)
    } catch (error) {
        console.error('Erreur lors de l\'analyse du JSON :', error);
    }
});

while(db == 'none'){}

console.log('Données du fichier JSON :', db)

var indexEv = 0
const user = db.users[0]
console.log("username:" + user.username)
console.log(`titre event ${indexEv}: ${user.events[indexEv].title}`)


