const Tache = require('../models/Tache');
const SessionTravail = require('../models/SessionTravail');

// 13.1 Tâches du jour
const tachesDuJour = async (req, res) => {
  try {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const demain = new Date(aujourdHui);
    demain.setDate(demain.getDate() + 1);

    const taches = await Tache.find({
      assigneA: req.user._id,
      $or: [
        { dateEcheance: { $gte: aujourdHui, $lt: demain } },
        { dateEcheance: { $lt: aujourdHui }, statut: { $ne: 'termine' } }
      ]
    })
      .populate('projet', 'titre')
      .sort({ scoreUrgence: -1 });

    res.status(200).json({ taches });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 13.2 Résumé de la semaine
const resumeSemaine = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutSemaine = new Date(maintenant);
    debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
    debutSemaine.setHours(0, 0, 0, 0);
    const finSemaine = new Date(debutSemaine);
    finSemaine.setDate(finSemaine.getDate() + 7);

    const debutSemainePrecedente = new Date(debutSemaine);
    debutSemainePrecedente.setDate(debutSemainePrecedente.getDate() - 7);
    const finSemainePrecedente = new Date(debutSemaine);

    const [termineesCetteSemaine, enRetard, aVenirCetteSemaine, termineesSemainePrecedente] = await Promise.all([
      Tache.countDocuments({ assigneA: req.user._id, statut: 'termine', dateCompletion: { $gte: debutSemaine, $lt: finSemaine } }),
      Tache.countDocuments({ assigneA: req.user._id, statut: { $ne: 'termine' }, dateEcheance: { $lt: maintenant } }),
      Tache.countDocuments({ assigneA: req.user._id, dateEcheance: { $gte: maintenant, $lt: finSemaine } }),
      Tache.countDocuments({ assigneA: req.user._id, statut: 'termine', dateCompletion: { $gte: debutSemainePrecedente, $lt: finSemainePrecedente } })
    ]);

    res.status(200).json({
      termineesCetteSemaine,
      enRetard,
      aVenirCetteSemaine,
      semainePrecedente: termineesSemainePrecedente,
      tendance: termineesCetteSemaine > termineesSemainePrecedente ? 'hausse' : termineesCetteSemaine < termineesSemainePrecedente ? 'baisse' : 'stable'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 13.3 Taux de complétion mensuel
const tauxCompletionMensuel = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutMoisProchain = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
    const debutMoisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);

    const [termineesCeMois, totalAssigneesCeMois, termineesMoisPrecedent, totalAssigneesMoisPrecedent] = await Promise.all([
      Tache.countDocuments({ assigneA: req.user._id, statut: 'termine', dateCompletion: { $gte: debutMois, $lt: debutMoisProchain } }),
      Tache.countDocuments({ assigneA: req.user._id, createdAt: { $lt: debutMoisProchain } }),
      Tache.countDocuments({ assigneA: req.user._id, statut: 'termine', dateCompletion: { $gte: debutMoisPrecedent, $lt: debutMois } }),
      Tache.countDocuments({ assigneA: req.user._id, createdAt: { $lt: debutMois } })
    ]);

    const tauxCeMois = totalAssigneesCeMois > 0 ? Math.round((termineesCeMois / totalAssigneesCeMois) * 100) : 0;
    const tauxMoisPrecedent = totalAssigneesMoisPrecedent > 0 ? Math.round((termineesMoisPrecedent / totalAssigneesMoisPrecedent) * 100) : 0;

    // Temps total travaillé ce mois
    const sessions = await SessionTravail.find({
      employe: req.user._id,
      fin: { $ne: null },
      debut: { $gte: debutMois, $lt: debutMoisProchain }
    });
    const tempsTotalMinutes = sessions.reduce((sum, s) => sum + (s.duree || 0), 0);

    res.status(200).json({
      tauxCompletion: tauxCeMois,
      terminees: termineesCeMois,
      totalAssignees: totalAssigneesCeMois,
      moisPrecedent: { taux: tauxMoisPrecedent, terminees: termineesMoisPrecedent },
      tempsTotal: { minutes: tempsTotalMinutes, heures: Math.round(tempsTotalMinutes / 60 * 10) / 10 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 13.4 Tâches les plus urgentes (top 5)
const tachesUrgentes = async (req, res) => {
  try {
    const taches = await Tache.find({
      assigneA: req.user._id,
      statut: { $ne: 'termine' }
    })
      .populate('projet', 'titre')
      .sort({ scoreUrgence: -1 })
      .limit(5)
      .select('titre projet priorite dateEcheance scoreUrgence');

    const resultats = taches.map(t => {
      const tempsRestant = t.dateEcheance ? Math.ceil((t.dateEcheance - new Date()) / (1000 * 60 * 60)) : null;
      return {
        _id: t._id,
        titre: t.titre,
        projet: t.projet?.titre,
        priorite: t.priorite,
        dateEcheance: t.dateEcheance,
        scoreUrgence: t.scoreUrgence,
        tempsRestantHeures: tempsRestant
      };
    });

    res.status(200).json({ taches: resultats });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { tachesDuJour, resumeSemaine, tauxCompletionMensuel, tachesUrgentes };