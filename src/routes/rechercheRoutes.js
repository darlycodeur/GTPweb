const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const { rechercher } = require('../controllers/rechercheController');

router.get('/', protect, rechercher);

module.exports = router;