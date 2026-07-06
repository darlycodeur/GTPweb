const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  creerCommentaire,
  listerCommentaires,
  modifierCommentaire,
  supprimerCommentaire
} = require('../controllers/commentaireController');

// Tous les connectés
router.get('/tache/:tacheId', protect, listerCommentaires);
router.post('/',              protect, creerCommentaire);
router.put('/:id',            protect, modifierCommentaire);
router.delete('/:id',         protect, supprimerCommentaire);

module.exports = router;