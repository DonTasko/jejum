/**
 * storage.js — Jejum Fácil
 * Camada de persistência usando IndexedDB.
 * Todas as operações são async/Promise-based.
 */

const Storage = (() => {
  const DB_NAME    = 'jejumfacil_db';
  const DB_VERSION = 1;
  let db = null;

  // ── STORES ───────────────────────────────────
  const STORES = {
    SESSIONS:     'sessions',      // histórico de jejuns
    SETTINGS:     'settings',      // configurações do utilizador
    ACHIEVEMENTS: 'achievements',  // conquistas desbloqueadas
    STATS:        'stats_cache',   // cache de estatísticas
    PROTOCOLS:    'protocols',     // protocolos personalizados
  };

  // ── INIT ─────────────────────────────────────
  function init() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        // Sessions store
        if (!d.objectStoreNames.contains(STORES.SESSIONS)) {
          const ss = d.createObjectStore(STORES.SESSIONS, { keyPath: 'id', autoIncrement: true });
          ss.createIndex('startTime', 'startTime', { unique: false });
          ss.createIndex('date', 'date', { unique: false });
        }
        // Settings store (key/value)
        if (!d.objectStoreNames.contains(STORES.SETTINGS)) {
          d.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
        // Achievements store
        if (!d.objectStoreNames.contains(STORES.ACHIEVEMENTS)) {
          d.createObjectStore(STORES.ACHIEVEMENTS, { keyPath: 'id' });
        }
        // Stats cache
        if (!d.objectStoreNames.contains(STORES.STATS)) {
          d.createObjectStore(STORES.STATS, { keyPath: 'key' });
        }
        // Custom protocols
        if (!d.objectStoreNames.contains(STORES.PROTOCOLS)) {
          d.createObjectStore(STORES.PROTOCOLS, { keyPath: 'id', autoIncrement: true });
        }
      };

      req.onsuccess  = (e) => { db = e.target.result; resolve(db); };
      req.onerror    = (e) => reject(e.target.error);
    });
  }

  // ── GENERIC HELPERS ───────────────────────────
  function tx(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function promisify(req) {
    return new Promise((res, rej) => {
      req.onsuccess = (e) => res(e.target.result);
      req.onerror   = (e) => rej(e.target.error);
    });
  }

  // ── SESSIONS ─────────────────────────────────
  async function saveSession(session) {
    await init();
    return promisify(tx(STORES.SESSIONS, 'readwrite').add(session));
  }

  async function getAllSessions() {
    await init();
    return promisify(tx(STORES.SESSIONS).getAll());
  }

  async function deleteSession(id) {
    await init();
    return promisify(tx(STORES.SESSIONS, 'readwrite').delete(id));
  }

  async function clearSessions() {
    await init();
    return promisify(tx(STORES.SESSIONS, 'readwrite').clear());
  }

  // ── SETTINGS (key/value) ──────────────────────
  async function setSetting(key, value) {
    await init();
    return promisify(tx(STORES.SETTINGS, 'readwrite').put({ key, value }));
  }

  async function getSetting(key, fallback = null) {
    await init();
    const result = await promisify(tx(STORES.SETTINGS).get(key));
    return result ? result.value : fallback;
  }

  async function getAllSettings() {
    await init();
    const rows = await promisify(tx(STORES.SETTINGS).getAll());
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  // ── ACHIEVEMENTS ─────────────────────────────
  async function setAchievement(id, data) {
    await init();
    return promisify(tx(STORES.ACHIEVEMENTS, 'readwrite').put({ id, ...data }));
  }

  async function getAllAchievements() {
    await init();
    return promisify(tx(STORES.ACHIEVEMENTS).getAll());
  }

  // ── CUSTOM PROTOCOLS ─────────────────────────
  async function saveProtocol(proto) {
    await init();
    return promisify(tx(STORES.PROTOCOLS, 'readwrite').add(proto));
  }

  async function getAllProtocols() {
    await init();
    return promisify(tx(STORES.PROTOCOLS).getAll());
  }

  // ── RESET ALL ─────────────────────────────────
  async function resetAll() {
    await init();
    const storeNames = Object.values(STORES);
    return new Promise((res, rej) => {
      const t = db.transaction(storeNames, 'readwrite');
      storeNames.forEach(name => t.objectStore(name).clear());
      t.oncomplete = () => res();
      t.onerror    = (e) => rej(e.target.error);
    });
  }

  // ── ACTIVE FAST (localStorage for real-time state) ─
  const LS = {
    ACTIVE: 'jf_active_fast',
  };

  function saveActiveFast(state) {
    try { localStorage.setItem(LS.ACTIVE, JSON.stringify(state)); } catch (_) {}
  }

  function loadActiveFast() {
    try {
      const raw = localStorage.getItem(LS.ACTIVE);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function clearActiveFast() {
    try { localStorage.removeItem(LS.ACTIVE); } catch (_) {}
  }

  // ── PUBLIC API ────────────────────────────────
  return {
    init,
    // Sessions
    saveSession, getAllSessions, deleteSession, clearSessions,
    // Settings
    setSetting, getSetting, getAllSettings,
    // Achievements
    setAchievement, getAllAchievements,
    // Protocols
    saveProtocol, getAllProtocols,
    // Reset
    resetAll,
    // Active fast state
    saveActiveFast, loadActiveFast, clearActiveFast,
  };
})();
