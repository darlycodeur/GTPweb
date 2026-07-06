const Tache = require('../models/Tache');
const Projet = require('../models/Projet');
const User = require('../models/User');
const Notification = require('../models/Notification');
const JournalAudit = require('../models/JournalAudit');
const SessionTravail = require('../models/SessionTravail');
const { detecterCycle, getChaineDependances } = require('../services/cycleDetection');

// Calcul du score d'urgence
const calculerScoreUrgence = (priorite, dateEcheance) => {
  const scores = { basse: 10, normale: 30, haute: 60, critique: 90 };
  let score = scores[priorite] || 30;

  if (dateEcheance) {
    const joursRestants = Math.ceil((new Date(dateEcheance) - new Date()) / (1000 * 60 * 60 * 24));
    if (joursRestants < 0) score += 50;
    else if (joursRestants <= 2) score += 30;
    else if (joursRestants <= 7) score += 15;
  }

  return Math.min(score, 100);
};

// ─────────────────────────────────────────────
// @route   POST /api/taches
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const creerTache = async (req, res) => {
  try {
    const { titre, description, priorite, projet, assigneA, categorie, prerequis, dateEcheance, estimation, tags } = req.body;

    // 1. Vérifier que le projet existe et n'est pas archivé
    const projetExiste = await Projet.findById(projet);
    if (!projetExiste) return res.status(404).json({ message: 'Projet introuvable.' });
    if (projetExiste.archive) return res.status(400).json({ message: 'Impossible de créer une tâche dans un projet archivé.' });

    // 2. Vérifier que l'employé assigné est membre du projet
    if (assigneA) {
      const estMembre = projetExiste.membres.some(m => m.toString() === assigneA);
      if (!estMembre) return res.status(400).json({ message: "L'employé assigné n'est pas membre du projet." });

      // 3. Vérifier le quota
      const employe = await User.findById(assigneA);
      const tachesOuvertes = await Tache.countDocuments({
        assigneA,
        statut: { $in: ['a_faire', 'en_cours', 'en_revue'] }
      });
      if (tachesOuvertes >= employe.quotaTaches) {
        // Notifier le chef
        await Notification.create({
          destinataire: req.user._id,
          type: 'depassement',
          titre: 'Quota dépassé',
          message: `${employe.nom} a atteint son quota de tâches (${employe.quotaTaches})`,
          refId: assigneA,
          refModel: 'Tache'
        });
        return res.status(400).json({ message: `Quota de tâches dépassé pour cet employé.` });
      }
    }

    // 4. Vérifier les prérequis
    if (prerequis && prerequis.length > 0) {
      for (const prereqId of prerequis) {
        const prereq = await Tache.findById(prereqId);
        if (!prereq || prereq.projet.toString() !== projet) {
          return res.status(400).json({ message: 'Prérequis invalide ou appartenant à un autre projet.' });
        }
      }
    }

    // 5. Calculer le score d'urgence
    const scoreUrgence = calculerScoreUrgence(priorite, dateEcheance);

    // 6. Créer la tâche
    const tache = await Tache.create({
      titre, description, priorite, projet,
      assigneA, categorie, prerequis, dateEcheance,
      estimation, tags, scoreUrgence,
      createdBy: req.user._id
    });

    // 7. Notifier l'employé assigné
    if (assigneA) {
      await Notification.create({
        destinataire: assigneA,
        type: 'assignation',
        titre: 'Nouvelle tâche assignée',
        message: `La tâche "${titre}" vous a été assignée`,
        refId: tache._id,
        refModel: 'Tache'
      });
    }

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'creation',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { titre },
      ip: req.ip,
      suspecte: false
    });

    res.status(201).json({ message: 'Tâche créée.', tache });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/taches
