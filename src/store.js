// ================================================================
// SmartPayroll AI — Data Store (Backend API Integration)
// ================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const RUNTIME_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const IS_HOSTED_RUNTIME = !['localhost', '127.0.0.1'].includes(RUNTIME_HOST);

let warnedHostedLocalApi = false;
let warnedNetworkFallback = false;

function isLocalApiConfiguredOnHostedRuntime() {
  try {
    const apiHost = new URL(API_BASE).hostname;
    return IS_HOSTED_RUNTIME && ['localhost', '127.0.0.1'].includes(apiHost);
  } catch {
    return false;
  }
}

function warnHostedLocalApiMismatch() {
  if (warnedHostedLocalApi) return;
  warnedHostedLocalApi = true;
  console.warn('Backend URL is set to localhost while app is hosted. Update VITE_API_URL to a public backend URL in your GitHub environment secrets.');
}

function warnNetworkFallbackOnce() {
  if (warnedNetworkFallback) return;
  warnedNetworkFallback = true;
  console.warn('Backend not reachable, using localStorage fallback.');
}

// ── API Helper ────────────────────────────────────────────────
async function api(path, options = {}) {
  if (isLocalApiConfiguredOnHostedRuntime()) {
    warnHostedLocalApiMismatch();
    return null;
  }

  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      let detail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed.detail || errorText;
      } catch {}
      throw new Error(detail);
    }
    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      warnNetworkFallbackOnce();
      return null;
    }
    throw error;
  }
}

// ── Store Class ──────────────────────────────────────────────
class Store {
  constructor() {
    this._listeners = {};
    this._cache = {};
  }

