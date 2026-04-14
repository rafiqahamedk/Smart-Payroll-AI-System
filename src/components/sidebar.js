// ================================================================
// SmartPayroll AI — Sidebar Component
// ================================================================

import router from '../router.js';
import store from '../store.js';

const NAV_ITEMS = [
  { label: 'Menu', type: 'section' },
  { path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { path: '/employees', label: 'Employees', icon: 'users' },
  { path: '/attendance', label: 'Attendance', icon: 'calendar-check' },
  { path: '/payroll', label: 'Payroll', icon: 'banknote', badge: () => {
    const pending = store.getPendingPayrolls();
    return pending > 0 ? pending : null;
  }},
  { label: 'Analytics', type: 'section' },
  { path: '/reports', label: 'Reports', icon: 'bar-chart-3' },
  { label: 'System', type: 'section' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

export function renderSidebar(container) {
  const currentPath = router.getPath();

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'main-sidebar';

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">
        <i data-lucide="sparkles"></i>
      </div>
      <div class="sidebar-brand-text">
        <h1>SmartPayroll</h1>
        <span>AI-Powered Payroll</span>
      </div>
    </div>

    <nav class="sidebar-nav" id="sidebar-nav">
      ${NAV_ITEMS.map(item => {
        if (item.type === 'section') {
          return `<div class="nav-section-label">${item.label}</div>`;
        }
        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
        const badge = item.badge ? item.badge() : null;
        return `
          <div class="nav-item ${isActive ? 'active' : ''}" data-path="${item.path}" id="nav-${item.path.slice(1)}">
            <i data-lucide="${item.icon}"></i>
            <span>${item.label}</span>
            ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
          </div>
        `;
      }).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="nav-item" id="nav-ai-chat-toggle">
        <i data-lucide="bot"></i>
        <span>AI Assistant</span>
      </div>
    </div>
  `;

  container.appendChild(sidebar);

  // Navigation handlers
  sidebar.querySelectorAll('.nav-item[data-path]').forEach(item => {
    item.addEventListener('click', () => {
      router.navigate(item.dataset.path);
      updateActiveState(item.dataset.path);
    });
  });

  // AI Chat toggle
  sidebar.querySelector('#nav-ai-chat-toggle').addEventListener('click', () => {
    const panel = document.getElementById('ai-chat-panel');
    if (panel) panel.classList.toggle('open');
  });

  return sidebar;
}

export function updateActiveState(path) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  nav.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active',
      item.dataset.path === path || (path && path.startsWith(item.dataset.path + '/'))
    );
  });
}
