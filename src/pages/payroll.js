// ================================================================
// SmartPayroll AI — Payroll Processing Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import showToast from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { generatePayslipHTML, printPayslip } from '../components/payslip.js';

export default async function renderPayroll(container) {
  const employees = await store.getEmployees();
  const settings = await store.getSettings();
  const c = settings.payroll.currency;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const payrolls = await store.getPayrollForMonth(currentMonth);
  const totalGross = payrolls.reduce((sum, p) => sum + (p.earnings?.grossEarnings || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.deductions?.totalDeductions || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);

  const currentMonthNum = now.getMonth() + 1;
  const activeFestivals = (settings.festivals || []).filter(f => f.enabled && f.month === currentMonthNum);

  container.innerHTML = `
    <div class="page-content">
      <div class="one-click-hero">
        <h2>⚡ One-Click Payroll Processing</h2>
        <p>Process salaries for all ${employees.length} employees instantly — ${monthLabel}</p>
        ${activeFestivals.length > 0 ? `<div style="margin-bottom:var(--space-4);position:relative"><span class="badge badge-warning" style="font-size:var(--text-xs)">🎉 ${activeFestivals.map(f => `${f.name} (${f.bonusPercentage}%)`).join(', ')}</span></div>` : ''}
        <button class="btn btn-primary one-click-btn" id="process-all-btn" ${employees.length === 0 ? 'disabled' : ''}><i data-lucide="zap"></i> Process All Salaries</button>
        ${payrolls.length > 0 ? `<p style="color:var(--success);font-size:var(--text-xs);margin-top:var(--space-3);position:relative">✅ ${payrolls.length}/${employees.length} processed</p>` : ''}
      </div>

      <div class="card" style="padding:var(--space-4) var(--space-5);margin-bottom:var(--space-5)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3)">
          <div class="form-group" style="margin-bottom:0"><label class="form-label">Pay Period</label><input type="month" class="form-input" id="payroll-month" value="${currentMonth}" /></div>
          <div style="display:flex;gap:var(--space-3)">
            <button class="btn btn-ai btn-sm" id="payroll-ai-review" ${payrolls.length === 0 ? 'disabled' : ''}><i data-lucide="sparkles"></i> AI Review</button>
            <button class="btn btn-secondary btn-sm" id="payroll-ai-bonus"><i data-lucide="gift"></i> AI Bonus Suggest</button>
          </div>
        </div>
      </div>

      ${payrolls.length > 0 ? `
        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--space-5)">
          <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Total Earnings</div><div style="font-size:var(--text-2xl);font-weight:800;color:var(--success)">${c}${totalGross.toLocaleString('en-IN')}</div></div>
          <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Total Deductions</div><div style="font-size:var(--text-2xl);font-weight:800;color:var(--error)">${c}${totalDeductions.toLocaleString('en-IN')}</div></div>
          <div class="card" style="padding:var(--space-4)"><div class="card-title" style="margin-bottom:var(--space-2)">Total Net Pay</div><div style="font-size:var(--text-2xl);font-weight:800;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${c}${totalNet.toLocaleString('en-IN')}</div></div>
        </div>
      ` : ''}

      <div class="section-header"><h2 class="section-title">Employee Payroll — ${monthLabel}</h2></div>

      ${employees.length === 0 ? `<div class="empty-state"><i data-lucide="users"></i><h3>No employees</h3></div>` : `
        <div class="grid-auto" id="payroll-cards">
          ${await renderPayrollCards(employees, payrolls, c, currentMonth, settings)}
        </div>
      `}
    </div>
  `;

  // Process All
  document.getElementById('process-all-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('process-all-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;border-color:white;border-top-color:transparent"></div> Processing...';
    try {
      const selectedMonth = document.getElementById('payroll-month')?.value || currentMonth;
      const overrides = {};
      employees.forEach(emp => {
        const bonus = activeFestivals.reduce((sum, f) => sum + Math.round(emp.salary.basic * (f.bonusPercentage / 100)), 0);
        overrides[emp.id] = { festivalBonus: bonus };
      });
      const results = await store.processAllPayroll(selectedMonth, overrides);
      const successCount = results.filter(r => !r.error).length;
      showToast({ type: 'success', title: '🎉 Payroll Processed!', message: `${successCount}/${employees.length} processed` });
      renderPayroll(container);
    } catch (error) {
      showToast({ type: 'error', title: 'Error', message: error.message });
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="zap"></i> Process All Salaries';
    }
  });

  // Individual process
  container.querySelectorAll('.payroll-process-btn').forEach(btn => {
    btn.addEventListener('click', () => openProcessModal(btn.dataset.id, document.getElementById('payroll-month')?.value || currentMonth, container, settings, activeFestivals));
  });

  // Payslip
  container.querySelectorAll('.payroll-payslip-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const payrolls = await store.getPayrollHistory();
      const payroll = payrolls.find(p => p.id === btn.dataset.payrollid);
      if (payroll) showPayslipModal(payroll);
    });
  });

  // AI Review
  document.getElementById('payroll-ai-review')?.addEventListener('click', async () => {
    showModal({
      title: '✨ AI Payroll Review',
      content: '<div id="ai-review-content"><div class="ai-insight-loading"><div class="spinner"></div> Reviewing...</div></div>',
      size: 'modal-lg', showFooter: false,
      onOpen: async (body) => {
        const contentEl = body.querySelector('#ai-review-content');
        let html = '';
        for (const p of payrolls) {
          try {
            const review = await ai.reviewPayroll(p);
            html += `<div style="margin-bottom:var(--space-4);padding:var(--space-4);background:var(--surface-1);border-radius:var(--radius-md)"><div style="font-weight:600;margin-bottom:var(--space-2)">${p.employeeName}</div><p style="font-size:var(--text-sm);color:var(--text-secondary);white-space:pre-line">${review}</p></div>`;
          } catch (err) { html += `<div style="color:var(--error)">Error: ${err.message}</div>`; }
        }
        contentEl.innerHTML = html;
      },
    });
  });

  // AI Bonus
  document.getElementById('payroll-ai-bonus')?.addEventListener('click', async () => {
    showModal({
      title: '🎁 AI Bonus Recommendations',
      content: '<div id="ai-bonus-content"><div class="ai-insight-loading"><div class="spinner"></div> Analyzing...</div></div>',
      size: 'modal-lg', showFooter: false,
      onOpen: async (body) => {
        try {
          const rec = await ai.recommendBonus();
          body.querySelector('#ai-bonus-content').innerHTML = `<div class="ai-insight-box"><p style="white-space:pre-line">${rec}</p></div>`;
        } catch (err) { body.querySelector('#ai-bonus-content').innerHTML = `<p style="color:var(--error)">${err.message}</p>`; }
        if (window.lucide) window.lucide.createIcons();
      },
    });
  });

  document.getElementById('payroll-month')?.addEventListener('change', () => renderPayroll(container));
}

