const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // 1. Vérifier si le token est présent dans le header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Accès refusé. Token manquant.'
      });
    }

    // 2. Extraire le token
    const token = authHeader.split(' ')[1];

    // 3. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Chercher l'utilisateur en base
    const user = await User.findById(decoded.id).select('-motDePasse');

    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur introuvable.'
      });
    }

    // 5. Vérifier que le compte est actif
    if (!user.actif) {
      return res.status(401).json({
        message: 'Compte désactivé. Contactez un administrateur.'
      });
    }

    // 6. Attacher l'utilisateur à la requête
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré. Reconnectez-vous.' });
    }
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

module.exports = protect;