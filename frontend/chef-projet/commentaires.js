const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let tacheSelectionnee = null;

// ─── Charger les tâches ───────────────────
const chargerTaches = async () => {
  try {
    const data = await api('/taches?limit=100');
    document.getElementById('selectTache').innerHTML =
      '<option value="">-- Choisir une tâche --</option>' +
      (data.taches || []).map(t =>
        `<option value="${t._id}">${t.titre} (${t.projet?.titre || '-'})</option>`
      ).join('');
  } catch (e) { console.error(e.message); }
};

// ─── Charger les commentaires ─────────────
const chargerCommentaires = async (tacheId) => {
  try {
    const data = await api(`/commentaires/tache/${tacheId}`);
    const liste = data.commentaires || [];
    const container = document.getElementById('listeCommentaires');

    if (liste.length === 0) {
      container.innerHTML = `
        <div class="card text-center" style="padding:32px; color:var(--gray)">
          Aucun commentaire pour cette tâche.
        </div>`;
      return;
    }

    // Séparer commentaires parents et réponses
    const parents  = liste.filter(c => !c.parentId);
    const reponses = liste.filter(c => c.parentId);

    container.innerHTML = parents.map(c => {
      const reps = reponses.filter(r =>
        r.parentId === c._id || r.parentId?._id === c._id
      );
      return `
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex; gap:12px">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--primary);
              flex-shrink:0;display:flex;align-items:center;justify-content:center;
              color:white;font-weight:700">
              ${c.auteur?.nom ? c.auteur.nom.charAt(0) : '?'}
            </div>
            <div style="flex:1">
              <div style="display:flex; justify-content:space-between; align-items:center">
                <strong style="font-size:14px">${c.auteur?.nom || 'Inconnu'}</strong>
                <span style="font-size:12px; color:var(--gray)">
                  ${new Date(c.createdAt).toLocaleString('fr-FR')}
                  ${c.modifie ? '<em>(modifié)</em>' : ''}
                </span>
              </div>
              <p style="font-size:14px; margin-top:6px; color:var(--dark)">${c.contenu}</p>
              <button class="btn btn-outline btn-sm" style="margin-top:8px"
                onclick="repondre('${c._id}', '${c.auteur?.nom}')">
                ↩️ Répondre
              </button>
            </div>
          </div>

          ${reps.length > 0 ? `
            <div style="margin-top:12px; padding-left:50px; border-left:3px solid var(--gray-light)">
              ${reps.map(r => `
                <div style="display:flex; gap:10px; margin-top:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--secondary);
                    flex-shrink:0;display:flex;align-items:center;justify-content:center;
                    color:white;font-weight:700;font-size:12px">
                    ${r.auteur?.nom ? r.auteur.nom.charAt(0) : '?'}
                  </div>
                  <div style="flex:1">
                    <div style="display:flex; justify-content:space-between">
                      <strong style="font-size:13px">${r.auteur?.nom || 'Inconnu'}</strong>
                      <span style="font-size:11px; color:var(--gray)">
                        ${new Date(r.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p style="font-size:13px; margin-top:4px">${r.contenu}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (e) { console.error(e.message); }
};

// ─── Répondre à un commentaire ────────────
let parentIdActif = null;
const repondre = (commentaireId, auteurNom) => {
  parentIdActif = commentaireId;
  const textarea = document.getElementById('contenuCommentaire');
  textarea.placeholder = `Répondre à ${auteurNom}...`;
  textarea.focus();
};

// ─── Changement de tâche ──────────────────
document.getElementById('selectTache').addEventListener('change', (e) => {
  tacheSelectionnee = e.target.value;
  if (tacheSelectionnee) {
    document.getElementById('zoneCommentaires').style.display = 'block';
    document.getElementById('placeholderSelect').style.display = 'none';
    parentIdActif = null;
    chargerCommentaires(tacheSelectionnee);
  } else {
    document.getElementById('zoneCommentaires').style.display = 'none';
    document.getElementById('placeholderSelect').style.display = 'block';
  }
});

// ─── Envoyer commentaire ──────────────────
document.getElementById('btnEnvoyer').addEventListener('click', async () => {
  const contenu = document.getElementById('contenuCommentaire').value.trim();
  if (!contenu || !tacheSelectionnee) return;

  try {
    await api('/commentaires', 'POST', {
      contenu,
      tache: tacheSelectionnee,
      parentId: parentIdActif || undefined
    });
    document.getElementById('contenuCommentaire').value = '';
    document.getElementById('contenuCommentaire').placeholder = 'Écrire un commentaire...';
    parentIdActif = null;
    chargerCommentaires(tacheSelectionnee);
  } catch (e) { alert('Erreur : ' + e.message); }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerTaches();