/**
 * app.js — Jejum Fácil
 * Controlador principal: coordena UI, timer, storage, stats e ads.
 */

// ── CONSTANTES SVG CIRCUNFERÊNCIA ─────────────
const RING_CIRCUMFERENCE = 2 * Math.PI * 128; // r=128 → ≈ 804.25

// ── REFERÊNCIAS DOM ───────────────────────────
const $ = (id) => document.getElementById(id);

const UI = {
  // Splash
  splash:           $('splash'),
  app:              $('app'),
  // Timer
  ringProgress:     $('ringProgress'),
  ringPercent:      $('ringPercent'),
  ringElapsed:      $('ringElapsed'),
  ringLabel:        $('ringLabel'),
  ringFinish:       $('ringFinish'),
  ringStateIcon:    $('ringStateIcon'),
  ringContainer:    document.querySelector('.ring-container'),
  phaseCard:        $('phaseCard'),
  phaseIcon:        $('phaseIcon'),
  phaseTitle:       $('phaseTitle'),
  phaseDesc:        $('phaseDesc'),
  btnStart:         $('btnStart'),
  activeControls:   $('activeControls'),
  btnPause:         $('btnPause'),
  btnStop:          $('btnStop'),
  protocolBar:      $('protocolBar'),
  quoteText:        $('quoteText'),
  // History
  historyList:      $('historyList'),
  btnExportHistory: $('btnExportHistory'),
  btnClearHistory:  $('btnClearHistory'),
  // Settings
  btnSettings:      $('btnSettings'),
  settingsPanel:    $('settingsPanel'),
  btnCloseSettings: $('btnCloseSettings'),
  overlay:          $('overlay'),
  btnTheme:         $('btnTheme'),
  btnNotifToggle:   $('btnNotifToggle'),
  btnSaveCustom:    $('btnSaveCustom'),
  customHours:      $('customHours'),
  customName:       $('customName'),
  btnResetAll:      $('btnResetAll'),
  // Stats
  weekChart:        $('weekChart'),
  // Achievements
  achievementsGrid: $('achievementsGrid'),
  // Toast
  toast:            $('toast'),
};

// ── ESTADO DA APP ─────────────────────────────
let App = {
  currentTab:    'timer',
  selectedProto: { hours: 16, label: '16:8' },
  sessions:      [],
  theme:         'dark',
};

// ── TOAST ──────────────────────────────────────
let _toastTimeout = null;
function showToast(msg, duration = 2500) {
  UI.toast.textContent = msg;
  UI.toast.classList.remove('hidden');
  requestAnimationFrame(() => UI.toast.classList.add('show'));
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    UI.toast.classList.remove('show');
    setTimeout(() => UI.toast.classList.add('hidden'), 350);
  }, duration);
}

// ── THEME ─────────────────────────────────────
function applyTheme(theme) {
  App.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  Storage.setSetting('theme', theme);
}

// ── TABS ──────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tabEl = $(`tab-${name}`);
  const navEl = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (tabEl) tabEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  App.currentTab = name;

  // Ads: mostrar banner em history/stats, esconder em timer
  if (name === 'timer') {
    Ads.hideBanner();
  } else {
    Ads.showBanner();
  }

  // Carregar conteúdo da tab
  if (name === 'history')      renderHistory();
  if (name === 'stats')        renderStats();
  if (name === 'achievements') Stats.renderAchievements(UI.achievementsGrid);
}

// ── RING UPDATE ───────────────────────────────
function updateRing(pct) {
  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;
  UI.ringProgress.style.strokeDashoffset = offset;
}

// ── TIMER CALLBACKS ───────────────────────────
Timer.on('onTick', ({ pct, elapsed, remainingStr, phase, icon, finishStr, done }) => {
  updateRing(pct);
  UI.ringPercent.textContent   = Math.floor(pct) + '%';
  UI.ringElapsed.textContent   = elapsed;
  UI.ringLabel.textContent     = done ? 'Concluído!' : 'Tempo decorrido';
  UI.ringFinish.textContent    = done ? '' : `Fim previsto: ${finishStr}`;
  UI.ringStateIcon.textContent = icon;
  UI.phaseIcon.textContent     = phase.icon;
  UI.phaseTitle.textContent    = phase.title;
  UI.phaseDesc.textContent     = phase.desc;

  if (done) {
    UI.ringContainer.classList.add('ring-pulsing');
    UI.ringLabel.textContent = '🏆 Objetivo atingido!';
  }
});

