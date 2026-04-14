// ================================================================
// SmartPayroll AI — Modal Component
// ================================================================

/**
 * Show a modal dialog
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.content - HTML content
 * @param {string} [options.size] - '', 'modal-lg', 'modal-xl'
 * @param {Function} [options.onConfirm]
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.confirmClass='btn-primary']
 * @param {boolean} [options.showFooter=true]
 * @returns {{ close: Function, element: HTMLElement }}
 */
export function showModal(options) {
  const {
    title = 'Modal',
    content = '',
    size = '',
    onConfirm,
    confirmText = 'Confirm',
    confirmClass = 'btn-primary',
    showFooter = true,
    onOpen,
  } = options;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';

  overlay.innerHTML = `
    <div class="modal ${size}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-btn">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body" id="modal-body">
        ${content}
      </div>
      ${showFooter ? `
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn ${confirmClass}" id="modal-confirm-btn">${confirmText}</button>
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(overlay);

  if (window.lucide) window.lucide.createIcons();

  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  };

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Close button
  overlay.querySelector('#modal-close-btn').addEventListener('click', close);

  // Cancel button
  const cancelBtn = overlay.querySelector('#modal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', close);

  // Confirm button
  const confirmBtn = overlay.querySelector('#modal-confirm-btn');
  if (confirmBtn && onConfirm) {
    confirmBtn.addEventListener('click', () => {
      onConfirm(overlay.querySelector('#modal-body'), close);
    });
  }

  // ESC key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // onOpen callback
  if (onOpen) {
    setTimeout(() => onOpen(overlay.querySelector('#modal-body')), 50);
  }

  return { close, element: overlay };
}

/**
 * Show a confirmation dialog
 */
export function showConfirm({ title, message, confirmText = 'Delete', confirmClass = 'btn-danger' }) {
  return new Promise((resolve) => {
    showModal({
      title,
      content: `<p style="color:var(--text-secondary);font-size:var(--text-sm)">${message}</p>`,
      confirmText,
      confirmClass,
      onConfirm: (body, close) => {
        close();
        resolve(true);
      },
    });
  });
}

export default showModal;
