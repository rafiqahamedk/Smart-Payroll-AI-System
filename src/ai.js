// ================================================================
// SmartPayroll AI — AI Engine (Backend API Proxy)
// ================================================================

import store from './store.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const RUNTIME_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const IS_HOSTED_RUNTIME = !['localhost', '127.0.0.1'].includes(RUNTIME_HOST);

function isLocalApiConfiguredOnHostedRuntime() {
  try {
    const apiHost = new URL(API_BASE).hostname;
    return IS_HOSTED_RUNTIME && ['localhost', '127.0.0.1'].includes(apiHost);
  } catch {
    return false;
  }
}

async function aiApi(path, body = {}) {
  if (isLocalApiConfiguredOnHostedRuntime()) {
    throw new Error('AI backend is configured as localhost, which is unreachable from GitHub Pages. Set VITE_API_URL to a public backend URL.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/api/ai${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Unable to reach backend API. Verify VITE_API_URL points to a live public backend.');
    }
    throw error;
  }

  if (!response.ok) {
    const error = await response.text();
    let detail = error;
    try { detail = JSON.parse(error).detail || error; } catch {}
    throw new Error(detail);
  }

  const data = await response.json();
  return data.response || data;
}

class AIEngine {
  /**
   * Chat with the AI payroll assistant
   */
  async chat(userMessage) {
    const history = store.getChatHistory().slice(-10);
    return await aiApi('/chat', { message: userMessage, history });
  }

  /**
   * Generate dashboard insights
   */
  async generateDashboardInsights() {
    return await aiApi('/insights');
  }

  /**
   * Suggest salary structure for a role
   */
  async suggestSalaryStructure(role, department, budget) {
    return await aiApi('/salary-suggest', { role, department, budget });
  }

  /**
   * Detect attendance anomalies
   */
  async detectAttendanceAnomalies(employeeId, month) {
    return await aiApi('/attendance-analyze', { employeeId, month });
  }

  /**
   * Review payroll for anomalies
   */
  async reviewPayroll(payrollData) {
    return await aiApi('/payroll-review', { payrollId: payrollData.id });
  }

  /**
   * Generate payslip summary
   */
  async generatePayslipSummary(payrollData) {
    return await aiApi(`/payslip-summary/${payrollData.id}`);
  }

  /**
   * Generate report executive summary
   */
  async generateReportSummary(reportType, data) {
    return await aiApi('/report-summary', { reportType, data });
  }

  /**
   * Smart bonus recommendation
   */
  async recommendBonus() {
    return await aiApi('/bonus-recommend');
  }
}

export const ai = new AIEngine();
export default ai;
