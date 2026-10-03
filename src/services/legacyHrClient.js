const soap = require('soap');
const config = require('../config/soapConfig');

/**
 * Client SOAP du systeme RH legacy (`legacy-hr-system`).
 *
 * <p>ROLE : traduire les appels WSDL en requetes SOAP et inversement.
 * Aucune logique de base de donnees ici : la synchronisation vers MongoDB
 * est du ressort de `employeeService`. Cette separation evite d'avoir un
 * acces base de donnees cache dans un adaptateur reseau.</p>
 *
 * <p>On lit le WSDL a la volee (`WSDL` en HTTP) plutot que d'embarquer un
 * XSD en dur : toute evolution du contrat (ajout d'un element, d'une
 * operation) est alors prise en compte sans rien redeclarer dans le code.</p>
 */

/** Code d'erreur metier present dans le <detail> des soap:Fault. */
const FAULT_CODES = {
  DEPARTMENT_NOT_FOUND: 'DEPARTMENT_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
};

/**
 * Erreur metier levee quand le legacy repond avec une <soap:Fault>.
 *
 * <p>Elle porte le `status` HTTP et le code metier : le controlleur peut
 * ainsi renvoyer une vraie erreur 404/400 au client REST au lieu d'un 500
 * generique qui masquerait la cause.</p>
 */
class LegacySoapFaultError extends Error {
  constructor(message, { faultCode, faultString, status = 502, cause } = {}) {
    super(message);
    this.name = 'LegacySoapFaultError';
    this.faultCode = faultCode;
    this.faultString = faultString;
    this.status = status;
    this.cause = cause;
  }
}

/**
 * Erreur de disponibilite : le legacy ne repond pas.
 * Distinguee de la fault metier, car le remede n'est pas le meme
 * (le serveur est eteint, non le parametre invalide).
 */
class LegacyUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'LegacyUnavailableError';
    this.status = 503;
    this.cause = cause;
  }
}

/** Instance de client, initialisee au premier appel (lazy). */
let client = null;
let initialisation = null;

/**
 * Cree le client SOAP a partir du WSDL, une seule fois.
 * Les echecs d'initialisation ne sont pas memorises : une panne de
 * demarrage du legacy ne doit pas empecher l'application de retenter
 * plus tard.
 */
async function obtenirClient() {
  if (client) return client;

  if (!initialisation) {
    initialisation = soap.createClientAsync(config.wsdlUrl, {
      // WSDL signe en HTTPS localement : on ne verifie pas l'autorite de
      // certificat, ce serait un obstacle en developpement uniquement.
      disableCache: true,
      wsdl_headers: { 'User-Agent': config.userAgent },
    })
      .then((c) => {
        client = c;
        initialisation = null;
        console.log('✅ Client SOAP legacy initialise depuis', config.wsdlUrl);
        return c;
      })
      .catch((err) => {
        initialisation = null;
        throw new LegacyUnavailableError(
          `Impossible de lire le WSDL du systeme RH legacy (${config.wsdlUrl}). ` +
          'Verifiez que le service est demarre sur le port 8080.',
          err
        );
      });
  }

  return initialisation;
}

/**
 * Execute un appel SOAP avec un delai maximal.
 *
 * <p>Sans delai, une indisponibilite du legacy bloquerait une requete HTTP
 * jusqu'au timeout par defaut de Node (sans limite), ce qui saturerait
 * l'event loop et/epuiserait les connexions.</p>
 */
function appelerAvecTimeout(methode) {
  return new Promise((resolve, reject) => {
    const chrono = setTimeout(() => {
      reject(
        new LegacyUnavailableError(
          `Le systeme RH legacy n'a pas repondu en ${config.timeout} ms.`
        )
      );
    }, config.timeout);

    Promise.resolve(methode())
      .then((res) => {
        clearTimeout(chrono);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(chrono);
        reject(err);
      });
  });
}

/**
 * Retire l'enveloppe technique que la bibliotheque `soap` ajoute autour du
 * corps utile de la reponse.
 *
 * <p>Pour une operation dont le portType ne declare qu'un seul
 * `<wsdl:output>`, `node-soap` renvoie TOUJOURS un tableau :</p>
 * <pre>
 *   [ resultat, reponseXmlBrute, piecesJointes ]
 * </pre>
 * <p>Le resultat utile est donc toujours en premiere position. Sans ce
 * deballage, `reponse.getDepartmentEmployeesResponse` vaut `undefined` et le
 * mapping importerait silencieusement ZERO employe.</p>
 *
 * <p>La forme du resultat utile est celle du WSDL : pour
 * `getDepartmentEmployees`, le portType expose un unique output, d'ou
 * <code>{ employees, totalCount }</code> — et non un second niveau
 * `getDepartmentEmployeesResponse` (qui n'existe que dans l'element XML).</p>
 */
function deballerReponse(brut) {
  return Array.isArray(brut) ? brut[0] : brut;
}

