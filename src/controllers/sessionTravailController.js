const SessionTravail = require('../models/SessionTravail');
const Tache = require('../models/Tache');
const sessionService = require('../services/sessionService');

const demarrerSession = async (req, res) => {
  try {
    const { tacheId } = req.params;

    const sessionEnCours = await SessionTravail.findOne({ tache: tacheId, employe: req.user._id, fin: null });
    if (sessionEnCours) return res.status(400).json({ message: 'Une session est déjà en cours.' });

    const session = await SessionTravail.create({
      tache: tacheId,
      employe: req.user._id,
      debut: new Date()
    });

    res.status(201).json({ message: 'Session démarrée.', session });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const arreterSession = async (req, res) => {
  try {
    const { tacheId } = req.params;
    const { note } = req.body;

    const session = await SessionTravail.findOne({ tache: tacheId, employe: req.user._id, fin: null });
    if (!session) return res.status(404).json({ message: 'Aucune session en cours.' });

    session.fin = new Date();
    session.duree = Math.ceil((session.fin - session.debut) / 60000);
    session.note = note || '';
    await session.save();

    const totalMinutes = await SessionTravail.aggregate([
      { $match: { tache: session.tache, fin: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$duree' } } }
    ]);

    await Tache.findByIdAndUpdate(tacheId, {
      tempsReel: totalMinutes[0]?.total || 0
    });

    res.status(200).json({ message: 'Session arrêtée.', session });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const mesSessions = async (req, res) => {
  try {
    const sessions = await SessionTravail.find({ employe: req.user._id })
      .populate('tache', 'titre')
      .sort({ debut: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 6.3 Consulter toutes les sessions d'une tâche
const sessionsParTache = async (req, res) => {
  try {
    const { tacheId } = req.params;
    const sessions = await SessionTravail.find({ tache: tacheId })
      .populate('employe', 'nom avatar')
      .sort({ debut: -1 });

    const totalGlobal = sessions.reduce((sum, s) => sum + (s.duree || 0), 0);
    const parEmploye = {};
    sessions.forEach(s => {
      const id = s.employe?._id?.toString();
      if (!parEmploye[id]) {
        parEmploye[id] = { employe: s.employe, totalMinutes: 0 };
      }
      parEmploye[id].totalMinutes += s.duree || 0;
    });

    const sessionEnCours = sessions.some(s => s.fin === null);

    res.status(200).json({ sessions, totalGlobal, parEmploye: Object.values(parEmploye), sessionEnCours });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

// 6.4 Rapport de temps par employé
const monRapport = async (req, res) => {
  try {
    const { debut, fin } = req.query;
    const employeId = req.user._id;
    const rapport = await sessionService.rapport(employeId, debut, fin);
    res.status(200).json(rapport);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

module.exports = { demarrerSession, arreterSession, mesSessions, sessionsParTache, monRapport };