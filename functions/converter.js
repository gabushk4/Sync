const fs = require('fs');
const { exec } = require('child_process')
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');

const path = require('path');
const token = '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'
// Récupérer les arguments de la console (fichier CSV et dossier de sortie)
const args = process.argv.slice(2);


const url = args[0];

// Fonction pour convertir une vidéo YouTube en MP3
async function convertToMp3(url) {
    const downloadDir = path.resolve('C:\\Users\\gabbo\\Music\\FROM_YTB');  // Remplacer par ton nom d'utilisateur Windows
  exec(`yt-dlp -o '${downloadDir}/%(title)s.%(ext)s' -x --audio-format mp3 ${url}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erreur : ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Erreur : ${stderr}`);
      return;
    }
    console.log('Téléchargement terminé !');
  });
}

convertToMp3(url)

// Lire et traiter le fichier CSV
/* fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    const videoUrl = row.url; // Supposons que la colonne s'appelle 'url'
    const outputFilePath = path.join(outputDir, `${path.basename(videoUrl)}.mp3`);
    convertToMp3(videoUrl, outputFilePath);
  })
  .on('end', () => {
    console.log('Tous les URL ont été traités.');
  })
  .on('error', (error) => {
    console.error('Erreur lors de la lecture du fichier CSV :', error);
  }); */