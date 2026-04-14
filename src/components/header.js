// ================================================================
// SmartPayroll AI — Header Component
// ================================================================

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & AI Insights' },
  '/employees': { title: 'Employees', subtitle: 'Manage your team' },
  '/attendance': { title: 'Attendance', subtitle: 'Track working days & leaves' },
  '/payroll': { title: 'Payroll', subtitle: 'Process & manage salaries' },
  '/reports': { title: 'Reports', subtitle: 'Analytics & summaries' },
  '/settings': { title: 'Settings', subtitle: 'Configure your payroll' },
};

export function renderHeader(container) {
  const header = document.createElement('header');
  header.className = 'header';
  header.id = 'main-header';

  header.innerHTML = `
    <div class="header-left">
      <div>
        <div class="header-title" id="header-title">Dashboard</div>
        <div class="header-subtitle" id="header-subtitle">Overview & AI Insights</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-search">
        <i data-lucide="search"></i>
        <input type="text" placeholder="Search employees, payroll..." id="header-search-input" />
      </div>
      <button class="header-btn tooltip" data-tooltip="AI Assistant" id="header-ai-btn">
        <i data-lucide="sparkles"></i>
      </button>
      <button class="header-btn tooltip" data-tooltip="Notifications" id="header-notif-btn">
        <i data-lucide="bell"></i>
        <span class="notification-dot"></span>
      </button>
      <div class="header-avatar tooltip" data-tooltip="Admin" id="header-avatar">A</div>
    </div>
  `;

  container.appendChild(header);

  // AI button
  header.querySelector('#header-ai-btn').addEventListener('click', () => {
    const panel = document.getElementById('ai-chat-panel');
    if (panel) panel.classList.toggle('open');
  });

  return header;
}

export function updateHeader(path) {
  const basePath = '/' + (path || 'dashboard').split('/').filter(Boolean)[0];
  const info = PAGE_TITLES[basePath] || { title: 'SmartPayroll', subtitle: '' };

  const titleEl = document.getElementById('header-title');
  const subtitleEl = document.getElementById('header-subtitle');

  if (titleEl) titleEl.textContent = info.title;
  if (subtitleEl) subtitleEl.textContent = info.subtitle;
}
