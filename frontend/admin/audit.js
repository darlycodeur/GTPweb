const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

const badgeAction = (action) => {
  const map = {
    connexion: 'badge-info', creation: 'badge-success',
    modification: 'badge-warning', suppression: 'badge-danger',
    changement_statut: 'badge-gray', archivage: 'badge-warning',
    restauration: 'badge-success'
  };
  return `<span class="badge ${map[action]||'badge-gray'}">${action}</span>`;
};

const chargerAudit = async () => {
  const action    = document.getElementById('filtreAction').value;
  const ressource = document.getElementById('filtreRessource').value;
  const suspecte  = document.getElementById('filtreSuspecte').value;
  let url = '/audit?limit=50';
  if (action)    url += `&action=${action}`;
  if (ressource) url += `&ressource=${ressource}`;
  if (suspecte)  url += `&suspecte=${suspecte}`;

  try {
    const data  = await api(url);
    const tbody = document.getElementById('tableAudit');

    tbody.innerHTML = (data.logs || []).map(log => `
      <tr style="${log.suspecte ? 'background:#FFF5F5' : ''}">
        <td>
          <div style="display:flex; align-items:center; gap:8px">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--primary);
              display:flex;align-items:center;justify-content:center;color:white;font-size:12px">
              ${log.utilisateur?.nom ? log.utilisateur.nom.charAt(0) : '?'}
            </div>
            <div>
              <p style="font-size:13px;font-weight:600">${log.utilisateur?.nom || 'Système'}</p>
              <p style="font-size:11px;color:var(--gray)">${log.utilisateur?.role || ''}</p>
            </div>
          </div>
        </td>
        <td>${badgeAction(log.action)}</td>
        <td><span class="badge badge-gray">${log.ressource}</span></td>
        <td style="font-size:12px;max-width:200px;word-break:break-all">
          ${JSON.stringify(log.details).substring(0, 60)}...
        </td>
        <td style="font-size:12px;color:var(--gray)">${log.ip || '-'}</td>
        <td style="font-size:13px">${new Date(log.createdAt).toLocaleString('fr-FR')}</td>
        <td>${log.suspecte ? '🚨' : '✅'}</td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="text-center">Aucun log trouvé</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

document.getElementById('btnFiltrer').addEventListener('click', chargerAudit);
document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerAudit();