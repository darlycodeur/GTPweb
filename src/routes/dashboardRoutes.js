const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  tachesDuJour,
  resumeSemaine,
  tauxCompletionMensuel,
  tachesUrgentes
} = require('../controllers/dashboardController');

router.get('/taches-du-jour',          protect, tachesDuJour);
router.get('/resume-semaine',          protect, resumeSemaine);
router.get('/taux-mensuel',            protect, tauxCompletionMensuel);
router.get('/taches-urgentes',         protect, tachesUrgentes);

module.exports = router;