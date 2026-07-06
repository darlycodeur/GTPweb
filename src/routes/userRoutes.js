const express = require('express');
const router = express.Router();
const protect    = require('../middlewares/authMiddleware');
const autoriser  = require('../middlewares/roleMiddleware');
const {
  listerUsers,
  getUser,
  creerUser,
  modifierUser,
  supprimerUser
} = require('../controllers/userController');

// Admin (tout) / Chef de projet (employés seulement — filtré dans le contrôleur)
router.get('/',     protect, autoriser('admin', 'chef_projet'), listerUsers);
router.get('/:id',  protect, autoriser('admin'), getUser);
router.put('/:id',  protect, autoriser('admin'), modifierUser);
router.delete('/:id', protect, autoriser('admin'), supprimerUser);

// Création de compte (admin → tout, chef_projet → employe seulement)
router.post('/', protect, autoriser('admin', 'chef_projet'), creerUser);

module.exports = router;