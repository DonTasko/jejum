/**
 * stats.js — Jejum Fácil
 * Cálculo de estatísticas, histórico e sistema de conquistas.
 */

const Stats = (() => {

  // ── DEFINIÇÃO DE CONQUISTAS ───────────────────
  const ACHIEVEMENT_DEFS = [
    {
      id: 'first_fast',
      medal: '🥉', name: 'Primeiro Jejum',
      desc: 'Completaste o teu primeiro jejum!',
      check: (sessions) => sessions.length >= 1,
    },
    {
      id: 'three_fasts',
      medal: '🥈', name: 'Triplo',
      desc: 'Três jejuns concluídos.',
      check: (sessions) => sessions.filter(s => s.completed).length >= 3,
    },
    {
      id: 'seven_fasts',
      medal: '🥇', name: '7 Jejuns',
      desc: 'Sete jejuns no histórico.',
      check: (sessions) => sessions.filter(s => s.completed).length >= 7,
    },
    {
      id: 'thirty_fasts',
      medal: '🏅', name: '30 Jejuns',
      desc: 'Dedicação total — 30 jejuns!',
      check: (sessions) => sessions.filter(s => s.completed).length >= 30,
    },
    {
      id: 'ten_hours',
      medal: '⏱️', name: '10 Horas',
      desc: 'Totalizaste 10 horas de jejum.',
      check: (sessions, stats) => stats.totalHours >= 10,
    },
    {
      id: 'fifty_hours',
      medal: '⚡', name: '50 Horas',
      desc: '50 horas totais de jejum!',
      check: (sessions, stats) => stats.totalHours >= 50,
    },
    {
      id: 'hundred_hours',
      medal: '🏆', name: '100 Horas',
      desc: 'Lendário — 100 horas de jejum!',
      check: (sessions, stats) => stats.totalHours >= 100,
    },
    {
      id: 'streak_3',
      medal: '🔥', name: '3 Dias Seguidos',
      desc: '3 dias consecutivos a jejuar.',
      check: (sessions, stats) => stats.streak >= 3,
    },
    {
      id: 'streak_7',
      medal: '🌟', name: '7 Dias Seguidos',
      desc: 'Uma semana inteira de jejum!',
      check: (sessions, stats) => stats.streak >= 7,
    },
    {
      id: 'streak_30',
      medal: '👑', name: '30 Dias Seguidos',
      desc: 'Um mês de consistência incrível!',
      check: (sessions, stats) => stats.streak >= 30,
    },
    {
      id: 'long_fast',
      medal: '🚀', name: 'Jejum Longo',
      desc: 'Completaste um jejum de 20+ horas.',
      check: (sessions) => sessions.some(s => s.durationHours >= 20),
    },
    {
      id: 'omad',
      medal: '💎', name: 'OMAD Master',
      desc: 'Completaste um jejum OMAD (23h+).',
      check: (sessions) => sessions.some(s => s.durationHours >= 23),
    },
  ];

  // ── CÁLCULO DE ESTATÍSTICAS ───────────────────
  function compute(sessions) {
    if (!sessions || sessions.length === 0) {
      return { total: 0, totalHours: 0, avgHours: 0, bestHours: 0, streak: 0 };
    }

    const completed = sessions.filter(s => s.completed);
    const totalHours = parseFloat(
      sessions.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(1)
    );
    const avgHours = completed.length
      ? parseFloat((completed.reduce((sum, s) => sum + (s.durationHours || 0), 0) / completed.length).toFixed(1))
      : 0;
    const bestHours = parseFloat(
      Math.max(...sessions.map(s => s.durationHours || 0)).toFixed(1)
    );
    const streak = computeStreak(sessions);

    return { total: sessions.length, totalHours, avgHours, bestHours, streak };
  }

  function computeStreak(sessions) {
    if (!sessions.length) return 0;
    // Extrair datas únicas com jejum
    const dates = [...new Set(
      sessions.map(s => s.date).filter(Boolean)
    )].sort((a, b) => {
      return parsePTDate(b) - parsePTDate(a); // mais recente primeiro
    });

    if (!dates.length) return 0;

    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const d1 = parsePTDate(dates[i]);
      const d2 = parsePTDate(dates[i + 1]);
      const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) { streak++; }
      else { break; }
    }
    return streak;
  }

  function parsePTDate(str) {
    // formato DD/MM/YYYY
    if (!str) return 0;
    const parts = str.split('/');
    if (parts.length !== 3) return 0;
    return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
  }

  // ── DADOS DA ÚLTIMA SEMANA ────────────────────
  function weekData(sessions) {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-PT', { weekday: 'short' }).slice(0, 3);
      const dateStr = d.toLocaleDateString('pt-PT');
      const daySessions = sessions.filter(s => s.date === dateStr);
      const hours = parseFloat(
        daySessions.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(1)
      );
      days.push({ label, hours, dateStr });
    }
    return days;
  }

  // ── VERIFICAR E DESBLOQUEAR CONQUISTAS ────────
  async function checkAchievements(sessions, stats) {
    const unlocked = await Storage.getAllAchievements();
    const unlockedIds = new Set(unlocked.map(a => a.id));
    const newlyUnlocked = [];

    for (const def of ACHIEVEMENT_DEFS) {
      if (unlockedIds.has(def.id)) continue;
      if (def.check(sessions, stats)) {
        await Storage.setAchievement(def.id, {
          unlockedAt: Date.now(),
          date: new Date().toLocaleDateString('pt-PT'),
        });
        newlyUnlocked.push(def);
      }
    }
    return newlyUnlocked;
  }

  // ── RENDER HISTÓRICO ──────────────────────────
  function renderHistory(sessions, container) {
    if (!sessions || !sessions.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="var(--muted)" stroke-width="2"/>
            <path d="M32 20v12l8 4" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>Nenhum jejum registado ainda.</p>
          <span>Começa o teu primeiro jejum!</span>
        </div>`;
      return;
    }

    const sorted = [...sessions].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    container.innerHTML = sorted.map(s => {
      const h = Math.floor(s.durationHours);
      const m = Math.round((s.durationHours - h) * 60);
      const icon = s.completed ? '✅' : '⏹️';
      const start = s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      const end   = s.endTime   ? new Date(s.endTime).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
      return `
        <div class="history-item" data-id="${s.id}">
          <div class="history-icon">${icon}</div>
          <div class="history-info">
            <div class="history-duration">${h}h ${m}min</div>
            <div class="history-meta">${s.date || ''} · ${start} → ${end}</div>
          </div>
          <div class="history-badge">${s.protocol || '–'}</div>
        </div>`;
    }).join('');
  }

  // ── RENDER STATS ──────────────────────────────
  function renderStats(stats, weekArr) {
    const el = (id) => document.getElementById(id);
    if (el('statTotal'))  el('statTotal').textContent  = stats.total;
    if (el('statHours'))  el('statHours').textContent  = stats.totalHours + 'h';
    if (el('statAvg'))    el('statAvg').textContent    = stats.avgHours + 'h';
    if (el('statBest'))   el('statBest').textContent   = stats.bestHours + 'h';
    if (el('statStreak')) el('statStreak').textContent = stats.streak;

    // Bar chart
    const chart = el('weekChart');
    if (chart && weekArr) {
      const maxH = Math.max(...weekArr.map(d => d.hours), 1);
      chart.innerHTML = weekArr.map(d => {
        const pct = Math.round((d.hours / maxH) * 100);
        return `
          <div class="bar-col">
            <div class="bar-fill ${d.hours === 0 ? 'empty' : ''}" style="height:${pct}%"></div>
            <div class="bar-day">${d.label}</div>
          </div>`;
      }).join('');
    }
  }

  // ── RENDER ACHIEVEMENTS ───────────────────────
  async function renderAchievements(container) {
    const unlocked = await Storage.getAllAchievements();
    const unlockedIds = new Set(unlocked.map(a => a.id));

    container.innerHTML = ACHIEVEMENT_DEFS.map(def => {
      const isUnlocked = unlockedIds.has(def.id);
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="ach-medal">${def.medal}</div>
          <div class="ach-name">${def.name}</div>
          <div class="ach-desc">${def.desc}</div>
          ${isUnlocked ? '<div class="ach-badge">Desbloqueado</div>' : ''}
        </div>`;
    }).join('');
  }

  // ── EXPORTAR HISTÓRICO ────────────────────────
  function exportHistory(sessions) {
    if (!sessions.length) return;
    const rows = [
      ['Data', 'Início', 'Fim', 'Duração (h)', 'Protocolo', 'Concluído'].join(','),
      ...sessions.map(s => [
        s.date || '',
        s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-PT') : '',
        s.endTime   ? new Date(s.endTime).toLocaleTimeString('pt-PT') : '',
        s.durationHours || 0,
        s.protocol || '',
        s.completed ? 'Sim' : 'Não',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `jejum-facil-historico-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    compute, weekData,
    checkAchievements,
    renderHistory, renderStats, renderAchievements,
    exportHistory,
    ACHIEVEMENT_DEFS,
  };
})();
