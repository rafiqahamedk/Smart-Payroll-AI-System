// ================================================================
// SmartPayroll AI — Payslip Component
// ================================================================

import store from '../store.js';

/**
 * Generate printable payslip HTML
 */
export function generatePayslipHTML(payroll) {
  const settings = store.getSettingsSync();
  const employee = store.getEmployeesSync().find((e) => e.id === payroll.employeeId);
  const c = settings.payroll.currency;

  const monthDate = new Date(payroll.month + '-01');
  const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return `
    <div class="payslip" id="payslip-content">
      <div class="payslip-header">
        <div class="payslip-company">
          <h2>${settings.company.name}</h2>
          <p>${settings.company.address}</p>
          <p>Email: ${settings.company.email} | Phone: ${settings.company.phone}</p>
        </div>
        <div class="payslip-title">PAYSLIP<br><small style="font-size:0.75rem;color:#6b7280">${monthLabel}</small></div>
      </div>

      <div class="payslip-meta">
        <div class="payslip-meta-item">
          <label>Employee Name</label>
          <span>${payroll.employeeName}</span>
        </div>
        <div class="payslip-meta-item">
          <label>Designation</label>
          <span>${payroll.employeeRole}</span>
        </div>
        <div class="payslip-meta-item">
          <label>Department</label>
          <span>${employee?.department || 'N/A'}</span>
        </div>
        <div class="payslip-meta-item">
          <label>Pay Period</label>
          <span>${monthLabel}</span>
        </div>
        <div class="payslip-meta-item">
          <label>Working Days</label>
          <span>${payroll.presentDays} / ${payroll.workingDays}</span>
        </div>
        <div class="payslip-meta-item">
          <label>LOP Days</label>
          <span>${payroll.lopDays}</span>
        </div>
        ${employee ? `
          <div class="payslip-meta-item">
            <label>Bank Account</label>
            <span>${employee.bankAccount}</span>
          </div>
          <div class="payslip-meta-item">
            <label>IFSC Code</label>
            <span>${employee.ifsc}</span>
          </div>
        ` : ''}
      </div>

      <table class="payslip-table">
        <thead>
          <tr>
            <th>Earnings</th>
            <th style="text-align:right">Amount (${c})</th>
            <th>Deductions</th>
            <th style="text-align:right">Amount (${c})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td style="text-align:right">${payroll.earnings.basic.toLocaleString('en-IN')}</td>
            <td>Provident Fund (${settings.payroll.pfRate}%)</td>
            <td style="text-align:right">${payroll.deductions.pf.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>House Rent Allowance</td>
            <td style="text-align:right">${payroll.earnings.hra.toLocaleString('en-IN')}</td>
            <td>ESI (${settings.payroll.esiRate}%)</td>
            <td style="text-align:right">${payroll.deductions.esi.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>Dearness Allowance</td>
            <td style="text-align:right">${payroll.earnings.da.toLocaleString('en-IN')}</td>
            <td>Professional Tax</td>
            <td style="text-align:right">${payroll.deductions.professionalTax.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td>Special Allowance</td>
            <td style="text-align:right">${payroll.earnings.specialAllowance.toLocaleString('en-IN')}</td>
            <td>TDS (${settings.payroll.tdsRate}%)</td>
            <td style="text-align:right">${payroll.deductions.tds.toLocaleString('en-IN')}</td>
          </tr>
          ${payroll.earnings.overtimePay > 0 ? `
            <tr>
              <td>Overtime (${payroll.overtimeHours} hrs)</td>
              <td style="text-align:right">${payroll.earnings.overtimePay.toLocaleString('en-IN')}</td>
              <td>Other Deductions</td>
              <td style="text-align:right">${payroll.deductions.otherDeductions.toLocaleString('en-IN')}</td>
            </tr>
          ` : ''}
          ${payroll.earnings.festivalBonus > 0 ? `
            <tr>
              <td>Festival Bonus</td>
              <td style="text-align:right">${payroll.earnings.festivalBonus.toLocaleString('en-IN')}</td>
              <td></td>
              <td></td>
            </tr>
          ` : ''}
          ${payroll.earnings.otherBonus > 0 ? `
            <tr>
              <td>Other Bonus</td>
              <td style="text-align:right">${payroll.earnings.otherBonus.toLocaleString('en-IN')}</td>
              <td></td>
              <td></td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td>Total Earnings</td>
            <td style="text-align:right">${payroll.earnings.grossEarnings.toLocaleString('en-IN')}</td>
            <td>Total Deductions</td>
            <td style="text-align:right">${payroll.deductions.totalDeductions.toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
      </table>

      <div class="payslip-net">
        <span>NET PAY</span>
        <h3>${c}${payroll.netPay.toLocaleString('en-IN')}</h3>
      </div>

      ${payroll.aiSummary ? `
        <div class="payslip-ai-summary">
          <h4>✨ AI Summary</h4>
          <p>${payroll.aiSummary}</p>
        </div>
      ` : ''}

      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb">
        <p style="font-size:0.6875rem;color:#9ca3af">
          This is a computer-generated payslip by SmartPayroll AI. | Processed on ${new Date(payroll.processedDate).toLocaleDateString('en-IN')}
        </p>
      </div>
    </div>
  `;
}

/**
 * Print payslip
 */
export function printPayslip(payroll) {
  const html = generatePayslipHTML(payroll);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip - ${payroll.employeeName} - ${payroll.month}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; padding: 24px; }
        .payslip { max-width: 700px; margin: 0 auto; }
        .payslip-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; margin-bottom: 16px; }
        .payslip-company h2 { font-size: 1.25rem; }
        .payslip-company p { font-size: 0.75rem; color: #6b7280; }
        .payslip-title { font-size: 1.125rem; font-weight: 700; color: #4f46e5; text-align: right; }
        .payslip-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; }
        .payslip-meta-item label { font-size: 0.75rem; color: #6b7280; display: block; }
        .payslip-meta-item span { font-size: 0.875rem; font-weight: 600; }
        .payslip-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .payslip-table th { text-align: left; padding: 8px; font-size: 0.75rem; text-transform: uppercase; color: #6b7280; background: #f1f5f9; border-bottom: 1px solid #e5e7eb; }
        .payslip-table td { padding: 8px; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
        .total-row td { font-weight: 700; border-top: 2px solid #e5e7eb !important; }
        .payslip-net { text-align: center; padding: 16px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 8px; margin-bottom: 16px; color: white; }
        .payslip-net span { font-size: 0.75rem; opacity: 0.8; }
        .payslip-net h3 { font-size: 1.875rem; font-weight: 800; }
        .payslip-ai-summary { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; margin-top: 16px; }
        .payslip-ai-summary h4 { font-size: 0.875rem; color: #0369a1; margin-bottom: 4px; }
        .payslip-ai-summary p { font-size: 0.75rem; color: #0c4a6e; line-height: 1.6; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}
