const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images (jpg, png, gif, webp) sont autorisées'));
    }
  }
});

// ─── Upload pour fichiers de tâches (pièces jointes) ──────
const storageFichiers = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/fichiers');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `fichier-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const MIME_AUTORISES = [
  'image/png', 'image/jpeg', 'image/gif',
  'application/pdf', 'application/msword',
  'text/plain'
];

const uploadFichier = multer({
  storage: storageFichiers,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (MIME_AUTORISES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Types autorisés : PNG, JPEG, GIF, PDF, DOC, TXT (max 10 Mo)'));
    }
  }
});

module.exports = { upload, uploadFichier };