async function renderPayrollCards(employees, payrolls, c, month, settings) {
  let html = '';
  for (const emp of employees) {
    const payroll = payrolls.find(p => p.employeeId === emp.id);
    const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (payroll) {
      html += `<div class="payroll-card"><div class="payroll-card-header"><div class="payroll-card-header-left"><div class="payroll-emp-avatar">${initials}</div><div><div style="font-weight:600">${emp.name}</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">${emp.role}</div></div></div><span class="badge badge-${payroll.status === 'paid' ? 'success' : 'info'}">${payroll.status}</span></div><div class="payroll-card-body"><div class="payroll-breakdown"><div><div class="payroll-item"><span class="payroll-item-label">Basic</span><span class="payroll-item-value earning">${c}${payroll.earnings.basic.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">HRA</span><span class="payroll-item-value earning">${c}${payroll.earnings.hra.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">DA + Special</span><span class="payroll-item-value earning">${c}${(payroll.earnings.da + payroll.earnings.specialAllowance).toLocaleString('en-IN')}</span></div>${payroll.earnings.overtimePay > 0 ? `<div class="payroll-item"><span class="payroll-item-label">OT (${payroll.overtimeHours}h)</span><span class="payroll-item-value earning">${c}${payroll.earnings.overtimePay.toLocaleString('en-IN')}</span></div>` : ''}${payroll.earnings.festivalBonus > 0 ? `<div class="payroll-item"><span class="payroll-item-label">Festival Bonus</span><span class="payroll-item-value earning">${c}${payroll.earnings.festivalBonus.toLocaleString('en-IN')}</span></div>` : ''}</div><div><div class="payroll-item"><span class="payroll-item-label">PF</span><span class="payroll-item-value deduction">-${c}${payroll.deductions.pf.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">ESI</span><span class="payroll-item-value deduction">-${c}${payroll.deductions.esi.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">PT</span><span class="payroll-item-value deduction">-${c}${payroll.deductions.professionalTax.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">TDS</span><span class="payroll-item-value deduction">-${c}${payroll.deductions.tds.toLocaleString('en-IN')}</span></div><div class="payroll-item"><span class="payroll-item-label">Days</span><span class="payroll-item-value">${payroll.presentDays}/${payroll.workingDays}</span></div></div></div></div><div class="payroll-card-footer"><div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">Net Pay</div><div class="payroll-net-pay">${c}${payroll.netPay.toLocaleString('en-IN')}</div></div><div style="display:flex;gap:var(--space-2)"><button class="btn btn-secondary btn-sm payroll-payslip-btn" data-payrollid="${payroll.id}"><i data-lucide="file-text"></i> Payslip</button><button class="btn btn-ghost btn-sm payroll-process-btn" data-id="${emp.id}"><i data-lucide="refresh-cw"></i></button></div></div></div>`;
    } else {
      const summary = await store.getAttendanceSummary(emp.id, month);
      html += `<div class="payroll-card" style="border-style:dashed"><div class="payroll-card-header"><div class="payroll-card-header-left"><div class="payroll-emp-avatar" style="opacity:0.5">${initials}</div><div><div style="font-weight:600">${emp.name}</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">${emp.role}</div></div></div><span class="badge badge-warning">Pending</span></div><div class="payroll-card-body" style="text-align:center;padding:var(--space-6)"><div style="color:var(--text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-2)">Gross: ${c}${emp.salary.gross.toLocaleString('en-IN')}/month</div><div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-4)">Attendance: ${summary.present}P / ${summary.absent}A / ${summary.paidLeave}PL</div><button class="btn btn-primary btn-sm payroll-process-btn" data-id="${emp.id}"><i data-lucide="play"></i> Process</button></div></div>`;
    }
  }
  return html;
}

