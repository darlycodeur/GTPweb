const mongoose = require('mongoose');

// Sous-schéma historique (embarqué)
const historiqueSchema = new mongoose.Schema({
  ancienStatut: { type: String, required: true },
  nouveauStatut: { type: String, required: true },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

// Sous-schéma pièces jointes (embarqué)
const pieceJointeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  taille: { type: Number, required: true },
  uploadePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const tacheSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre est obligatoire'],
    minlength: 3,
    maxlength: 150,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  statut: {
    type: String,
    enum: ['a_faire', 'en_cours', 'en_revue', 'termine', 'bloque'],
    default: 'a_faire'
  },
  priorite: {
    type: String,
    enum: ['basse', 'normale', 'haute', 'critique'],
    default: 'normale'
  },
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Projet',
    required: [true, 'Le projet est obligatoire']
  },
  assigneA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie',
    default: null
  },
  prerequis: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tache'
  }],
  dateEcheance: { type: Date, default: null },
  dateCompletion: { type: Date, default: null },
  estimation: { type: Number, default: 0 },
  tempsReel: { type: Number, default: 0 },
  scoreUrgence: { type: Number, default: 0 },
  pieceJointes: [pieceJointeSchema],
  tags: [{ type: String }],
  historique: [historiqueSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Index
tacheSchema.index({ projet: 1 });
tacheSchema.index({ assigneA: 1 });
tacheSchema.index({ statut: 1 });
tacheSchema.index({ scoreUrgence: -1 });
tacheSchema.index({ projet: 1, statut: 1 });
tacheSchema.index({ projet: 1, assigneA: 1 });
tacheSchema.index({ priorite: 1, dateEcheance: 1 });

module.exports = mongoose.model('Tache', tacheSchema);