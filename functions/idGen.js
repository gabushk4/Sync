"use strict"
const genId = require('generate-unique-id')
const { pool } = require('../PDO')

async function generateId(length = 6, useLetters = true, useNumbers = true){
    let stop = false
    do{
        const id = genId({
            length: length, 
            useLetters: useLetters, 
            useNumbers: useNumbers
        })
        const sql = `SELECT * FROM membres WHERE id = '${id}'`
        await pool.query(sql)
            .then(result => {
                if(result[0].length > 0){
                    console.log('Un membre existe avec cet id: '+ id)
                }
                else
                    stop = true
            }).catch(err=>{
                console.log(err)
            })
        return id    
    }while(!stop)
    
} 

module.exports = { generateId }