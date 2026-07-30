/* =========================================================
   PTPS CLASSROOM HUB - SCRIPT ENGINE
   ========================================================= */

// --- GLOBAL ROSTER PERSISTENCE ---
const DEFAULT_ROSTER = ["Alex", "Jordan", "Taylor", "Morgan", "Sam", "Chris", "Riley", "Casey", "Avery", "Quinn", "Skyler", "Dakota"];
let roster = [...DEFAULT_ROSTER];

function loadSavedRoster() {
  try {
    const saved = localStorage.getItem('ptps_classroom_roster');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) roster = parsed;
    }
  } catch(e) {}
}

function saveRoster(newRoster) {
  roster = newRoster;
  try { localStorage.setItem('ptps_classroom_roster', JSON.stringify(roster)); } catch(e) {}
  attendanceStatus = {};
  updateTileDisplay('picker');
  updateTileDisplay('attendance');
}

// --- AUDIO SYNTHESIZER FOR SFX ---
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  initAudio();
  const now = audioCtx.currentTime;
  if (type === 'bell') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc.start(now); osc.stop(now + 1.8);
  } else if (type === 'buzzer') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  } else if (type === 'tada') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.setValueAtTime(freq, now + idx * 0.08);
      g.gain.setValueAtTime(0.3, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
      o.start(now + idx * 0.08); o.stop(now + idx * 0.08 + 0.3);
    });
  }
}

// --- LIGHT / DARK THEME TOGGLE ---
function initTheme() {
  const savedTheme = localStorage.getItem('ptps_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ptps_theme', next);
  updateThemeUI(next);
}

function updateThemeUI(theme) {
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon && label) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  }
}

// --- DEVICE VIEW TOGGLE (PC vs MOBILE) ---
let currentDeviceView = 'pc';
function setDeviceView(view) {
  currentDeviceView = view;
  document.body.classList.remove('view-pc', 'view-mobile');
  document.body.classList.add(`view-${view}`);
  document.getElementById('btnViewPc').classList.toggle('active', view === 'pc');
  document.getElementById('btnViewMobile').classList.toggle('active', view === 'mobile');
}

// --- COUNTDOWN TIMER MODULE STATE WITH VISUAL RING ---
let timerTotalSeconds = 300;
let timerSeconds = 300;
let timerRunning = false;
let timerInterval = null;

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerRings() {
  const fraction = timerTotalSeconds > 0 ? (timerSeconds / timerTotalSeconds) : 0;
  
  // 1. Tile Ring Progress (circumference ~ 232)
  const tileCircle = document.getElementById('tile_timer_circle');
  if (tileCircle) {
    const tileOffset = 232 - (232 * fraction);
    tileCircle.style.strokeDashoffset = tileOffset;
    tileCircle.style.stroke = timerSeconds <= 30 ? '#ef4444' : (timerSeconds <= 60 ? '#f59e0b' : 'var(--ptps-turquoise)');
  }

  // 2. Fullscreen Ring Progress (circumference ~ 565)
  const modalCircle = document.getElementById('modal_timer_circle');
  if (modalCircle) {
    const modalOffset = 565 - (565 * fraction);
    modalCircle.style.strokeDashoffset = modalOffset;
    modalCircle.style.stroke = timerSeconds <= 30 ? '#ef4444' : (timerSeconds <= 60 ? '#f59e0b' : 'var(--ptps-turquoise)');
  }

  const formatted = formatTime(timerSeconds * 1000);
  const tileText = document.getElementById('grid_timer_display');
  const modalText = document.getElementById('timerBigDisplay');
  if (tileText) tileText.textContent = formatted;
  if (modalText) modalText.textContent = formatted;
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
  } else {
    if (timerSeconds <= 0) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerRings();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        playSound('buzzer');
      }
    }, 1000);
  }
  if (activeToolId === 'timer') renderToolContent('timer');
}

function setTimerSecs(s) {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
  }
  timerTotalSeconds = s;
  timerSeconds = s;
  updateTimerRings();
  if (activeToolId === 'timer') renderToolContent('timer');
}

// --- MODULE DEFINITIONS & DASHBOARD TILE ENGINE ---
let activeToolId = null;
const defaultTileOrder = ['timer', 'ready30', 'picker', 'bell', 'traffic', 'timeLoss', 'noiseMeter', 'attendance', 'groups', 'notes', 'soundboard'];
let tileOrder = [...defaultTileOrder];

