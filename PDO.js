const mysql = require("mysql2/promise.js");
require("dotenv").config();

const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    dateStrings: true,
  })
 
pool.getConnection()
  .then((val)=>{console.log('db connected.')},(res)=>{console.log('db connection failed',res)})
  .catch(err => {
    console.log(err.message)
  })

module.exports = { pool }