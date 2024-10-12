const mysql = require("mysql2/promise.js");
require("dotenv").config();

const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  })

pool.getConnection()
  .then(console.log('db connected.'))
  .catch(err => {
    console.log(err.message)
  })

module.exports = { pool }