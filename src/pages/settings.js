// ================================================================
// SmartPayroll AI — Settings Page
// ================================================================

import store from '../store.js';
import ai from '../ai.js';
import showToast from '../components/toast.js';
import { showConfirm } from '../components/modal.js';

export default async function renderSettings(container) {
  const settings = await store.getSettings();

  container.innerHTML = `
    <div class="page-content">
      <div class="section-header">
        <h2 class="section-title">Settings</h2>
        <div class="section-actions">
          <button class="btn btn-secondary btn-sm" id="settings-import"><i data-lucide="upload"></i> Import Data</button>
          <button class="btn btn-danger btn-sm" id="settings-reset"><i data-lucide="trash-2"></i> Reset All</button>
        </div>
      </div>
      <div class="tabs" id="settings-tabs">
        <button class="tab active" data-tab="company">Company</button>
        <button class="tab" data-tab="payroll">Payroll Policy</button>
        <button class="tab" data-tab="festivals">Festival Bonuses</button>
        <button class="tab" data-tab="leaves">Leave Policy</button>
        <button class="tab" data-tab="ai">AI Configuration</button>
      </div>
      <div id="settings-content"></div>
    </div>
  `;

  let activeTab = 'company';
  document.querySelectorAll('#settings-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#settings-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderSettingsTab(activeTab, settings);
    });
  });
  renderSettingsTab(activeTab, settings);

  document.getElementById('settings-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          await store.importData(data);
          showToast({ type: 'success', title: 'Data Imported', message: 'All data restored.' });
          renderSettings(container);
        } catch (error) { showToast({ type: 'error', title: 'Import Failed', message: 'Invalid JSON file.' }); }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  document.getElementById('settings-reset')?.addEventListener('click', async () => {
    const confirmed = await showConfirm({ title: '⚠️ Reset All Data', message: 'This will delete ALL employees, payroll, attendance, and settings. Are you sure?', confirmText: 'Yes, Reset Everything' });
    if (confirmed) {
      await store.resetAll();
      showToast({ type: 'info', title: 'Data Reset', message: 'Defaults restored.' });
      renderSettings(container);
    }
  });
}

function renderSettingsTab(tab, settings) {
  const el = document.getElementById('settings-content');
  if (!el) return;
  switch (tab) {
    case 'company': renderCompanySettings(el, settings); break;
    case 'payroll': renderPayrollPolicy(el, settings); break;
    case 'festivals': renderFestivalSettings(el, settings); break;
    case 'leaves': renderLeavePolicy(el, settings); break;
    case 'ai': renderAIConfig(el, settings); break;
  }
  if (window.lucide) window.lucide.createIcons();
}

