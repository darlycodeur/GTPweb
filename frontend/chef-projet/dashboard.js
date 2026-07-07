const user = JSON.parse(localStorage.getItem('user'));
const userId = user._id;
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

const badgeStatut = (s) => {
  const map = { en_cours:'badge-warning', termine:'badge-success', planifie:'badge-info', suspendu:'badge-gray' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
};

const badgePriorite = (p) => {
  const map = { critique:'badge-danger', haute:'badge-warning', normale:'badge-info', basse:'badge-gray' };
  return `<span class="badge ${map[p]||'badge-gray'}">${p}</span>`;
};

let chartTachesStatut = null;
let chartPriorites = null;

const detruireCharts = () => {
  if (chartTachesStatut) { chartTachesStatut.destroy(); chartTachesStatut = null; }
  if (chartPriorites) { chartPriorites.destroy(); chartPriorites = null; }
};

const chargerDashboard = async () => {
  try {
    const [projets, taches] = await Promise.all([
      api(`/projets?chefProjet=${userId}`),
      api('/taches')
    ]);

    const listeProjets = projets.projets || [];
    const listeTaches  = taches.taches  || [];

    // Stats
    document.getElementById('totalProjets').textContent    = listeProjets.length;
    document.getElementById('tachesEnCours').textContent   = listeTaches.filter(t => t.statut === 'en_cours').length;
    document.getElementById('tachesAFaire').textContent    = listeTaches.filter(t => t.statut === 'a_faire').length;
    document.getElementById('tachesTerminees').textContent = listeTaches.filter(t => t.statut === 'termine').length;

    // Tâches urgentes
    const urgentes = listeTaches
      .filter(t => t.scoreUrgence > 60 && t.statut !== 'termine')
      .slice(0, 5);

    document.getElementById('tableTachesUrgentes').innerHTML =
      urgentes.map(t => `
        <tr>
          <td>${t.titre}</td>
          <td>${t.projet?.titre || '-'}</td>
          <td>${t.assigneA?.nom || 'Non assigné'}</td>
          <td>${badgePriorite(t.priorite)}</td>
          <td>${t.dateEcheance ? new Date(t.dateEcheance).toLocaleDateString('fr-FR') : '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" class="text-center">Aucune tâche urgente</td></tr>';

    // Projets récents
    document.getElementById('tableProjets').innerHTML =
      listeProjets.slice(0, 5).map(p => `
        <tr>
          <td>${p.titre}</td>
          <td>${badgeStatut(p.statut)}</td>
          <td>${p.membres?.length || 0} membre(s)</td>
          <td>${p.dateFin ? new Date(p.dateFin).toLocaleDateString('fr-FR') : '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="text-center">Aucun projet</td></tr>';

    // Graphiques
    dessinerGraphiques(listeTaches);

  } catch (error) {
    console.error('Erreur dashboard:', error.message);
  }
};

const dessinerGraphiques = (taches) => {
  detruireCharts();

  const ctxStatut = document.getElementById('chartTachesStatut');
  const ctxPriorite = document.getElementById('chartPriorites');
  if (!ctxStatut || !ctxPriorite) return;

  const statuts = ['a_faire', 'en_cours', 'en_revue', 'termine', 'bloque'];
  const statutsLabels = { a_faire: 'À faire', en_cours: 'En cours', en_revue: 'En revue', termine: 'Terminé', bloque: 'Bloqué' };
  const statutsCouleurs = { a_faire: '#3B82F6', en_cours: '#F59E0B', en_revue: '#8B5CF6', termine: '#10B981', bloque: '#EF4444' };

  const countsStatut = statuts.map(s => taches.filter(t => t.statut === s).length);

  chartTachesStatut = new Chart(ctxStatut, {
    type: 'doughnut',
    data: {
      labels: statuts.map(s => statutsLabels[s]),
      datasets: [{
        data: countsStatut,
        backgroundColor: statuts.map(s => statutsCouleurs[s]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      }
    }
  });

  const priorites = ['critique', 'haute', 'normale', 'basse'];
  const prioritesLabels = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
  const prioritesCouleurs = { critique: '#EF4444', haute: '#F59E0B', normale: '#3B82F6', basse: '#94A3B8' };

  const countsPriorite = priorites.map(p => taches.filter(t => t.priorite === p).length);

  chartPriorites = new Chart(ctxPriorite, {
    type: 'pie',
    data: {
      labels: priorites.map(p => prioritesLabels[p]),
      datasets: [{
        data: countsPriorite,
        backgroundColor: priorites.map(p => prioritesCouleurs[p]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
      }
    }
  });
};

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerDashboard();
