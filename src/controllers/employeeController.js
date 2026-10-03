const Employee = require('../models/employee');
const employeeService = require('../services/employeeService');
const legacyHrClient = require('../services/legacyHrClient');

/**
 * Controleur REST des employes synchronises depuis le systeme RH legacy.
 *
 * <p>Les erreurs SOAP (indisponibilite du legacy, departement inconnu)
 * remontent telles quelles : elles portent deja un `status` HTTP pertinent,
 * {@link #repondreErreur} le transmet au client au lieu de tout
 * transformer en 500.</p>
 */

/** Convertit une erreur metier ou de transport en reponse HTTP. */
function repondreErreur(res, err) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error('❌ Appel au systeme RH legacy impossible :', err.message);
  }

  return res.status(status).json({
    message: err.message || 'Erreur interne du serveur',
    // Le code metier permet au client d'afficher un message cible
    // sans analyser le texte libre.
    faultCode: err.faultCode || null,
  });
}

/**
 * GET /api/employees
 * Liste les employes deja synchronises dans MongoDB.
 *
 * @query department  Filtre sur le code departement.
 * @query search      Recherche sur le nom (nom ou prenom).
 * @query available   `true` ne retourne que les employes disponibles.
 * @query limit       Nombre maximum de resultats (100 par defaut).
 */
async function lister(req, res) {
  try {
    const filtre = {};

    if (req.query.department) {
      filtre.department = String(req.query.department).toUpperCase();
    }

    if (req.query.search) {
      const motif = new RegExp(
        String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      filtre.$or = [{ firstName: motif }, { lastName: motif }, { fullName: motif }];
    }

    if (req.query.available === 'true') {
      filtre.availabilityStatus = 'AVAILABLE';
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const [employes, total] = await Promise.all([
      Employee.find(filtre).sort({ lastName: 1, firstName: 1 }).limit(limit).lean(),
      Employee.countDocuments(filtre),
    ]);

    return res.json({
      total,
      limit,
      employes,
    });
  } catch (err) {
    return repondreErreur(res, err);
  }
}

/**
 * GET /api/employees/:employeeCode
 * Detail d'un employe synchronise.
 */
async function detail(req, res) {
  try {
    const employe = await Employee.findOne({
      employeeCode: String(req.params.employeeCode).toUpperCase(),
    }).lean();

    if (!employe) {
      return res.status(404).json({
        message: `Employe ${req.params.employeeCode} introuvable.`,
        faultCode: 'EMPLOYEE_NOT_FOUND',
      });
    }

    return res.json(employe);
  } catch (err) {
    return repondreErreur(res, err);
  }
}

/**
 * POST /api/employees/sync
 * Declenche la synchronisation des employes du systeme RH legacy vers MongoDB.
 *
 * @body departements  (optionnel) tableau de codes departements a importer.
 */
async function synchroniser(req, res) {
  try {
    const departements = Array.isArray(req.body?.departements)
      ? req.body.departements.filter(Boolean)
      : null;

    const rapport = await employeeService.syncFromLegacy(departements);

    // Un echec partiel reste un 207 : la reponse contient la fois
    // ce qui a reussi et ce qui a echoue. Un 200 masquerait la panne.
    return res.status(rapport.succes ? 200 : 207).json(rapport);
  } catch (err) {
    return repondreErreur(res, err);
  }
}

/**
 * GET /api/employees/sync/status
 * Etat de la derniere synchronisation et disponibilite du legacy.
 */
async function etatSync(req, res) {
  try {
    const etat = employeeService.getDernierEtat();

    // Le ping distingue « legacy eteint » de « legacy joignable mais
    // synchronisation jamais lancee ».
    let legacy;
    try {
      const pong = await legacyHrClient.ping();
      legacy = { disponible: true, departements: pong.departements };
    } catch (err) {
      legacy = { disponible: false, message: err.message };
    }

    const employesEnBase = await Employee.countDocuments();

    return res.json({
      legacy,
      derniereSynchronisation: etat,
      employesEnBase,
    });
  } catch (err) {
    return repondreErreur(res, err);
  }
}

module.exports = {
  lister,
  detail,
  synchroniser,
  etatSync,
};