Timer.on('onComplete', () => {
  Notifications.triggerComplete();
  showToast('🏆 Jejum concluído! Parabéns!', 4000);
});

Timer.on('onPause', () => {
  UI.btnPause.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    Retomar`;
});

Timer.on('onResume', () => {
  UI.btnPause.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    Pausar`;
});

Timer.on('onStop', () => {
  UI.ringContainer.classList.remove('ring-pulsing');
  updateRing(0);
  UI.ringPercent.textContent   = '0%';
  UI.ringElapsed.textContent   = '00:00:00';
  UI.ringLabel.textContent     = 'Iniciar jejum';
  UI.ringFinish.textContent    = '';
  UI.ringStateIcon.textContent = '🌙';
  UI.phaseIcon.textContent     = '🌱';
  UI.phaseTitle.textContent    = 'Pronto para começar';
  UI.phaseDesc.textContent     = 'Escolhe o protocolo e inicia o teu jejum.';
  setIdleUI();
});

// ── UI STATES ─────────────────────────────────
function setActiveUI() {
  UI.btnStart.classList.add('hidden');
  UI.activeControls.classList.remove('hidden');
  UI.protocolBar.style.opacity = '.4';
  UI.protocolBar.style.pointerEvents = 'none';
}

function setIdleUI() {
  UI.btnStart.classList.remove('hidden');
  UI.activeControls.classList.add('hidden');
  UI.protocolBar.style.opacity = '';
  UI.protocolBar.style.pointerEvents = '';
  UI.btnPause.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    Pausar`;
}

// ── PROTOCOL SELECTION ────────────────────────
function initProtocolBar() {
  UI.protocolBar.querySelectorAll('.proto-chip:not(.proto-custom)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (Timer.isRunning()) return;
      UI.protocolBar.querySelectorAll('.proto-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      App.selectedProto = {
        hours: parseInt(btn.dataset.hours, 10),
        label: btn.dataset.label,
      };
    });
  });

  $('btnCustomProto').addEventListener('click', () => {
    openSettings();
    UI.customHours.focus();
  });
}

async function loadCustomProtocols() {
  const protos = await Storage.getAllProtocols();
  protos.forEach(p => addProtoChip(p.hours, p.label));
}

function addProtoChip(hours, label) {
  const existing = UI.protocolBar.querySelector(`.proto-chip[data-label="${label}"]`);
  if (existing) return;
  const btn = document.createElement('button');
  btn.className = 'proto-chip';
  btn.dataset.hours = hours;
  btn.dataset.label = label;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    if (Timer.isRunning()) return;
    UI.protocolBar.querySelectorAll('.proto-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    App.selectedProto = { hours, label };
  });
  // Inserir antes do botão custom
  UI.protocolBar.insertBefore(btn, $('btnCustomProto'));
}

// ── TIMER CONTROLS ────────────────────────────
UI.btnStart.addEventListener('click', () => {
  Timer.start(App.selectedProto.hours, App.selectedProto.label);
  UI.quoteText.textContent = Timer.getRandomQuote();
  setActiveUI();
});

UI.btnPause.addEventListener('click', () => {
  if (Timer.isPaused()) Timer.resume();
  else Timer.pause();
});

UI.btnStop.addEventListener('click', async () => {
  if (!Timer.isRunning()) return;
  const session = Timer.stop();
  if (!session) return;

  await Storage.saveSession(session);
  App.sessions = await Storage.getAllSessions();

  const stats = Stats.compute(App.sessions);
  const newlyUnlocked = await Stats.checkAchievements(App.sessions, stats);
  newlyUnlocked.forEach(a => {
    setTimeout(() => showToast(`🏅 Conquista desbloqueada: ${a.name}!`, 4000), 800);
  });

  showToast(`Jejum guardado: ${session.durationHours}h`, 3000);

  // Interstitial após terminar jejum
  setTimeout(() => Ads.showInterstitial(), 2000);
});

// ── HISTORY ───────────────────────────────────
async function renderHistory() {
  App.sessions = await Storage.getAllSessions();
  Stats.renderHistory(App.sessions, UI.historyList);
}

UI.btnExportHistory.addEventListener('click', async () => {
  App.sessions = await Storage.getAllSessions();
  if (!App.sessions.length) { showToast('Nenhum registo para exportar.'); return; }
  Stats.exportHistory(App.sessions);
  showToast('CSV exportado com sucesso!');
});

UI.btnClearHistory.addEventListener('click', async () => {
  if (!confirm('Apagar todo o histórico? Esta ação não pode ser desfeita.')) return;
  await Storage.clearSessions();
  App.sessions = [];
  renderHistory();
  showToast('Histórico apagado.');
});

// ── STATS ─────────────────────────────────────
async function renderStats() {
  App.sessions = await Storage.getAllSessions();
  const stats  = Stats.compute(App.sessions);
  const week   = Stats.weekData(App.sessions);
  Stats.renderStats(stats, week);
}

// ── SETTINGS PANEL ────────────────────────────
function openSettings() {
  UI.settingsPanel.classList.remove('hidden');
  requestAnimationFrame(() => UI.settingsPanel.classList.add('open'));
  UI.overlay.classList.remove('hidden');
}

function closeSettings() {
  UI.settingsPanel.classList.remove('open');
  UI.overlay.classList.add('hidden');
  setTimeout(() => UI.settingsPanel.classList.add('hidden'), 300);
}

UI.btnSettings.addEventListener('click', openSettings);
UI.btnCloseSettings.addEventListener('click', closeSettings);
UI.overlay.addEventListener('click', closeSettings);

UI.btnTheme.addEventListener('click', () => {
  applyTheme(App.theme === 'dark' ? 'light' : 'dark');
  showToast(App.theme === 'dark' ? '🌙 Tema escuro' : '☀️ Tema claro');
});

document.querySelectorAll('.theme-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
  });
});

UI.btnNotifToggle.addEventListener('click', async () => {
  const granted = await Notifications.requestPermission();
  UI.btnNotifToggle.dataset.active = granted ? 'true' : 'false';
  UI.btnNotifToggle.textContent = granted ? 'Ativado ✓' : 'Ativar';
  showToast(granted ? 'Notificações ativadas!' : 'Permissão negada.');
  Storage.setSetting('notifications', granted);
});

UI.btnSaveCustom.addEventListener('click', async () => {
  const h = parseInt(UI.customHours.value, 10);
  const label = UI.customName.value.trim() || `${h}:${24 - h}`;
  if (!h || h < 1 || h > 23) { showToast('Horas inválidas (1–23).'); return; }
  const proto = { hours: h, label };
  await Storage.saveProtocol(proto);
  addProtoChip(h, label);
  UI.customHours.value = '';
  UI.customName.value  = '';
  showToast(`Protocolo "${label}" guardado!`);
  closeSettings();
});

UI.btnResetAll.addEventListener('click', async () => {
  if (!confirm('Apagar TODOS os dados? Histórico, conquistas e definições serão perdidos.')) return;
  await Storage.resetAll();
  App.sessions = [];
  location.reload();
});

// ── ADS SAFE WRAPPER ─────────────────────────
// Guard para o caso de adsManager.js não ter carregado
const Ads = {
  init:             () => typeof AdsManager !== 'undefined' && AdsManager.init(),
  showBanner:       () => typeof AdsManager !== 'undefined' && AdsManager.showBanner(),
  hideBanner:       () => typeof AdsManager !== 'undefined' && AdsManager.hideBanner(),
  showInterstitial: () => typeof AdsManager !== 'undefined' && AdsManager.showInterstitial(),
  showRewarded:     (t) => typeof AdsManager !== 'undefined' ? AdsManager.showRewarded(t) : Promise.resolve(false),
};

// ── BOOT ──────────────────────────────────────
async function boot() {
  await Storage.init();

  // Restaurar tema
  const savedTheme = await Storage.getSetting('theme', 'dark');
  applyTheme(savedTheme);

  // Restaurar sessão ativa (se app foi fechada com jejum em curso)
  const hasActive = Timer.restore();
  if (hasActive) {
    setActiveUI();
    UI.quoteText.textContent = Timer.getRandomQuote();
    showToast('Jejum retomado!');
    Timer.resume();
  }

  // Carregar sessões
  App.sessions = await Storage.getAllSessions();

  // Protocolos personalizados
  await loadCustomProtocols();

  // Notificações — verificar estado guardado
  const notifSaved = await Storage.getSetting('notifications', false);
  if (notifSaved && Notifications.isGranted()) {
    UI.btnNotifToggle.dataset.active = 'true';
    UI.btnNotifToggle.textContent = 'Ativado ✓';
  }

  // AdMob init (estrutura)
  Ads.init();

  // Splash → app
  setTimeout(() => {
    UI.splash.classList.add('hide');
    UI.app.classList.remove('hidden');
    setTimeout(() => UI.splash.style.display = 'none', 600);
  }, 1200);
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initProtocolBar();

  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('[SW] Registado'))
      .catch(err => console.warn('[SW] Erro:', err));
  }

  boot();
});
