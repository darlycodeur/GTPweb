const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

const couleurs = {
  a_faire:  '#3B82F6', en_cours: '#F59E0B',
  termine:  '#10B981', bloque:   '#EF4444',
  en_revue: '#8B5CF6', planifie: '#6366F1',
  suspendu: '#64748B', critique: '#EF4444',
  haute:    '#F59E0B', normale:  '#3B82F6',
  basse:    '#10B981', admin:    '#EF4444',
  chef_projet: '#F59E0B', employe: '#3B82F6'
};

// ─── Barre de progression ──────────────────
const barreProgression = (label, valeur, total, couleur) => {
  const pct = total > 0 ? Math.round((valeur / total) * 100) : 0;
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px">
        <span style="font-size:13px; font-weight:500">${label}</span>
        <span style="font-size:13px; color:var(--gray)">${valeur} (${pct}%)</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%; background:${couleur}"></div>
      </div>
    </div>
  `;
};

// ─── Charger toutes les stats ─────────────
const chargerStats = async () => {
  try {
    const [users, projets, taches] = await Promise.all([
      api('/users?limit=100'),
      api('/projets?limit=100'),
      api('/taches?limit=200')
    ]);

    const listeUsers   = users.users   || [];
    const listeProjets = projets.projets || [];
    const listeTaches  = taches.taches  || [];

    // ── Stats globales ──────────────────
    const terminees = listeTaches.filter(t => t.statut === 'termine').length;
    const taux = listeTaches.length > 0
      ? Math.round((terminees / listeTaches.length) * 100)
      : 0;

    document.getElementById('statUsers').textContent  = listeUsers.length;
    document.getElementById('statProjets').textContent = listeProjets.length;
    document.getElementById('statTaches').textContent  = listeTaches.length;
    document.getElementById('statTaux').textContent    = `${taux}%`;

    // ── Tâches par statut ───────────────
    const statutsTaches = ['a_faire','en_cours','en_revue','termine','bloque'];
    document.getElementById('statsTachesStatut').innerHTML =
      statutsTaches.map(s => {
        const count = listeTaches.filter(t => t.statut === s).length;
        return barreProgression(s.replace(/_/g,' '), count, listeTaches.length, couleurs[s]);
      }).join('');

    // ── Projets par statut ──────────────
    const statutsProjets = ['planifie','en_cours','termine','suspendu'];
    document.getElementById('statsProjetsStatut').innerHTML =
      statutsProjets.map(s => {
        const count = listeProjets.filter(p => p.statut === s).length;
        return barreProgression(s.replace(/_/g,' '), count, listeProjets.length, couleurs[s]);
      }).join('');

    // ── Graphique priorités ─────────────
    const priorites = ['critique','haute','normale','basse'];
    const maxPriorite = Math.max(...priorites.map(p =>
      listeTaches.filter(t => t.priorite === p).length
    ), 1);

    document.getElementById('chartPriorite').innerHTML =
      priorites.map(p => {
        const count = listeTaches.filter(t => t.priorite === p).length;
        const hauteur = Math.round((count / maxPriorite) * 140);
        return `
          <div class="chart-bar-item">
            <div class="chart-bar-value">${count}</div>
            <div class="chart-bar" style="height:${hauteur}px; background:${couleurs[p]}"></div>
            <div class="chart-bar-label">${p}</div>
          </div>
        `;
      }).join('');

    // ── Top employés ────────────────────
    const employes = listeUsers.filter(u => u.role === 'employe');
    const topEmployes = employes.map(e => ({
      nom: e.nom,
      terminees: listeTaches.filter(t =>
        t.assigneA?._id === e._id || t.assigneA === e._id && t.statut === 'termine'
      ).length,
      totales: listeTaches.filter(t =>
        t.assigneA?._id === e._id || t.assigneA === e._id
      ).length
    })).sort((a, b) => b.terminees - a.terminees).slice(0, 5);

    document.getElementById('topEmployes').innerHTML =
      topEmployes.length > 0
      ? topEmployes.map((e, i) => `
          <div style="display:flex; align-items:center; gap:16px; padding:12px 0;
            border-bottom:1px solid var(--gray-light)">
            <div style="width:32px; height:32px; border-radius:50%;
              background:${i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : 'var(--primary)'};
              display:flex; align-items:center; justify-content:center;
              color:white; font-weight:700; font-size:14px">
              ${i + 1}
            </div>
            <div style="flex:1">
              <p style="font-weight:600; font-size:14px">${e.nom}</p>
              <p style="font-size:12px; color:var(--gray)">${e.terminees} tâche(s) terminée(s) / ${e.totales} total</p>
            </div>
            <div style="width:100px">
              <div class="progress-bar">
                <div class="progress-fill" style="width:${e.totales > 0 ? Math.round(e.terminees/e.totales*100) : 0}%;
                  background:var(--secondary)"></div>
              </div>
            </div>
          </div>
        `).join('')
      : '<p style="color:var(--gray); text-align:center; padding:20px">Aucun employé</p>';

    // ── Stats par rôle ──────────────────
    const roles = ['admin','chef_projet','employe'];
    document.getElementById('statsRoles').innerHTML =
      roles.map(r => {
        const count = listeUsers.filter(u => u.role === r).length;
        return barreProgression(r.replace('_',' '), count, listeUsers.length, couleurs[r]);
      }).join('');

  } catch (error) {
    console.error('Erreur:', error.message);
  }
};

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerStats();