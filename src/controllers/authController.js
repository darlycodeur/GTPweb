const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const JournalAudit = require('../models/JournalAudit');

// ─── Générer un token JWT ──────────────────────
const genererToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// ─── Enregistrer dans le journal d'audit ──────
const enregistrerAudit = async (utilisateur, action, ressource, ressourceId, details, ip) => {
  try {
    await JournalAudit.create({ utilisateur, action, ressource, ressourceId, details, ip });
  } catch (e) {
    console.error('Audit error:', e.message);
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // 1. Vérifier champs obligatoires
    if (!email || !motDePasse) {
      return res.status(400).json({ message: 'Email et mot de passe sont obligatoires.' });
    }

    // 2. Chercher l'utilisateur avec le mot de passe
    const user = await User.findOne({ email }).select('+motDePasse');

    // 3. Erreur générique si introuvable
    if (!user) {
      await enregistrerAudit(null, 'connexion_echouee', 'User', null, { email, raison: 'Utilisateur introuvable' }, req.ip);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 4. Comparer le mot de passe
    const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!motDePasseValide) {
      await enregistrerAudit(user._id, 'connexion_echouee', 'User', user._id, { email, raison: 'Mot de passe incorrect' }, req.ip);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    // 5. Vérifier que le compte est actif
    if (!user.actif) {
      await enregistrerAudit(user._id, 'connexion_echouee', 'User', user._id, { email, raison: 'Compte désactivé' }, req.ip);
      return res.status(401).json({ message: 'Compte désactivé. Contactez un administrateur.' });
    }

    // 6. Générer le token
    const token = genererToken(user._id, user.role);

    // 7. Enregistrer dans le journal
    await enregistrerAudit(user._id, 'connexion', 'User', user._id, { message: 'Connexion réussie' }, req.ip);

    // 8. Retourner la réponse
    res.status(200).json({
      message: 'Connexion réussie.',
      token,
      user: {
        _id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Privé
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/auth/profil
// @access  Privé
// ─────────────────────────────────────────────
const modifierProfil = async (req, res) => {
  try {
    const { nom, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { nom, avatar },
      { new: true, runValidators: true }
    );

    await enregistrerAudit(req.user._id, 'modification', 'User', req.user._id, { nom, avatar }, req.ip);

    res.status(200).json({ message: 'Profil mis à jour.', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/auth/mot-de-passe
// @access  Privé
// ─────────────────────────────────────────────
const changerMotDePasse = async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    // 1. Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(req.user._id).select('+motDePasse');

    // 2. Vérifier l'ancien mot de passe
    const valide = await bcrypt.compare(ancienMotDePasse, user.motDePasse);
    if (!valide) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect.' });
    }

    // 3. Hasher et sauvegarder le nouveau
    user.motDePasse = await bcrypt.hash(nouveauMotDePasse, 10);
    await user.save();

    await enregistrerAudit(req.user._id, 'modification', 'User', req.user._id, { message: 'Mot de passe modifié' }, req.ip);

    res.status(200).json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { login, getMe, modifierProfil, changerMotDePasse };