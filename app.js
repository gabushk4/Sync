const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require('path')

const membresRoutes = require("./api/routes/membres");
const notificationsRoutes = require("./api/routes/notifications");
const evenementsRoutes = require("./api/routes/evenements");
const messagesRoutes = require("./api/routes/evenements");
const amisRoutes = require("./api/routes/amis")
const imagesRoutes = require("./api/routes/images")

app.use(morgan("dev")); 

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//handling CORS errors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

const imagePath = path.join(__dirname, 'public/img');
console.log("Dossier des images:", imagePath)

app.use((req, res, next) => {
  console.log("Requête reçue :", req.url,); // Log de l'URL de la requête
  next(); // Passe au middleware suivant
});

app.get("/", (req, res) => {
  res.status(201).send("Server is running...");
});

//routes which should handle requests
app.use("/membres", membresRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/evenements", evenementsRoutes);
app.use("/messages", messagesRoutes);
app.use("/amis", amisRoutes)
app.use('/images', imagesRoutes);
app.use('/img', express.static(imagePath));

//route for 404 not found
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

//route for db not connected
app.use((error, req, res, next) => {
  return res.status(error.status || 500).json({
      message: error.message,
      erreur:error
  });
}); 

const date = new Date()

module.exports = app; 
