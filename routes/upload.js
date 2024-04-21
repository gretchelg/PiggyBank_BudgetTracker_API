const express = require('express')
const { upload, getUrl } = require('../services/upload');

const router = express.Router();

router.post('/upload', upload.single('picture'), getUrl)

module.exports = router;