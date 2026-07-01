const mongoose = require('mongoose');

const journalAuditSchema = new mongoose.Schema({
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  action: {
    type: String,
    enum: [
      'connexion', 'deconnexion', 'creation',
      'modification', 'suppression', 'changement_statut',
      'upload', 'archivage', 'restauration'
    ],
    required: true
  },
  ressource: {
    type: String,
    enum: ['User', 'Projet', 'Tache', 'Commentaire', 'Categorie'],
    required: true
  },
  ressourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: ''
  },
  suspecte: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index
journalAuditSchema.index({ utilisateur: 1 });
journalAuditSchema.index({ action: 1 });
journalAuditSchema.index({ ressource: 1 });
journalAuditSchema.index({ suspecte: 1 });
journalAuditSchema.index({ createdAt: -1 });
journalAuditSchema.index({ utilisateur: 1, createdAt: -1 });

module.exports = mongoose.model('JournalAudit', journalAuditSchema);