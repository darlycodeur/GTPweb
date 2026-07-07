const Tache = require('../models/Tache');
const Projet = require('../models/Projet');
const Notification = require('../models/Notification');
const JournalAudit = require('../models/JournalAudit');

const VERROUILLE = { acquis: false };

const verrouiller = () => {
  if (VERROUILLE.acquis) return false;
  VERROUILLE.acquis = true;
  return true;
};

const deverrouiller = () => { VERROUILLE.acquis = false; };

const executer = async () => {
  if (!verrouiller()) return;
  try {
    await escaladePriorite48h();
    await detectionTachesCritiquesBloquees();
    await dureeMaxBloquee();
  } catch (err) {
    console.error('Erreur escaladeService:', err.message);
  } finally {
    deverrouiller();
  }
};

// 7.2 Escalade automatique : échéance < 48h → critique
const escaladePriorite48h = async () => {
  const maintenant = new Date();
  const dans48h = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000);

  const taches = await Tache.find({
    dateEcheance: { $gte: maintenant, $lte: dans48h },
    statut: { $ne: 'termine' },
    priorite: { $ne: 'critique' }
  }).populate('projet', 'chefProjet');

  for (const tache of taches) {
    tache.priorite = 'critique';
    tache.historique.push({
      ancienStatut: tache.statut,
      nouveauStatut: tache.statut,
      changedBy: tache.createdBy,
      note: 'Escalade automatique : échéance dans moins de 48h',
      changedAt: new Date()
    });
    tache.scoreUrgence = Math.min((tache.scoreUrgence || 0) + 30, 100);
    await tache.save();

    if (tache.assigneA) {
      await Notification.create({
        destinataire: tache.assigneA,
        type: 'echeance',
        titre: 'Priorité escaladée en critique',
        message: `La tâche "${tache.titre}" a été passée en priorité critique (échéance dans < 48h)`,
        refId: tache._id,
        refModel: 'Tache'
      });
    }
    if (tache.projet?.chefProjet) {
      await Notification.create({
        destinataire: tache.projet.chefProjet,
        type: 'echeance',
        titre: 'Escalade de priorité',
        message: `La tâche "${tache.titre}" a été automatiquement passée en critique`,
        refId: tache._id,
        refModel: 'Tache'
      });
    }
    await JournalAudit.create({
      utilisateur: tache.createdBy,
      action: 'modification',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { message: 'Escalade automatique 48h', anciennePriorite: 'non-critique', nouvellePriorite: 'critique' },
      suspecte: false
    });
  }
};

// 7.3 Détection : > 2 tâches critiques bloquées dans un même projet
const detectionTachesCritiquesBloquees = async () => {
  const resultats = await Tache.aggregate([
    { $match: { statut: 'bloque', priorite: { $in: ['haute', 'critique'] } } },
    { $group: { _id: '$projet', count: { $sum: 1 }, taches: { $push: { _id: '$_id', titre: '$titre', updatedAt: '$updatedAt' } } } },
    { $match: { count: { $gte: 2 } } }
  ]);

  for (const groupe of resultats) {
    const projet = await Projet.findById(groupe._id).select('chefProjet titre');
    if (!projet) continue;

    await Notification.create({
      destinataire: projet.chefProjet,
      type: 'bloque_critique',
      titre: 'Tâches critiques bloquées',
      message: `${groupe.count} tâches critiques sont bloquées dans le projet "${projet.titre}".`,
      refId: projet._id,
      refModel: 'Projet'
    });
  }
};

// 15.3 Durée max en statut bloqué (72h)
const dureeMaxBloquee = async () => {
  const seuil = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const taches = await Tache.find({
    statut: 'bloque',
    updatedAt: { $lte: seuil }
  }).populate('projet', 'chefProjet titre');

  for (const tache of taches) {
    const heuresBloque = Math.round((Date.now() - tache.updatedAt) / (1000 * 60 * 60));
    if (!tache.projet?.chefProjet) continue;

    await Notification.create({
      destinataire: tache.projet.chefProjet,
      type: 'bloque_critique',
      titre: 'Tâche bloquée depuis trop longtemps',
      message: `La tâche "${tache.titre}" (assignée à ${tache.assigneA}) est bloquée depuis ${heuresBloque}h.`,
      refId: tache._id,
      refModel: 'Tache'
    });
  }
};

module.exports = { executer, escaladePriorite48h, detectionTachesCritiquesBloquees, dureeMaxBloquee };