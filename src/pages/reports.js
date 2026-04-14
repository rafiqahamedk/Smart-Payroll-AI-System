// ================================================================
// SmartPayroll AI — Reports Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import { drawBarChart, drawDonutChart, drawHorizontalBars } from '../components/chart.js';
import showToast from '../components/toast.js';

export default async function renderReports(container) {
  const employees = await store.getEmployees();
  const settings = await store.getSettings();
  const c = settings.payroll.currency;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  container.innerHTML = `
    <div class="page-content">
      <div class="section-header">
        <h2 class="section-title">Reports & Analytics</h2>
        <div class="section-actions">
          <button class="btn btn-ai btn-sm" id="report-ai-summary"><i data-lucide="sparkles"></i> AI Executive Summary</button>
          <button class="btn btn-secondary btn-sm" id="report-export"><i data-lucide="download"></i> Export Data</button>
        </div>
      </div>

      <div class="tabs" id="report-tabs">
        <button class="tab active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="salary">Salary Analysis</button>
        <button class="tab" data-tab="attendance">Attendance</button>
        <button class="tab" data-tab="cost">Cost Breakdown</button>
      </div>

      <div id="report-content"></div>

      <div class="card" id="report-ai-box" style="display:none;margin-top:var(--space-6)">
        <div class="ai-insight-box">
          <h3><i data-lucide="sparkles" style="width:16px;height:16px"></i> AI Executive Summary</h3>
          <div id="report-ai-content"></div>
        </div>
      </div>
    </div>
  `;

  let activeTab = 'overview';
  document.querySelectorAll('#report-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#report-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderTabContent(activeTab, employees, settings, c, currentMonth);
    });
  });

  await renderTabContent(activeTab, employees, settings, c, currentMonth);

  document.getElementById('report-ai-summary')?.addEventListener('click', async () => {
    const box = document.getElementById('report-ai-box');
    const content = document.getElementById('report-ai-content');
    box.style.display = 'block';
    content.innerHTML = '<div class="ai-insight-loading"><div class="spinner"></div> Generating Executive Summary...</div>';
    try {
      const payrolls = await store.getPayrollForMonth(currentMonth);
      const trend = await store.getPayrollTrend(3);
      const summary = await ai.generateReportSummary('Monthly Payroll', {
        month: currentMonth, employees: employees.length,
        totalPayroll: payrolls.reduce((s, p) => s + p.netPay, 0),
        processed: payrolls.length, trend,
      });
      content.innerHTML = `<p style="white-space:pre-line">${summary}</p>`;
    } catch (err) { content.innerHTML = `<p style="color:var(--error)">Error: ${err.message}</p>`; }
    if (window.lucide) window.lucide.createIcons();
  });

  document.getElementById('report-export')?.addEventListener('click', async () => {
    try {
      const data = await store.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `smartpayroll_export_${currentMonth}.json`; a.click();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', title: 'Exported', message: 'Data exported as JSON.' });
    } catch (err) { showToast({ type: 'error', title: 'Error', message: err.message }); }
  });
}

async function renderTabContent(tab, employees, settings, c, currentMonth) {
  const el = document.getElementById('report-content');
  if (!el) return;
  switch (tab) {
    case 'overview': await renderOverview(el, employees, settings, c, currentMonth); break;
    case 'salary': renderSalaryAnalysis(el, employees, settings, c); break;
    case 'attendance': await renderAttendanceReport(el, employees, settings, currentMonth); break;
    case 'cost': await renderCostBreakdown(el, employees, settings, c, currentMonth); break;
  }
}

async function renderOverview(el, employees, settings, c, currentMonth) {
  const trend = await store.getPayrollTrend(6);
  const payrolls = await store.getPayrollForMonth(currentMonth);
  const totalNet = payrolls.reduce((s, p) => s + p.netPay, 0);
  const avgSalary = employees.length > 0 ? Math.round(employees.reduce((s, e) => s + e.salary.gross, 0) / employees.length) : 0;

  el.innerHTML = `
    <div class="stats-grid" style="margin-bottom:var(--space-6)">
      <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Total Employees</div><div class="card-value">${employees.length}</div></div>
      <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Avg. Salary</div><div class="card-value" style="font-size:var(--text-2xl)">${c}${avgSalary.toLocaleString('en-IN')}</div></div>
      <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">This Month</div><div class="card-value" style="font-size:var(--text-2xl)">${c}${totalNet.toLocaleString('en-IN')}</div></div>
      <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Processed</div><div class="card-value">${payrolls.length}/${employees.length}</div></div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">6-Month Payroll Trend</span></div><div class="chart-container" style="height:280px"><canvas id="report-trend-chart"></canvas></div></div>
  `;
  setTimeout(() => {
    const canvas = document.getElementById('report-trend-chart');
    if (canvas) drawBarChart(canvas, { labels: trend.map(t => t.label), data: trend.map(t => t.total), color: '#6366f1' });
  }, 100);
}

