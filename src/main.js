// ================================================================
// SmartPayroll AI — Main Entry Point
// ================================================================

import './styles/index.css';
import router from './router.js';
import store from './store.js';
import { renderSidebar, updateActiveState } from './components/sidebar.js';
import { renderHeader, updateHeader } from './components/header.js';
import { renderAIChat } from './components/ai-chat.js';

// Import Pages
import renderDashboard from './pages/dashboard.js';
import renderEmployees from './pages/employees.js';
import renderAttendance from './pages/attendance.js';
import renderPayroll from './pages/payroll.js';
import renderReports from './pages/reports.js';
import renderSettings from './pages/settings.js';

// ── Initialize Application ───────────────────────────────────
async function init() {
  const app = document.getElementById('app');

  // Preload data from backend
  await store.preload();

  // Create app layout
  app.innerHTML = `
    <div class="app-layout">
      <div id="sidebar-container"></div>
      <div class="main-area">
        <div id="header-container"></div>
        <div id="page-container" class="page-content" style="opacity:1;transform:translateY(0)"></div>
      </div>
      <div id="ai-chat-container"></div>
    </div>
  `;

  // Render shell components
  renderSidebar(document.getElementById('sidebar-container'));
  renderHeader(document.getElementById('header-container'));
  renderAIChat(document.getElementById('ai-chat-container'));

  // Initialize Lucide icons
  if (window.lucide) window.lucide.createIcons();

  // Register routes
  const pageContainer = document.getElementById('page-container');
  router.setContainer(pageContainer);

  router.register('/dashboard', renderDashboard);
  router.register('/employees', renderEmployees);
  router.register('/attendance', renderAttendance);
  router.register('/payroll', renderPayroll);
  router.register('/reports', renderReports);
  router.register('/settings', renderSettings);

  // Before each route — update header and sidebar
  router.beforeEach((toPath) => {
    updateHeader(toPath);
    updateActiveState(toPath);
    return true;
  });

  // After each route — re-render icons
  router.afterEach(() => {
    setTimeout(() => {
      if (window.lucide) window.lucide.createIcons();
    }, 150);
  });

  // Start router
  router.start();

  console.log(
    '%c SmartPayroll AI %c Backend: FastAPI + MongoDB | AI: OSM API (qwen3.5-397b-a17b) ',
    'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: 700;',
    'background: #1e1b4b; color: #a78bfa; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
}

// ── Boot ──────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
