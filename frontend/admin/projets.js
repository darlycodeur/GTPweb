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

const chargerProjets = async () => {
  const statut   = document.getElementById('filtreStatut').value;
  const priorite = document.getElementById('filtrePriorite').value;
  let url = '/projets?limit=50';
  if (statut)   url += `&statut=${statut}`;
  if (priorite) url += `&priorite=${priorite}`;

  try {
    const data  = await api(url);
    const tbody = document.getElementById('tableProjets');

    tbody.innerHTML = (data.projets || []).map(p => `
      <tr>
        <td><strong>${p.titre}</strong></td>
        <td>${p.chefProjet?.nom || '-'}</td>
        <td>${p.idCategorie?.nom || '-'}</td>
        <td>${badgeStatut(p.statut)}</td>
        <td>${badgePriorite(p.priorite)}</td>
        <td>${p.membres?.length || 0} membre(s)</td>
        <td>${p.dateFin ? new Date(p.dateFin).toLocaleDateString('fr-FR') : '-'}</td>
        <td>
          ${!p.archive
            ? `<button class="btn btn-warning btn-sm" onclick="archiverProjet('${p._id}','${p.titre}')">📦 Archiver</button>`
            : `<button class="btn btn-success btn-sm" onclick="restaurerProjet('${p._id}','${p.titre}')">♻️ Restaurer</button>`
          }
          <button class="btn btn-danger btn-sm" onclick="supprimerProjet('${p._id}','${p.titre}')">🗑️</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="text-center">Aucun projet trouvé</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

const archiverProjet = async (id, titre) => {
  const ok = await showConfirmModal({ title: 'Archiver', message: `Archiver le projet "<strong>${titre}</strong>" ?`, confirmText: 'Archiver', confirmClass: 'btn-warning' });
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

const restaurerProjet = async (id, titre) => {
  const ok = await showConfirmModal({ title: 'Restaurer', message: `Restaurer le projet "<strong>${titre}</strong>" ?`, confirmText: 'Restaurer', confirmClass: 'btn-primary' });
  if (!ok) return;
  try {
    await api(`/projets/${id}/restaurer`, 'PUT');
    chargerProjets();
  } catch (e) {
    const al = document.getElementById('alertError');
    al.textContent = 'Erreur : ' + e.message;
    al.classList.add('show');
  }
};

const supprimerProjet = async (id, titre) => {
  const ok = await showConfirmModal({ title: 'Supprimer', message: `Supprimer définitivement "<strong>${titre}</strong>" ? Cette action est irréversible.`, confirmText: 'Supprimer', confirmClass: 'btn-danger' });
  if (!ok) return;
  try {
    await api(`/projets/${id}`, 'DELETE');
    chargerProjets();
  } catch (e) {
    const al = document.getElementById('alertError');
    al.textContent = 'Erreur : ' + e.message;
    al.classList.add('show');
  }
};

document.getElementById('btnFiltrer').addEventListener('click', chargerProjets);
document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerProjets();