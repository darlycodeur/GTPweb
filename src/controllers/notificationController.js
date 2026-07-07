const Notification = require('../models/Notification');

const mesNotifications = async (req, res) => {
  try {
    const { lu, page = 1, limit = 20 } = req.query;
    const filtre = { destinataire: req.user._id };
    if (lu !== undefined) filtre.lu = lu === 'true';

    const skip = (page - 1) * limit;
    const total = await Notification.countDocuments(filtre);
    const notifications = await Notification.find(filtre)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ notifications, total });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const marquerLue = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { lu: true });
    res.status(200).json({ message: 'Notification marquée comme lue.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const marquerToutesLues = async (req, res) => {
  try {
    await Notification.updateMany({ destinataire: req.user._id, lu: false }, { lu: true });
    res.status(200).json({ message: 'Toutes les notifications marquées comme lues.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const supprimerNotification = async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, destinataire: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification introuvable.' });
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Notification supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const supprimerToutesNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ destinataire: req.user._id });
    res.status(200).json({ message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { mesNotifications, marquerLue, marquerToutesLues, supprimerNotification, supprimerToutesNotifications };