try {
  const token = localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user || !user.role) {
    localStorage.clear();
    window.location.replace('/auth/login.html');
  }
} catch (e) {
  localStorage.clear();
  window.location.replace('/auth/login.html');
}