function renderDashboardGrid() {
  const container = document.getElementById('dashboardGridContainer');
  if (!container) return;
  container.innerHTML = '';

  tileOrder.forEach(toolId => {
    const tileEl = document.createElement('div');
    tileEl.className = `tile ${toolId === 'ready30' ? 'tile-ready-30' : ''}`;
    
    if (toolId === 'timer') {
      const strokeOffset = 232 - (232 * (timerSeconds / timerTotalSeconds));
      tileEl.innerHTML = `
        <div class="tile-header">
          <span class="tile-title">⏳ Countdown Timer</span>
          <span class="tile-expand-icon">⤢</span>
        </div>
        <div class="tile-body">
          <div class="tile-timer-ring-wrapper">
            <svg class="tile-timer-svg" viewBox="0 0 90 90">
              <circle class="tile-timer-bg" cx="45" cy="45" r="37" />
              <circle class="tile-timer-progress" id="tile_timer_circle" cx="45" cy="45" r="37" style="stroke-dashoffset: ${strokeOffset};" />
            </svg>
            <div class="display-main tile-timer-text" id="grid_timer_display">${formatTime(timerSeconds * 1000)}</div>
          </div>
          <div class="tile-subtext">VISUAL COUNTDOWN</div>
        </div>
      `;
    } else {
      let title = "Tool", display = "▶", subtext = "TAP TO OPEN";
      if (toolId === 'ready30') { title = "⚡ Ready in 30s"; display = "30s"; subtext = "CLASS ROUTINE"; }
      else if (toolId === 'picker') { title = "🎲 Random Picker"; display = "Pick"; subtext = `${roster.length} STUDENTS`; }
      else if (toolId === 'bell') { title = "🔔 Attention Bell"; display = "🔔"; subtext = "CHIME"; }
      else if (toolId === 'traffic') { title = "🚦 Traffic Light"; display = "🔴"; subtext = "CLASS STATE"; }
      else if (toolId === 'attendance') { title = "📋 Attendance"; display = "100%"; subtext = "PRESENT"; }

      tileEl.innerHTML = `
        <div class="tile-header">
          <span class="tile-title">${title}</span>
          <span class="tile-expand-icon">⤢</span>
        </div>
        <div class="tile-body">
          <div class="display-main" id="grid_${toolId}_display">${display}</div>
          <div class="tile-subtext">${subtext}</div>
        </div>
      `;
    }

    tileEl.addEventListener('click', () => openTool(toolId));
    container.appendChild(tileEl);
  });
}

function openTool(toolId) {
  activeToolId = toolId;
  const overlay = document.getElementById('fullscreenOverlay');
  overlay.classList.add('active');
  renderToolContent(toolId);
}

function closeTool() {
  document.getElementById('fullscreenOverlay').classList.remove('active');
  activeToolId = null;
}

function renderToolContent(toolId) {
  const title = document.getElementById('overlayTitle');
  const content = document.getElementById('overlayContent');
  content.innerHTML = '';

  if (toolId === 'timer') {
    title.textContent = '⏳ Visual Countdown Timer';
    const strokeOffset = 565 - (565 * (timerSeconds / timerTotalSeconds));
    content.innerHTML = `
      <div class="modal-timer-clock-wrapper">
        <svg class="modal-timer-svg" viewBox="0 0 200 200">
          <circle class="modal-timer-bg" cx="100" cy="100" r="90" />
          <circle class="modal-timer-progress" id="modal_timer_circle" cx="100" cy="100" r="90" style="stroke-dashoffset: ${strokeOffset};" />
        </svg>
        <div class="modal-timer-time-text" id="timerBigDisplay">${formatTime(timerSeconds * 1000)}</div>
      </div>
      
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="control-btn ${timerRunning ? 'danger' : ''}" onclick="toggleTimer()">${timerRunning ? 'Pause' : 'Start'}</button>
        <button class="control-btn secondary" onclick="setTimerSecs(300)">Reset (5m)</button>
      </div>

      <div style="margin-top: 1.25rem; display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center;">
        <button class="control-btn preset" onclick="setTimerSecs(30)">30s</button>
        <button class="control-btn preset" onclick="setTimerSecs(60)">1m</button>
        <button class="control-btn preset" onclick="setTimerSecs(180)">3m</button>
        <button class="control-btn preset" onclick="setTimerSecs(300)">5m</button>
        <button class="control-btn preset" onclick="setTimerSecs(600)">10m</button>
      </div>
    `;
  } else if (toolId === 'picker') {
    title.textContent = '🎲 Random Student Picker';
    content.innerHTML = `
      <div class="modal-timer-time-text" id="pickerBigDisplay" style="font-size: 4rem;">Ready</div>
      <button class="control-btn" style="margin-top: 2rem;" onclick="shuffleStudent()">Pick Student</button>
    `;
  } else if (toolId === 'bell') {
    title.textContent = '🔔 Attention Bell';
    content.innerHTML = `
      <div style="font-size: 8rem; cursor: pointer;" onclick="playSound('bell')">🔔</div>
      <button class="control-btn" style="margin-top: 2rem;" onclick="playSound('bell')">Ring Bell</button>
    `;
  }
}

function shuffleStudent() {
  const disp = document.getElementById('pickerBigDisplay');
  if (!disp || roster.length === 0) return;
  let count = 0;
  const interval = setInterval(() => {
    disp.textContent = roster[Math.floor(Math.random() * roster.length)];
    count++;
    if (count > 12) {
      clearInterval(interval);
      playSound('tada');
    }
  }, 80);
}

function updateTileDisplay(toolId) {
  renderDashboardGrid();
}

function resetTileOrder() {
  tileOrder = [...defaultTileOrder];
  renderDashboardGrid();
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  loadSavedRoster();
  initTheme();
  renderDashboardGrid();
});