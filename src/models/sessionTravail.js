const mongoose = require('mongoose');

const sessionTravailSchema = new mongoose.Schema({
  tache: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tache',
    required: true
  },
  employe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  debut: {
    type: Date,
    required: true
  },
  fin: {
    type: Date,
    default: null
  },
  duree: {
    type: Number, // en minutes
    default: null
  },
  note: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index
sessionTravailSchema.index({ tache: 1 });
sessionTravailSchema.index({ employe: 1 });
sessionTravailSchema.index({ tache: 1, employe: 1 });
sessionTravailSchema.index({ employe: 1, debut: -1 });

module.exports = mongoose.model('SessionTravail', sessionTravailSchema);