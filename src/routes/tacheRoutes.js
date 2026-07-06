const express = require('express');
const router = express.Router();
const protect   = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const {
  creerTache,
  listerTaches,
  getTache,
  modifierTache,
  changerStatut,
  supprimerTache,
  ajouterPrerequis,
  retirerPrerequis,
  chaineDependances
} = require('../controllers/tacheController');

// Tous les connectés
router.get('/',    protect, listerTaches);
router.get('/:id', protect, getTache);

// Tous les connectés (employé change son propre statut)
router.put('/:id/statut', protect, changerStatut);

// Chef de projet + Admin
router.post('/',     protect, autoriser('chef_projet', 'admin'), creerTache);
router.put('/:id',   protect, autoriser('chef_projet', 'admin'), modifierTache);
router.delete('/:id',protect, autoriser('chef_projet', 'admin'), supprimerTache);

// 8.1 Gestion des prérequis
router.post('/:id/prerequis',                 protect, autoriser('chef_projet', 'admin'), ajouterPrerequis);
router.delete('/:id/prerequis/:prereqId',     protect, autoriser('chef_projet', 'admin'), retirerPrerequis);

// 8.3 Chaîne de dépendances
router.get('/:id/chaine-dependances',         protect, chaineDependances);

module.exports = router;