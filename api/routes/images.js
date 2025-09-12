const express = require('express');
const { authentifierToken } = require('../../functions/authenticate');
const upload = require('../../functions/upload');
const router = express.Router()
require('dotenv').config()

router.get("/:imagename", (req, res) => {
    
});

router.post('/', authentifierToken,  async (req,res) => {

})

module.exports = router