  // ── Event System ────────────────────────────────────────────
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }

  // ── Settings ────────────────────────────────────────────────
  async getSettings() {
    try {
      const data = await api('/api/settings');
      if (data) {
        this._cache.settings = data;
        return data;
      }
    } catch {}
    return this._cache.settings || this._getDefaultSettings();
  }

  getSettingsSync() {
    return this._cache.settings || this._getDefaultSettings();
  }

  _getDefaultSettings() {
    return {
      company: { name: 'My Company', address: '', email: '', phone: '', fiscalYearStart: 'April' },
      payroll: { pfRate: 12, esiRate: 0.75, professionalTax: 200, tdsRate: 10, overtimeMultiplier: 2, workingHoursPerDay: 8, workingDaysPerMonth: 26, currency: '₹' },
      festivals: [],
      leaves: { earnedPerYear: 15, casualPerYear: 7, sickPerYear: 7 },
      ai: { apiUrl: '', model: 'gemini-2.0-flash' },
    };
  }

  async updateSettings(updates) {
    const data = await api('/api/settings', { method: 'PUT', body: updates });
    if (data) this._cache.settings = data;
    this._emit('settings:updated', data);
    return data;
  }

  // ── Employees ───────────────────────────────────────────────
  async getEmployees() {
    try {
      const data = await api('/api/employees');
      if (data) {
        this._cache.employees = data;
        return data;
      }
    } catch {}
    return this._cache.employees || [];
  }

  getEmployeesSync() {
    return this._cache.employees || [];
  }

  async getEmployee(id) {
    try {
      return await api(`/api/employees/${id}`);
    } catch {
      return (this._cache.employees || []).find(e => e.id === id);
    }
  }

  async addEmployee(employee) {
    const data = await api('/api/employees', { method: 'POST', body: employee });
    this._emit('employees:updated');
    return data;
  }

  async updateEmployee(id, updates) {
    const data = await api(`/api/employees/${id}`, { method: 'PUT', body: updates });
    this._emit('employees:updated');
    return data;
  }

  async deleteEmployee(id) {
    await api(`/api/employees/${id}`, { method: 'DELETE' });
    this._emit('employees:updated');
  }

  // ── Attendance ──────────────────────────────────────────────
  async getEmployeeAttendance(employeeId, month) {
    try {
      const data = await api(`/api/attendance/${employeeId}/${month}`);
      return data || {};
    } catch {
      return {};
    }
  }

  async setAttendanceDay(employeeId, month, day, status) {
    await api(`/api/attendance/${employeeId}/${month}/${day}`, {
      method: 'PUT',
      body: { day, status },
    });
    this._emit('attendance:updated', { employeeId, month });
  }

  async bulkSetAttendance(employeeId, month, days) {
    await api(`/api/attendance/${employeeId}/${month}/bulk`, {
      method: 'PUT',
      body: { days },
    });
    this._emit('attendance:updated', { employeeId, month });
  }

  async getAttendanceSummary(employeeId, month) {
    try {
      const data = await api(`/api/attendance/${employeeId}/${month}/summary`);
      return data || { present: 0, absent: 0, halfDay: 0, paidLeave: 0, unpaidLeave: 0, holiday: 0, weekend: 0, totalWorking: 0 };
    } catch {
      return { present: 0, absent: 0, halfDay: 0, paidLeave: 0, unpaidLeave: 0, holiday: 0, weekend: 0, totalWorking: 0 };
    }
  }

  // ── Payroll ─────────────────────────────────────────────────
  async getPayrollHistory() {
    try {
      return await api('/api/payroll') || [];
    } catch {
      return [];
    }
  }

  async getPayrollForMonth(month) {
    try {
      return await api(`/api/payroll?month=${month}`) || [];
    } catch {
      return [];
    }
  }

  async getEmployeePayroll(employeeId, month) {
    const payrolls = await this.getPayrollForMonth(month);
    return payrolls.find(p => p.employeeId === employeeId);
  }

  async processPayroll(employeeId, month, overtimeHours = 0, festivalBonus = 0, otherBonus = 0) {
    const data = await api(`/api/payroll/process/${employeeId}`, {
      method: 'POST',
      body: { month, overtimeHours, festivalBonus, otherBonus },
    });
    this._emit('payroll:updated');
    return data;
  }

  async processAllPayroll(month, overrides = {}) {
    const data = await api('/api/payroll/process-all', {
      method: 'POST',
      body: { month, overrides },
    });
    this._emit('payroll:updated');
    return data?.results || [];
  }

  async updatePayrollStatus(payrollId, status) {
    await api(`/api/payroll/${payrollId}/status?status=${status}`, { method: 'PUT' });
    this._emit('payroll:updated');
  }

  async getPayrollStats() {
    try {
      return await api('/api/payroll/stats') || {};
    } catch {
      return {};
    }
  }

  // ── Analytics ───────────────────────────────────────────────
  async getPayrollTrend(months = 6) {
    try {
      return await api(`/api/payroll/trend?months=${months}`) || [];
    } catch {
      return [];
    }
  }

  async getTotalPayrollCost() {
    const stats = await this.getPayrollStats();
    return stats.totalNet || 0;
  }

  async getPendingPayrolls() {
    const stats = await this.getPayrollStats();
    return stats.pending || 0;
  }

  // ── Export / Import ─────────────────────────────────────────
  async exportData() {
    return await api('/api/reports/export');
  }

  async importData(data) {
    await api('/api/reports/import', { method: 'POST', body: data });
    this._emit('data:imported');
  }

  async resetAll() {
    await api('/api/reports/reset', { method: 'POST' });
    this._cache = {};
    this._emit('data:reset');
  }

  // ── Chat History (kept client-side for speed) ──────────────
  getChatHistory() {
    try {
      return JSON.parse(localStorage.getItem('sp_chat_history')) || [];
    } catch {
      return [];
    }
  }

  addChatMessage(role, content) {
    const history = this.getChatHistory();
    history.push({ role, content, timestamp: Date.now() });
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem('sp_chat_history', JSON.stringify(history));
    return history;
  }

  clearChatHistory() {
    localStorage.setItem('sp_chat_history', JSON.stringify([]));
  }

  // ── Preload cache ───────────────────────────────────────────
  async preload() {
    try {
      const [employees, settings] = await Promise.all([
        this.getEmployees(),
        this.getSettings(),
      ]);
      this._cache.employees = employees;
      this._cache.settings = settings;
    } catch (e) {
      console.warn('Preload failed:', e.message);
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────
export const store = new Store();
export default store;
