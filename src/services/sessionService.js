const SessionTravail = require('../models/SessionTravail');
const Tache = require('../models/Tache');
const notificationService = require('./notificationService');
const Projet = require('../models/Projet');

const sessionService = {

  // Démarrer une session de travail
  demarrer: async (tacheId, employeId) => {
    // Vérifier qu'il n'y a pas déjà une session en cours
    const sessionEnCours = await SessionTravail.findOne({
      tache: tacheId,
      employe: employeId,
      fin: null
    });

    if (sessionEnCours) {
      throw new Error('Une session est déjà en cours pour cette tâche.');
    }

    // Créer la session
    const session = await SessionTravail.create({
      tache: tacheId,
      employe: employeId,
      debut: new Date()
    });

    // Passer la tâche en "en_cours" si elle ne l'est pas déjà
    const tache = await Tache.findById(tacheId);
    if (tache && tache.statut === 'a_faire') {
      tache.statut = 'en_cours';
      tache.historique.push({
        ancienStatut: 'a_faire',
        nouveauStatut: 'en_cours',
        changedBy: employeId,
        note: 'Démarrage automatique du chronomètre',
        changedAt: new Date()
      });
      await tache.save();
    }

    return session;
  },

  // Arrêter une session de travail
  arreter: async (tacheId, employeId, note = '') => {
    // Retrouver la session en cours
    const session = await SessionTravail.findOne({
      tache: tacheId,
      employe: employeId,
      fin: null
    });

    if (!session) {
      throw new Error('Aucune session en cours pour cette tâche.');
    }

    // Calculer la durée
    const fin = new Date();
    const dureeMs = fin - session.debut;
    const dureeMinutes = Math.ceil(dureeMs / 60000);

    session.fin    = fin;
    session.duree  = dureeMinutes;
    session.note   = note;
    await session.save();

    // Recalculer le temps réel total de la tâche
    await sessionService.recalculerTempsReel(tacheId);

    return session;
  },

  // Recalculer le temps réel total d'une tâche
  recalculerTempsReel: async (tacheId) => {
    const sessions = await SessionTravail.find({
      tache: tacheId,
      fin: { $ne: null }
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duree || 0), 0);

    const tache = await Tache.findByIdAndUpdate(
      tacheId,
      { tempsReel: totalMinutes },
      { new: true }
    );

    // Vérifier si le temps réel dépasse l'estimation de plus de 20%
    if (tache && tache.estimation > 0) {
      const estimationMinutes = tache.estimation * 60;
      const depassement = ((totalMinutes - estimationMinutes) / estimationMinutes) * 100;

      if (depassement > 20) {
        // Notifier le chef de projet
        const projet = await Projet.findById(tache.projet);
        if (projet) {
          await notificationService.envoyer(
            projet.chefProjet,
            'depassement',
            'Dépassement de temps détecté',
            `La tâche "${tache.titre}" a dépassé son estimation de ${Math.round(depassement)}%`,
            tache._id,
            'Tache'
          );
        }
      }
    }

    return tache;
  },

  // Obtenir le rapport de temps d'un employé
  rapport: async (employeId, debut, fin) => {
    const filtre = { employe: employeId, fin: { $ne: null } };
    if (debut) filtre.debut = { $gte: new Date(debut) };
    if (fin)   filtre.fin   = { ...filtre.fin, $lte: new Date(fin) };

    const sessions = await SessionTravail.find(filtre)
      .populate({ path: 'tache', populate: { path: 'projet', select: 'titre' } })
      .sort({ debut: -1 });

    // Grouper par tâche
    const parTache = {};
    // Grouper par projet
    const parProjet = {};
    sessions.forEach(s => {
      const tacheId = s.tache?._id?.toString();
      const projetId = s.tache?.projet?._id?.toString();
      const projetTitre = s.tache?.projet?.titre || 'Inconnu';

      if (!parTache[tacheId]) {
        parTache[tacheId] = {
          tache: s.tache?.titre,
          projet: projetTitre,
          totalMinutes: 0,
          sessions: 0
        };
      }
      parTache[tacheId].totalMinutes += s.duree || 0;
      parTache[tacheId].sessions += 1;

      if (!parProjet[projetId]) {
        parProjet[projetId] = {
          projet: projetTitre,
          totalMinutes: 0,
          sessions: 0
        };
      }
      parProjet[projetId].totalMinutes += s.duree || 0;
      parProjet[projetId].sessions += 1;
    });

    const totalGeneral = sessions.reduce((sum, s) => sum + (s.duree || 0), 0);

    return {
      totalMinutes: totalGeneral,
      totalHeures: Math.round(totalGeneral / 60 * 10) / 10,
      parTache: Object.values(parTache),
      parProjet: Object.values(parProjet),
      sessions
    };
  }
};

module.exports = sessionService;