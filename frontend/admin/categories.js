const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let modeEdition = false;

const chargerCategories = async () => {
  try {
    const data = await api('/categories');
    const grid = document.getElementById('grilleCats');

    grid.innerHTML = (data.categories || []).map(c => `
      <div class="card" style="border-top: 4px solid ${c.couleur}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px">
              <div style="width:12px;height:12px;border-radius:50%;background:${c.couleur}"></div>
              <h3 style="font-size:16px; font-weight:700">${c.nom}</h3>
            </div>
            <p style="font-size:13px; color:var(--gray); margin-bottom:12px">
              ${c.description || 'Aucune description'}
            </p>
            <span class="badge badge-info">${c.portee === 'les_deux' ? 'Projets & Tâches' : c.portee}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:16px">
          <button class="btn btn-outline btn-sm" style="flex:1"
            onclick="ouvrirEdition('${c._id}','${c.nom}','${c.couleur}','${c.description||''}','${c.portee}')">
            ✏️ Modifier
          </button>
          <button class="btn btn-danger btn-sm"
            onclick="supprimerCat('${c._id}','${c.nom}')">🗑️</button>
        </div>
      </div>
    `).join('') || '<p class="text-center">Aucune catégorie</p>';

  } catch (e) { console.error(e.message); }
};

document.getElementById('btnAjouter').addEventListener('click', () => {
  modeEdition = false;
  document.getElementById('modalTitre').textContent = 'Nouvelle Catégorie';
  document.getElementById('catId').value      = '';
  document.getElementById('catNom').value     = '';
  document.getElementById('catCouleur').value = '#3B82F6';
  document.getElementById('catDesc').value    = '';
  document.getElementById('catPortee').value  = 'les_deux';
  document.getElementById('alertError').classList.remove('show');
  document.getElementById('modalCat').classList.add('show');
});

const ouvrirEdition = (id, nom, couleur, desc, portee) => {
  modeEdition = true;
  document.getElementById('modalTitre').textContent = 'Modifier la catégorie';
  document.getElementById('catId').value      = id;
  document.getElementById('catNom').value     = nom;
  document.getElementById('catCouleur').value = couleur;
  document.getElementById('catDesc').value    = desc;
  document.getElementById('catPortee').value  = portee;
  document.getElementById('alertError').classList.remove('show');
  document.getElementById('modalCat').classList.add('show');
};

document.getElementById('modalClose').addEventListener('click',  () => document.getElementById('modalCat').classList.remove('show'));
document.getElementById('btnAnnuler').addEventListener('click',  () => document.getElementById('modalCat').classList.remove('show'));

document.getElementById('btnSauvegarder').addEventListener('click', async () => {
  const nom     = document.getElementById('catNom').value.trim();
  const couleur = document.getElementById('catCouleur').value;
  const desc    = document.getElementById('catDesc').value.trim();
  const portee  = document.getElementById('catPortee').value;
  const id      = document.getElementById('catId').value;

  if (!nom) {
    const al = document.getElementById('alertError');
    al.textContent = 'Le nom est obligatoire.';
    al.classList.add('show');
    return;
  }

  try {
    if (modeEdition) {
      await api(`/categories/${id}`, 'PUT', { nom, couleur, description: desc, portee });
    } else {
      await api('/categories', 'POST', { nom, couleur, description: desc, portee });
    }
    document.getElementById('modalCat').classList.remove('show');
    chargerCategories();
  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = error.message;
    al.classList.add('show');
  }
});

const supprimerCat = async (id, nom) => {
  const ok = await showConfirmModal({ title: 'Supprimer', message: `Supprimer la catégorie "<strong>${nom}</strong>" ?`, confirmText: 'Supprimer', confirmClass: 'btn-danger' });
  if (!ok) return;
  try {
    await api(`/categories/${id}`, 'DELETE');
    chargerCategories();
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

chargerCategories();