const user = JSON.parse(localStorage.getItem('user'));
document.getElementById('sidebarNom').textContent    = user.nom;
document.getElementById('sidebarAvatar').textContent = user.nom.charAt(0).toUpperCase();

let intervalId  = null;
let secondes    = 0;
let tacheActive = null;

// ─── Formater le temps ────────────────────
const formaterTemps = (s) => {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

// ─── Charger les tâches de l'employé ─────
const chargerTaches = async () => {
  try {
    const data = await api('/taches?statut=en_cours&limit=50');
    const select = document.getElementById('selectTache');

    select.innerHTML = '<option value="">-- Choisir une tâche --</option>' +
      (data.taches || []).map(t =>
        `<option value="${t._id}">${t.titre} (${t.projet?.titre || '-'})</option>`
      ).join('');

    // Si tacheId dans l'URL
    const params  = new URLSearchParams(window.location.search);
    const tacheId = params.get('tacheId');
    if (tacheId) select.value = tacheId;

  } catch (e) { console.error(e.message); }
};

// ─── Charger sessions ─────────────────────
const chargerSessions = async () => {
  try {
    const data  = await api('/sessions');
    const tbody = document.getElementById('tableSessions');

    tbody.innerHTML = (data.sessions || []).map(s => `
      <tr>
        <td>${s.tache?.titre || '-'}</td>
        <td>${new Date(s.debut).toLocaleString('fr-FR')}</td>
        <td>${s.fin ? new Date(s.fin).toLocaleString('fr-FR') : '<span class="badge badge-warning">En cours</span>'}</td>
        <td>${s.duree ? `${s.duree} min` : '-'}</td>
        <td>${s.note || '-'}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">Aucune session</td></tr>';

  } catch (e) { console.error(e.message); }
};

// ─── Démarrer le timer ────────────────────
document.getElementById('btnDemarrer').addEventListener('click', async () => {
  const tacheId = document.getElementById('selectTache').value;

  if (!tacheId) {
    const al = document.getElementById('alertError');
    al.textContent = 'Veuillez sélectionner une tâche.';
    al.classList.add('show');
    return;
  }

  try {
    await api(`/sessions/tache/${tacheId}/start`, 'POST');

    tacheActive = tacheId;
    const tacheNom = document.getElementById('selectTache').selectedOptions[0].text;
    document.getElementById('timerTacheNom').innerHTML = `Tâche : <strong>${tacheNom}</strong>`;
    document.getElementById('timerDisplay').classList.add('running');
    document.getElementById('btnDemarrer').style.display = 'none';
    document.getElementById('btnArreter').style.display  = 'inline-flex';
    document.getElementById('alertError').classList.remove('show');

    secondes = 0;
    intervalId = setInterval(() => {
      secondes++;
      document.getElementById('timerDisplay').textContent = formaterTemps(secondes);
    }, 1000);

  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = error.message;
    al.classList.add('show');
  }
});

// ─── Arrêter le timer ─────────────────────
document.getElementById('btnArreter').addEventListener('click', async () => {
  if (!tacheActive) return;

  const note = prompt('Note sur cette session (optionnel) :') || '';

  try {
    await api(`/sessions/tache/${tacheActive}/stop`, 'PUT', { note });

    clearInterval(intervalId);
    intervalId = null;

    const al = document.getElementById('alertSuccess');
    al.textContent = `Session terminée ! Durée : ${formaterTemps(secondes)}`;
    al.classList.add('show');
    setTimeout(() => al.classList.remove('show'), 4000);

    document.getElementById('timerDisplay').textContent = '00:00:00';
    document.getElementById('timerDisplay').classList.remove('running');
    document.getElementById('timerTacheNom').textContent = 'Aucune tâche sélectionnée';
    document.getElementById('btnDemarrer').style.display = 'inline-flex';
    document.getElementById('btnArreter').style.display  = 'none';

    tacheActive = null;
    secondes    = 0;
    chargerSessions();

  } catch (error) {
    const al = document.getElementById('alertError');
    al.textContent = error.message;
    al.classList.add('show');
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const ok = await showConfirmModal({ title: 'Déconnexion', message: 'Êtes-vous sûr de vouloir vous déconnecter ?', confirmText: 'Se déconnecter', confirmClass: 'btn-danger' });
  if (!ok) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../auth/login.html';
});

chargerTaches();
chargerSessions();