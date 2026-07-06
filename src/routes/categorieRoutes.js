const express = require('express');
const router = express.Router();
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const {
  listerCategories,
  creerCategorie,
  modifierCategorie,
  supprimerCategorie
} = require('../controllers/categorieController');

// Tous les connectés peuvent voir les catégories
router.get('/', protect, listerCategories);

// Admin uniquement pour modifier
router.post('/',     protect, autoriser('admin'), creerCategorie);
router.put('/:id',   protect, autoriser('admin'), modifierCategorie);
router.delete('/:id',protect, autoriser('admin'), supprimerCategorie);

module.exports = router;