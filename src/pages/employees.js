// ================================================================
// SmartPayroll AI — Employees Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import { showModal } from '../components/modal.js';
import showToast from '../components/toast.js';

export default async function renderEmployees(container) {
  const employees = await store.getEmployees();
  const settings = await store.getSettings();
  const c = settings.payroll.currency;

  container.innerHTML = `
    <div class="page-content">
      <div class="section-header">
        <h2 class="section-title">Team Members <span style="color:var(--text-tertiary);font-weight:400">(${employees.length}/10)</span></h2>
        <div class="section-actions">
          <button class="btn btn-ai btn-sm" id="emp-ai-suggest">
            <i data-lucide="sparkles"></i> AI Salary Advisor
          </button>
          <button class="btn btn-primary" id="emp-add-btn" ${employees.length >= 10 ? 'disabled' : ''}>
            <i data-lucide="user-plus"></i> Add Employee
          </button>
        </div>
      </div>

      ${employees.length > 0 ? `
        <div class="grid-auto" id="employees-grid">
          ${employees.map(emp => renderEmployeeCard(emp, c)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <i data-lucide="users"></i>
          <h3>No employees yet</h3>
          <p>Add your first team member to get started with payroll processing.</p>
          <button class="btn btn-primary" id="emp-add-empty"><i data-lucide="user-plus"></i> Add First Employee</button>
        </div>
      `}
    </div>
  `;

  document.getElementById('emp-add-btn')?.addEventListener('click', () => openEmployeeModal(null, container));
  document.getElementById('emp-add-empty')?.addEventListener('click', () => openEmployeeModal(null, container));
  document.getElementById('emp-ai-suggest')?.addEventListener('click', () => openAISalaryAdvisor());

  container.querySelectorAll('.emp-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEmployeeModal(btn.dataset.id, container));
  });

  container.querySelectorAll('.emp-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const emp = await store.getEmployee(btn.dataset.id);
      if (confirm(`Are you sure you want to remove ${emp.name}?`)) {
        await store.deleteEmployee(btn.dataset.id);
        showToast({ type: 'success', title: 'Employee Removed', message: `${emp.name} has been removed.` });
        renderEmployees(container);
      }
    });
  });
}

function renderEmployeeCard(emp, c) {
  const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const totalLeaves = (emp.leaves.earned.total - emp.leaves.earned.used) +
                      (emp.leaves.casual.total - emp.leaves.casual.used) +
                      (emp.leaves.sick.total - emp.leaves.sick.used);

  return `
    <div class="card" style="padding:0;overflow:hidden" id="emp-card-${emp.id}">
      <div style="padding:var(--space-5)">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
          <div class="payroll-emp-avatar">${initials}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:var(--text-base)">${emp.name}</div>
            <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${emp.role} • ${emp.department}</div>
          </div>
          <div style="display:flex;gap:var(--space-1)">
            <button class="btn btn-ghost btn-icon btn-sm emp-edit-btn" data-id="${emp.id}" title="Edit"><i data-lucide="pencil" style="width:15px;height:15px"></i></button>
            <button class="btn btn-ghost btn-icon btn-sm emp-delete-btn" data-id="${emp.id}" title="Delete"><i data-lucide="trash-2" style="width:15px;height:15px;color:var(--error)"></i></button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
          <div>
            <div style="font-size:0.6875rem;color:var(--text-tertiary)">Gross Salary</div>
            <div style="font-size:var(--text-base);font-weight:700;color:var(--success)">${c}${emp.salary.gross.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style="font-size:0.6875rem;color:var(--text-tertiary)">Leaves Left</div>
            <div style="font-size:var(--text-base);font-weight:700">${totalLeaves} days</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
          <span class="badge badge-primary">Basic: ${c}${emp.salary.basic.toLocaleString('en-IN')}</span>
          <span class="badge badge-info">HRA: ${c}${emp.salary.hra.toLocaleString('en-IN')}</span>
          <span class="badge badge-neutral">DA: ${c}${emp.salary.da.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div style="padding:var(--space-3) var(--space-5);background:var(--surface-1);border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Joined ${new Date(emp.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
        <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${emp.email}</div>
      </div>
    </div>
  `;
}

