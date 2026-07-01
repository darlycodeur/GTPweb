const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'assignation', 'statut', 'commentaire',
      'echeance', 'mention', 'depassement',
      'bloque_critique', 'audit'
    ],
    required: true
  },
  titre: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  lu: {
    type: Boolean,
    default: false
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  refModel: {
    type: String,
    enum: ['Tache', 'Projet', 'Commentaire'],
    default: null
  }
}, { timestamps: true });

// Index
notificationSchema.index({ destinataire: 1, lu: 1 });
notificationSchema.index({ destinataire: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);