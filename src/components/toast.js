// ================================================================
// SmartPayroll AI — Toast Notification System
// ================================================================

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {number} [options.duration=4000]
 */
export function showToast({ type = 'info', title, message = '', duration = 4000 }) {
  const container = ensureContainer();

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close">
      <i data-lucide="x"></i>
    </button>
  `;

  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons();

  const dismiss = () => {
    toast.classList.add('exiting');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { dismiss };
}

export default showToast;
