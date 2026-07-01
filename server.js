const app = require('./src/app');
const connectDB = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  // 1. Connexion à MongoDB
  await connectDB();

  // 2. Démarrage du serveur
  app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🔍 Test API : http://localhost:${PORT}/api/health`);
  });
};

start();