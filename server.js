const http = require("http");
const app = require("./app");


const port = process.env.PORT;

app.listen(port, '0.0.0.0', () => {
    console.log(`Serveur roule sur 0.0.0.0:${port}`);
  });
