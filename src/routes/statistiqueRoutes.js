const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const {
  statistiquesProjet,
  dashboardAdmin,
  tachesProchesEcheance
} = require('../controllers/statistiqueController');

// 16.1 Statistiques d'un projet
router.get('/projet/:id',       protect, statistiquesProjet);

// 16.2 Dashboard admin
router.get('/dashboard',        protect, autoriser('admin'), dashboardAdmin);

// 16.3 Tâches proches de l'échéance
router.get('/echeances-proches', protect, tachesProchesEcheance);

module.exports = router;