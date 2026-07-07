const express = require('express');
const router = express.Router();
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const {
  demarrerSession,
  arreterSession,
  mesSessions,
  sessionsParTache,
  monRapport
} = require('../controllers/sessionTravailController');

// Employé + Chef + Admin
router.get('/',                      protect, mesSessions);
router.post('/tache/:tacheId/start', protect, autoriser('employe', 'chef_projet', 'admin'), demarrerSession);
router.put('/tache/:tacheId/stop',   protect, autoriser('employe', 'chef_projet', 'admin'), arreterSession);

// 6.3 Sessions par tâche
router.get('/tache/:tacheId',        protect, sessionsParTache);

// 6.4 Rapport de temps
router.get('/rapport',               protect, monRapport);

module.exports = router;