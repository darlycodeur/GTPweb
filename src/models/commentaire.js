const mongoose = require('mongoose');

const commentaireSchema = new mongoose.Schema({
  contenu: {
    type: String,
    required: [true, 'Le contenu est obligatoire'],
    minlength: 1,
    maxlength: 2000,
    trim: true
  },
  tache: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tache',
    required: true
  },
  auteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commentaire',
    default: null
  },
  modifie: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index
commentaireSchema.index({ tache: 1 });
commentaireSchema.index({ auteur: 1 });
commentaireSchema.index({ tache: 1, createdAt: -1 });

module.exports = mongoose.model('Commentaire', commentaireSchema);