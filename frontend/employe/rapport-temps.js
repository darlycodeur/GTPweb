const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

const chargerRapport = async (debut, fin) => {
  try {
    let endpoint = '/sessions/rapport';
    const params = [];
    if (debut) params.push(`debut=${debut}`);
    if (fin)   params.push(`fin=${fin}`);
    if (params.length) endpoint += '?' + params.join('&');

    const data = await api(endpoint);

    document.getElementById('totalHeures').textContent = `${data.totalHeures}h`;
    document.getElementById('totalMinutes').textContent = `${data.totalMinutes} min`;
    document.getElementById('totalSessions').textContent = `${data.sessions.length} session(s)`;

    // Tableau par tâche
    const tbodyTache = document.getElementById('tableParTache');
    if (!data.parTache?.length) {
      tbodyTache.innerHTML = '<tr><td colspan="4" class="text-center">Aucune donnée</td></tr>';
    } else {
      tbodyTache.innerHTML = data.parTache.map(t => `
        <tr>
          <td><strong>${t.tache}</strong></td>
          <td>${t.projet}</td>
          <td>${t.totalMinutes}</td>
          <td>${t.sessions}</td>
        </tr>
      `).join('');
    }

    // Tableau par projet
    const tbodyProjet = document.getElementById('tableParProjet');
    if (!data.parProjet?.length) {
      tbodyProjet.innerHTML = '<tr><td colspan="3" class="text-center">Aucune donnée</td></tr>';
    } else {
      tbodyProjet.innerHTML = data.parProjet.map(p => `
        <tr>
          <td><strong>${p.projet}</strong></td>
          <td>${p.totalMinutes}</td>
          <td>${p.sessions}</td>
        </tr>
      `).join('');
    }

    // Détail sessions
    const tbodySessions = document.getElementById('tableSessions');
    if (!data.sessions?.length) {
      tbodySessions.innerHTML = '<tr><td colspan="6" class="text-center">Aucune session</td></tr>';
    } else {
      tbodySessions.innerHTML = data.sessions.map(s => `
        <tr>
          <td>${s.tache?.titre || '-'}</td>
          <td>${s.tache?.projet?.titre || '-'}</td>
          <td>${new Date(s.debut).toLocaleString('fr-FR')}</td>
          <td>${s.fin ? new Date(s.fin).toLocaleString('fr-FR') : '-'}</td>
          <td>${s.duree ? `${s.duree} min` : '-'}</td>
          <td>${s.note || '-'}</td>
        </tr>
      `).join('');
    }

  } catch (error) {
    console.error(error.message);
    ['tableParTache', 'tableParProjet', 'tableSessions'].forEach(id => {
      document.getElementById(id).innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--danger)">Erreur : ${error.message}</td></tr>`;
    });
  }
};

document.getElementById('btnAppliquer').addEventListener('click', () => {
  const debut = document.getElementById('filtreDebut').value;
  const fin   = document.getElementById('filtreFin').value;
  chargerRapport(debut || undefined, fin || undefined);
});

document.getElementById('btnReset').addEventListener('click', () => {
  document.getElementById('filtreDebut').value = '';
  document.getElementById('filtreFin').value = '';
  chargerRapport();
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerRapport();
