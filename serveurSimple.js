const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
    const filePath = path.join("C:/img", "arrow_left.png");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Erreur serveur");
        return;
      }
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(data);
    });
});

server.listen(3000, () => {
  console.log("Serveur HTTP simple en écoute sur http://localhost:3000");
});