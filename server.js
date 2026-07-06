const app = require('./src/app');
const connectDB = require('./src/config/database');
const cron = require('node-cron');
const escaladeService = require('./src/services/escaladeService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const start = async () => {
  // 1. Connexion à MongoDB
  await connectDB();

  // 2. Planifier les tâches cron
  // Exécuter l'escalade automatique toutes les heures
  cron.schedule('0 * * * *', () => {
    console.log('🔔 Exécution du service d\'escalade automatique...');
    escaladeService.executer();
  });

  // 3. Démarrage du serveur
  app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🔍 Test API : http://localhost:${PORT}/api/health`);
  });
};

start();