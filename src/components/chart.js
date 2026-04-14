// ================================================================
// SmartPayroll AI — Chart Component (Canvas-based)
// ================================================================

/**
 * Draw a bar chart
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 */
export function drawBarChart(canvas, { labels, data, color = '#6366f1', maxBarWidth = 48 }) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = (rect.height || 240) * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = (rect.height || 240) + 'px';
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height || 240;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.clearRect(0, 0, w, h);

  const maxVal = Math.max(...data, 1);
  const barCount = labels.length;
  const gap = 12;
  let barWidth = (chartW - gap * (barCount + 1)) / barCount;
  barWidth = Math.min(barWidth, maxBarWidth);
  const totalBarsWidth = barCount * barWidth + (barCount + 1) * gap;
  const startX = padding.left + (chartW - totalBarsWidth) / 2 + gap;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const val = Math.round(maxVal - (maxVal / 4) * i);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCompact(val), padding.left - 8, y + 4);
  }

  // Bars
  data.forEach((val, i) => {
    const x = startX + i * (barWidth + gap);
    const barH = (val / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    // Gradient bar
    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '44');
    ctx.fillStyle = grad;

    // Rounded top
    const radius = Math.min(6, barWidth / 2);
    ctx.beginPath();
    ctx.moveTo(x, y + barH);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, y + barH);
    ctx.fill();

    // Glow
    ctx.shadowColor = color + '40';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Value on top
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    if (val > 0) {
      ctx.fillText(formatCompact(val), x + barWidth / 2, y - 6);
    }

    // X-axis label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(labels[i], x + barWidth / 2, h - padding.bottom + 18);
  });
}

/**
 * Draw a donut chart
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 */
export function drawDonutChart(canvas, { labels, data, colors, centerLabel = '', centerValue = '' }) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.parentElement.clientWidth, 220);

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 8;
  const innerRadius = outerRadius * 0.65;

  const total = data.reduce((sum, v) => sum + v, 0) || 1;
  let startAngle = -Math.PI / 2;

  data.forEach((val, i) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
    ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[i] || '#6366f1';
    ctx.fill();

    // Shadow
    ctx.shadowColor = (colors[i] || '#6366f1') + '30';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    startAngle = endAngle;
  });

  // Center text
  if (centerValue) {
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(centerValue, cx, cy - 6);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(centerLabel, cx, cy + 14);
  }
}

/**
 * Draw a horizontal bar/breakdown chart
 */
export function drawHorizontalBars(container, items) {
  const total = items.reduce((sum, it) => sum + it.value, 0) || 1;

  container.innerHTML = items.map(item => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:0.8125rem;color:var(--text-secondary)">${item.label}</span>
        <span style="font-size:0.8125rem;font-weight:600;color:var(--text-primary)">₹${item.value.toLocaleString('en-IN')}</span>
      </div>
      <div style="height:6px;background:var(--surface-2);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${(item.value / total * 100).toFixed(1)}%;background:${item.color || 'var(--primary)'};border-radius:99px;transition:width 0.6s ease"></div>
      </div>
    </div>
  `).join('');
}

// ── Helpers ──────────────────────────────────────────────────
function formatCompact(num) {
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
  return '₹' + num;
}

export default { drawBarChart, drawDonutChart, drawHorizontalBars };
