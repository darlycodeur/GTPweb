(function() {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const el = document.getElementById('sidebarAvatar');
    if (el && user && user.avatar) {
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = user.avatar;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block';
      el.appendChild(img);
    }
  } catch (e) {}
})();
