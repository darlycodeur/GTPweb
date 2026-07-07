const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let triUrgence = false;

const badgeStatut = (s) => {
  const map = { en_cours:'badge-warning', termine:'badge-success', a_faire:'badge-info', bloque:'badge-danger', en_revue:'badge-gray' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s.replace(/_/g,' ')}</span>`;
};

const badgePriorite = (p) => {
  const map = { critique:'badge-danger', haute:'badge-warning', normale:'badge-info', basse:'badge-gray' };
  return `<span class="badge ${map[p]||'badge-gray'}">${p}</span>`;
};

// ─── Charger les tâches ───────────────────
const chargerTaches = async () => {
  const projet = document.getElementById('filtreProjet').value;
  const statut = document.getElementById('filtreStatut').value;
  let url = '/taches?limit=50';
  if (projet)    url += `&projet=${projet}`;
  if (statut)    url += `&statut=${statut}`;
  if (triUrgence) url += `&tri=urgence`;

  try {
    const data  = await api(url);
    const tbody = document.getElementById('tableTaches');

    tbody.innerHTML = (data.taches || []).map(t => `
      <tr>
        <td><strong>${t.titre}</strong></td>
        <td>${t.projet?.titre || '-'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--primary);
              display:flex;align-items:center;justify-content:center;color:white;font-size:12px">
              ${t.assigneA ? t.assigneA.nom.charAt(0) : '?'}
            </div>
            ${t.assigneA?.nom || 'Non assigné'}
          </div>
        </td>
        <td>${badgePriorite(t.priorite)}</td>
        <td>${badgeStatut(t.statut)}</td>
        <td>${t.dateEcheance ? new Date(t.dateEcheance).toLocaleDateString('fr-FR') : '-'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:50px;height:6px;background:var(--gray-light);border-radius:3px">
              <div style="width:${t.scoreUrgence}%;height:100%;background:${t.scoreUrgence > 75 ? 'var(--danger)' : t.scoreUrgence > 50 ? 'var(--warning)' : 'var(--secondary)'};border-radius:3px"></div>
            </div>
            <span style="font-size:12px">${t.scoreUrgence}</span>
          </div>
        </td>
        <td>
          <button class="btn btn-danger btn-sm"
            onclick="supprimerTache('${t._id}','${t.titre}')">🗑️</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center">Aucune tâche trouvée</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

// ─── Charger projets et membres pour modal ─
const chargerFormulaire = async () => {
  try {
    const [projets, cats] = await Promise.all([
      api('/projets?limit=50'),
      api('/categories')
    ]);

    document.getElementById('tacheProjet').innerHTML =
      (projets.projets || []).map(p =>
        `<option value="${p._id}">${p.titre}</option>`
      ).join('');

    document.getElementById('tacheCategorie').innerHTML =
      '<option value="">Aucune catégorie</option>' +
      (cats.categories || []).map(c =>
        `<option value="${c._id}">${c.nom}</option>`
      ).join('');

    // Charger membres du 1er projet
    chargerMembres(projets.projets[0]?._id);

    // Quand on change de projet → recharger les membres
    document.getElementById('tacheProjet').addEventListener('change', (e) => {
      chargerMembres(e.target.value);
    });

    // Remplir filtre projets
    document.getElementById('filtreProjet').innerHTML =
      '<option value="">Tous les projets</option>' +
      (projets.projets || []).map(p =>
        `<option value="${p._id}">${p.titre}</option>`
      ).join('');

  } catch (e) { console.error(e.message); }
};

const chargerMembres = async (projetId) => {
  if (!projetId) return;
  try {
    const data = await api(`/projets/${projetId}`);
    const membres = data.projet?.membres || [];
    document.getElementById('tacheAssigne').innerHTML =
      '<option value="">Non assigné</option>' +
      membres.map(m => `<option value="${m._id}">${m.nom}</option>`).join('');
  } catch (e) { console.error(e.message); }
};

// ─── Modal ────────────────────────────────
document.getElementById('btnNouvelleTache').addEventListener('click', () => {
  document.getElementById('modalTache').classList.add('show');
  chargerFormulaire();
});

document.getElementById('modalClose').addEventListener('click',  () => document.getElementById('modalTache').classList.remove('show'));
document.getElementById('btnAnnuler').addEventListener('click',  () => document.getElementById('modalTache').classList.remove('show'));

// ─── Créer tâche ──────────────────────────
document.getElementById('btnSauvegarder').addEventListener('click', async () => {
  const titre      = document.getElementById('tacheTitre').value.trim();
  const desc       = document.getElementById('tacheDesc').value.trim();
  const projet     = document.getElementById('tacheProjet').value;
  const assigneA   = document.getElementById('tacheAssigne').value;
  const priorite   = document.getElementById('tachePriorite').value;
  const categorie  = document.getElementById('tacheCategorie').value;
  const echeance   = document.getElementById('tacheEcheance').value;
  const estimation = document.getElementById('tacheEstimation').value;
  const tagsRaw    = document.getElementById('tacheTags').value;
  const tags       = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!titre || !projet) {
    const al = document.getElementById('alertError');
    al.textContent = 'Titre et projet sont obligatoires.';
    al.classList.add('show');
    return;
  }

  try {
    await api('/taches', 'POST', {
      titre, description: desc, projet,
      assigneA: assigneA || undefined,
      priorite, categorie: categorie || undefined,
      dateEcheance: echeance || undefined,
      estimation: Number(estimation), tags
    });
    document.getElementById('modalTache').classList.remove('show');
    chargerTaches();
  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = error.message;
    al.classList.add('show');
  }
});

const supprimerTache = async (id, titre) => {
  const ok = await showConfirmModal({ title: 'Supprimer', message: `Supprimer la tâche "<strong>${titre}</strong>" ?`, confirmText: 'Supprimer', confirmClass: 'btn-danger' });
  if (!ok) return;
  try {
    await api(`/taches/${id}`, 'DELETE');
    chargerTaches();
  } catch (e) { alert('Erreur : ' + e.message); }
};

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

chargerFormulaire();
chargerTaches();