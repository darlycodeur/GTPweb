const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    minlength: 2,
    maxlength: 60,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email obligatoire'],
    unique: true,
    lowercase: true,
    trim: true
  },
  motDePasse: {
    type: String,
    required: [true, 'Mot de passe obligatoire'],
    select: false // jamais retourné dans les réponses
  },
  role: {
    type: String,
    enum: ['employe', 'chef_projet', 'admin'],
    default: 'employe'
  },
  avatar: {
    type: String,
    default: ''
  },
  actif: {
    type: Boolean,
    default: true
  },
  quotaTaches: {
    type: Number,
    default: 10
  }
}, { timestamps: true });

// Index
// userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ actif: 1 });

module.exports = mongoose.model('User', userSchema);