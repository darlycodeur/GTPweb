const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent   = user.nom;
document.getElementById('sidebarRole').textContent  = user.role;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

document.getElementById('dateActuelle').textContent =
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const badgeRole = (role) => {
  const map = { admin: 'badge-danger', chef_projet: 'badge-warning', employe: 'badge-info' };
  return `<span class="badge ${map[role] || 'badge-gray'}">${role}</span>`;
};

const badgeStatut = (statut) => {
  const map = {
    en_cours: 'badge-warning', termine: 'badge-success',
    planifie: 'badge-info',    suspendu: 'badge-gray'
  };
  return `<span class="badge ${map[statut] || 'badge-gray'}">${statut}</span>`;
};

const badgePriorite = (priorite) => {
  const map = { critique: 'badge-danger', haute: 'badge-warning', normale: 'badge-info', basse: 'badge-gray' };
  return `<span class="badge ${map[priorite] || 'badge-gray'}">${priorite}</span>`;
};

let chartTachesStatut = null;
let chartProjetsStatut = null;
let chartUrgentes = null;
let chartActivite = null;

const detruireCharts = () => {
  if (chartTachesStatut) { chartTachesStatut.destroy(); chartTachesStatut = null; }
  if (chartProjetsStatut) { chartProjetsStatut.destroy(); chartProjetsStatut = null; }
  if (chartUrgentes) { chartUrgentes.destroy(); chartUrgentes = null; }
  if (chartActivite) { chartActivite.destroy(); chartActivite = null; }
};

const chargerStats = async () => {
  try {
    const [users, projets, taches, categories] = await Promise.all([
      api('/users'),
      api('/projets?archive=all'),
      api('/taches'),
      api('/categories')
    ]);

    const listeUsers = users.users || [];
    const listeProjets = projets.projets || [];
    const listeTaches = taches.taches || [];
    const listeCategories = categories.categories || [];

    document.getElementById('totalUsers').textContent      = users.total || listeUsers.length || 0;
    document.getElementById('totalProjets').textContent    = listeProjets.filter(p => !p.archive).length;
    document.getElementById('totalTaches').textContent     = listeTaches.length;
    document.getElementById('totalCategories').textContent = listeCategories.length;

    // Tableau users
    document.getElementById('tableUsers').innerHTML =
      listeUsers.slice(0, 5).map(u => `
        <tr>
          <td>${u.nom}</td>
          <td>${badgeRole(u.role)}</td>
          <td>${u.actif ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" class="text-center">Aucun utilisateur</td></tr>';

    // Tableau projets
    document.getElementById('tableProjets').innerHTML =
      listeProjets.slice(0, 5).map(p => `
        <tr>
          <td>${p.titre}</td>
          <td>${badgeStatut(p.statut)}</td>
          <td>${badgePriorite(p.priorite)}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" class="text-center">Aucun projet</td></tr>';

    // Graphiques
    dessinerGraphiques(listeTaches, listeProjets);

  } catch (error) {
    console.error('Erreur chargement stats:', error.message);
  }
};

const dessinerGraphiques = (taches, projets) => {
  detruireCharts();

  // 1. Tâches par statut (doughnut)
  const ctxTaches = document.getElementById('chartTachesStatut');
  if (ctxTaches) {
    const statuts = ['a_faire', 'en_cours', 'en_revue', 'termine', 'bloque'];
    const labels = { a_faire: 'À faire', en_cours: 'En cours', en_revue: 'En revue', termine: 'Terminé', bloque: 'Bloqué' };
    const couleurs = { a_faire: '#3B82F6', en_cours: '#F59E0B', en_revue: '#8B5CF6', termine: '#10B981', bloque: '#EF4444' };

    chartTachesStatut = new Chart(ctxTaches, {
      type: 'doughnut',
      data: {
        labels: statuts.map(s => labels[s]),
        datasets: [{
          data: statuts.map(s => taches.filter(t => t.statut === s).length),
          backgroundColor: statuts.map(s => couleurs[s]),
          borderWidth: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } } } }
    });
  }

  // 2. Projets par statut (barres horizontales)
  const ctxProjets = document.getElementById('chartProjetsStatut');
  if (ctxProjets) {
    const statutsProjet = ['planifie', 'en_cours', 'termine', 'suspendu'];
    const labelsProjet = { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', suspendu: 'Suspendu' };
    const couleursProjet = ['#3B82F6', '#F59E0B', '#10B981', '#94A3B8'];

    chartProjetsStatut = new Chart(ctxProjets, {
      type: 'bar',
      data: {
        labels: statutsProjet.map(s => labelsProjet[s]),
        datasets: [{
          label: 'Projets',
          data: statutsProjet.map(s => projets.filter(p => p.statut === s).length),
          backgroundColor: couleursProjet,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Tâches urgentes (bar chart - critères de priorité)
  const ctxUrgentes = document.getElementById('chartUrgentes');
  if (ctxUrgentes) {
    const priorites = ['critique', 'haute', 'normale', 'basse'];
    const labelsPrio = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
    const couleursPrio = ['#EF4444', '#F59E0B', '#3B82F6', '#94A3B8'];

    chartUrgentes = new Chart(ctxUrgentes, {
      type: 'bar',
      data: {
        labels: priorites.map(p => labelsPrio[p]),
        datasets: [{
          label: 'Tâches',
          data: priorites.map(p => taches.filter(t => t.priorite === p).length),
          backgroundColor: couleursPrio,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 4. Activité 7 jours (ligne)
  const ctxActivite = document.getElementById('chartActivite');
  if (ctxActivite && taches.length > 0) {
    const jours = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      jours.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
      const debut = new Date(d);
      debut.setHours(0, 0, 0, 0);
      const fin = new Date(debut);
      fin.setDate(fin.getDate() + 1);
      counts.push(taches.filter(t => {
        const c = t.createdAt ? new Date(t.createdAt) : null;
        return c && c >= debut && c < fin;
      }).length);
    }

    chartActivite = new Chart(ctxActivite, {
      type: 'line',
      data: {
        labels: jours,
        datasets: [{
          label: 'Tâches créées',
          data: counts,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366F1',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }
};

// ─── Charger le journal d'audit ───────────
const chargerAudit = async () => {
  try {
    const data = await api('/audit?limit=5');
    const tbody = document.getElementById('tableAudit');

    tbody.innerHTML = (data.logs || []).map(log => `
      <tr>
        <td>${log.utilisateur?.nom || 'Système'}</td>
        <td><span class="badge badge-info">${log.action}</span></td>
        <td>${log.ressource}</td>
        <td>${new Date(log.createdAt).toLocaleDateString('fr-FR')}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-center">Aucune activité</td></tr>';

  } catch (error) {
    console.error('Erreur audit:', error.message);
  }
};

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerStats();
chargerAudit();