/**
 * Extrait le code metier et le message d'une <soap:Fault>.
 *
 * <p>Le legacy emet une structure stable :</p>
 * <pre>
 *   &lt;soap:Fault&gt;
 *     &lt;faultcode&gt;soap:Client&lt;/faultcode&gt;
 *     &lt;faultstring&gt;Departement introuvable...&lt;/faultstring&gt;
 *     &lt;detail&gt;&lt;hr:DEPARTMENT_NOT_FOUND&gt;Aucun employe...&lt;/hr:DEPARTMENT_NOT_FOUND&gt;&lt;/detail&gt;
 *   &lt;/soap:Fault&gt;
 * </pre>
 * <p>La bibliotheque `soap` signale une fault via un objet possessing
 * `root.Envelope.Body.Fault`, expose sous la cle `root` de l'erreur.</p>
 */
function extraireFault(erreur) {
  const racine = erreur?.root?.Envelope?.Body?.Fault;

  if (!racine) {
    return {
      faultCode: null,
      faultString: erreur?.message || 'Erreur SOAP inconnue',
    };
  }

  // Le nom de l'element de <detail> porte le code metier
  // (hr:DEPARTMENT_NOT_FOUND) et son texte le message dynamique.
  const detail = racine.detail;
  let faultCode = null;

  // <faultstring> est un texte simple, mais la bibliotheque `soap` le
  // materialise en objet des qu'il porte un attribut — or Spring y injecte
  // systematiquement xml:lang. D'ou l'acces a `$value` dans ce cas.
  const faultstring = racine.faultstring;
  let message =
    typeof faultstring === 'string' ? faultstring : (faultstring?.$value ?? null);

  if (detail) {
    for (const cle of Object.keys(detail)) {
      // On privilegie la premiere cle : une seule erreur metier par appel.
      faultCode = cle.includes(':') ? cle.split(':').pop() : cle;
      const valeur = detail[cle];
      if (typeof valeur === 'string' && valeur.trim() !== '') {
        message = valeur;
      }
      break;
    }
  }

  return { faultCode, faultString: message };
}

/**
 * Convertit une erreur SOAP en `LegacySoapFaultError` exploitable par le
 * controlleur REST.
 */
function versErreurMetier(erreur) {
  if (erreur instanceof LegacySoapFaultError || erreur instanceof LegacyUnavailableError) {
    return erreur;
  }

  const { faultCode, faultString } = extraireFault(erreur);

  // Pas de <soap:Fault> : le legacy a rendu la main sur une erreur
  // technique (timeout, connexion refusee, 500 interne). Ce n'est pas
  // une erreur metier, le code doit refléter l'indisponibilite.
  if (!faultCode) {
    return new LegacyUnavailableError(
      `Le systeme RH legacy a repondu par une erreur technique : ${faultString}`,
      erreur
    );
  }

  // 404 : la ressource demandee n'existe pas cote legacy.
  // 400 : la requete est invalide. Le reste (5xx) reste une panne du legacy.
  const status =
    faultCode === FAULT_CODES.DEPARTMENT_NOT_FOUND
      ? 404
      : faultCode === FAULT_CODES.INVALID_REQUEST
        ? 400
        : 502;

  return new LegacySoapFaultError(
    faultString || 'Erreur metier du systeme RH legacy',
    { faultCode, faultString, status, cause: erreur }
  );
}

/**
 * Appelle `getDepartmentEmployees` sur le legacy.
 *
 * @param {string} departement  Code du departement (ex. `IT`).
 * @returns {Promise<object>} Corps utile de la reponse : `{ employees, totalCount }`.
 * @throws {LegacySoapFaultError|LegacyUnavailableError}
 */
async function getDepartmentEmployees(departement) {
  const c = await obtenirClient();

  try {
    const brut = await appelerAvecTimeout(() =>
      c.getDepartmentEmployeesAsync({ department: departement })
    );
    return deballerReponse(brut);
  } catch (err) {
    throw versErreurMetier(err);
  }
}

/**
 * Appelle `getAllDepartments` : la liste des departements_connus.
 *
 * <p>Utilisee par la synchronisation pour decouvrir les departements a
 * importer, sans avoir a les coder en dur.</p>
 *
 * @returns {Promise<object>} Corps utile de la reponse : `{ departments }`.
 * @throws {LegacySoapFaultError|LegacyUnavailableError}
 */
async function getAllDepartments() {
  const c = await obtenirClient();

  try {
    const brut = await appelerAvecTimeout(() => c.getAllDepartmentsAsync({}));
    return deballerReponse(brut);
  } catch (err) {
    throw versErreurMetier(err);
  }
}

/**
 * Verifie que le legacy repond, sans modifier l'etat.
 * Utilise par la route de diagnostic `/api/employees/sync/status`.
 */
async function ping() {
  await obtenirClient();
  const departements = await getAllDepartments();
  // Corps utile : { departments: { department: [{ code, employeeCount }] } }
  const liste = departements?.departments?.department ?? [];
  return { ok: true, departements: Array.isArray(liste) ? liste : [liste] };
}

/** Remet a zero le client (utile en test, et apres un redemarrage du legacy). */
function reinitialiser() {
  client = null;
  initialisation = null;
}

module.exports = {
  getDepartmentEmployees,
  getAllDepartments,
  ping,
  reinitialiser,
  LegacySoapFaultError,
  LegacyUnavailableError,
};
