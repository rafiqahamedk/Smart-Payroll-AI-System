// ================================================================
// SmartPayroll AI — Dashboard Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import { drawBarChart, drawDonutChart } from '../components/chart.js';
import router from '../router.js';

export default async function renderDashboard(container) {
  const employees = await store.getEmployees();
  const settings = await store.getSettings();
  const c = settings.payroll.currency;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthPayrolls = await store.getPayrollForMonth(currentMonth);
  const totalPayroll = monthPayrolls.reduce((sum, p) => sum + p.netPay, 0);
  const pendingCount = await store.getPendingPayrolls();
  const trend = await store.getPayrollTrend(6);

  // Calculate total leaves used this month
  let totalLeavesUsed = 0;
  for (const emp of employees) {
    const summary = await store.getAttendanceSummary(emp.id, currentMonth);
    totalLeavesUsed += summary.paidLeave + summary.unpaidLeave + summary.absent;
  }

  container.innerHTML = `
    <div class="page-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="card" id="stat-employees">
          <div class="card-header">
            <span class="card-title">Total Employees</span>
            <div class="card-icon primary"><i data-lucide="users"></i></div>
          </div>
          <div class="card-value">${employees.length}</div>
          <div class="card-change up">
            <i data-lucide="trending-up" style="width:14px;height:14px"></i>
            Max capacity: 10
          </div>
        </div>

        <div class="card" id="stat-payroll">
          <div class="card-header">
            <span class="card-title">Monthly Payroll</span>
            <div class="card-icon success"><i data-lucide="indian-rupee"></i></div>
          </div>
          <div class="card-value">${c}${totalPayroll.toLocaleString('en-IN')}</div>
          <div class="card-change ${totalPayroll > 0 ? 'up' : ''}">
            ${monthPayrolls.length} of ${employees.length} processed
          </div>
        </div>

        <div class="card" id="stat-pending">
          <div class="card-header">
            <span class="card-title">Pending Payrolls</span>
            <div class="card-icon ${pendingCount > 0 ? 'warning' : 'success'}"><i data-lucide="${pendingCount > 0 ? 'clock' : 'check-circle'}"></i></div>
          </div>
          <div class="card-value">${pendingCount}</div>
          <div class="card-change ${pendingCount > 0 ? 'down' : 'up'}">
            ${pendingCount > 0 ? 'Action required' : 'All caught up!'}
          </div>
        </div>

        <div class="card" id="stat-leaves">
          <div class="card-header">
            <span class="card-title">Leaves This Month</span>
            <div class="card-icon violet"><i data-lucide="calendar-off"></i></div>
          </div>
          <div class="card-value">${totalLeavesUsed}</div>
          <div class="card-change">
            Across all employees
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section-header">
        <h2 class="section-title">Quick Actions</h2>
      </div>
      <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-8);flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" id="dash-process-all">
          <i data-lucide="zap"></i>
          One-Click Process All
        </button>
        <button class="btn btn-secondary" id="dash-add-employee" ${employees.length >= 10 ? 'disabled' : ''}>
          <i data-lucide="user-plus"></i>
          Add Employee
        </button>
        <button class="btn btn-ai" id="dash-ai-chat">
          <i data-lucide="sparkles"></i>
          Ask AI Assistant
        </button>
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom:var(--space-8)">
        <div class="card">
          <div class="card-header">
            <span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Payroll Trend (6 Months)</span>
          </div>
          <div class="chart-container" style="height:240px">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Salary Distribution</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-6)">
            <div class="chart-container" style="width:180px;height:180px;flex-shrink:0">
              <canvas id="dist-chart"></canvas>
            </div>
            <div id="dist-legend" style="flex:1"></div>
          </div>
        </div>
      </div>

      <!-- AI Insights -->
      <div class="card" style="margin-bottom:var(--space-8)">
        <div class="ai-insight-box">
          <h3><i data-lucide="sparkles" style="width:16px;height:16px"></i> AI Insights</h3>
          <div id="ai-insights-content">
            <div class="ai-insight-loading">
              <div class="spinner"></div>
              Generating insights...
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Payroll Activity -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Recent Payroll Activity</span>
          <button class="btn btn-ghost btn-sm" id="dash-view-all-payroll">View All →</button>
        </div>
        ${monthPayrolls.length > 0 ? `
          <div class="table-container" style="border:none">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${monthPayrolls.slice(0, 6).map(p => `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:var(--space-3)">
                        <div class="payroll-emp-avatar" style="width:32px;height:32px;font-size:0.75rem">${getInitials(p.employeeName)}</div>
                        <span style="font-weight:500">${p.employeeName}</span>
                      </div>
                    </td>
                    <td style="color:var(--text-secondary)">${p.employeeRole}</td>
                    <td>${c}${p.earnings.grossEarnings.toLocaleString('en-IN')}</td>
                    <td style="color:var(--error)">${c}${p.deductions.totalDeductions.toLocaleString('en-IN')}</td>
                    <td style="font-weight:700;color:var(--success)">${c}${p.netPay.toLocaleString('en-IN')}</td>
                    <td><span class="badge badge-${p.status === 'paid' ? 'success' : p.status === 'processed' ? 'info' : 'warning'}">${p.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state" style="padding:var(--space-8)">
            <i data-lucide="file-text"></i>
            <h3>No payrolls processed</h3>
            <p>Process payroll for this month to see activity here.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // ── Draw Charts ────────────────────────────────────────────
  setTimeout(() => {
    const trendCanvas = document.getElementById('trend-chart');
    if (trendCanvas) {
      drawBarChart(trendCanvas, {
        labels: trend.map(t => t.label),
        data: trend.map(t => t.total),
        color: '#6366f1',
      });
    }

    const distCanvas = document.getElementById('dist-chart');
    if (distCanvas && employees.length > 0) {
      const deptGroups = {};
      employees.forEach(e => {
        const dept = e.department || 'Other';
        deptGroups[dept] = (deptGroups[dept] || 0) + e.salary.gross;
      });

      const deptLabels = Object.keys(deptGroups);
      const deptData = Object.values(deptGroups);
      const colors = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

      drawDonutChart(distCanvas, { labels: deptLabels, data: deptData, colors, centerLabel: 'Total', centerValue: employees.length.toString() });

      const legendEl = document.getElementById('dist-legend');
      if (legendEl) {
        legendEl.innerHTML = deptLabels.map((label, i) => `
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
            <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]}"></div>
            <span style="font-size:var(--text-xs);color:var(--text-secondary)">${label}</span>
            <span style="font-size:var(--text-xs);font-weight:600;margin-left:auto">${c}${deptData[i].toLocaleString('en-IN')}</span>
          </div>
        `).join('');
      }
    }
  }, 100);

  // ── Load AI Insights ───────────────────────────────────────
  loadAIInsights();

  // ── Event Handlers ─────────────────────────────────────────
  document.getElementById('dash-process-all')?.addEventListener('click', () => router.navigate('/payroll'));
  document.getElementById('dash-add-employee')?.addEventListener('click', () => router.navigate('/employees'));
  document.getElementById('dash-ai-chat')?.addEventListener('click', () => {
    const panel = document.getElementById('ai-chat-panel');
    if (panel) panel.classList.add('open');
  });
  document.getElementById('dash-view-all-payroll')?.addEventListener('click', () => router.navigate('/payroll'));
}

async function loadAIInsights() {
  const el = document.getElementById('ai-insights-content');
  if (!el) return;
  try {
    const insights = await ai.generateDashboardInsights();
    el.innerHTML = `<p>${insights.replace(/\n/g, '<br>')}</p>`;
  } catch (error) {
    el.innerHTML = `<p style="color:var(--text-tertiary)">💡 AI insights will appear here once your AI API is configured. Go to Settings → AI Configuration to set up. <br><br><em style="font-size:0.75rem">Error: ${error.message}</em></p>`;
  }
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
