const bcrypt = require('bcryptjs');
const User = require('../models/User');
const JournalAudit = require('../models/JournalAudit');

// ─────────────────────────────────────────────
// @route   GET /api/users
// @access  Admin
// ─────────────────────────────────────────────
const listerUsers = async (req, res) => {
  try {
    const { role, actif, page = 1, limit = 10 } = req.query;
    const filtre = {};

    if (req.user.role === 'chef_projet') {
      filtre.role = 'employe';
    } else if (role) {
      filtre.role = role;
    }
    if (actif !== undefined) filtre.actif = actif === 'true';

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filtre);
    const users = await User.find(filtre).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });

    res.status(200).json({
      users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/users/:id
// @access  Admin
// ─────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/users/:id
// @access  Admin
// ─────────────────────────────────────────────
const modifierUser = async (req, res) => {
  try {
    const { nom, role, actif, quotaTaches, avatar } = req.body;
    const avant = await User.findById(req.params.id);

    if (!avant) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nom, role, actif, quotaTaches, avatar },
      { new: true, runValidators: true }
    );

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'modification',
      ressource: 'User',
      ressourceId: user._id,
      details: { avant: { nom: avant.nom, role: avant.role }, apres: { nom, role } },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Utilisateur modifié.', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/users/:id
// @access  Admin
// ─────────────────────────────────────────────
const supprimerUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    // Soft delete — on désactive plutôt que supprimer
    user.actif = false;
    await user.save();

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'suppression',
      ressource: 'User',
      ressourceId: user._id,
      details: { message: `Compte de ${user.nom} désactivé` },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Compte désactivé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/users
// @access  Admin (tout rôle) ou Chef_projet (employe seulement)
// ─────────────────────────────────────────────
const creerUser = async (req, res) => {
  try {
    const { nom, email, motDePasse, role, avatar, quotaTaches } = req.body;

    if (!nom || !email || !motDePasse || !role) {
      return res.status(400).json({ message: 'Nom, email, mot de passe et rôle sont obligatoires.' });
    }

    // Hiérarchie : qui peut créer quel rôle
    const creablePar = {
      admin: ['chef_projet', 'employe'],
      chef_projet: ['employe']
    };

    const rolesAutorises = creablePar[req.user.role];
    if (!rolesAutorises || !rolesAutorises.includes(role)) {
      return res.status(403).json({
        message: `Vous n'êtes pas autorisé à créer un compte avec le rôle "${role}".`
      });
    }

    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ message: 'Cet email est déjà utilisé.' });

    const hash = await bcrypt.hash(motDePasse, 10);

    const user = await User.create({
      nom, email,
      motDePasse: hash,
      role,
      avatar: avatar || '',
      quotaTaches: quotaTaches !== undefined ? quotaTaches : (role === 'employe' ? 10 : 20)
    });

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'creation',
      ressource: 'User',
      ressourceId: user._id,
      details: { nom, email, role, creePar: req.user.nom },
      ip: req.ip,
      suspecte: false
    });

    res.status(201).json({
      message: `Compte ${role} créé avec succès.`,
      user: {
        _id: user._id, nom: user.nom, email: user.email,
        role: user.role, avatar: user.avatar,
        actif: user.actif, quotaTaches: user.quotaTaches
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { listerUsers, getUser, creerUser, modifierUser, supprimerUser };