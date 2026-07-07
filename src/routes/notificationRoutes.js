const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  mesNotifications,
  marquerLue,
  marquerToutesLues,
  supprimerNotification,
  supprimerToutesNotifications
} = require('../controllers/notificationController');

// Tous les connectés (chacun voit ses propres notifications)
router.get('/',                     protect, mesNotifications);
router.put('/:id/lue',              protect, marquerLue);
router.put('/toutes/lues',          protect, marquerToutesLues);

// 17.2 Suppression (ordre important : spécifique avant paramétré)
router.delete('/',                  protect, supprimerToutesNotifications);
router.delete('/:id',               protect, supprimerNotification);

module.exports = router;