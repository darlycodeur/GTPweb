const express = require('express');
const controller = require('../controllers/employeeController');
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');

const router = express.Router();

// ─── CONSULTATION ─────────────────────────────
// Lisible par tout utilisateur connecte : un chef de projet doit pouvoir
// consulter les competences RH avant d'affecter une tache a un employe.
router.get('/',            protect, controller.lister);
router.get('/:employeeCode', protect, controller.detail);

// ─── SYNCHRONISATION ──────────────────────────
// Reservee a l'administrateur : elle declenche un import massif depuis le
// systeme legacy et ecrase les donnees RH en base.
//
// Declaree avant `/:employeeCode` pour que les segments litteraux
// « sync » et « status » ne soient pas captures comme un code employe.
router.post('/sync',         protect, autoriser('admin'), controller.synchroniser);
router.get('/sync/status',   protect, autoriser('admin'), controller.etatSync);

module.exports = router;
