const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connecté à MongoDB');

  const db = mongoose.connection.db;

  // ─── Hash des mots de passe ───────────────
  const hash = await bcrypt.hash('123456', 10);
  console.log('🔐 Mots de passe hashés');

  // ─── USERS ────────────────────────────────
  await db.collection('users').deleteMany({});
  await db.collection('users').insertMany([
    {
      nom: 'Admin Principal',
      email: 'admin@gestion.com',
      motDePasse: hash,
      role: 'admin',
      avatar: '',
      actif: true,
      quotaTaches: 99,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      nom: 'Jean Dupont',
      email: 'jean.dupont@gestion.com',
      motDePasse: hash,
      role: 'chef_projet',
      avatar: '',
      actif: true,
      quotaTaches: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      nom: 'Marie Martin',
      email: 'marie.martin@gestion.com',
      motDePasse: hash,
      role: 'chef_projet',
      avatar: '',
      actif: true,
      quotaTaches: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      nom: 'Alice Bernard',
      email: 'alice.bernard@gestion.com',
      motDePasse: hash,
      role: 'employe',
      avatar: '',
      actif: true,
      quotaTaches: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      nom: 'Bob Leroy',
      email: 'bob.leroy@gestion.com',
      motDePasse: hash,
      role: 'employe',
      avatar: '',
      actif: true,
      quotaTaches: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      nom: 'Clara Petit',
      email: 'clara.petit@gestion.com',
      motDePasse: hash,
      role: 'employe',
      avatar: '',
      actif: true,
      quotaTaches: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  console.log('📥 "users" : 6 documents insérés');

  // ─── CATEGORIES ───────────────────────────
  await db.collection('categories').deleteMany({});
  await db.collection('categories').insertMany([
    {
      nom: 'Informatique',
      couleur: '#3B82F6',
      icone: 'laptop',
      description: 'Projets et tâches liés au développement et à l\'IT',
      portee: 'les_deux',
      createdAt: new Date()
    },
    {
      nom: 'Ressources Humaines',
      couleur: '#10B981',
      icone: 'users',
      description: 'Projets liés aux RH et à la gestion du personnel',
      portee: 'projet',
      createdAt: new Date()
    },
    {
      nom: 'Finance',
      couleur: '#F59E0B',
      icone: 'dollar',
      description: 'Tâches de suivi budgétaire et financier',
      portee: 'tache',
      createdAt: new Date()
    }
  ]);
  console.log('📥 "categories" : 3 documents insérés');

  // ─── Récupérer les IDs générés ────────────
  const users = await db.collection('users').find({}).toArray();
  const cats  = await db.collection('categories').find({}).toArray();

  const admin   = users.find(u => u.role === 'admin');
  const chef1   = users.find(u => u.email === 'jean.dupont@gestion.com');
  const chef2   = users.find(u => u.email === 'marie.martin@gestion.com');
  const emp1    = users.find(u => u.email === 'alice.bernard@gestion.com');
  const emp2    = users.find(u => u.email === 'bob.leroy@gestion.com');
  const emp3    = users.find(u => u.email === 'clara.petit@gestion.com');
  const catInfo = cats.find(c => c.nom === 'Informatique');
  const catRH   = cats.find(c => c.nom === 'Ressources Humaines');

  // ─── PROJETS ──────────────────────────────
  await db.collection('projets').deleteMany({});
  await db.collection('projets').insertMany([
    {
      titre: 'Refonte du Système de Gestion Interne',
      description: 'Migration complète vers une architecture moderne Node.js + MongoDB',
      statut: 'en_cours',
      priorite: 'haute',
      idCategorie: catInfo._id,
      dateDebut: new Date('2024-01-15'),
      dateFin: new Date('2024-06-30'),
      chefProjet: chef1._id,
      membres: [emp1._id, emp2._id],
      budget: 50000,
      archive: false,
      dateArchivage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      titre: 'Campagne de Recrutement Q2 2024',
      description: 'Planification et suivi du recrutement de 15 nouveaux collaborateurs',
      statut: 'planifie',
      priorite: 'normale',
      idCategorie: catRH._id,
      dateDebut: new Date('2024-03-01'),
      dateFin: new Date('2024-05-31'),
      chefProjet: chef2._id,
      membres: [emp3._id],
      budget: 15000,
      archive: false,
      dateArchivage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  console.log('📥 "projets" : 2 documents insérés');

  // ─── Récupérer les IDs projets ────────────
  const projets = await db.collection('projets').find({}).toArray();
  const proj1   = projets.find(p => p.titre.includes('Refonte'));
  const proj2   = projets.find(p => p.titre.includes('Recrutement'));

  // ─── TACHES ───────────────────────────────
  await db.collection('taches').deleteMany({});
  const tache1Result = await db.collection('taches').insertOne({
    titre: 'Analyse des besoins et rédaction du cahier des charges',
    description: 'Réunions avec les parties prenantes et documentation complète',
    statut: 'termine',
    priorite: 'haute',
    projet: proj1._id,
    assigneA: emp1._id,
    categorie: catInfo._id,
    prerequis: [],
    dateEcheance: new Date('2024-02-01'),
    dateCompletion: new Date('2024-01-30'),
    estimation: 16,
    tempsReel: 18,
    scoreUrgence: 0,
    pieceJointes: [],
    tags: ['analyse', 'documentation'],
    historique: [
      { ancienStatut: 'a_faire', nouveauStatut: 'en_cours', changedBy: emp1._id, note: 'Démarrage', changedAt: new Date('2024-01-16') },
      { ancienStatut: 'en_cours', nouveauStatut: 'termine', changedBy: emp1._id, note: 'Validé', changedAt: new Date('2024-01-30') }
    ],
    createdBy: chef1._id,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db.collection('taches').insertMany([
    {
      titre: 'Conception de la base de données MongoDB',
      description: 'Modélisation des 8 collections avec leurs relations et index',
      statut: 'en_cours',
      priorite: 'haute',
      projet: proj1._id,
      assigneA: emp2._id,
      categorie: catInfo._id,
      prerequis: [tache1Result.insertedId],
      dateEcheance: new Date('2024-03-01'),
      dateCompletion: null,
      estimation: 24,
      tempsReel: 10,
      scoreUrgence: 75,
      pieceJointes: [],
      tags: ['mongodb', 'schema'],
      historique: [],
      createdBy: chef1._id,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      titre: 'Développement des APIs REST',
      description: 'Implémentation de tous les endpoints Express',
      statut: 'a_faire',
      priorite: 'critique',
      projet: proj1._id,
      assigneA: emp1._id,
      categorie: catInfo._id,
      prerequis: [],
      dateEcheance: new Date('2024-04-15'),
      dateCompletion: null,
      estimation: 40,
      tempsReel: 0,
      scoreUrgence: 90,
      pieceJointes: [],
      tags: ['api', 'express', 'nodejs'],
      historique: [],
      createdBy: chef1._id,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      titre: 'Rédaction des fiches de poste',
      description: 'Création des 15 fiches de poste pour le recrutement Q2',
      statut: 'en_cours',
      priorite: 'normale',
      projet: proj2._id,
      assigneA: emp3._id,
      categorie: catRH._id,
      prerequis: [],
      dateEcheance: new Date('2024-03-15'),
      dateCompletion: null,
      estimation: 8,
      tempsReel: 3,
      scoreUrgence: 55,
      pieceJointes: [],
      tags: ['recrutement', 'rh'],
      historique: [],
      createdBy: chef2._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  console.log('📥 "taches" : 4 documents insérés');

  // ─── AUTRES COLLECTIONS ───────────────────
  await db.collection('commentaires').deleteMany({});
  await db.collection('notifications').deleteMany({});
  await db.collection('sessions_travail').deleteMany({});
  await db.collection('journal_audit').deleteMany({});
  console.log('🗑️  Autres collections vidées');

  console.log('\n🎉 Base de données remplie avec succès !');
  console.log('\n📋 Comptes disponibles (mot de passe : 123456) :');
  console.log('   Admin       : admin@gestion.com');
  console.log('   Chef projet : jean.dupont@gestion.com');
  console.log('   Chef projet : marie.martin@gestion.com');
  console.log('   Employé     : alice.bernard@gestion.com');
  console.log('   Employé     : bob.leroy@gestion.com');
  console.log('   Employé     : clara.petit@gestion.com');

  process.exit(0);
};

run().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});