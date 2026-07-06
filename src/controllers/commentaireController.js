const Commentaire = require('../models/Commentaire');
const Notification = require('../models/Notification');
const Tache = require('../models/Tache');
const User = require('../models/User');

const extraireMentions = (contenu) => {
  const regex = /@(\w{2,30})/g;
  const matches = [];
  let match;
  while ((match = regex.exec(contenu)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

const notifierMentions = async (nomsMentionnes, auteurId, auteurNom, extrait, tacheId, saufIds = []) => {
  for (const nom of nomsMentionnes) {
    const user = await User.findOne({ nom: { $regex: new RegExp(`^${nom}$`, 'i') }, actif: true });
    if (user && !saufIds.includes(user._id.toString()) && user._id.toString() !== auteurId.toString()) {
      await Notification.create({
        destinataire: user._id,
        type: 'mention',
        titre: 'Vous avez été mentionné',
        message: `${auteurNom} vous a mentionné dans un commentaire : "${extrait}"`,
        refId: tacheId,
        refModel: 'Tache'
      });
    }
  }
};

const creerCommentaire = async (req, res) => {
  try {
    const { contenu, tache, parentId } = req.body;

    const commentaire = await Commentaire.create({
      contenu, tache,
      auteur: req.user._id,
      parentId: parentId || null
    });

    // Détection des mentions @nom
    const nomsMentionnes = extraireMentions(contenu);
    if (nomsMentionnes.length > 0) {
      await notifierMentions(nomsMentionnes, req.user._id, req.user.nom, contenu.substring(0, 100), tache);
    }

    // Notifier le créateur de la tâche + assigné + chef
    const tacheDoc = await Tache.findById(tache).populate('projet', 'chefProjet');
    const notifies = new Set();
    if (tacheDoc) {
      if (tacheDoc.createdBy && tacheDoc.createdBy.toString() !== req.user._id.toString()) {
        notifies.add(tacheDoc.createdBy.toString());
      }
      if (tacheDoc.assigneA && tacheDoc.assigneA.toString() !== req.user._id.toString()) {
        notifies.add(tacheDoc.assigneA.toString());
      }
      if (tacheDoc.projet?.chefProjet && tacheDoc.projet.chefProjet.toString() !== req.user._id.toString()) {
        notifies.add(tacheDoc.projet.chefProjet.toString());
      }
      for (const destId of notifies) {
        await Notification.create({
          destinataire: destId,
          type: 'commentaire',
          titre: 'Nouveau commentaire',
          message: `${req.user.nom} a commenté la tâche "${tacheDoc.titre}"`,
          refId: tache,
          refModel: 'Tache'
        });
      }
    }

    await commentaire.populate('auteur', 'nom avatar');
    res.status(201).json({ message: 'Commentaire ajouté.', commentaire });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const listerCommentaires = async (req, res) => {
  try {
    const { tacheId } = req.params;
    const commentaires = await Commentaire.find({ tache: tacheId })
      .populate('auteur', 'nom avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({ commentaires });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const modifierCommentaire = async (req, res) => {
  try {
    const commentaire = await Commentaire.findById(req.params.id);
    if (!commentaire) return res.status(404).json({ message: 'Commentaire introuvable.' });

    if (commentaire.auteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const ancienContenu = commentaire.contenu;
    commentaire.contenu = req.body.contenu;
    commentaire.modifie = true;
    await commentaire.save();

    // Re-détection des mentions : ne notifier que les nouveaux mentionnés
    const anciennesMentions = extraireMentions(ancienContenu);
    const nouvellesMentions = extraireMentions(req.body.contenu);
    const nouveaux = nouvellesMentions.filter(n => !anciennesMentions.includes(n));
    if (nouveaux.length > 0) {
      const dejaNotifies = anciennesMentions.map(n => n.toLowerCase());
      const aNotifier = nouveaux.filter(n => !dejaNotifies.includes(n.toLowerCase()));
      if (aNotifier.length > 0) {
        await notifierMentions(aNotifier, req.user._id, req.user.nom, req.body.contenu.substring(0, 100), commentaire.tache);
      }
    }

    res.status(200).json({ message: 'Commentaire modifié.', commentaire });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const supprimerCommentaire = async (req, res) => {
  try {
    const commentaire = await Commentaire.findById(req.params.id);
    if (!commentaire) return res.status(404).json({ message: 'Commentaire introuvable.' });

    const estAuteur = commentaire.auteur.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    // Supprimer en cascade les réponses
    await Commentaire.deleteMany({ parentId: commentaire._id });
    await Commentaire.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Commentaire et ses réponses supprimés.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { creerCommentaire, listerCommentaires, modifierCommentaire, supprimerCommentaire };