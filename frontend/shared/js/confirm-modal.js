function showConfirmModal({ title = 'Confirmation', message = '', confirmText = 'Confirmer', cancelText = 'Annuler', confirmClass = 'btn-primary' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center;">
        <div class="modal-header" style="justify-content:center;border:none;padding-bottom:0;">
          <h3 class="modal-title">${title}</h3>
        </div>
        <p style="margin:16px 0;color:var(--gray);font-size:15px;">${message}</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">
          <button class="btn btn-outline" id="confirmCancel">${cancelText}</button>
          <button class="btn ${confirmClass}" id="confirmOk">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const ok = () => { overlay.remove(); resolve(true); };
    const cancel = () => { overlay.remove(); resolve(false); };

    overlay.querySelector('#confirmOk').addEventListener('click', ok);
    overlay.querySelector('#confirmCancel').addEventListener('click', cancel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
  });
}
