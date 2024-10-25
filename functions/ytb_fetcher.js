const { query } = require('express');
const http = require('http');

const apiKey = 'AIzaSyCZozgXo0On-NLWmuWnUwRA7qBQnG-mtgo'; 
const baseUrl = 'www.googleapis.com';
const pathUrl = '/youtube/v3/search';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node youtubeToMp3.js <fichier_csv> <dossier_sortie>');
  process.exit(1);
}

const givenQuery = args[0]; 
const outputDir = args[1]; 

console.log('args: ' + givenQuery, outputDir)

// Fonction pour faire une requête GET à l'API YouTube
function fetchYouTubeVideos(query = givenQuery, maxResults = 3, duration = 'any') {
    const options = {
        hostname: baseUrl,
        path: `${pathUrl}?key=${apiKey}&q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=${maxResults}&videoDuration=${duration}`,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';

        // Écouter les chunks de données
        res.on('data', (chunk) => {
            data += chunk;
            console.log('data being filled up')
        });

        console.log(data)

        // Lorsque toute la réponse est reçue
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                const videos = parsedData.items;

                console.log(videos)

                // Extraire les URL des vidéos
                const videoUrls = videos.map((video, index = 0) => {
                    return { 
                        index: index += 1, 
                        url: `https://www.youtube.com/watch?v=${video.id.videoId}`, 
                        title: video.snippet.title 
                    };
            
                });

                // Afficher les vidéos avec index et titre
                console.log('Vidéos trouvées :');
                videoUrls.forEach(video => {
                    console.log(`${video.index}. ${video.title} - ${video.url}`);
                });

                // Demander à l'utilisateur de choisir les vidéos à insérer dans le fichier CSV
                promptUserForSelection(videoUrls);
            } catch (error) {
                console.log(error.message)
            }
        });
    });

  // Gérer les erreurs
  req.on('error', (error) => {
    console.error('Erreur lors de la requête :', error);
  });

  // Fin de la requête
  req.end();
}

// Fonction pour demander à l'utilisateur de choisir les vidéos
function promptUserForSelection(videoUrls) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  
    rl.question('Entrez les numéros des vidéos que vous souhaitez insérer dans le CSV (séparés par des virgules) : ', (answer) => {
      const selectedIndexes = answer.split(',').map(Number).filter(num => !isNaN(num));
  
      // Filtrer les vidéos sélectionnées
      const selectedVideos = videoUrls.filter(video => selectedIndexes.includes(video.index));
  
      // Écrire les vidéos sélectionnées dans un fichier CSV
      writeToCSV(selectedVideos);
  
      rl.close();
    });
}

// Fonction pour écrire les vidéos sélectionnées dans un fichier CSV
function writeToCSV(videos) {
  const csvRows = videos.map(video => `${video.index},${video.title},${video.url}`);
  const header = 'Index,Titre,URL';
  const csvContent = [header, ...csvRows].join('\n');

  fs.writeFile(outputDir, csvContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier CSV :', err);
    } else {
      console.log('Vidéos sélectionnées insérées dans videos.csv avec succès.');
    }
  });
}

fetchYouTubeVideos()


module.exports = fetchYouTubeVideos