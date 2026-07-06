const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const autoriser = require('../middlewares/roleMiddleware');
const { upload, uploadFichier } = require('../middlewares/uploadMiddleware');
const User = require('../models/User');
const Tache = require('../models/Tache');
const JournalAudit = require('../models/JournalAudit');

// ─── Upload avatar ───────────────────────────────
const uploadAvatarMiddleware = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Erreur upload' });
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier sélectionné' });
    next();
  });
};

router.post('/avatar', protect, uploadAvatarMiddleware, async (req, res) => {
  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    );
    res.json({ avatar: avatarUrl, user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

router.post('/admin-avatar', protect, autoriser('admin'), uploadAvatarMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      userId || req.user._id,
      { avatar: avatarUrl },
      { new: true }
    );
    res.json({ avatar: avatarUrl, user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// ─── 3.4 Upload pièce jointe à une tâche ────────
const uploadFichierMiddleware = (req, res, next) => {
  uploadFichier.single('fichier')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Erreur upload' });
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier sélectionné' });
    next();
  });
};

router.post('/tache/:tacheId', protect, autoriser('chef_projet', 'admin'), uploadFichierMiddleware, async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.tacheId);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    const piece = {
      nom: req.file.originalname,
      url: `/uploads/fichiers/${req.file.filename}`,
      type: req.file.mimetype,
      taille: req.file.size,
      uploadePar: req.user._id,
      uploadedAt: new Date()
    };

    tache.pieceJointes.push(piece);
    await tache.save();

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'upload',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { nom: req.file.originalname, taille: req.file.size, type: req.file.mimetype },
      ip: req.ip,
      suspecte: false
    });

    res.status(201).json({ message: 'Fichier ajouté à la tâche.', piece });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

// ─── 11.3 Suppression d'une pièce jointe ────────
router.delete('/tache/:tacheId/fichier/:fichierId', protect, async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.tacheId);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    const piece = tache.pieceJointes.id(req.params.fichierId);
    if (!piece) return res.status(404).json({ message: 'Fichier introuvable.' });

    const estAuteur = piece.uploadePar.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé. Seul l\'auteur ou un admin peut supprimer.' });
    }

    tache.pieceJointes.pull({ _id: req.params.fichierId });
    await tache.save();

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'suppression',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { nomFichier: piece.nom, supprime: true },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Fichier supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
});

module.exports = router;