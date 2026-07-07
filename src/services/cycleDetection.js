const Tache = require('../models/Tache');

const detecterCycle = async (tacheId, prereqId, visited = new Set()) => {
  if (tacheId.toString() === prereqId.toString()) return true;
  if (visited.has(prereqId.toString())) return false;
  visited.add(prereqId.toString());

  const prereq = await Tache.findById(prereqId).select('prerequis');
  if (!prereq) return false;

  for (const p of prereq.prerequis) {
    if (await detecterCycle(tacheId, p, visited)) return true;
  }
  return false;
};

const getChaineDependances = async (tacheId, depth = 0, maxDepth = 10) => {
  if (depth > maxDepth) return [];
  const tache = await Tache.findById(tacheId)
    .populate('prerequis', 'titre statut assigneA dateEcheance')
    .select('titre statut assigneA dateEcheance prerequis');
  if (!tache) return [];

  const result = [];
  for (const prereq of tache.prerequis) {
    const sousArbre = await getChaineDependances(prereq._id, depth + 1, maxDepth);
    result.push({
      _id: prereq._id,
      titre: prereq.titre,
      statut: prereq.statut,
      assigneA: prereq.assigneA,
      dateEcheance: prereq.dateEcheance,
      bloquant: prereq.statut !== 'termine',
      dependances: sousArbre
    });
  }
  return result;
};

module.exports = { detecterCycle, getChaineDependances };