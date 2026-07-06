const express = require('express');
const router = express.Router();
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const { listerAudit } = require('../controllers/auditController');

// Admin uniquement
router.get('/', protect, autoriser('admin'), listerAudit);

module.exports = router;