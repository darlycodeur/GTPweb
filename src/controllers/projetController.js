const Projet = require('../models/Projet');
const Tache = require('../models/Tache');
const Notification = require('../models/Notification');
const JournalAudit = require('../models/JournalAudit');
const Categorie = require('../models/Categorie');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// ─────────────────────────────────────────────
// @route   POST /api/projets
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const creerProjet = async (req, res) => {
  try {
    const { titre, description, statut, priorite, idCategorie, dateDebut, dateFin, membres, budget } = req.body;

    // 1. Vérifier la catégorie
    const categorie = await Categorie.findById(idCategorie);
    if (!categorie || categorie.portee === 'tache') {
      return res.status(400).json({ message: 'Catégorie invalide pour un projet.' });
    }

    // 2. Vérifier membres
    if (!membres || membres.length === 0) {
      return res.status(400).json({ message: 'Au moins un membre est obligatoire.' });
    }

    // 3. Vérifier que tous les membres existent
    for (const membreId of membres) {
      const existe = await User.findById(membreId);
      if (!existe) return res.status(400).json({ message: `Membre introuvable : ${membreId}` });
    }

    // 4. Créer le projet
    const projet = await Projet.create({
      titre, description, statut, priorite,
      idCategorie, dateDebut, dateFin,
      chefProjet: req.user._id,
      membres, budget
    });

    // 5. Notifier chaque membre
    for (const membreId of membres) {
      await Notification.create({
        destinataire: membreId,
        type: 'assignation',
        titre: 'Ajouté à un projet',
        message: `Vous avez été ajouté au projet "${titre}"`,
        refId: projet._id,
        refModel: 'Projet'
      });
    }

    // 6. Journal audit
    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'creation',
      ressource: 'Projet',
      ressourceId: projet._id,
      details: { titre },
      ip: req.ip,
      suspecte: false
    });

    res.status(201).json({ message: 'Projet créé.', projet });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/projets
// @access  Privé
// ─────────────────────────────────────────────
const listerProjets = async (req, res) => {
  try {
    const { statut, priorite, idCategorie, chefProjet, q, archive, page = 1, limit = 10 } = req.query;
    const filtre = {};

    // Par défaut exclure les archivés, sauf si archive=true
    if (archive === 'true') {
      filtre.archive = true;
    } else if (archive === 'all') {
      // Pas de filtre archive
    } else {
      filtre.archive = false;
    }

    if (statut) filtre.statut = statut;
    if (priorite) filtre.priorite = priorite;
    if (idCategorie) filtre.idCategorie = idCategorie;
    if (chefProjet) filtre.chefProjet = chefProjet;
    if (q) filtre.titre = { $regex: q, $options: 'i' };

    // Employé voit uniquement ses projets
    if (req.user.role === 'employe') {
      filtre.membres = req.user._id;
    }

    // Chef de projet voit uniquement ses propres projets
    if (req.user.role === 'chef_projet') {
      filtre.chefProjet = req.user._id;
    }

    const skip = (page - 1) * limit;
    const total = await Projet.countDocuments(filtre);
    const projets = await Projet.find(filtre)
      .populate('idCategorie', 'nom couleur')
      .populate('chefProjet', 'nom email')
      .populate('membres', 'nom email avatar')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({ projets, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   GET /api/projets/:id
// @access  Privé
// ─────────────────────────────────────────────
const getProjet = async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id)
      .populate('idCategorie', 'nom couleur')
      .populate('chefProjet', 'nom email avatar')
      .populate('membres', 'nom email avatar role');

    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    res.status(200).json({ projet });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/projets/:id
// @access  Chef_projet (son projet), Admin
// ─────────────────────────────────────────────
const modifierProjet = async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    // Vérifier les droits
    const estChef = projet.chefProjet.toString() === req.user._id.toString();
    if (!estChef && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const avant = { titre: projet.titre, statut: projet.statut };
    const projetMaj = await Projet.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'modification',
      ressource: 'Projet',
      ressourceId: projet._id,
      details: { avant, apres: req.body },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Projet modifié.', projet: projetMaj });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   DELETE /api/projets/:id
// @access  Admin
// ─────────────────────────────────────────────
const supprimerProjet = async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    // Vérifier les tâches non terminées
    const tachesNonTerminees = await Tache.countDocuments({
      projet: projet._id,
      statut: { $ne: 'termine' }
    });
    if (tachesNonTerminees > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer : ${tachesNonTerminees} tâche(s) non terminée(s). Archivez ou terminez-les d'abord.`
      });
    }

    // Supprimer en cascade
    await Tache.deleteMany({ projet: projet._id });
    await Projet.findByIdAndDelete(req.params.id);

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'suppression',
      ressource: 'Projet',
      ressourceId: projet._id,
      details: { titre: projet.titre },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Projet supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/projets/:id/archiver
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const archiverProjet = async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    // Passer les tâches non terminées en suspendu
    await Tache.updateMany(
      { projet: projet._id, statut: { $ne: 'termine' } },
      { statut: 'bloque' }
    );

    projet.archive = true;
    projet.dateArchivage = new Date();
    await projet.save();

    // Notifier les membres
    for (const membreId of projet.membres) {
      await Notification.create({
        destinataire: membreId,
        type: 'statut',
        titre: 'Projet archivé',
        message: `Le projet "${projet.titre}" a été archivé`,
        refId: projet._id,
        refModel: 'Projet'
      });
    }

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'archivage',
      ressource: 'Projet',
      ressourceId: projet._id,
      details: { titre: projet.titre },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Projet archivé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// ─────────────────────────────────────────────
// @route   PUT /api/projets/:id/restaurer
// @access  Chef_projet, Admin
// ─────────────────────────────────────────────
const restaurerProjet = async (req, res) => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) return res.status(404).json({ message: 'Projet introuvable.' });

    projet.archive = false;
    projet.dateArchivage = null;
    await projet.save();

    // Notifier les membres de la restauration
    const membresIds = projet.membres.map(m => m.toString());
    await notificationService.notifierRestauration(membresIds, projet.titre, projet._id);

    await JournalAudit.create({
      utilisateur: req.user._id,
      action: 'restauration',
      ressource: 'Projet',
      ressourceId: projet._id,
      details: { titre: projet.titre },
      ip: req.ip,
      suspecte: false
    });

    res.status(200).json({ message: 'Projet restauré.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { creerProjet, listerProjets, getProjet, modifierProjet, supprimerProjet, archiverProjet, restaurerProjet };