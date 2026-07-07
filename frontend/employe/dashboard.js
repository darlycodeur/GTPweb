const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();
document.getElementById('welcomeMsg').textContent    = `Bonjour, ${user.nom} 👋`;

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
    const [taches, notifs] = await Promise.all([
      api('/taches'),
      api('/notifications?limit=5')
    ]);

    const liste = taches.taches || [];
    const now   = new Date();

    // Stats
    document.getElementById('totalTaches').textContent = liste.length;
    document.getElementById('enCours').textContent     = liste.filter(t => t.statut === 'en_cours').length;
    document.getElementById('terminees').textContent   = liste.filter(t => t.statut === 'termine').length;
    document.getElementById('enRetard').textContent    = liste.filter(t =>
      t.dateEcheance && new Date(t.dateEcheance) < now && t.statut !== 'termine'
    ).length;

    // Tâches en cours
    const enCours = liste.filter(t => t.statut !== 'termine').slice(0, 5);
    document.getElementById('tableMesTaches').innerHTML =
      enCours.map(t => `
        <tr>
          <td>${t.titre}</td>
          <td>${t.projet?.titre || '-'}</td>
          <td>${badgePriorite(t.priorite)}</td>
          <td>${t.dateEcheance ? new Date(t.dateEcheance).toLocaleDateString('fr-FR') : '-'}</td>
          <td>
            <a href="mes-taches.html" class="btn btn-primary btn-sm">Voir</a>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="5" class="text-center">Aucune tâche en cours</td></tr>';

    // Notifications
    const listeNotifs = notifs.notifications || [];
    document.getElementById('listeNotifications').innerHTML =
      listeNotifs.map(n => `
        <div style="padding:12px 0; border-bottom:1px solid var(--gray-light); display:flex; gap:12px; align-items:flex-start;">
          <span style="font-size:20px">${n.lu ? '📭' : '📬'}</span>
          <div>
            <p style="font-weight:600; font-size:14px">${n.titre}</p>
            <p style="font-size:13px; color:var(--gray)">${n.message}</p>
            <p style="font-size:12px; color:var(--gray); margin-top:4px">
              ${new Date(n.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      `).join('') || '<p class="text-center" style="color:var(--gray)">Aucune notification</p>';

    // Graphiques
    dessinerGraphiques(liste);

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
  const labelsStatut = { a_faire: 'À faire', en_cours: 'En cours', en_revue: 'En revue', termine: 'Terminé', bloque: 'Bloqué' };
  const couleursStatut = { a_faire: '#3B82F6', en_cours: '#F59E0B', en_revue: '#8B5CF6', termine: '#10B981', bloque: '#EF4444' };

  chartTachesStatut = new Chart(ctxStatut, {
    type: 'doughnut',
    data: {
      labels: statuts.map(s => labelsStatut[s]),
      datasets: [{
        data: statuts.map(s => taches.filter(t => t.statut === s).length),
        backgroundColor: statuts.map(s => couleursStatut[s]),
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
  const labelsPrio = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
  const couleursPrio = { critique: '#EF4444', haute: '#F59E0B', normale: '#3B82F6', basse: '#94A3B8' };

  chartPriorites = new Chart(ctxPriorite, {
    type: 'pie',
    data: {
      labels: priorites.map(p => labelsPrio[p]),
      datasets: [{
        data: priorites.map(p => taches.filter(t => t.priorite === p).length),
        backgroundColor: priorites.map(p => couleursPrio[p]),
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