async function openEmployeeModal(editId, pageContainer) {
  const isEdit = !!editId;
  const emp = isEdit ? await store.getEmployee(editId) : null;
  const settings = await store.getSettings();

  const content = `
    <form id="employee-form">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Full Name *</label><input type="text" class="form-input" name="name" value="${emp?.name || ''}" required placeholder="e.g., Rajesh Kumar" /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" value="${emp?.email || ''}" placeholder="rajesh@company.com" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" name="phone" value="${emp?.phone || ''}" placeholder="+91 98765 43210" /></div>
        <div class="form-group"><label class="form-label">Role *</label><input type="text" class="form-input" name="role" value="${emp?.role || ''}" required placeholder="e.g., Senior Developer" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Department</label>
          <select class="form-select" name="department">
            ${['Engineering','Finance','Operations','Sales','Marketing','HR','Admin','Other'].map(d => `<option ${emp?.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Join Date</label><input type="date" class="form-input" name="joinDate" value="${emp?.joinDate || new Date().toISOString().split('T')[0]}" /></div>
      </div>
      <div style="border-top:1px solid var(--border);margin:var(--space-5) 0;padding-top:var(--space-5)">
        <h4 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">💰 Salary Structure</h4>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Basic *</label><input type="number" class="form-input salary-input" name="basic" value="${emp?.salary?.basic || ''}" required placeholder="25000" /></div>
          <div class="form-group"><label class="form-label">HRA</label><input type="number" class="form-input salary-input" name="hra" value="${emp?.salary?.hra || ''}" placeholder="10000" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">DA</label><input type="number" class="form-input salary-input" name="da" value="${emp?.salary?.da || ''}" placeholder="5000" /></div>
          <div class="form-group"><label class="form-label">Special Allowance</label><input type="number" class="form-input salary-input" name="specialAllowance" value="${emp?.salary?.specialAllowance || ''}" placeholder="3000" /></div>
        </div>
        <div class="form-group"><label class="form-label">Computed Gross</label><input type="text" class="form-input" id="computed-gross" readonly style="font-weight:700;color:var(--success)" /></div>
      </div>
      <div style="border-top:1px solid var(--border);margin:var(--space-5) 0;padding-top:var(--space-5)">
        <h4 style="font-size:var(--text-sm);font-weight:600;margin-bottom:var(--space-4)">🏦 Bank Details</h4>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Bank Name</label><input type="text" class="form-input" name="bankName" value="${emp?.bankName || ''}" placeholder="State Bank of India" /></div>
          <div class="form-group"><label class="form-label">Account Number</label><input type="text" class="form-input" name="bankAccount" value="${emp?.bankAccount || ''}" placeholder="XXXX XXXX XXXX" /></div>
        </div>
        <div class="form-group"><label class="form-label">IFSC Code</label><input type="text" class="form-input" name="ifsc" value="${emp?.ifsc || ''}" placeholder="SBIN0001234" /></div>
      </div>
    </form>
  `;

  showModal({
    title: isEdit ? `Edit Employee — ${emp.name}` : 'Add New Employee',
    content,
    size: 'modal-lg',
    confirmText: isEdit ? 'Save Changes' : 'Add Employee',
    confirmClass: 'btn-primary',
    onConfirm: async (body, close) => {
      const fd = new FormData(body.querySelector('#employee-form'));
      const name = fd.get('name')?.trim();
      const role = fd.get('role')?.trim();
      const basic = parseInt(fd.get('basic')) || 0;

      if (!name || !role || !basic) {
        showToast({ type: 'error', title: 'Missing Fields', message: 'Name, Role, and Basic Salary are required.' });
        return;
      }

      const hra = parseInt(fd.get('hra')) || 0;
      const da = parseInt(fd.get('da')) || 0;
      const specialAllowance = parseInt(fd.get('specialAllowance')) || 0;

      const employeeData = {
        name, email: fd.get('email') || '', phone: fd.get('phone') || '', role,
        department: fd.get('department') || 'Other',
        joinDate: fd.get('joinDate') || new Date().toISOString().split('T')[0],
        bankName: fd.get('bankName') || '', bankAccount: fd.get('bankAccount') || '', ifsc: fd.get('ifsc') || '',
        salary: { basic, hra, da, specialAllowance, gross: basic + hra + da + specialAllowance },
        leaves: emp?.leaves || {
          earned: { total: settings.leaves.earnedPerYear, used: 0 },
          casual: { total: settings.leaves.casualPerYear, used: 0 },
          sick: { total: settings.leaves.sickPerYear, used: 0 },
        },
      };

      try {
        if (isEdit) {
          await store.updateEmployee(editId, employeeData);
          showToast({ type: 'success', title: 'Employee Updated', message: `${name}'s record updated.` });
        } else {
          await store.addEmployee(employeeData);
          showToast({ type: 'success', title: 'Employee Added', message: `${name} added to your team!` });
        }
        close();
        renderEmployees(pageContainer);
      } catch (err) {
        showToast({ type: 'error', title: 'Error', message: err.message });
      }
    },
    onOpen: (body) => {
      const salaryInputs = body.querySelectorAll('.salary-input');
      const grossEl = body.querySelector('#computed-gross');
      const updateGross = () => {
        const total = Array.from(salaryInputs).reduce((sum, i) => sum + (parseInt(i.value) || 0), 0);
        grossEl.value = `${settings.payroll.currency}${total.toLocaleString('en-IN')} /month`;
      };
      salaryInputs.forEach(input => input.addEventListener('input', updateGross));
      updateGross();
    },
  });
}

