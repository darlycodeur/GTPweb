const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  login,
  getMe,
  modifierProfil,
  changerMotDePasse
} = require('../controllers/authController');

// Public
router.post('/login',    login);

// Privé
router.get('/me',              protect, getMe);
router.put('/profil',          protect, modifierProfil);
router.put('/mot-de-passe',    protect, changerMotDePasse);

module.exports = router;