function renderCompanySettings(el, settings) {
  el.innerHTML = `<div class="card"><h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-5)">🏢 Company Information</h3><form id="company-form"><div class="form-row"><div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" name="name" value="${settings.company.name}" /></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" value="${settings.company.email}" /></div></div><div class="form-row"><div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" name="phone" value="${settings.company.phone}" /></div><div class="form-group"><label class="form-label">Fiscal Year Start</label><select class="form-select" name="fiscalYearStart">${['January', 'April', 'July', 'October'].map(m => `<option ${settings.company.fiscalYearStart === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div><div class="form-group"><label class="form-label">Address</label><textarea class="form-textarea" name="address" rows="2">${settings.company.address}</textarea></div><button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save</button></form></div>`;
  el.querySelector('#company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await store.updateSettings({ company: { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), address: fd.get('address'), fiscalYearStart: fd.get('fiscalYearStart') } });
    showToast({ type: 'success', title: 'Saved', message: 'Company settings updated.' });
  });
}

function renderPayrollPolicy(el, settings) {
  const c = settings.payroll.currency;
  el.innerHTML = `<div class="card"><h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-5)">⚙️ Payroll Policy</h3><form id="payroll-policy-form"><div class="form-row"><div class="form-group"><label class="form-label">PF Rate (%)</label><input type="number" class="form-input" name="pfRate" value="${settings.payroll.pfRate}" step="0.01" /><div class="form-help">Standard: 12%</div></div><div class="form-group"><label class="form-label">ESI Rate (%)</label><input type="number" class="form-input" name="esiRate" value="${settings.payroll.esiRate}" step="0.01" /><div class="form-help">Standard: 0.75%</div></div></div><div class="form-row"><div class="form-group"><label class="form-label">Professional Tax (${c}/month)</label><input type="number" class="form-input" name="professionalTax" value="${settings.payroll.professionalTax}" /></div><div class="form-group"><label class="form-label">TDS Rate (%)</label><input type="number" class="form-input" name="tdsRate" value="${settings.payroll.tdsRate}" step="0.01" /></div></div><div class="form-row"><div class="form-group"><label class="form-label">OT Multiplier</label><input type="number" class="form-input" name="overtimeMultiplier" value="${settings.payroll.overtimeMultiplier}" step="0.5" /><div class="form-help">Min 2x per Factories Act</div></div><div class="form-group"><label class="form-label">Hours/Day</label><input type="number" class="form-input" name="workingHoursPerDay" value="${settings.payroll.workingHoursPerDay}" /></div></div><div class="form-row"><div class="form-group"><label class="form-label">Working Days/Month</label><input type="number" class="form-input" name="workingDaysPerMonth" value="${settings.payroll.workingDaysPerMonth}" /></div><div class="form-group"><label class="form-label">Currency</label><input type="text" class="form-input" name="currency" value="${c}" maxlength="3" /></div></div><button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save Policy</button></form></div>`;
  el.querySelector('#payroll-policy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await store.updateSettings({ payroll: { pfRate: parseFloat(fd.get('pfRate')) || 12, esiRate: parseFloat(fd.get('esiRate')) || 0.75, professionalTax: parseInt(fd.get('professionalTax')) || 200, tdsRate: parseFloat(fd.get('tdsRate')) || 10, overtimeMultiplier: parseFloat(fd.get('overtimeMultiplier')) || 2, workingHoursPerDay: parseInt(fd.get('workingHoursPerDay')) || 8, workingDaysPerMonth: parseInt(fd.get('workingDaysPerMonth')) || 26, currency: fd.get('currency') || '₹' } });
    showToast({ type: 'success', title: 'Saved', message: 'Payroll policy updated.' });
  });
}

function renderFestivalSettings(el, settings) {
  el.innerHTML = `<div class="card"><h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-5)">🎉 Festival Bonus Configuration</h3><p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">Auto-apply bonuses as % of basic salary when payroll month matches.</p><div id="festival-list">${(settings.festivals || []).map((f, i) => `<div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);background:var(--surface-1);border-radius:var(--radius-md);margin-bottom:var(--space-3)"><label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer"><input type="checkbox" class="festival-toggle" data-index="${i}" ${f.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary)" /></label><div style="flex:1"><div style="font-weight:600;font-size:var(--text-sm)">${f.name}</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">Month: ${new Date(2024, f.month - 1).toLocaleDateString('en-IN', { month: 'long' })}</div></div><div style="text-align:right"><div style="font-size:var(--text-sm);font-weight:600;color:var(--primary-light)">${f.bonusPercentage}%</div><div style="font-size:var(--text-xs);color:var(--text-tertiary)">of Basic</div></div></div>`).join('')}</div></div>`;
  el.querySelectorAll('.festival-toggle').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const index = parseInt(e.target.dataset.index);
      const festivals = [...settings.festivals];
      festivals[index] = { ...festivals[index], enabled: e.target.checked };
      await store.updateSettings({ festivals });
      settings.festivals = festivals;
      showToast({ type: 'info', title: e.target.checked ? 'Enabled' : 'Disabled', message: `${festivals[index].name}` });
    });
  });
}