function openAISalaryAdvisor() {
  const content = `
    <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">Get AI-powered salary structure recommendations.</p>
    <div class="form-group"><label class="form-label">Role</label><input type="text" class="form-input" id="ai-salary-role" placeholder="e.g., Senior Developer" /></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Department</label>
        <select class="form-select" id="ai-salary-dept"><option>Engineering</option><option>Finance</option><option>Operations</option><option>Sales</option><option>Marketing</option><option>HR</option></select>
      </div>
      <div class="form-group"><label class="form-label">Monthly Budget (CTC)</label><input type="number" class="form-input" id="ai-salary-budget" placeholder="50000" /></div>
    </div>
    <div id="ai-salary-result" style="display:none"><div class="ai-insight-box" style="margin-top:var(--space-4)"><h3><i data-lucide="sparkles" style="width:16px;height:16px"></i> AI Recommendation</h3><div id="ai-salary-content"></div></div></div>
  `;

  showModal({
    title: '✨ AI Salary Advisor', content, size: 'modal-lg',
    confirmText: 'Get Recommendation', confirmClass: 'btn-ai',
    onConfirm: async (body) => {
      const role = body.querySelector('#ai-salary-role').value.trim();
      const dept = body.querySelector('#ai-salary-dept').value;
      const budget = body.querySelector('#ai-salary-budget').value;
      if (!role || !budget) { showToast({ type: 'warning', title: 'Missing Info' }); return; }

      const resultDiv = body.querySelector('#ai-salary-result');
      const contentDiv = body.querySelector('#ai-salary-content');
      resultDiv.style.display = 'block';
      contentDiv.innerHTML = '<div class="ai-insight-loading"><div class="spinner"></div> Analyzing...</div>';
      try {
        const suggestion = await ai.suggestSalaryStructure(role, dept, budget);
        contentDiv.innerHTML = `<p style="white-space:pre-line">${suggestion}</p>`;
        if (window.lucide) window.lucide.createIcons();
      } catch (error) {
        contentDiv.innerHTML = `<p style="color:var(--error)">Error: ${error.message}</p>`;
      }
    },
  });
}

export { renderEmployees };
