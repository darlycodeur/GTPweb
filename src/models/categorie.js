const mongoose = require('mongoose');

const categorieSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    unique: true,
    minlength: 2,
    maxlength: 50,
    trim: true
  },
  couleur: {
    type: String,
    default: '#3B82F6'
  },
  icone: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  portee: {
    type: String,
    enum: ['projet', 'tache', 'les_deux'],
    default: 'les_deux'
  }
}, { timestamps: true });

// Index
// categorieSchema.index({ nom: 1 }, { unique: true });
categorieSchema.index({ portee: 1 });

module.exports = mongoose.model('Categorie', categorieSchema);