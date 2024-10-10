const express = require("express");
const app = express();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const fs = require("fs");

const membresRoutes = require("./routes/membres");
const notificationsRoutes = require("./routes/notifications");
const evenementsRoutes = require("./routes/evenements");
const messagesRoutes = require("./routes/evenements");
const amisRoutes = require("./routes/amis")

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

//routes which should handle requests
app.use("/membres", membresRoutes);
//app.use("/notifications", notificationsRoutes);
app.use("/evenements", evenementsRoutes);
//app.use("/messages", messagesRoutes);
//app.use("/amis", amisRoutes)

//route for 404 not found
app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

//route for db not connected
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
}); 

const date = new Date()

console.log('-' + date.getTimezoneOffset()/60)

module.exports = app;
