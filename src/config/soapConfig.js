/**
 * Configuration du client SOAP du systeme RH legacy.
 *
 * <p>Isolee dans un module dedie pour que l'adresse du legacy ne soit
 * repetee qu'a un seul endroit : le code reste identique en developpement,
 * en demonstration et en production, seul le fichier <code>.env</code> change.</p>
 */

require('dotenv').config();

module.exports = {
  /** URL du WSDL : sert a la fois de contrat et de point d'entree SOAP. */
  wsdlUrl: process.env.SOAP_WSDL_URL || 'http://localhost:8080/ws/hr-service.wsdl',

  /**
   * Delai maximal d'un appel SOAP, en millisecondes.
   *
   * <p>9000 ms est choisi pour rester inferieur au timeout par defaut d'une
   * requete HTTP (16 s dans Node) : le client REST a ainsi le temps de
   * repondre proprement au lieu d'exposer une erreur de passerelle.</p>
   */
  timeout: Number(process.env.SOAP_TIMEOUT_MS) || 9000,

  userAgent: 'GTPweb/1.0 (consommateur SOAP legacy-hr-system)',
};
