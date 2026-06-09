/**
 * timer.js — Jejum Fácil
 * Cronómetro principal do jejum.
 * Persiste estado no localStorage para sobreviver ao fecho do browser.
 */

const Timer = (() => {
  // ── ESTADO ────────────────────────────────────
  let state = {
    active:      false,
    paused:      false,
    startTime:   null,   // timestamp absoluto de início
    pausedAt:    null,   // timestamp de quando foi pausado
    totalPaused: 0,      // ms totais de pausa acumulada
    targetHours: 16,
    protocol:    '16:8',
  };

  let _tickInterval = null;
  let _callbacks     = {};

  // ── FASES DO JEJUM ────────────────────────────
  const PHASES = [
    {
      from: 0,  to: 4,
      icon: '🌙', title: 'Digestão em curso',
      desc: 'O teu corpo está a processar a última refeição. Os níveis de insulina vão começar a baixar.',
    },
    {
      from: 4,  to: 8,
      icon: '🌿', title: 'Glicose em queda',
      desc: 'A glicose no sangue reduz gradualmente. O fígado começa a usar as suas reservas de glicogénio.',
    },
    {
      from: 8,  to: 12,
      icon: '⚡', title: 'Reservas a esgotar',
      desc: 'As reservas de glicogénio estão quase esgotadas. O corpo prepara-se para usar gordura.',
    },
    {
      from: 12, to: 16,
      icon: '🔥', title: 'Queima de gordura ativa',
      desc: 'Cetose ligeira em curso. O teu corpo está agora a usar gordura armazenada como combustível!',
    },
    {
      from: 16, to: 20,
      icon: '🚀', title: 'Jejum avançado',
      desc: 'Autofagia em progresso — as células limpam proteínas danificadas. Estado metabólico ótimo.',
    },
    {
      from: 20, to: 999,
      icon: '🏆', title: 'Modo élite',
      desc: 'Jejum profundo. Níveis elevados de hormona do crescimento. Renovação celular acelerada.',
    },
  ];

  // ── FRASES MOTIVACIONAIS ──────────────────────
  const QUOTES = [
    '"O corpo cura-se quando a mente acredita que consegue."',
    '"Cada hora de jejum é um passo em direção à melhor versão de ti."',
    '"A disciplina é a ponte entre os objetivos e as conquistas."',
    '"O desconforto de hoje é a força de amanhã."',
    '"Jejuar não é privar-se — é dar ao corpo o descanso que merece."',
    '"A saúde não é um destino, é uma viagem diária."',
    '"Pequenos passos consistentes levam a grandes transformações."',
    '"O teu futuro é criado pelas escolhas de hoje."',
  ];

  // ── HELPERS ───────────────────────────────────
  function elapsedMs() {
    if (!state.active) return 0;
    const now = Date.now();
    if (state.paused) {
      return (state.pausedAt - state.startTime) - state.totalPaused;
    }
    return (now - state.startTime) - state.totalPaused;
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [
      String(h).padStart(2, '0'),
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0'),
    ].join(':');
  }

  function getPhase(elapsedHours) {
    return PHASES.find(p => elapsedHours >= p.from && elapsedHours < p.to) || PHASES[PHASES.length - 1];
  }

  function getStateIcon(pct) {
    if (pct >= 100) return '🏆';
    if (pct >= 75)  return '🔵';
    if (pct >= 50)  return '🟡';
    if (pct >= 25)  return '🟢';
    return '🌙';
  }

  function getRandomQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  // ── PERSISTÊNCIA ─────────────────────────────
  function persist() {
    Storage.saveActiveFast({ ...state });
  }

  function restore() {
    const saved = Storage.loadActiveFast();
    if (saved && saved.active) {
      state = { ...state, ...saved };
      // Se estava em pausa não contar tempo extra
      return true;
    }
    return false;
  }

  // ── TICK ─────────────────────────────────────
  function tick() {
    const ms = elapsedMs();
    const targetMs = state.targetHours * 3600 * 1000;
    const pct = Math.min(100, (ms / targetMs) * 100);
    const elapsedHours = ms / 3600000;
    const remaining = Math.max(0, targetMs - ms);

    const phase = getPhase(elapsedHours);
    const icon  = getStateIcon(pct);

    // Hora estimada de fim
    const finishTs = state.startTime + state.totalPaused + targetMs;
    const finishDate = new Date(finishTs);
    const finishStr = finishDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    if (_callbacks.onTick) {
      _callbacks.onTick({
        ms, pct, remaining,
        elapsed: formatTime(ms),
        remainingStr: formatTime(remaining),
        phase, icon, finishStr,
        done: pct >= 100,
      });
    }

    // Notificações automáticas
    if (pct >= 50 && pct < 50.1) Notifications.triggerMidpoint();
    if (pct >= 100 && pct < 100.1) {
      if (_callbacks.onComplete) _callbacks.onComplete();
    }
  }

  // ── API PÚBLICA ───────────────────────────────
  function start(targetHours, protocol) {
    state.active      = true;
    state.paused      = false;
    state.startTime   = Date.now();
    state.pausedAt    = null;
    state.totalPaused = 0;
    state.targetHours = targetHours || 16;
    state.protocol    = protocol || '16:8';
    persist();
    Notifications.triggerStart(state.protocol);
    _startTick();
  }

  function pause() {
    if (!state.active || state.paused) return;
    state.paused   = true;
    state.pausedAt = Date.now();
    persist();
    _stopTick();
    if (_callbacks.onPause) _callbacks.onPause();
  }

  function resume() {
    if (!state.active || !state.paused) return;
    state.totalPaused += (Date.now() - state.pausedAt);
    state.pausedAt    = null;
    state.paused      = false;
    persist();
    _startTick();
    if (_callbacks.onResume) _callbacks.onResume();
  }

  function stop() {
    if (!state.active) return null;
    if (state.paused) {
      // Não conta tempo extra de pausa no fim
      state.totalPaused += (Date.now() - state.pausedAt);
    }
    const ms = elapsedMs();
    const session = {
      startTime:    state.startTime,
      endTime:      Date.now(),
      durationMs:   ms,
      durationHours: parseFloat((ms / 3600000).toFixed(2)),
      protocol:     state.protocol,
      targetHours:  state.targetHours,
      date:         new Date().toLocaleDateString('pt-PT'),
      completed:    ms >= state.targetHours * 3600000 * 0.9, // 90%+ = concluído
    };
    _reset();
    return session;
  }

  function _reset() {
    state = {
      active: false, paused: false,
      startTime: null, pausedAt: null, totalPaused: 0,
      targetHours: state.targetHours, protocol: state.protocol,
    };
    Storage.clearActiveFast();
    _stopTick();
    if (_callbacks.onStop) _callbacks.onStop();
  }

  function _startTick() {
    _stopTick();
    tick(); // imediato
    _tickInterval = setInterval(tick, 1000);
  }

  function _stopTick() {
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
  }

  function isActive()  { return state.active && !state.paused; }
  function isPaused()  { return state.active && state.paused; }
  function isRunning() { return state.active; }
  function getState()  { return { ...state }; }

  function on(event, cb) { _callbacks[event] = cb; }

  return {
    start, pause, resume, stop,
    restore, persist,
    isActive, isPaused, isRunning, getState,
    getRandomQuote, getPhase,
    formatTime,
    on,
  };
})();
