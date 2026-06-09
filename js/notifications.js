/**
 * notifications.js — Jejum Fácil
 * Notificações do browser para eventos do jejum.
 */

const Notifications = (() => {
  let _permitted = false;
  let _midpointFired = false;
  let _completeFired = false;

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    try {
      const result = await Notification.requestPermission();
      _permitted = result === 'granted';
      return _permitted;
    } catch (_) { return false; }
  }

  function isGranted() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  function send(title, body, icon = 'assets/icons/icon-192.png') {
    if (!isGranted()) return;
    try {
      new Notification(title, { body, icon, badge: icon, silent: false });
    } catch (_) {}
  }

  function triggerStart(protocol) {
    _midpointFired = false;
    _completeFired = false;
    send('Jejum iniciado! 🌙', `Protocolo ${protocol} em curso. Boa sorte!`);
  }

  function triggerMidpoint() {
    if (_midpointFired) return;
    _midpointFired = true;
    send('Metade do caminho! 🟡', 'Já passaste da metade do jejum. Continua assim!');
  }

  function triggerComplete() {
    if (_completeFired) return;
    _completeFired = true;
    send('Jejum concluído! 🏆', 'Parabéns! Atingiste o teu objetivo de jejum.');
  }

  function reset() {
    _midpointFired = false;
    _completeFired = false;
  }

  return { requestPermission, isGranted, send, triggerStart, triggerMidpoint, triggerComplete, reset };
})();
