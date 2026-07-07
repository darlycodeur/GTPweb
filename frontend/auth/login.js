// ─── Sécurité : récupération robuste du user ──
let userExistant = null;
let tokenExistant = null;
try {
  tokenExistant = localStorage.getItem('token');
  userExistant  = JSON.parse(localStorage.getItem('user') || 'null');
  if (userExistant && !userExistant.role) userExistant = null;
} catch (e) {
  localStorage.clear();
  userExistant = null;
  tokenExistant = null;
}

if (tokenExistant && userExistant) {
  redirigerSelonRole(userExistant.role);
}

// Redirection selon le rôle
function redirigerSelonRole(role) {
  if (role === 'admin')        window.location.replace('../admin/dashboard.html');
  if (role === 'chef_projet')  window.location.replace('../chef-projet/dashboard.html');
  if (role === 'employe')      window.location.replace('../employe/dashboard.html');
}

// Afficher une erreur
function afficherErreur(message) {
  const alert = document.getElementById('alertError');
  alert.textContent = message;
  alert.classList.add('show');
}

// Bouton login
document.getElementById('btnLogin').addEventListener('click', async () => {
  const email      = document.getElementById('email').value.trim();
  const motDePasse = document.getElementById('motDePasse').value.trim();
  const btn        = document.getElementById('btnLogin');

  if (!email || !motDePasse) {
    afficherErreur('Email et mot de passe sont obligatoires.');
    return;
  }

  btn.textContent = 'Connexion en cours...';
  btn.disabled = true;

  try {
    const data = await api('/auth/login', 'POST', { email, motDePasse });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    redirigerSelonRole(data.user.role);

  } catch (error) {
    afficherErreur(error.message);
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
});

// Login avec Enter
document.getElementById('motDePasse').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('btnLogin').click();
});

// ─── Réinitialiser localStorage ──────────────
document.getElementById('btnReset').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.replace('/auth/login.html');
});

// ─── Toggle mot de passe ──────────────────────
const toggleBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('motDePasse');

toggleBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  toggleBtn.innerHTML = isPassword
    ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
       </svg>`;
  toggleBtn.setAttribute('aria-label', isPassword ? 'Masquer' : 'Afficher');
});
