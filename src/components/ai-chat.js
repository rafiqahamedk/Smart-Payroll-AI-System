// ================================================================
// SmartPayroll AI — AI Chat Panel Component
// ================================================================

import ai from '../ai.js';
import store from '../store.js';

const SUGGESTIONS = [
  "What's the total payroll cost this month?",
  "Who has the most leaves remaining?",
  "Compare salary structures of all employees",
  "Suggest bonus amounts for this quarter",
  "How can I optimize my payroll costs?",
  "Explain PF calculation rules",
];

export function renderAIChat(container) {
  const panel = document.createElement('div');
  panel.className = 'ai-chat-panel';
  panel.id = 'ai-chat-panel';

  panel.innerHTML = `
    <div class="ai-chat-header">
      <div class="ai-chat-header-left">
        <div class="ai-chat-avatar">
          <i data-lucide="sparkles"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:var(--text-sm)">AI Assistant <span class="ai-status-dot"></span></div>
          <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Payroll Intelligence</div>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2)">
        <button class="header-btn" id="ai-chat-clear" title="Clear chat">
          <i data-lucide="trash-2"></i>
        </button>
        <button class="header-btn" id="ai-chat-close">
          <i data-lucide="x"></i>
        </button>
      </div>
    </div>

    <div class="ai-chat-messages" id="ai-chat-messages">
      <div class="ai-message assistant">
        <div class="ai-message-content">
          👋 Hi! I'm your SmartPayroll AI assistant. I can help you with payroll calculations, salary queries, leave management, compliance questions, and more. What would you like to know?
        </div>
      </div>
    </div>

    <div class="ai-suggestions" id="ai-suggestions">
      ${SUGGESTIONS.slice(0, 4).map(s => `
        <button class="ai-suggestion-chip">${s}</button>
      `).join('')}
    </div>

    <div class="ai-chat-input-area">
      <div class="ai-chat-input-wrapper">
        <input type="text" placeholder="Ask anything about payroll..." id="ai-chat-input" />
        <button class="ai-chat-send-btn" id="ai-chat-send" disabled>
          <i data-lucide="send"></i>
        </button>
      </div>
    </div>
  `;

  container.appendChild(panel);

  // Load existing chat history
  const history = store.getChatHistory();
  if (history.length > 0) {
    const messagesEl = panel.querySelector('#ai-chat-messages');
    history.forEach(msg => {
      appendMessage(messagesEl, msg.role, msg.content);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Event handlers
  const input = panel.querySelector('#ai-chat-input');
  const sendBtn = panel.querySelector('#ai-chat-send');
  const messagesEl = panel.querySelector('#ai-chat-messages');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      sendMessage(input, messagesEl, sendBtn);
    }
  });

  sendBtn.addEventListener('click', () => {
    if (input.value.trim()) {
      sendMessage(input, messagesEl, sendBtn);
    }
  });

  // Suggestion chips
  panel.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      sendBtn.disabled = false;
      sendMessage(input, messagesEl, sendBtn);
    });
  });

  // Close
  panel.querySelector('#ai-chat-close').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Clear
  panel.querySelector('#ai-chat-clear').addEventListener('click', () => {
    store.clearChatHistory();
    messagesEl.innerHTML = `
      <div class="ai-message assistant">
        <div class="ai-message-content">
          Chat cleared! How can I help you with payroll today?
        </div>
      </div>
    `;
  });
}

async function sendMessage(input, messagesEl, sendBtn) {
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  sendBtn.disabled = true;

  // Add user message
  appendMessage(messagesEl, 'user', text);
  store.addChatMessage('user', text);

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'ai-message assistant';
  typingEl.innerHTML = `
    <div class="ai-typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const response = await ai.chat(text);
    typingEl.remove();
    appendMessage(messagesEl, 'assistant', response);
    store.addChatMessage('assistant', response);
  } catch (error) {
    typingEl.remove();
    appendMessage(messagesEl, 'assistant', `⚠️ Sorry, I encountered an error: ${error.message}. Please check your AI API configuration in Settings.`);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(container, role, content) {
  const msg = document.createElement('div');
  msg.className = `ai-message ${role}`;
  msg.innerHTML = `
    <div class="ai-message-content">${formatAIResponse(content)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function formatAIResponse(text) {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--surface-3);padding:2px 6px;border-radius:4px;font-size:0.8em">$1</code>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\d\. /g, (match) => '<br>' + match.trim() + ' ')
    .replace(/\n/g, '<br>');
}
