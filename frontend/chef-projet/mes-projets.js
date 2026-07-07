const user = JSON.parse(localStorage.getItem('user'));
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

// ─── Charger les projets ──────────────────
const chargerProjets = async () => {
  try {
    const data  = await api('/projets?limit=50');
    const tbody = document.getElementById('tableProjets');

    tbody.innerHTML = (data.projets || []).map(p => `
      <tr>
        <td><strong>${p.titre}</strong></td>
        <td>${p.idCategorie?.nom || '-'}</td>
        <td>${badgeStatut(p.statut)}</td>
        <td>${badgePriorite(p.priorite)}</td>
        <td>${p.membres?.length || 0}</td>
        <td>${p.budget ? p.budget.toLocaleString('fr-FR') + ' €' : '-'}</td>
        <td>${p.dateFin ? new Date(p.dateFin).toLocaleDateString('fr-FR') : '-'}</td>
        <td>
          <button class="btn btn-warning btn-sm"
            onclick="archiverProjet('${p._id}','${p.titre}')">
            📦 Archiver
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center">Aucun projet</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

// ─── Charger catégories et membres pour le modal ──
const chargerFormulaire = async () => {
  try {
    const [cats, users] = await Promise.all([
      api('/categories'),
      api('/users?role=employe&limit=50')
    ]);

    document.getElementById('projetCategorie').innerHTML =
      (cats.categories || []).map(c =>
        `<option value="${c._id}">${c.nom}</option>`
      ).join('');

    document.getElementById('projetMembres').innerHTML =
      (users.users || []).map(u =>
        `<option value="${u._id}">${u.nom}</option>`
      ).join('');

  } catch (e) { console.error(e.message); }
};

// ─── Ouvrir modal ─────────────────────────
document.getElementById('btnNouveauProjet').addEventListener('click', () => {
  document.getElementById('modalProjet').classList.add('show');
  chargerFormulaire();
});

document.getElementById('modalClose').addEventListener('click',  () => document.getElementById('modalProjet').classList.remove('show'));
document.getElementById('btnAnnuler').addEventListener('click',  () => document.getElementById('modalProjet').classList.remove('show'));

// ─── Créer projet ─────────────────────────
document.getElementById('btnSauvegarder').addEventListener('click', async () => {
  const titre     = document.getElementById('projetTitre').value.trim();
  const desc      = document.getElementById('projetDesc').value.trim();
  const categorie = document.getElementById('projetCategorie').value;
  const priorite  = document.getElementById('projetPriorite').value;
  const dateDebut = document.getElementById('projetDebut').value;
  const dateFin   = document.getElementById('projetFin').value;
  const budget    = document.getElementById('projetBudget').value;
  const select    = document.getElementById('projetMembres');
  const membres   = Array.from(select.selectedOptions).map(o => o.value);

  if (!titre || !categorie || !dateDebut || membres.length === 0) {
    const al = document.getElementById('alertError');
    al.textContent = 'Titre, catégorie, date de début et au moins un membre sont obligatoires.';
    al.classList.add('show');
    return;
  }

  try {
    await api('/projets', 'POST', {
      titre, description: desc, idCategorie: categorie,
      priorite, dateDebut, dateFin, budget: Number(budget), membres
    });
    document.getElementById('modalProjet').classList.remove('show');
    chargerProjets();
  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = error.message;
    al.classList.add('show');
  }
});

const archiverProjet = async (id, titre) => {
  const ok = await showConfirmModal({ title: 'Archiver', message: `Archiver "<strong>${titre}</strong>" ?`, confirmText: 'Archiver', confirmClass: 'btn-warning' });
  if (!ok) return;
  try {
    await api(`/projets/${id}/archiver`, 'PUT');
    chargerProjets();
  } catch (e) {
    const al = document.getElementById('alertError');
    al.textContent = 'Erreur : ' + e.message;
    al.classList.add('show');
  }
};

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerProjets();