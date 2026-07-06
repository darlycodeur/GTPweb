const JournalAudit = require('../models/JournalAudit');

const listerAudit = async (req, res) => {
  try {
    const { action, ressource, suspecte, page = 1, limit = 20 } = req.query;
    const filtre = {};

    if (action) filtre.action = action;
    if (ressource) filtre.ressource = ressource;
    if (suspecte !== undefined) filtre.suspecte = suspecte === 'true';

    const skip = (page - 1) * limit;
    const total = await JournalAudit.countDocuments(filtre);
    const logs = await JournalAudit.find(filtre)
      .populate('utilisateur', 'nom email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { listerAudit };