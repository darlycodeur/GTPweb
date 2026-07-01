const autoriser = (...rolesAutorises) => {
  return (req, res, next) => {
    // 1. Vérifier que protect a bien été appelé avant
    if (!req.user) {
      return res.status(401).json({
        message: 'Non authentifié.'
      });
    }

    // 2. Vérifier que le rôle est autorisé
    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        message: `Accès interdit. Rôle requis : ${rolesAutorises.join(' ou ')}.`
      });
    }

    next();
  };
};

module.exports = autoriser;