// @access  Privé
// ─────────────────────────────────────────────
const listerTaches = async (req, res) => {
  try {
    const { projet, statut, priorite, tri, page = 1, limit = 10 } = req.query;
    const filtre = {};

    if (statut) filtre.statut = statut;
    if (priorite) filtre.priorite = priorite;

    // Employé voit uniquement ses tâches
    if (req.user.role === 'employe') filtre.assigneA = req.user._id;

    // Chef de projet voit uniquement les tâches de ses propres projets
    if (req.user.role === 'chef_projet') {
      const mesProjets = await Projet.find({ chefProjet: req.user._id }).select('_id');
      const idsProjets = mesProjets.map(p => p._id);
      if (idsProjets.length === 0) {
        return res.status(200).json({ taches: [], total: 0, page: 1, totalPages: 0 });
      }
      // Si un projet spécifique est demandé, vérifier qu'il appartient au chef
      if (projet) {
        if (!idsProjets.some(id => id.toString() === projet)) {
          return res.status(403).json({ message: 'Accès non autorisé à ce projet.' });
        }
        filtre.projet = projet;
      } else {
        filtre.projet = { $in: idsProjets };
      }
    } else if (projet) {
      filtre.projet = projet;
    }

    const skip = (page - 1) * limit;
    const total = await Tache.countDocuments(filtre);
    const sort = tri === 'urgence' ? { scoreUrgence: -1 } : { createdAt: -1 };

    const taches = await Tache.find(filtre)
      .populate('projet', 'titre')
      .populate('assigneA', 'nom avatar')
      .populate('categorie', 'nom couleur')
      .populate('createdBy', 'nom')
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    res.status(200).json({ taches, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/taches/:id
// @access  Privé
// ─────────────────────────────────────────────
const getTache = async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.id)
      .populate('projet', 'titre statut')
      .populate('assigneA', 'nom email avatar')
      .populate('categorie', 'nom couleur')
      .populate('createdBy', 'nom')
      .populate('prerequis', 'titre statut')
      .populate('historique.changedBy', 'nom');

    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });
    res.status(200).json({ tache });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/taches/:id/statut
// @access  Privé
// ─────────────────────────────────────────────
const changerStatut = async (req, res) => {
  try {
    const { nouveauStatut, note } = req.body;
    const tache = await Tache.findById(req.params.id);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    // 1. Vérifier que le statut est différent
    if (tache.statut === nouveauStatut) {
      return res.status(400).json({ message: 'La tâche est déjà dans ce statut.' });
    }

    // 2. Vérifier les prérequis si passage en en_cours
    if (nouveauStatut === 'en_cours' && tache.prerequis.length > 0) {
      for (const prereqId of tache.prerequis) {
        const prereq = await Tache.findById(prereqId);
        if (prereq && prereq.statut !== 'termine') {
          return res.status(400).json({ message: `Le prérequis "${prereq.titre}" n'est pas encore terminé.` });
        }
      }
    }

    const ancienStatut = tache.statut;

    // 3. Mettre à jour le statut
    tache.statut = nouveauStatut;

    // 4. Gérer dateCompletion
    if (nouveauStatut === 'termine') {
      tache.dateCompletion = new Date();
      // Arrêter session en cours si existante
      await SessionTravail.findOneAndUpdate(
        { tache: tache._id, fin: null },
        { fin: new Date() }
      );
    } else {
      tache.dateCompletion = null;
    }

    // 5. Ajouter dans l'historique
    tache.historique.push({
      ancienStatut,
      nouveauStatut,
      changedBy: req.user._id,
      note: note || '',
      changedAt: new Date()
    });

    // 6. Recalculer le score d'urgence
    tache.scoreUrgence = calculerScoreUrgence(tache.priorite, tache.dateEcheance);

    await tache.save();

    // 7. Notifier le chef de projet
    const projet = await Projet.findById(tache.projet);
    if (projet) {
      await Notification.create({
        destinataire: projet.chefProjet,
        type: 'statut',
        titre: 'Statut de tâche modifié',
        message: `La tâche "${tache.titre}" est passée de "${ancienStatut}" à "${nouveauStatut}"`,
        refId: tache._id,
        refModel: 'Tache'
      });
    }

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'changement_statut',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { avant: { statut: ancienStatut }, apres: { statut: nouveauStatut } },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Statut mis à jour.', tache });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/taches/:id
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const modifierTache = async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.id);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    const champsAutorises = ['titre', 'description', 'priorite', 'dateEcheance', 'estimation', 'tags', 'categorie'];
    const modifications = {};
    for (const champ of champsAutorises) {
      if (req.body[champ] !== undefined) {
        modifications[champ] = req.body[champ];
      }
    }

    // Recalculer le score d'urgence si priorité ou date modifiée
    const priorite = req.body.priorite || tache.priorite;
    const dateEcheance = req.body.dateEcheance || tache.dateEcheance;
    if (req.body.priorite || req.body.dateEcheance) {
      modifications.scoreUrgence = calculerScoreUrgence(priorite, dateEcheance);
    }

    const tacheMaj = await Tache.findByIdAndUpdate(req.params.id, modifications, { new: true, runValidators: true });

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'modification',
      ressource: 'Tache',
      ressourceId: tache._id,
      details: { avant: { titre: tache.titre, priorite: tache.priorite }, apres: modifications },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Tâche modifiée.', tache: tacheMaj });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/taches/:id
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const supprimerTache = async (req, res) => {
  try {
    const tache = await Tache.findByIdAndDelete(req.params.id);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    res.status(200).json({ message: 'Tâche supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   POST /api/taches/:id/prerequis
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const ajouterPrerequis = async (req, res) => {
  try {
    const { prereqId } = req.body;
    const tache = await Tache.findById(req.params.id);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    if (!prereqId) return res.status(400).json({ message: 'ID du prérequis requis.' });

    const prereq = await Tache.findById(prereqId);
    if (!prereq) return res.status(404).json({ message: 'Tâche prérequis introuvable.' });
    if (prereq.projet.toString() !== tache.projet.toString()) {
      return res.status(400).json({ message: 'Les tâches doivent appartenir au même projet.' });
    }
    if (tache.prerequis.some(p => p.toString() === prereqId)) {
      return res.status(400).json({ message: 'Ce prérequis est déjà ajouté.' });
    }

    const cycle = await detecterCycle(tache._id, prereqId);
    if (cycle) return res.status(400).json({ message: 'Ajout impossible : détection de cycle.' });

    tache.prerequis.push(prereqId);
    await tache.save();

    res.status(200).json({ message: 'Prérequis ajouté.', tache });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/taches/:id/prerequis/:prereqId
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const retirerPrerequis = async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.id);
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    tache.prerequis = tache.prerequis.filter(p => p.toString() !== req.params.prereqId);
    await tache.save();

    res.status(200).json({ message: 'Prérequis retiré.', tache });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/taches/:id/chaine-dependances
// @access  Privé
// ─────────────────────────────────────────────
const chaineDependances = async (req, res) => {
  try {
    const tache = await Tache.findById(req.params.id).select('titre');
    if (!tache) return res.status(404).json({ message: 'Tâche introuvable.' });

    const chaine = await getChaineDependances(req.params.id);
    res.status(200).json({ tache: tache.titre, chaine });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { creerTache, listerTaches, getTache, modifierTache, changerStatut, supprimerTache, ajouterPrerequis, retirerPrerequis, chaineDependances };