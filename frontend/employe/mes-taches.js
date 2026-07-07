const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let triUrgence = false;

const badgeStatut = (s) => {
  const map = { en_cours:'badge-warning', termine:'badge-success', a_faire:'badge-info', bloque:'badge-danger', en_revue:'badge-gray' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s.replace('_',' ')}</span>`;
};

const badgePriorite = (p) => {
  const map = { critique:'badge-danger', haute:'badge-warning', normale:'badge-info', basse:'badge-gray' };
  return `<span class="badge ${map[p]||'badge-gray'}">${p}</span>`;
};

const chargerTaches = async () => {
  const statut   = document.getElementById('filtreStatut').value;
  const priorite = document.getElementById('filtrePriorite').value;
  let url = '/taches?limit=50';
  if (statut)    url += `&statut=${statut}`;
  if (priorite)  url += `&priorite=${priorite}`;
  if (triUrgence) url += `&tri=urgence`;

  try {
    const data  = await api(url);
    const tbody = document.getElementById('tableTaches');
    const now   = new Date();

    tbody.innerHTML = (data.taches || []).map(t => {
      const enRetard = t.dateEcheance && new Date(t.dateEcheance) < now && t.statut !== 'termine';
      return `
        <tr style="${enRetard ? 'background:#FFF5F5' : ''}">
          <td>
            <strong>${t.titre}</strong>
            ${enRetard ? '<span class="badge badge-danger" style="margin-left:8px">En retard</span>' : ''}
          </td>
          <td>${t.projet?.titre || '-'}</td>
          <td>${badgePriorite(t.priorite)}</td>
          <td>${badgeStatut(t.statut)}</td>
          <td>${t.dateEcheance ? new Date(t.dateEcheance).toLocaleDateString('fr-FR') : '-'}</td>
          <td>
            <button class="btn btn-primary btn-sm"
              onclick="ouvrirModalStatut('${t._id}','${t.statut}')">
              🔄 Statut
            </button>
            <a href="chronometre.html?tacheId=${t._id}" class="btn btn-outline btn-sm">
              ⏱️ Timer
            </a>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6" class="text-center">Aucune tâche trouvée</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

// ─── Modal statut ─────────────────────────
const ouvrirModalStatut = (id, statutActuel) => {
  document.getElementById('tacheId').value       = id;
  document.getElementById('nouveauStatut').value = statutActuel;
  document.getElementById('noteStatut').value    = '';
  document.getElementById('modalStatut').classList.add('show');
};

document.getElementById('modalClose').addEventListener('click',  () => document.getElementById('modalStatut').classList.remove('show'));
document.getElementById('btnAnnuler').addEventListener('click',  () => document.getElementById('modalStatut').classList.remove('show'));

document.getElementById('btnChangerStatut').addEventListener('click', async () => {
  const id            = document.getElementById('tacheId').value;
  const nouveauStatut = document.getElementById('nouveauStatut').value;
  const note          = document.getElementById('noteStatut').value.trim();

  try {
    await api(`/taches/${id}/statut`, 'PUT', { nouveauStatut, note });
    document.getElementById('modalStatut').classList.remove('show');
    chargerTaches();
  } catch (error) {
    alert('Erreur : ' + error.message);
  }
});

// ─── Filtres ──────────────────────────────
document.getElementById('btnFiltrer').addEventListener('click', chargerTaches);

document.getElementById('btnUrgence').addEventListener('click', () => {
  triUrgence = !triUrgence;
  document.getElementById('btnUrgence').textContent = triUrgence ? '📅 Par date' : '🔥 Par urgence';
  chargerTaches();
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerTaches();