const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARES GLOBAUX ───────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── FICHIERS STATIQUES (frontend) ────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── FICHIERS UPLOADÉS ────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── ROUTES API ───────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/projets',       require('./routes/projetRoutes'));
app.use('/api/categories',    require('./routes/categorieRoutes'));
app.use('/api/taches',        require('./routes/tacheRoutes'));
app.use('/api/commentaires',  require('./routes/commentaireRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/sessions',      require('./routes/sessionTravailRoutes'));
app.use('/api/audit',         require('./routes/auditRoutes'));
app.use('/api/upload',        require('./routes/uploadRoutes'));

// ─── ROUTE SANTÉ ──────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur opérationnel',
    timestamp: new Date()
  });
});

// ─── PAGE D'ACCUEIL → redirige vers login ──
app.get('/', (req, res) => {
  res.redirect('/auth/login.html');
});

// ─── ROUTE 404 ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// ─── GESTIONNAIRE D'ERREURS GLOBAL ────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Erreur interne du serveur'
  });
});

module.exports = app;