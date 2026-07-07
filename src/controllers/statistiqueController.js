const Projet = require('../models/Projet');
const Tache = require('../models/Tache');
const Categorie = require('../models/Categorie');
const JournalAudit = require('../models/JournalAudit');

// 16.1 Statistiques d'un projet
const statistiquesProjet = async (req, res) => {
  try {
    const { id } = req.params;
    const projet = await Projet.findById(id);
    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    const taches = await Tache.find({ projet: id });

    const totalTaches = taches.length;
    const parStatut = { a_faire: 0, en_cours: 0, en_revue: 0, termine: 0, bloque: 0 };
    const parPriorite = { basse: 0, normale: 0, haute: 0, critique: 0 };
    taches.forEach(t => {
      if (parStatut[t.statut] !== undefined) parStatut[t.statut]++;
      if (parPriorite[t.priorite] !== undefined) parPriorite[t.priorite]++;
    });

    const terminees = parStatut.termine;
    const progression = totalTaches > 0 ? Math.round((terminees / totalTaches) * 100) : 0;

    const maintenant = new Date();
    const enRetard = taches.filter(t => t.statut !== 'termine' && t.dateEcheance && t.dateEcheance < maintenant).length;

    const estimationTotale = taches.reduce((sum, t) => sum + (t.estimation || 0), 0);
    const tempsReelTotal = taches.reduce((sum, t) => sum + (t.tempsReel || 0), 0);

    // Tâches par employé
    const parEmploye = {};
    taches.forEach(t => {
      if (!t.assigneA) return;
      const idEmp = t.assigneA.toString();
      if (!parEmploye[idEmp]) parEmploye[idEmp] = { assigneA: t.assigneA, total: 0, terminees: 0 };
      parEmploye[idEmp].total++;
      if (t.statut === 'termine') parEmploye[idEmp].terminees++;
    });
    for (const idEmp of Object.keys(parEmploye)) {
      parEmploye[idEmp].tauxCompletion = parEmploye[idEmp].total > 0
        ? Math.round((parEmploye[idEmp].terminees / parEmploye[idEmp].total) * 100) : 0;
    }

    res.status(200).json({
      projet: projet.titre,
      totalTaches,
      parStatut,
      parPriorite,
      progression,
      enRetard,
      estimationTotale,
      tempsReelTotal,
      parEmploye: Object.values(parEmploye)
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 16.2 Dashboard admin global
const dashboardAdmin = async (req, res) => {
  try {
    const maintenant = new Date();
    const ilYASeptJours = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [projets, taches, categories, employes, actionsRecentes, actionsSuspectes] = await Promise.all([
      Projet.find({}),
      Tache.find({}),
      Categorie.find({}),
      require('../models/User').find({ role: 'employe', actif: true }).select('nom quotaTaches'),
      JournalAudit.countDocuments({ createdAt: { $gte: ilYASeptJours } }),
      JournalAudit.countDocuments({ suspecte: true, createdAt: { $gte: ilYASeptJours } })
    ]);

    // Stats projets
    const projetsActifs = projets.filter(p => !p.archive).length;
    const projetsArchives = projets.filter(p => p.archive).length;
    const projetsParStatut = { planifie: 0, en_cours: 0, termine: 0, suspendu: 0 };
    const projetsParStatutArchives = { planifie: 0, en_cours: 0, termine: 0, suspendu: 0 };
    projets.forEach(p => {
      if (p.archive) {
        if (projetsParStatutArchives[p.statut] !== undefined) projetsParStatutArchives[p.statut]++;
      } else {
        if (projetsParStatut[p.statut] !== undefined) projetsParStatut[p.statut]++;
      }
    });

    // Stats catégories
    const projetsParCategorie = {};
    for (const cat of categories) {
      const count = projets.filter(p => p.idCategorie && p.idCategorie.toString() === cat._id.toString()).length;
      if (count > 0) projetsParCategorie[cat.nom] = count;
    }

    // Stats tâches
    const tachesParStatut = { a_faire: 0, en_cours: 0, en_revue: 0, termine: 0, bloque: 0 };
    taches.forEach(t => { if (tachesParStatut[t.statut] !== undefined) tachesParStatut[t.statut]++; });

    // Employés les plus chargés
    const employesCharges = await Promise.all(
      employes.map(async (emp) => {
        const ouvertes = await Tache.countDocuments({
          assigneA: emp._id,
          statut: { $in: ['a_faire', 'en_cours', 'en_revue'] }
        });
        return { nom: emp.nom, quota: emp.quotaTaches, tachesOuvertes: ouvertes };
      })
    );
    employesCharges.sort((a, b) => b.tachesOuvertes - a.tachesOuvertes);

    // Tâches les plus urgentes
    const tachesUrgentes = await Tache.find({ statut: { $ne: 'termine' } })
      .populate('projet', 'titre')
      .sort({ scoreUrgence: -1 })
      .limit(10)
      .select('titre projet priorite dateEcheance scoreUrgence');

    res.status(200).json({
      projets: { actifs: projetsActifs, archives: projetsArchives, parStatut: projetsParStatut, parStatutArchives: projetsParStatutArchives, parCategorie: projetsParCategorie },
      taches: { total: taches.length, parStatut: tachesParStatut },
      employes: employesCharges.slice(0, 5),
      tachesUrgentes,
      activite: { septJours: actionsRecentes, actionsSuspectes }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 16.3 Tâches proches de l'échéance
const tachesProchesEcheance = async (req, res) => {
  try {
    const jours = parseInt(req.query.jours) || 7;
    const maintenant = new Date();
    const limite = new Date(maintenant.getTime() + jours * 24 * 60 * 60 * 1000);

    const taches = await Tache.find({
      statut: { $ne: 'termine' },
      dateEcheance: { $gte: maintenant, $lte: limite }
    })
      .populate('projet', 'titre')
      .populate('assigneA', 'nom')
      .sort({ dateEcheance: 1 });

    // Grouper par projet
    const parProjet = {};
    taches.forEach(t => {
      const projetId = t.projet?._id?.toString() || 'inconnu';
      if (!parProjet[projetId]) {
        parProjet[projetId] = { projet: t.projet?.titre || 'Inconnu', taches: [] };
      }
      parProjet[projetId].taches.push({
        _id: t._id,
        titre: t.titre,
        statut: t.statut,
        priorite: t.priorite,
        assigneA: t.assigneA?.nom,
        dateEcheance: t.dateEcheance,
        heuresRestantes: Math.ceil((t.dateEcheance - maintenant) / (1000 * 60 * 60))
      });
    });

    res.status(200).json({ parProjet: Object.values(parProjet), total: taches.length });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { statistiquesProjet, dashboardAdmin, tachesProchesEcheance };