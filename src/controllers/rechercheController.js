const Projet = require('../models/Projet');
const Tache = require('../models/Tache');
const Commentaire = require('../models/Commentaire');

const normaliser = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const rechercher = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Minimum 2 caractères pour la recherche.' });
    }

    const terme = normaliser(q.trim());
    const regex = new RegExp(terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Construire les filtres avec restriction de rôles
    const filtreProjet = {
      $or: [
        { titre: { $regex: regex } },
        { description: { $regex: regex } }
      ],
      archive: false
    };

    const filtreTache = {
      $or: [
        { titre: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $regex: regex } }
      ]
    };

    const filtreCommentaire = { contenu: { $regex: regex } };

    // Restriction : employé voit seulement ses projets/tâches
    if (req.user.role === 'employe') {
      const mesProjets = await Projet.find({ membres: req.user._id, archive: false }).select('_id');
      const idsProjets = mesProjets.map(p => p._id);

      filtreProjet._id = { $in: idsProjets };
      filtreTache.projet = { $in: idsProjets };

      const mesTaches = await Tache.find({ assigneA: req.user._id }).select('_id');
      const idsTaches = mesTaches.map(t => t._id);
      filtreCommentaire.tache = { $in: idsTaches };
    }

    const [projets, taches, commentaires] = await Promise.all([
      Projet.find(filtreProjet).limit(5).select('titre description statut priorite'),
      Tache.find(filtreTache).limit(5)
        .populate('projet', 'titre')
        .select('titre description statut priorite projet'),
      Commentaire.find(filtreCommentaire).limit(5)
        .populate('auteur', 'nom')
        .populate('tache', 'titre')
        .select('contenu auteur tache')
    ]);

    res.status(200).json({
      resultats: {
        projets: { count: projets.length, items: projets },
        taches: { count: taches.length, items: taches },
        commentaires: { count: commentaires.length, items: commentaires }
      },
      terme: q
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { rechercher };