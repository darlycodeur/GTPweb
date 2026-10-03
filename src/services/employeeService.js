const Employee = require('../models/employee');
const legacyHrClient = require('./legacyHrClient');

/**
 * Service de synchronisation des employes du systeme RH legacy.
 *
 * <p>ROLE : transformer la reponse SOAP en documents MongoDB.
 * L'appel reseau lui-meme est delegue a `legacyHrClient`, ce qui rend cette
 * couche testable en injectant un faux client.</p>
 *
 * <h2>Strategie d'import</h2>
 * <p>Import par <b>upsert</b> sur la clef metier <code>employeeCode</code> :
 * relancer la synchronisation ne cree pas de doublon, et corrige au passage
 * les employes modifies dans le legacy. L'identifiant technique du legacy
 * n'est pas utilise comme clef, car il n'a aucun sens en dehors de sa base.</p>
 *
 * <p>Les employes supprimes cote legacy sont <b>conserves</b> : les supprimer
 * ici detruirait l'historique des taches qui leur sont affectees. Pour adherer
 * strictement a l'etat du legacy, appeler `employeeService.purgerAbsents()`
 * explicitement.</p>
 */

// Etat de la derniere synchronisation, expose par la route de diagnostic.
let dernierEtat = {
  date: null,
  succes: false,
  employesImportes: 0,
  employesCrees: 0,
  employesMisAJour: 0,
  departementsTraites: [],
  message: null,
};

/**
 * Normalise un employe JAXB en document Mongoose.
 *
 * <p>La bibliotheque `soap` deserialise le payload JAXB en objets
 * possibles : le nom de champ est donc lu de facon tolerante, et la
 * normalisation explicite evite de polluer MongoDB avec des cles
 * parasites ou des valeurs `undefined`.</p>
 */
function normaliserEmploye(brut) {
  // `soap` peut renvoyer l'objet seul ou le wrapper de reponse.
  const e = brut && brut.employee ? brut.employee : brut;
  if (!e) return null;

  // Liste de competences : peut etre absente, un objet unique, ou un tableau.
  const competences = e.skills?.skill ?? [];
  const liste = Array.isArray(competences) ? competences : [competences];

  return {
    employeeCode: e.employeeCode,
    legacyId: e.id != null ? Number(e.id) : undefined,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: e.fullName,
    department: e.department,
    availabilityStatus: e.availabilityStatus || 'AVAILABLE',
    skills: liste
      .filter(Boolean)
      .map((c) => ({
        skillName: c.skillName,
        proficiency: c.proficiency || 'BEGINNER',
      })),
    source: 'legacy-hr-soap',
    syncDate: new Date(),
  };
}

/**
 * Importe les employes d'un seul departement.
 *
 * @param {string} departement  Code du departement.
 * @returns {Promise<{crees:number, misAJour:number, total:number}>}
 */
async function importerDepartement(departement) {
  const reponse = await legacyHrClient.getDepartmentEmployees(departement);

  // Corps utile de la reponse (enveloppe node-soap deja retiree par
  // legacyHrClient) : { employees: { employee: [...] }, totalCount: n }.
  // `employee` peut etre absent, un objet unique, ou un tableau selon que
  // le departement compte 0, 1 ou plusieurs employes.
  const container = reponse?.employees?.employee ?? [];
  const employes = Array.isArray(container) ? container : [container];

  let crees = 0;
  let misAJour = 0;

  for (const brut of employes) {
    const donnees = normaliserEmploye(brut);
    if (!donnees || !donnees.employeeCode) continue;

    const existant = await Employee.findOne({
      employeeCode: donnees.employeeCode,
    }).lean();

    // `findOneAndUpdate` avec `upsert: true` est atomique : deux
    // synchronisations lancees en parallele ne creent pas de doublon.
    await Employee.findOneAndUpdate(
      { employeeCode: donnees.employeeCode },
      { $set: donnees },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existant) misAJour += 1;
    else crees += 1;
  }

  return { crees, misAJour, total: employes.length };
}