function renderLeavePolicy(el, settings) {
  el.innerHTML = `<div class="card"><h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-5)">🌴 Leave Policy</h3><form id="leave-policy-form"><div class="form-row"><div class="form-group"><label class="form-label">Earned Leave/Year</label><input type="number" class="form-input" name="earnedPerYear" value="${settings.leaves.earnedPerYear}" /><div class="form-help">Privilege / Annual Leave</div></div><div class="form-group"><label class="form-label">Casual Leave/Year</label><input type="number" class="form-input" name="casualPerYear" value="${settings.leaves.casualPerYear}" /></div></div><div class="form-group"><label class="form-label">Sick Leave/Year</label><input type="number" class="form-input" name="sickPerYear" value="${settings.leaves.sickPerYear}" /></div><button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save</button></form></div>`;
  el.querySelector('#leave-policy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await store.updateSettings({ leaves: { earnedPerYear: parseInt(fd.get('earnedPerYear')) || 15, casualPerYear: parseInt(fd.get('casualPerYear')) || 7, sickPerYear: parseInt(fd.get('sickPerYear')) || 7 } });
    showToast({ type: 'success', title: 'Saved', message: 'Leave policy updated.' });
  });
}

function renderAIConfig(el, settings) {
  const apiKey = import.meta.env.VITE_OSMAPI || '';
  el.innerHTML = `<div class="card"><h3 style="font-size:var(--text-base);font-weight:600;margin-bottom:var(--space-5)">🤖 AI Configuration — OSM API</h3>
    <div class="ai-insight-box" style="margin-bottom:var(--space-5)"><h3><i data-lucide="sparkles" style="width:16px;height:16px"></i> AI Features (Powered by OSM API)</h3><p>SmartPayroll uses <strong>OSM API</strong> (unified AI gateway) with the <strong>qwen3.5-397b-a17b</strong> model for: dashboard insights, salary recommendations, attendance anomaly detection, payroll review, payslip summaries, report generation, bonus suggestions, and chatbot assistance.</p></div>
    <form id="ai-config-form">
      <div class="form-group"><label class="form-label">OSM API Endpoint</label><input type="url" class="form-input" name="apiUrl" value="${settings.ai?.apiUrl || 'https://api.osmapi.com/v1/chat/completions'}" /><div class="form-help">OSM API unified AI gateway — OpenAI-compatible format</div></div>
      <div class="form-group"><label class="form-label">Model</label><input type="text" class="form-input" name="model" value="${settings.ai?.model || 'qwen3.5-397b-a17b'}" /><div class="form-help">130+ models available via OSM API (e.g., qwen3.5-397b-a17b, gpt-4o, claude-4-sonnet)</div></div>
      <div class="form-group"><label class="form-label">API Key Status</label><div style="display:flex;align-items:center;gap:var(--space-2)"><span class="badge ${apiKey ? 'badge-success' : 'badge-error'}">${apiKey ? '✓ OSM API Key configured' : '✗ No key found'}</span>${apiKey ? `<span style="font-size:var(--text-xs);color:var(--text-tertiary)">Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}</span>` : ''}</div></div>
      <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> Save AI Config</button>
      <button type="button" class="btn btn-ai btn-sm" id="ai-test-btn" style="margin-left:var(--space-3)"><i data-lucide="zap"></i> Test Connection</button>
    </form>
  </div>`;

  el.querySelector('#ai-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await store.updateSettings({ ai: { apiUrl: fd.get('apiUrl'), model: fd.get('model') } });
    showToast({ type: 'success', title: 'Saved', message: 'AI configuration updated.' });
  });

  el.querySelector('#ai-test-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#ai-test-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;border-color:white;border-top-color:transparent"></div> Testing...';
    try {
      const response = await ai.chat('Say "Connection successful! SmartPayroll AI is ready." in one sentence.');
      showToast({ type: 'success', title: 'AI Connected!', message: response.slice(0, 100) });
    } catch (error) {
      showToast({ type: 'error', title: 'Connection Failed', message: error.message, duration: 8000 });
    }
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="zap"></i> Test Connection';
    if (window.lucide) window.lucide.createIcons();
  });
}
