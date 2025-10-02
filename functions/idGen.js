"use strict"
const genId = require('generate-unique-id')
const { pool } = require('../PDO')

let isGenerating = false
const queue = []

async function generateIdWithQueue(length = 6, useLetters = true, useNumbers = true, prefixe = '', table) {
  return new Promise((resolve) => {
    queue.push(async () => {
      const id = await generateId(length, useLetters, useNumbers, prefixe, table)
      resolve(id)
    })
    processQueue()
  })
}

async function processQueue() {
  if (isGenerating) return
  isGenerating = true
  while (queue.length > 0) {
    const task = queue.shift()
    await task()
  }
  isGenerating = false
}

async function generateId(length = 6, useLetters = true, useNumbers = true, prefixe = '', table = 'membres'){
    let stop = false
    do{
        const id = genId({
            length: length - prefixe.length, 
            useLetters: useLetters, 
            useNumbers: useNumbers
        })
        await pool.query(`SELECT * FROM ${table} WHERE id_publique = ?`, [`${prefixe + id}`])
            .then(result => {
                if(result[0].length > 0){
                    console.log('Un membre existe avec cet id: ' + id)
                }
                else
                    stop = true
            }).catch(err=>{
                console.log(err)
            })
        return prefixe + id    
    }while(!stop)
} 

module.exports = { generateIdWithQueue }