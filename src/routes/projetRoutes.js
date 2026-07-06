const express = require('express');
const router = express.Router();
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const {
  creerProjet,
  listerProjets,
  getProjet,
  modifierProjet,
  supprimerProjet,
  archiverProjet,
  restaurerProjet
} = require('../controllers/projetController');

// Tous les connectés
router.get('/',    protect, listerProjets);
router.get('/:id', protect, getProjet);

// Chef de projet + Admin
router.post('/',              protect, autoriser('chef_projet', 'admin'), creerProjet);
router.put('/:id',            protect, autoriser('chef_projet', 'admin'), modifierProjet);
router.put('/:id/archiver',   protect, autoriser('chef_projet', 'admin'), archiverProjet);
router.put('/:id/restaurer',  protect, autoriser('chef_projet', 'admin'), restaurerProjet);

// Admin uniquement
router.delete('/:id', protect, autoriser('admin'), supprimerProjet);

module.exports = router;