function openProcessModal(empId, month, pageContainer, settings, activeFestivals) {
  store.getEmployee(empId).then(async emp => {
    if (!emp) return;
    const c = settings.payroll.currency;
    const summary = await store.getAttendanceSummary(empId, month);
    const autoBonus = activeFestivals.reduce((sum, f) => sum + Math.round(emp.salary.basic * (f.bonusPercentage / 100)), 0);

    showModal({
      title: `Process — ${emp.name}`,
      content: `<div><div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)"><div class="payroll-emp-avatar">${emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</div><div><div style="font-weight:600">${emp.name}</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">${emp.role} • Gross: ${c}${emp.salary.gross.toLocaleString('en-IN')}</div></div></div><div style="background:var(--surface-1);padding:var(--space-4);border-radius:var(--radius-md);margin-bottom:var(--space-5)"><div style="display:flex;gap:var(--space-4);flex-wrap:wrap"><span style="font-size:var(--text-sm)">✅ Present: <strong>${summary.present}</strong></span><span style="font-size:var(--text-sm)">❌ Absent: <strong>${summary.absent}</strong></span><span style="font-size:var(--text-sm)">🔵 PL: <strong>${summary.paidLeave}</strong></span></div></div><div class="form-row"><div class="form-group"><label class="form-label">Overtime Hours</label><input type="number" class="form-input" id="process-overtime" value="0" min="0" /></div><div class="form-group"><label class="form-label">Festival Bonus</label><input type="number" class="form-input" id="process-festival-bonus" value="${autoBonus}" min="0" /></div></div><div class="form-group"><label class="form-label">Other Bonus</label><input type="number" class="form-input" id="process-other-bonus" value="0" min="0" /></div></div>`,
      confirmText: 'Process & Calculate', confirmClass: 'btn-primary',
      onConfirm: async (body, close) => {
        const overtime = parseInt(body.querySelector('#process-overtime').value) || 0;
        const festivalBonus = parseInt(body.querySelector('#process-festival-bonus').value) || 0;
        const otherBonus = parseInt(body.querySelector('#process-other-bonus').value) || 0;
        try {
          const payroll = await store.processPayroll(empId, month, overtime, festivalBonus, otherBonus);
          showToast({ type: 'success', title: 'Processed', message: `${emp.name}: Net ${c}${payroll.netPay.toLocaleString('en-IN')}` });
          close();
          renderPayroll(pageContainer);
        } catch (error) { showToast({ type: 'error', title: 'Error', message: error.message }); }
      },
    });
  });
}

function showPayslipModal(payroll) {
  showModal({
    title: `Payslip — ${payroll.employeeName}`,
    content: generatePayslipHTML(payroll),
    size: 'modal-xl',
    confirmText: 'Print', confirmClass: 'btn-primary',
    onConfirm: () => printPayslip(payroll),
  });
}
