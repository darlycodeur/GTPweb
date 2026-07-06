const JournalAudit = require('../models/JournalAudit');

const auditService = {

  // Enregistrer une action dans le journal
  enregistrer: async (utilisateurId, action, ressource, ressourceId, details = {}, ip = '') => {
    try {
      // Vérifier si l'action est suspecte
      const suspecte = await auditService.verifierSuspicion(utilisateurId, action, ip);

      await JournalAudit.create({
        utilisateur: utilisateurId,
        action,
        ressource,
        ressourceId,
        details,
        ip,
        suspecte
      });

      // Si suspecte, notifier l'admin
      if (suspecte) {
        await auditService.notifierAdmin(utilisateurId, action, ip);
      }
    } catch (error) {
      console.error('Erreur audit:', error.message);
    }
  },

  // Vérifier si une action est suspecte
  verifierSuspicion: async (utilisateurId, action, ip) => {
    try {
      const cinqMinutesAvant = new Date(Date.now() - 5 * 60 * 1000);

      // Plus de 5 suppressions en 5 minutes
      if (action === 'suppression') {
        const count = await JournalAudit.countDocuments({
          utilisateur: utilisateurId,
          action: 'suppression',
          createdAt: { $gte: cinqMinutesAvant }
        });
        if (count >= 5) return true;
      }

      // Plus de 10 tentatives de connexion échouées en 15 min
      if (action === 'connexion_echouee') {
        const quinzeMinutesAvant = new Date(Date.now() - 15 * 60 * 1000);
        const count = await JournalAudit.countDocuments({
          ip,
          action: 'connexion_echouee',
          createdAt: { $gte: quinzeMinutesAvant }
        });
        if (count >= 10) return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  },

  // Notifier l'admin d'une action suspecte
  notifierAdmin: async (utilisateurId, action, ip) => {
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');
      const admins = await User.find({ role: 'admin', actif: true }).select('_id');

      const notifications = admins.map(admin => ({
        destinataire: admin._id,
        type: 'audit',
        titre: '🚨 Action suspecte détectée',
        message: `Une action suspecte de type "${action}" a été détectée depuis l'IP ${ip}`,
        refId: utilisateurId,
        refModel: 'User'
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error('Erreur notification admin:', error.message);
    }
  },

  // Raccourcis pour les actions courantes
  connexion:        (userId, ip) => auditService.enregistrer(userId, 'connexion', 'User', userId, { message: 'Connexion réussie' }, ip),
  creation:         (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'creation', res, resId, details, ip),
  modification:     (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'modification', res, resId, details, ip),
  suppression:      (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'suppression', res, resId, details, ip),
  changementStatut: (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'changement_statut', res, resId, details, ip),
  archivage:        (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'archivage', res, resId, details, ip),
  restauration:     (userId, res, resId, details, ip) => auditService.enregistrer(userId, 'restauration', res, resId, details, ip),
};

module.exports = auditService;