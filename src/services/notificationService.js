const Notification = require('../models/Notification');

const notificationService = {

  // Envoyer une notification à un utilisateur
  envoyer: async (destinataire, type, titre, message, refId = null, refModel = null) => {
    try {
      await Notification.create({ destinataire, type, titre, message, refId, refModel });
    } catch (error) {
      console.error('Erreur notification:', error.message);
    }
  },

  // Notifier plusieurs utilisateurs
  envoyerGroupe: async (destinataires, type, titre, message, refId = null, refModel = null) => {
    try {
      const notifications = destinataires.map(dest => ({
        destinataire: dest, type, titre, message, refId, refModel
      }));
      await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Erreur notification groupe:', error.message);
    }
  },

  // Notifier assignation d'une tâche
  notifierAssignation: async (employeId, tacheTitre, chefNom, tacheId) => {
    await notificationService.envoyer(
      employeId,
      'assignation',
      'Nouvelle tâche assignée',
      `La tâche "${tacheTitre}" vous a été assignée par ${chefNom}`,
      tacheId,
      'Tache'
    );
  },

  // Notifier changement de statut
  notifierChangementStatut: async (chefId, tacheTitre, ancienStatut, nouveauStatut, tacheId) => {
    await notificationService.envoyer(
      chefId,
      'statut',
      'Statut de tâche modifié',
      `La tâche "${tacheTitre}" est passée de "${ancienStatut}" à "${nouveauStatut}"`,
      tacheId,
      'Tache'
    );
  },

  // Notifier échéance proche (48h)
  notifierEcheance: async (employeId, tacheTitre, tacheId) => {
    await notificationService.envoyer(
      employeId,
      'echeance',
      'Échéance dans moins de 48h',
      `La tâche "${tacheTitre}" arrive à échéance dans moins de 48 heures`,
      tacheId,
      'Tache'
    );
  },

  // Notifier dépassement de quota
  notifierQuotaDepasse: async (chefId, employeNom, quota) => {
    await notificationService.envoyer(
      chefId,
      'depassement',
      'Quota de tâches atteint',
      `${employeNom} a atteint son quota maximum de ${quota} tâches ouvertes`
    );
  },

  // Notifier archivage d'un projet
  notifierArchivage: async (membres, projetTitre, projetId) => {
    await notificationService.envoyerGroupe(
      membres,
      'statut',
      'Projet archivé',
      `Le projet "${projetTitre}" a été archivé`,
      projetId,
      'Projet'
    );
  },

  // Notifier nouveau commentaire
  notifierCommentaire: async (destinataireId, auteurNom, tacheTitre, tacheId) => {
    await notificationService.envoyer(
      destinataireId,
      'commentaire',
      'Nouveau commentaire',
      `${auteurNom} a commenté la tâche "${tacheTitre}"`,
      tacheId,
      'Tache'
    );
  },

  // Notifier mention @nom
  notifierMention: async (destinataireId, auteurNom, extrait, tacheId) => {
    await notificationService.envoyer(
      destinataireId,
      'mention',
      'Vous avez été mentionné',
      `${auteurNom} vous a mentionné dans un commentaire : "${extrait}"`,
      tacheId,
      'Tache'
    );
  },

  // Notifier restauration d'un projet
  notifierRestauration: async (membres, projetTitre, projetId) => {
    await notificationService.envoyerGroupe(
      membres,
      'statut',
      'Projet restauré',
      `Le projet "${projetTitre}" a été restauré`,
      projetId,
      'Projet'
    );
  }
};

module.exports = notificationService;