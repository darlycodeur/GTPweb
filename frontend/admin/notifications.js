const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarRole').textContent   = user.role;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let afficherNonLues = false;

const iconeType = (type) => {
  const map = {
    assignation: '📋', statut: '🔄', commentaire: '💬',
    echeance: '⏰', mention: '👤', depassement: '⚠️',
    bloque_critique: '🚨', audit: '📋'
  };
  return map[type] || '🔔';
};

const chargerNotifications = async () => {
  const url = afficherNonLues ? '/notifications?lu=false' : '/notifications';
  try {
    const data = await api(url);
    const liste = data.notifications || [];

    // Compteur
    const nonLues = liste.filter(n => !n.lu).length;
    document.getElementById('compteurNonLues').textContent =
      nonLues > 0 ? `${nonLues} notification(s) non lue(s)` : 'Toutes les notifications sont lues';

    // Affichage
    const container = document.getElementById('listeNotifications');

    if (liste.length === 0) {
      container.innerHTML = `
        <div class="card text-center" style="padding:48px">
          <p style="font-size:48px">📭</p>
          <p style="color:var(--gray); margin-top:12px">Aucune notification</p>
        </div>`;
      return;
    }

    container.innerHTML = liste.map(n => `
      <div class="card" style="
        margin-bottom:12px;
        border-left: 4px solid ${n.lu ? 'var(--gray-light)' : 'var(--primary)'};
        opacity: ${n.lu ? '0.7' : '1'};
        cursor: pointer;
      " onclick="marquerLue('${n._id}', this, ${n.lu})">
        <div style="display:flex; gap:16px; align-items:flex-start">
          <span style="font-size:28px">${iconeType(n.type)}</span>
          <div style="flex:1">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <h4 style="font-size:15px; font-weight:600">${n.titre}</h4>
              <div style="display:flex; gap:8px; align-items:center">
                ${!n.lu ? '<span class="badge badge-info">Nouveau</span>' : ''}
                <span style="font-size:12px; color:var(--gray)">
                  ${new Date(n.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            <p style="font-size:14px; color:var(--gray); margin-top:6px">${n.message}</p>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

const marquerLue = async (id, element, dejaLue) => {
  if (dejaLue) return;
  try {
    await api(`/notifications/${id}/lue`, 'PUT');
    element.style.borderLeftColor = 'var(--gray-light)';
    element.style.opacity = '0.7';
    element.querySelector('.badge')?.remove();
    chargerNotifications();
  } catch (e) { console.error(e.message); }
};

document.getElementById('btnToutesLues').addEventListener('click', async () => {
  try {
    await api('/notifications/toutes/lues', 'PUT');
    chargerNotifications();
  } catch (e) { alert('Erreur : ' + e.message); }
});

document.getElementById('filtreToutes').addEventListener('click', () => {
  afficherNonLues = false;
  document.getElementById('filtreToutes').className   = 'btn btn-primary btn-sm';
  document.getElementById('filtreNonLues').className  = 'btn btn-outline btn-sm';
  chargerNotifications();
});

document.getElementById('filtreNonLues').addEventListener('click', () => {
  afficherNonLues = true;
  document.getElementById('filtreNonLues').className  = 'btn btn-primary btn-sm';
  document.getElementById('filtreToutes').className   = 'btn btn-outline btn-sm';
  chargerNotifications();
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerNotifications();