const mongoose = require('mongoose');

/**
 * Modele Mongoose `Employee` : employe du systeme RH legacy (groupe 1).
 *
 * DISTINCTION IMPORTANTE
 * ----------------------
 * Ce modele est VOLONTAIREMENT separe du modele `User` existant :
 *
 *   - `User`     = comptes de l'application de gestion de taches
 *                  (authentification, roles employe/chef_projet/admin).
 *   - `Employee` = donnees RH importees depuis le SOAP legacy
 *                  (competences, disponibilite, departement).
 *
 * Melanger les deux aurait couple l'authentification a la synchronisation
 * RH : une panne du SOAP ferait tomber les connexions de l'application.
 *
 * Chaque document conserve la trace de sa synchronisation (`source`,
 * `syncDate`) afin de pouvoir tracer l'import, exigence de l'audit.
 */

const availabilityEnum = ['AVAILABLE', 'ON_LEAVE', 'BUSY'];
const proficiencyEnum = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

/** Sous-schema : une competence (ligne de la table SQL employee_skill). */
const skillSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'Le nom de la competence est obligatoire'],
      trim: true,
    },
    proficiency: {
      type: String,
      enum: {
        values: proficiencyEnum,
        message: 'Niveau de maitrise invalide : {VALUE}',
      },
      default: 'BEGINNER',
    },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    // ─── Identite ───
    // employee_code : la cle metier stable du systeme legacy (VARCHAR UNIQUE).
    // C'est elle qui sert de clef d'upsert : l'identifiant technique du
    // legacy (id) n'a aucun sens en dehors de sa base.
    employeeCode: {
      type: String,
      required: [true, 'Le code employe est obligatoire'],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Colonne employee.id du legacy. Conserve pour la tracabilite.
    legacyId: {
      type: Number,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    // Champ derive : concatenation firstName + lastName.
    fullName: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      required: [true, 'Le departement est obligatoire'],
      trim: true,
      uppercase: true,
      index: true,
    },

    // Colonne employee.status du legacy, exposee en availabilityStatus.
    availabilityStatus: {
      type: String,
      enum: {
        values: availabilityEnum,
        message: 'Statut de disponibilite invalide : {VALUE}',
      },
      default: 'AVAILABLE',
    },

    // LISTE IMBRIQUEE : les competences de l'employe (table employee_skill).
    skills: {
      type: [skillSchema],
      default: [],
    },

    // ─── Tracabilite de la synchronisation ───
    source: {
      type: String,
      enum: ['legacy-hr-soap'],
      default: 'legacy-hr-soap',
    },

    // Date de la derniere synchronisation reussie depuis le SOAP.
    syncDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index sur le nom pour la recherche.
employeeSchema.index({ lastName: 1, firstName: 1 });

// Middleware : garantit que fullName est toujours coherent.
employeeSchema.pre('validate', function (next) {
  if (this.firstName || this.lastName) {
    this.fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
module.exports.availabilityEnum = availabilityEnum;
module.exports.proficiencyEnum = proficiencyEnum;