function renderSalaryAnalysis(el, employees, settings, c) {
  if (employees.length === 0) { el.innerHTML = '<div class="empty-state"><p>No employees.</p></div>'; return; }
  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:var(--space-6)">
      <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Salary Comparison</span></div><div class="chart-container" style="height:260px"><canvas id="salary-compare-chart"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Dept. Distribution</span></div><div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4)"><div class="chart-container" style="width:160px;height:160px;flex-shrink:0"><canvas id="dept-dist-chart"></canvas></div><div id="dept-dist-legend" style="flex:1"></div></div></div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Salary Table</span></div>
      <div class="table-container" style="border:none"><table><thead><tr><th>Employee</th><th>Basic</th><th>HRA</th><th>DA</th><th>Special</th><th>Gross</th></tr></thead><tbody>
        ${employees.map(e => `<tr><td style="font-weight:500">${e.name}</td><td>${c}${e.salary.basic.toLocaleString('en-IN')}</td><td>${c}${e.salary.hra.toLocaleString('en-IN')}</td><td>${c}${e.salary.da.toLocaleString('en-IN')}</td><td>${c}${e.salary.specialAllowance.toLocaleString('en-IN')}</td><td style="font-weight:700;color:var(--success)">${c}${e.salary.gross.toLocaleString('en-IN')}</td></tr>`).join('')}
      </tbody></table></div></div>
  `;
  setTimeout(() => {
    const sc = document.getElementById('salary-compare-chart');
    if (sc) drawBarChart(sc, { labels: employees.map(e => e.name.split(' ')[0]), data: employees.map(e => e.salary.gross), color: '#22d3ee' });
    const dc = document.getElementById('dept-dist-chart');
    if (dc) {
      const depts = {}; employees.forEach(e => { depts[e.department] = (depts[e.department] || 0) + 1; });
      const colors = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      drawDonutChart(dc, { labels: Object.keys(depts), data: Object.values(depts), colors, centerValue: employees.length.toString(), centerLabel: 'Team' });
      const legendEl = document.getElementById('dept-dist-legend');
      if (legendEl) legendEl.innerHTML = Object.entries(depts).map(([dept, count], i) => `<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)"><div style="width:10px;height:10px;border-radius:50%;background:${colors[i]}"></div><span style="font-size:var(--text-xs);color:var(--text-secondary)">${dept}</span><span style="font-size:var(--text-xs);font-weight:600;margin-left:auto">${count}</span></div>`).join('');
    }
  }, 100);
}

async function renderAttendanceReport(el, employees, settings, currentMonth) {
  let rows = '';
  for (const e of employees) {
    const s = await store.getAttendanceSummary(e.id, currentMonth);
    rows += `<tr><td style="font-weight:500">${e.name}</td><td><span class="badge badge-success">${s.present}</span></td><td><span class="badge badge-error">${s.absent}</span></td><td><span class="badge badge-warning">${s.halfDay}</span></td><td><span class="badge badge-info">${s.paidLeave}</span></td><td><span class="badge badge-error">${s.unpaidLeave}</span></td><td style="font-weight:700">${s.totalWorking}</td></tr>`;
  }
  el.innerHTML = `<div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Attendance Summary — ${new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span></div><div class="table-container" style="border:none"><table><thead><tr><th>Employee</th><th>Present</th><th>Absent</th><th>Half Day</th><th>Paid Leave</th><th>Unpaid</th><th>Effective</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

async function renderCostBreakdown(el, employees, settings, c, currentMonth) {
  const payrolls = await store.getPayrollForMonth(currentMonth);
  const totalGross = payrolls.reduce((s, p) => s + (p.earnings?.grossEarnings || 0), 0);
  const totalPF = payrolls.reduce((s, p) => s + (p.deductions?.pf || 0), 0);
  const totalESI = payrolls.reduce((s, p) => s + (p.deductions?.esi || 0), 0);
  const totalPT = payrolls.reduce((s, p) => s + (p.deductions?.professionalTax || 0), 0);
  const totalTDS = payrolls.reduce((s, p) => s + (p.deductions?.tds || 0), 0);
  const totalOT = payrolls.reduce((s, p) => s + (p.earnings?.overtimePay || 0), 0);
  const totalBonus = payrolls.reduce((s, p) => s + (p.earnings?.festivalBonus || 0) + (p.earnings?.otherBonus || 0), 0);

  el.innerHTML = `
    <div class="grid-2" style="margin-bottom:var(--space-6)">
      <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Earnings</span></div><div id="earnings-bars" style="padding:var(--space-2)"></div></div>
      <div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Deductions</span></div><div id="deductions-bars" style="padding:var(--space-2)"></div></div>
    </div>
    ${payrolls.length > 0 ? `<div class="card"><div class="card-header"><span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)">Cost Per Employee</span></div><div class="chart-container" style="height:260px"><canvas id="cost-per-emp-chart"></canvas></div></div>` : '<div class="empty-state"><p>Process payroll first.</p></div>'}
  `;
  setTimeout(() => {
    const eB = document.getElementById('earnings-bars');
    if (eB) drawHorizontalBars(eB, [{ label: 'Base Pay', value: totalGross - totalOT - totalBonus, color: 'var(--success)' }, { label: 'Overtime', value: totalOT, color: 'var(--accent)' }, { label: 'Bonuses', value: totalBonus, color: 'var(--warning)' }]);
    const dB = document.getElementById('deductions-bars');
    if (dB) drawHorizontalBars(dB, [{ label: 'PF', value: totalPF, color: '#ef4444' }, { label: 'ESI', value: totalESI, color: '#f59e0b' }, { label: 'PT', value: totalPT, color: '#8b5cf6' }, { label: 'TDS', value: totalTDS, color: '#f97316' }]);
    const cc = document.getElementById('cost-per-emp-chart');
    if (cc && payrolls.length > 0) drawBarChart(cc, { labels: payrolls.map(p => p.employeeName.split(' ')[0]), data: payrolls.map(p => p.netPay), color: '#10b981' });
  }, 100);
}
