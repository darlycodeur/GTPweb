const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let modeEdition = false;

const badgeRole = (role) => {
  const map = { admin:'badge-danger', chef_projet:'badge-warning', employe:'badge-info' };
  return `<span class="badge ${map[role]||'badge-gray'}">${role}</span>`;
};

// ─── Charger les utilisateurs ─────────────
const chargerUsers = async () => {
  const role  = document.getElementById('filtreRole').value;
  const actif = document.getElementById('filtreActif').value;
  let url = '/users?limit=50';
  if (role)  url += `&role=${role}`;
  if (actif) url += `&actif=${actif}`;

  try {
    const data = await api(url);
    const tbody = document.getElementById('tableUsers');

    tbody.innerHTML = (data.users || []).map(u => {
      const avatar = u.avatar
        ? `<img src="${u.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
        : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:700">${u.nom.charAt(0).toUpperCase()}</span>`;
      const safeNom = u.nom.replace(/'/g,"\\'");
      const safeEmail = u.email.replace(/'/g,"\\'");
      const safeAvatar = (u.avatar || '').replace(/'/g,"\\'");
      return `<tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:${u.avatar ? 'transparent' : 'var(--primary)'};overflow:hidden;flex-shrink:0">${avatar}</div>
            <span>${u.nom}</span>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${badgeRole(u.role)}</td>
        <td>${u.quotaTaches}</td>
        <td>${u.actif
          ? '<span class="badge badge-success">Actif</span>'
          : '<span class="badge badge-danger">Inactif</span>'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="ouvrirEdition('${u._id}','${safeNom}','${safeEmail}','${u.role}',${u.quotaTaches},${u.actif},'${safeAvatar}')">
            ✏️ Modifier
          </button>
          <button class="btn btn-danger btn-sm" onclick="desactiverUser('${u._id}','${safeNom}')">
            🚫 Désactiver
          </button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center">Aucun utilisateur trouvé</td></tr>';

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

// ─── Avatar preview ───────────────────────
document.getElementById('userAvatar').addEventListener('change', () => {
  const file = document.getElementById('userAvatar').files[0];
  const preview = document.getElementById('avatarPreview');
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
      preview.style.background = 'transparent';
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '📷';
    preview.style.background = 'var(--gray-light)';
  }
});

const reinitialiserModal = () => {
  document.getElementById('userId').value      = '';
  document.getElementById('userNom').value     = '';
  document.getElementById('userEmail').value   = '';
  document.getElementById('userMotDePasse').value = '';
  document.getElementById('userRole').value    = 'employe';
  document.getElementById('userQuota').value   = '';
  document.getElementById('userAvatar').value  = '';
  document.getElementById('avatarPreview').innerHTML = '📷';
  document.getElementById('avatarPreview').style.background = 'var(--gray-light)';
  document.getElementById('alertError').classList.remove('show');
};

// ─── Ouvrir modal ajout ───────────────────
document.getElementById('btnAjouter').addEventListener('click', () => {
  modeEdition = false;
  document.getElementById('modalTitre').textContent = 'Ajouter un utilisateur';
  reinitialiserModal();
  document.getElementById('groupMotDePasse').style.display = 'block';
  document.getElementById('groupActif').style.display      = 'none';
  document.getElementById('modalUser').classList.add('show');
});

// ─── Ouvrir modal édition ─────────────────
const ouvrirEdition = (id, nom, email, role, quota, actif, avatar) => {
  modeEdition = true;
  document.getElementById('modalTitre').textContent   = 'Modifier l\'utilisateur';
  reinitialiserModal();
  document.getElementById('userId').value             = id;
  document.getElementById('userNom').value            = nom;
  document.getElementById('userEmail').value          = email;
  document.getElementById('userRole').value           = role;
  document.getElementById('userQuota').value          = quota;
  document.getElementById('userActif').value          = String(actif);
  if (avatar) {
    document.getElementById('avatarPreview').innerHTML = `<img src="${avatar}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`;
    document.getElementById('avatarPreview').style.background = 'transparent';
  }
  document.getElementById('groupMotDePasse').style.display = 'none';
  document.getElementById('groupActif').style.display      = 'block';
  document.getElementById('modalUser').classList.add('show');
};

// ─── Fermer modal ─────────────────────────
document.getElementById('modalClose').addEventListener('click',  () => document.getElementById('modalUser').classList.remove('show'));
document.getElementById('btnAnnuler').addEventListener('click',  () => document.getElementById('modalUser').classList.remove('show'));

const uploadAvatar = async (userId) => {
  const fileInput = document.getElementById('userAvatar');
  if (!fileInput.files.length) return null;
  const formData = new FormData();
  formData.append('avatar', fileInput.files[0]);
  if (userId) formData.append('userId', userId);
  const res = await fetch('/api/upload/admin-avatar', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.avatar;
};

// ─── Sauvegarder ──────────────────────────
document.getElementById('btnSauvegarder').addEventListener('click', async () => {
  const nom        = document.getElementById('userNom').value.trim();
  const email      = document.getElementById('userEmail').value.trim();
  const motDePasse = document.getElementById('userMotDePasse').value.trim();
  const role       = document.getElementById('userRole').value;
  const quota      = document.getElementById('userQuota').value;
  const actif      = document.getElementById('userActif').value === 'true';
  const id         = document.getElementById('userId').value;

  if (!nom || !email) {
    const alert = document.getElementById('alertError');
    alert.textContent = 'Nom et email sont obligatoires.';
    alert.classList.add('show');
    return;
  }

  try {
    let avatarUrl = null;

    if (modeEdition) {
      avatarUrl = await uploadAvatar(id);
      const payload = { nom, role, actif };
      if (quota !== '') payload.quotaTaches = Number(quota);
      if (avatarUrl) payload.avatar = avatarUrl;
      await api(`/users/${id}`, 'PUT', payload);
    } else {
      const payload = { nom, email, motDePasse, role };
      if (quota !== '') payload.quotaTaches = Number(quota);
      const result = await api('/users', 'POST', payload);
      if (result.user?._id) {
        const uploaded = await uploadAvatar(result.user._id);
        if (uploaded) {
          await api(`/users/${result.user._id}`, 'PUT', { avatar: uploaded });
        }
      }
    }

    document.getElementById('modalUser').classList.remove('show');
    const alertSuccess = document.getElementById('alertSuccess');
    alertSuccess.textContent = modeEdition ? 'Utilisateur modifié !' : 'Utilisateur créé !';
    alertSuccess.classList.add('show');
    setTimeout(() => alertSuccess.classList.remove('show'), 3000);
    chargerUsers();

  } catch (error) {
    const alertEl = document.getElementById('alertError');
    alertEl.textContent = error.message;
    alertEl.classList.add('show');
  }
});

// ─── Désactiver utilisateur ───────────────
const desactiverUser = async (id, nom) => {
  const ok = await showConfirmModal({ title: 'Désactiver', message: `Désactiver le compte de <strong>${nom}</strong> ?`, confirmText: 'Désactiver', confirmClass: 'btn-danger' });
  if (!ok) return;
  try {
    await api(`/users/${id}`, 'DELETE');
    chargerUsers();
  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = 'Erreur : ' + error.message;
    al.classList.add('show');
  }
};

// ─── Filtrer ──────────────────────────────
document.getElementById('btnFiltrer').addEventListener('click', chargerUsers);

// ─── Déconnexion ──────────────────────────
document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerUsers();

// ─── Toggle mot de passe ──────────────────────
document.getElementById('toggleUserMdp').addEventListener('click', () => {
  const input = document.getElementById('userMotDePasse');
  const btn = document.getElementById('toggleUserMdp');
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = isPassword
    ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
       </svg>`;
  btn.setAttribute('aria-label', isPassword ? 'Masquer' : 'Afficher');
});