/**
 * Synchronise TOUS les employes du systeme RH legacy vers MongoDB.
 *
 * <p>Les departements sont decouverts via `getAllDepartments` plutot que
 * codes en dur : ajouter un departement dans le legacy ne requiert aucune
 * modification ici.</p>
 *
 * <p>Un departement en erreur n'interrompt pas l'ensemble : la synchronisation
 * continue sur les autres et le rapport indique clairement ce qui a echoue.
 * Cela evite qu'une donnee erronee dans une seule equipe bloque tout le
 * reste de l'import.</p>
 *
 * @param {string[]} [departements]  Restreint la synchronisation a ces codes.
 * @returns {Promise<object>} Rapport de synchronisation.
 */
async function syncFromLegacy(departements = null) {
  const debut = Date.now();
  const rapport = {
    date: new Date(),
    succes: true,
    employesImportes: 0,
    employesCrees: 0,
    employesMisAJour: 0,
    departementsTraites: [],
    departementsEnErreur: [],
    dureeMs: 0,
    message: null,
  };

  try {
    let cibles = departements;

    if (!cibles || cibles.length === 0) {
      const reponse = await legacyHrClient.getAllDepartments();
      // Corps utile : { departments: { department: [{ code, employeeCount }] } }
      const liste = reponse?.departments?.department ?? [];
      const tableaux = Array.isArray(liste) ? liste : [liste];
      cibles = tableaux
        .map((d) => (typeof d === 'string' ? d : d?.code))
        .filter(Boolean);
    }

    if (cibles.length === 0) {
      rapport.succes = false;
      rapport.message = 'Aucun departement a synchroniser.';
      return rapport;
    }

    for (const code of cibles) {
      try {
        const r = await importerDepartement(code);
        rapport.employesCrees += r.crees;
        rapport.employesMisAJour += r.misAJour;
        rapport.employesImportes += r.total;
        rapport.departementsTraites.push(code);
      } catch (err) {
        rapport.departementsEnErreur.push({
          departement: code,
          message: err.message,
          faultCode: err.faultCode || null,
        });
      }
    }

    rapport.succes = rapport.departementsEnErreur.length === 0;
    rapport.message = rapport.succes
      ? `${rapport.employesImportes} employe(s) synchronise(s) depuis ${rapport.departementsTraites.length} departement(s).`
      : `${rapport.employesImportes} employe(s) synchronise(s), ${rapport.departementsEnErreur.length} departement(s) en erreur.`;
  } catch (err) {
    rapport.succes = false;
    rapport.message = `Synchronisation impossible : ${err.message}`;
    rapport.faultCode = err.faultCode || null;
  }

  rapport.dureeMs = Date.now() - debut;
  dernierEtat = rapport;

  console.log(
    `🔄 Sync legacy HR : ${rapport.message} (${rapport.dureeMs} ms)`
  );

  return rapport;
}

/** Etat de la derniere synchronisation effectuee par ce processus. */
function getDernierEtat() {
  return dernierEtat;
}

/**
 * Supprime les employes absents du legacy.
 *
 * <p>Volontairement NON appele par `syncFromLegacy` : une suppression
 * automatique detruirait l'historique des taches affectees. Cette methode
 * est exposee pour une purge explicite et consciente.</p>
 *
 * @param {string[]} codesLegaux  Codes employee presents cote legacy.
 * @returns {Promise<number>} Nombre de documents supprimes.
 */
async function purgerAbsents(codesLegaux) {
  const resultat = await Employee.deleteMany({
    employeeCode: { $nin: codesLegaux },
  });
  console.log(
    `🗑️  ${resultat.deletedCount} employe(s) absent(s) du legacy supprime(s)`
  );
  return resultat.deletedCount;
}

module.exports = {
  syncFromLegacy,
  importerDepartement,
  getDernierEtat,
  purgerAbsents,
};
