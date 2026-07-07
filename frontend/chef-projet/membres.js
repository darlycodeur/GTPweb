const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

const bgCouleurs = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#3B82F6'];

const chargerProjets = async () => {
  try {
    const data = await api('/projets?limit=50');
    document.getElementById('selectProjet').innerHTML =
      '<option value="">-- Choisir un projet --</option>' +
      (data.projets || []).map(p =>
        `<option value="${p._id}">${p.titre}</option>`
      ).join('');
  } catch (e) { console.error(e.message); }
};

const chargerMembres = async (projetId) => {
  try {
    const data    = await api(`/projets/${projetId}`);
    const projet  = data.projet;
    const membres = projet?.membres || [];
    const grid    = document.getElementById('gridMembres');

    grid.innerHTML = membres.map((m, i) => {
      const avatarHtml = m.avatar
        ? `<img src="${m.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
        : m.nom.charAt(0).toUpperCase();
      const bg = m.avatar ? 'transparent' : bgCouleurs[i % bgCouleurs.length];
      return `<div class="card" style="text-align:center; padding:32px 24px">
        <div style="width:70px;height:70px;border-radius:50%;overflow:hidden;
          background:${bg};
          display:flex;align-items:center;justify-content:center;
          color:white;font-size:28px;font-weight:700;margin:0 auto 16px">
          ${avatarHtml}
        </div>
        <h3 style="font-size:16px; font-weight:700">${m.nom}</h3>
        <p style="font-size:13px; color:var(--gray); margin-top:4px">${m.email}</p>
        <span class="badge badge-info" style="margin-top:12px">${m.role}</span>
      </div>`;
    }).join('') || '<p style="color:var(--gray)">Aucun membre dans ce projet</p>';

  } catch (e) { console.error(e.message); }
};

document.getElementById('selectProjet').addEventListener('change', (e) => {
  const projetId = e.target.value;
  if (projetId) {
    document.getElementById('listeMembres').style.display = 'block';
    document.getElementById('placeholder').style.display  = 'none';
    chargerMembres(projetId);
  } else {
    document.getElementById('listeMembres').style.display = 'none';
    document.getElementById('placeholder').style.display  = 'block';
  }
});

// ─── Avatar preview membre ────────────────
document.getElementById('membreAvatar').addEventListener('change', () => {
  const file = document.getElementById('membreAvatar').files[0];
  const preview = document.getElementById('avatarMembrePreview');
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

const uploadMembreAvatar = async (userId) => {
  const fileInput = document.getElementById('membreAvatar');
  if (!fileInput.files.length) return null;
  const formData = new FormData();
  formData.append('avatar', fileInput.files[0]);
  formData.append('userId', userId);
  const res = await fetch('/api/upload/admin-avatar', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.avatar;
};

// ─── Ouvrir modal ajout membre ────────────
document.getElementById('btnAjouterMembre').addEventListener('click', () => {
  document.getElementById('membreNom').value = '';
  document.getElementById('membreEmail').value = '';
  document.getElementById('membreMotDePasse').value = '';
  document.getElementById('membreAvatar').value = '';
  document.getElementById('avatarMembrePreview').innerHTML = '📷';
  document.getElementById('avatarMembrePreview').style.background = 'var(--gray-light)';
  document.getElementById('alertMembreError').classList.remove('show');
  document.getElementById('modalMembre').classList.add('show');
});

document.getElementById('modalMembreClose').addEventListener('click', () => document.getElementById('modalMembre').classList.remove('show'));
document.getElementById('btnMembreAnnuler').addEventListener('click', () => document.getElementById('modalMembre').classList.remove('show'));

document.getElementById('btnMembreSauvegarder').addEventListener('click', async () => {
  const nom = document.getElementById('membreNom').value.trim();
  const email = document.getElementById('membreEmail').value.trim();
  const motDePasse = document.getElementById('membreMotDePasse').value.trim();

  if (!nom || !email || !motDePasse) {
    const alert = document.getElementById('alertMembreError');
    alert.textContent = 'Nom, email et mot de passe sont obligatoires.';
    alert.classList.add('show');
    return;
  }

  try {
    const result = await api('/users', 'POST', { nom, email, motDePasse, role: 'employe' });
    if (result.user?._id) {
      const avatarUrl = await uploadMembreAvatar(result.user._id);
      if (avatarUrl) {
        await api(`/users/${result.user._id}`, 'PUT', { avatar: avatarUrl });
      }
    }
    document.getElementById('modalMembre').classList.remove('show');
    const success = document.getElementById('alertMembreSuccess');
    success.textContent = 'Membre créé avec succès !';
    success.classList.add('show');
    setTimeout(() => success.classList.remove('show'), 3000);
    const select = document.getElementById('selectProjet');
    if (select.value) chargerMembres(select.value);
  } catch (error) {
    const alert = document.getElementById('alertMembreError');
    alert.textContent = error.message;
    alert.classList.add('show');
  }
});

// ─── Toggle mot de passe membre ───────────
document.getElementById('toggleMembreMdp').addEventListener('click', () => {
  const input = document.getElementById('membreMotDePasse');
  const btn = document.getElementById('toggleMembreMdp');
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

// ─── Déconnexion ──────────────────────────
document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerProjets();