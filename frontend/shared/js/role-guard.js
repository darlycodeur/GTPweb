try {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || !user.role) {
    localStorage.clear();
    window.location.replace('/auth/login.html');
    return;
  }

  const page = window.location.pathname;

  if (page.includes('/admin/') && user.role !== 'admin') {
    window.location.replace('/auth/login.html');
    return;
  }

  if (page.includes('/chef-projet/') && user.role !== 'chef_projet' && user.role !== 'admin') {
    window.location.replace('/auth/login.html');
    return;
  }

  if (page.includes('/employe/') && user.role !== 'employe' && user.role !== 'admin') {
    window.location.replace('/auth/login.html');
    return;
  }
} catch (e) {
  localStorage.clear();
  window.location.replace('/auth/login.html');
}
