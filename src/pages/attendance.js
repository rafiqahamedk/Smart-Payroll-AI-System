// ================================================================
// SmartPayroll AI — Attendance Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import showToast from '../components/toast.js';

let selectedEmployeeId = null;
let currentMonth = '';

export default async function renderAttendance(container) {
  const employees = await store.getEmployees();
  const now = new Date();
  currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  selectedEmployeeId = employees.length > 0 ? employees[0].id : null;

  container.innerHTML = `
    <div class="page-content">
      <div class="section-header">
        <h2 class="section-title">Attendance Tracker</h2>
        <div class="section-actions">
          <button class="btn btn-ai btn-sm" id="att-ai-analyze" ${!selectedEmployeeId ? 'disabled' : ''}><i data-lucide="sparkles"></i> AI Anomaly Check</button>
          <button class="btn btn-secondary btn-sm" id="att-mark-all-present"><i data-lucide="check-check"></i> Mark All Present</button>
        </div>
      </div>

      ${employees.length === 0 ? `
        <div class="empty-state"><i data-lucide="calendar-off"></i><h3>No employees to track</h3><p>Add employees first.</p></div>
      ` : `
        <div class="card" style="margin-bottom:var(--space-5);padding:var(--space-4) var(--space-5)">
          <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap">
            <div class="form-group" style="margin-bottom:0;flex:1;min-width:200px">
              <label class="form-label">Employee</label>
              <select class="form-select" id="att-employee-select">
                ${employees.map(e => `<option value="${e.id}" ${e.id === selectedEmployeeId ? 'selected' : ''}>${e.name} — ${e.role}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Month</label>
              <input type="month" class="form-input" id="att-month-select" value="${currentMonth}" />
            </div>
          </div>
        </div>
        <div class="stats-grid" id="att-summary" style="grid-template-columns:repeat(auto-fit, minmax(140px, 1fr))"></div>
        <div class="card" style="margin-bottom:var(--space-5)">
          <div class="card-header">
            <span class="card-title" style="font-size:var(--text-base);color:var(--text-primary)" id="att-calendar-title">Calendar</span>
            <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
              <span class="badge badge-success" style="font-size:0.625rem">● Present</span>
              <span class="badge badge-error" style="font-size:0.625rem">● Absent</span>
              <span class="badge badge-warning" style="font-size:0.625rem">● Half-Day</span>
              <span class="badge badge-info" style="font-size:0.625rem">● Paid Leave</span>
              <span class="badge badge-neutral" style="font-size:0.625rem">● Weekend</span>
            </div>
          </div>
          <div class="calendar-grid" id="att-calendar"></div>
        </div>
        <div class="card" id="att-ai-box" style="display:none"><div class="ai-insight-box"><h3><i data-lucide="sparkles" style="width:16px;height:16px"></i> AI Attendance Analysis</h3><div id="att-ai-content"></div></div></div>
      `}
    </div>
  `;

  if (employees.length === 0) return;

  await renderCalendar();
  await renderSummary();

  document.getElementById('att-employee-select')?.addEventListener('change', async (e) => {
    selectedEmployeeId = e.target.value;
    await renderCalendar();
    await renderSummary();
  });

  document.getElementById('att-month-select')?.addEventListener('change', async (e) => {
    currentMonth = e.target.value;
    await renderCalendar();
    await renderSummary();
  });

  document.getElementById('att-mark-all-present')?.addEventListener('click', async () => {
    if (!selectedEmployeeId) return;
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      days[d] = date.getDay() === 0 ? 'weekend' : 'present';
    }
    await store.bulkSetAttendance(selectedEmployeeId, currentMonth, days);
    await renderCalendar();
    await renderSummary();
    showToast({ type: 'success', title: 'Attendance Updated', message: 'All working days marked present.' });
  });

  document.getElementById('att-ai-analyze')?.addEventListener('click', async () => {
    if (!selectedEmployeeId) return;
    const box = document.getElementById('att-ai-box');
    const content = document.getElementById('att-ai-content');
    box.style.display = 'block';
    content.innerHTML = '<div class="ai-insight-loading"><div class="spinner"></div> Analyzing...</div>';
    try {
      const analysis = await ai.detectAttendanceAnomalies(selectedEmployeeId, currentMonth);
      content.innerHTML = `<p style="white-space:pre-line">${analysis}</p>`;
    } catch (error) {
      content.innerHTML = `<p style="color:var(--error)">Error: ${error.message}</p>`;
    }
    if (window.lucide) window.lucide.createIcons();
  });
}

async function renderCalendar() {
  const calendarEl = document.getElementById('att-calendar');
  const titleEl = document.getElementById('att-calendar-title');
  if (!calendarEl || !selectedEmployeeId) return;

  const [year, month] = currentMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDay = firstDay.getDay();
  const monthLabel = firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  if (titleEl) titleEl.textContent = monthLabel;

  const attendance = await store.getEmployeeAttendance(selectedEmployeeId, currentMonth);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const statusCycle = ['present', 'absent', 'half-day', 'paid-leave', 'unpaid-leave', 'holiday', 'weekend'];
  const statusLabels = { 'present': 'P', 'absent': 'A', 'half-day': 'HD', 'paid-leave': 'PL', 'unpaid-leave': 'UL', 'holiday': 'H', 'weekend': 'W' };

  let html = dayNames.map(d => `<div class="calendar-header-cell">${d}</div>`).join('');
  for (let i = 0; i < startDay; i++) html += '<div class="calendar-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const status = attendance[d] || (date.getDay() === 0 ? 'weekend' : '');
    const today = new Date();
    const isToday = d === today.getDate() && month === (today.getMonth() + 1) && year === today.getFullYear();
    html += `
      <div class="calendar-cell ${status}" data-day="${d}" title="Day ${d}: ${status || 'Not marked'}" style="${isToday ? 'border:2px solid var(--primary)' : ''}">
        <span class="day-num">${d}</span>
        ${statusLabels[status] ? `<span class="day-status">${statusLabels[status]}</span>` : ''}
      </div>`;
  }

  calendarEl.innerHTML = html;

  calendarEl.querySelectorAll('.calendar-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', async () => {
      const day = parseInt(cell.dataset.day);
      const currentStatus = attendance[day] || '';
      const nextStatus = statusCycle[(statusCycle.indexOf(currentStatus) + 1) % statusCycle.length];
      await store.setAttendanceDay(selectedEmployeeId, currentMonth, day, nextStatus);
      await renderCalendar();
      await renderSummary();
    });
  });
}

async function renderSummary() {
  const summaryEl = document.getElementById('att-summary');
  if (!summaryEl || !selectedEmployeeId) return;

  const summary = await store.getAttendanceSummary(selectedEmployeeId, currentMonth);
  const items = [
    { label: 'Present', value: summary.present, icon: 'check-circle', color: 'success' },
    { label: 'Absent', value: summary.absent, icon: 'x-circle', color: 'error' },
    { label: 'Half Day', value: summary.halfDay, icon: 'clock', color: 'warning' },
    { label: 'Paid Leave', value: summary.paidLeave, icon: 'calendar-check', color: 'info' },
    { label: 'Unpaid Leave', value: summary.unpaidLeave, icon: 'calendar-off', color: 'error' },
    { label: 'Holidays', value: summary.holiday, icon: 'star', color: 'violet' },
    { label: 'Effective Days', value: summary.totalWorking, icon: 'briefcase', color: 'primary' },
  ];

  summaryEl.innerHTML = items.map(item => `
    <div class="card" style="padding:var(--space-4)">
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
        <div class="card-icon ${item.color}" style="width:28px;height:28px;border-radius:6px"><i data-lucide="${item.icon}" style="width:14px;height:14px"></i></div>
        <span style="font-size:var(--text-xs);color:var(--text-secondary)">${item.label}</span>
      </div>
      <div style="font-size:var(--text-xl);font-weight:700">${item.value}</div>
    </div>
  `).join('');
  if (window.lucide) window.lucide.createIcons();
}
