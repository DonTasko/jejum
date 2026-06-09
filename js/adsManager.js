/**
 * adsManager.js — Jejum Fácil
 * ============================================================
 * Estrutura preparada para Google AdMob via Capacitor.
 * 
 * INTEGRAÇÃO FUTURA:
 *   1. Instalar: npm install @capacitor-community/admob
 *   2. Configurar IDs reais no objeto CONFIG abaixo
 *   3. Descomentar as chamadas à API AdMob
 *   4. Seguir guia: https://github.com/capacitor-community/admob
 * 
 * REGRAS DE ANÚNCIOS (nunca alterar):
 *   - Banner:       Dashboard / Histórico / Estatísticas APENAS
 *   - Interstitial: Após terminar jejum ou ver estatísticas (máx 1/4h)
 *   - Rewarded:     Para desbloquear temas premium / exportação avançada
 *   - NUNCA mostrar durante o cronómetro ativo
 * ============================================================
 */

const AdsManager = (() => {

  // ── CONFIGURAÇÃO (substituir pelos IDs reais) ──────────────
  const CONFIG = {
    // IDs de teste AdMob (seguros para desenvolvimento)
    banner:       'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded:     'ca-app-pub-3940256099942544/5224354917',

    // Limite de tempo entre interstitials (ms)
    interstitialCooldown: 4 * 60 * 60 * 1000, // 4 horas
  };

  // ── ESTADO INTERNO ─────────────────────────────────────────
  let _lastInterstitialTime = 0;
  let _bannerVisible = false;
  let _initialized   = false;

  // ── INIT ───────────────────────────────────────────────────
  /**
   * Inicializar AdMob via Capacitor.
   * Chamar uma vez no arranque da app após Capacitor.initialize().
   */
  async function init() {
    if (_initialized) return;
    try {
      /* DESCOMENTAR para produção:
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({
        testingDevices: ['DEVICE_ID_AQUI'],
        initializeForTesting: true, // remover em produção
      });
      */
      _initialized = true;
      console.log('[AdsManager] Inicializado (modo estrutura)');
    } catch (err) {
      console.warn('[AdsManager] Falha na inicialização:', err);
    }
  }

  // ── BANNER ADS ─────────────────────────────────────────────
  /**
   * Mostrar banner no fundo do ecrã.
   * Usar APENAS nas tabs: Histórico, Estatísticas, Dashboard.
   */
  async function showBanner() {
    if (_bannerVisible) return;
    try {
      /* DESCOMENTAR para produção:
      const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      await AdMob.showBanner({
        adId: CONFIG.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true, // remover em produção
      });
      */
      _bannerVisible = true;
      console.log('[AdsManager] Banner mostrado');
    } catch (err) {
      console.warn('[AdsManager] Erro ao mostrar banner:', err);
    }
  }

  /**
   * Esconder banner.
   * Chamar SEMPRE ao entrar no cronómetro ativo.
   */
  async function hideBanner() {
    if (!_bannerVisible) return;
    try {
      /* DESCOMENTAR para produção:
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.hideBanner();
      */
      _bannerVisible = false;
      console.log('[AdsManager] Banner escondido');
    } catch (err) {
      console.warn('[AdsManager] Erro ao esconder banner:', err);
    }
  }

  // ── INTERSTITIAL ADS ───────────────────────────────────────
  /**
   * Mostrar anúncio interstitial (ecrã completo).
   * Respeita cooldown de 4 horas automaticamente.
   * 
   * Usar APENAS em:
   *   - Após terminar um jejum
   *   - Após visualizar estatísticas (com intervalo)
   */
  async function showInterstitial() {
    const now = Date.now();
    if (now - _lastInterstitialTime < CONFIG.interstitialCooldown) {
      const remaining = Math.ceil((CONFIG.interstitialCooldown - (now - _lastInterstitialTime)) / 60000);
      console.log(`[AdsManager] Interstitial em cooldown (${remaining} min restantes)`);
      return false;
    }

    try {
      /* DESCOMENTAR para produção:
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({
        adId: CONFIG.interstitial,
        isTesting: true, // remover em produção
      });
      await AdMob.showInterstitial();
      */
      _lastInterstitialTime = now;
      console.log('[AdsManager] Interstitial mostrado');
      return true;
    } catch (err) {
      console.warn('[AdsManager] Erro ao mostrar interstitial:', err);
      return false;
    }
  }

  // ── REWARDED ADS ───────────────────────────────────────────
  /**
   * Mostrar anúncio recompensado.
   * Retorna true se o utilizador completou o anúncio (recebe recompensa).
   * 
   * Recompensas disponíveis:
   *   - 'theme_premium'    → Desbloquear temas premium
   *   - 'export_advanced'  → Exportação avançada (PDF)
   *   - 'stats_advanced'   → Estatísticas detalhadas
   */
  async function showRewarded(rewardType = 'generic') {
    return new Promise(async (resolve) => {
      try {
        /* DESCOMENTAR para produção:
        const { AdMob } = await import('@capacitor-community/admob');
        
        await AdMob.prepareRewardVideoAd({
          adId: CONFIG.rewarded,
          isTesting: true, // remover em produção
        });
        
        // Listener para saber se o utilizador recebeu a recompensa
        AdMob.addListener('onRewarded', (reward) => {
          console.log('[AdsManager] Recompensa recebida:', reward, 'Tipo:', rewardType);
          resolve(true);
        });
        
        AdMob.addListener('onRewardedVideoAdClosed', () => {
          resolve(false);
        });
        
        await AdMob.showRewardVideoAd();
        */
        console.log(`[AdsManager] Rewarded solicitado para: ${rewardType}`);
        resolve(false); // Estrutura — sem anúncio real
      } catch (err) {
        console.warn('[AdsManager] Erro ao mostrar rewarded:', err);
        resolve(false);
      }
    });
  }

  // ── HELPERS ────────────────────────────────────────────────
  function isInitialized() { return _initialized; }
  function isBannerVisible() { return _bannerVisible; }

  return {
    init, showBanner, hideBanner,
    showInterstitial, showRewarded,
    isInitialized, isBannerVisible,
  };
})();
