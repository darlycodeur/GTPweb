const Categorie = require('../models/Categorie');
const JournalAudit = require('../models/JournalAudit');

// ─────────────────────────────────────────────
// @route   GET /api/categories
// @access  Privé
// ─────────────────────────────────────────────
const listerCategories = async (req, res) => {
  try {
    const { portee } = req.query;
    const filtre = {};
    if (portee) filtre.portee = portee;

    const categories = await Categorie.find(filtre).sort({ nom: 1 });
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/categories
// @access  Admin
// ─────────────────────────────────────────────
const creerCategorie = async (req, res) => {
  try {
    const { nom, couleur, icone, description, portee } = req.body;

    const existe = await Categorie.findOne({ nom });
    if (existe) return res.status(400).json({ message: 'Cette catégorie existe déjà.' });

    const categorie = await Categorie.create({ nom, couleur, icone, description, portee });

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'creation',
      ressource: 'Categorie',
      ressourceId: categorie._id,
      details: { nom },
      ip: req.ip,
      suspecte: false
    });

    res.status(201).json({ message: 'Catégorie créée.', categorie });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/categories/:id
// @access  Admin
// ─────────────────────────────────────────────
const modifierCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable.' });

    res.status(200).json({ message: 'Catégorie modifiée.', categorie });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/categories/:id
// @access  Admin
// ─────────────────────────────────────────────
const supprimerCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findByIdAndDelete(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable.' });

    res.status(200).json({ message: 'Catégorie supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { listerCategories, creerCategorie, modifierCategorie, supprimerCategorie };