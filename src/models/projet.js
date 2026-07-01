const mongoose = require('mongoose');

const projetSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre est obligatoire'],
    minlength: 3,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  statut: {
    type: String,
    enum: ['planifie', 'en_cours', 'termine', 'suspendu'],
    default: 'planifie'
  },
  priorite: {
    type: String,
    enum: ['basse', 'normale', 'haute', 'critique'],
    default: 'normale'
  },
  idCategorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie',
    required: [true, 'La catégorie est obligatoire']
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est obligatoire']
  },
  dateFin: {
    type: Date,
    default: null
  },
  chefProjet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le chef de projet est obligatoire']
  },
  membres: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    validate: {
      validator: (val) => val.length >= 1,
      message: 'Au moins un membre est obligatoire'
    }
  },
  budget: {
    type: Number,
    default: 0
  },
  archive: {
    type: Boolean,
    default: false
  },
  dateArchivage: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Index
projetSchema.index({ statut: 1 });
projetSchema.index({ chefProjet: 1 });
projetSchema.index({ idCategorie: 1 });
projetSchema.index({ archive: 1 });
projetSchema.index({ statut: 1, priorite: 1 });
projetSchema.index({ archive: 1, statut: 1 });

module.exports = mongoose.model('Projet', projetSchema);