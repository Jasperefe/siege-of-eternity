// One adapter for Poki, CrazyGames, YouTube Playables, Playhop (Yandex Games) and plain web.
// The build script sets window.SOE_PLATFORM and injects the matching SDK <script> in index.html.
// Every SDK call is wrapped so a failing or blocked SDK can never break the game (all platforms require this).

const P = {
  name: 'local',
  ready: false,
  muted: false,          // platform-forced mute (YouTube mute button / CrazyGames muteAudio)
  adblock: false,        // CrazyGames: never penalise, just hide rewarded buttons
  lang: 'en',
  inGameplay: false,
  _adActive: false,
  _audioCbs: [], _pauseCbs: [], _resumeCbs: [],
  cg: null, ysdk: null, yplayer: null,
};

function safe(fn, fallback) { try { return fn(); } catch (e) { console.warn('[platform]', e); return fallback; } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function detect() {
  const want = (window.SOE_PLATFORM || '').toLowerCase();
  if (want === 'youtube' && window.ytgame && window.ytgame.IN_PLAYABLES_ENV) return 'youtube';
  if (want === 'crazygames' && window.CrazyGames && window.CrazyGames.SDK) return 'crazygames';
  if (want === 'poki' && typeof window.PokiSDK !== 'undefined') return 'poki';
  if (want === 'playhop' && typeof window.YaGames !== 'undefined') return 'playhop';
  return 'local';
}

P.init = async function () {
  P.name = detect();
  // Stop arrow keys / space / wheel from scrolling the host page (Poki, Playhop requirement)
  window.addEventListener('keydown', (ev) => {
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(ev.key)) ev.preventDefault();
  });
  window.addEventListener('wheel', (ev) => ev.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', (ev) => ev.preventDefault());

  if (P.name === 'poki') {
    try { await window.PokiSDK.init(); } catch (e) { console.warn('Poki init failed, continuing', e); }
  } else if (P.name === 'crazygames') {
    try {
      await window.CrazyGames.SDK.init();
      P.cg = window.CrazyGames.SDK;
      if (P.cg.environment === 'disabled') { P.name = 'local'; P.cg = null; }
    } catch (e) { console.warn('CrazyGames init failed', e); P.name = 'local'; P.cg = null; }
    if (P.cg) {
      const apply = (s) => { P.muted = !!(s && s.muteAudio); P._audioCbs.forEach((cb) => cb(!P.muted)); };
      safe(() => apply(P.cg.game.settings));
      safe(() => P.cg.game.addSettingsChangeListener(apply));
      try { P.adblock = !!(await P.cg.ad.hasAdblock()); } catch (e) { P.adblock = false; }
    }
  } else if (P.name === 'youtube') {
    const yt = window.ytgame;
    safe(() => { P.muted = !yt.system.isAudioEnabled(); });
    safe(() => yt.system.onAudioEnabledChange((enabled) => { P.muted = !enabled; P._audioCbs.forEach((cb) => cb(enabled)); }));
    safe(() => yt.system.onPause(() => P._pauseCbs.forEach((cb) => cb('platform'))));
    safe(() => yt.system.onResume(() => P._resumeCbs.forEach((cb) => cb('platform'))));
    try { P.lang = await yt.system.getLanguage(); } catch (e) {}
    window.addEventListener('error', () => safe(() => yt.health.logError()));
  } else if (P.name === 'playhop') {
    try {
      P.ysdk = await window.YaGames.init();
      safe(() => { P.lang = P.ysdk.environment.i18n.lang; });
      safe(() => P.ysdk.on('game_api_pause', () => P._pauseCbs.forEach((cb) => cb('platform'))));
      safe(() => P.ysdk.on('game_api_resume', () => P._resumeCbs.forEach((cb) => cb('platform'))));
      try { P.yplayer = await P.ysdk.getPlayer(); } catch (e) { P.yplayer = null; } // guests are fine
    } catch (e) { console.warn('Yandex SDK init failed', e); P.name = 'local'; P.ysdk = null; }
  }
  if (P.name === 'local' || P.name === 'poki' || P.name === 'crazygames') P.lang = (navigator.language || 'en');
  P.lang = String(P.lang || 'en').slice(0, 2).toLowerCase();

  // Hidden tab: stop sound and pause the fight. (YouTube forbids the Page Visibility API: it uses onPause/onResume.)
  if (P.name !== 'youtube') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) P._pauseCbs.forEach((cb) => cb('hidden'));
      else P._resumeCbs.forEach((cb) => cb('visible'));
    });
  }
  P.ready = true;
  return P.name;
};

P.loadingStart = () => { if (P.cg) safe(() => P.cg.game.loadingStart()); };
// The loading screen has painted its first frame
P.firstFrame = () => { if (P.name === 'youtube') safe(() => window.ytgame.game.firstFrameReady()); };
// Loading finished and the main menu is interactive
P.gameReady = () => {
  if (P.name === 'poki') safe(() => window.PokiSDK.gameLoadingFinished());
  if (P.cg) safe(() => P.cg.game.loadingStop());
  if (P.name === 'youtube') safe(() => window.ytgame.game.gameReady());
  if (P.ysdk) safe(() => P.ysdk.features.LoadingAPI?.ready());
  P._readyDone = true;
};

P.gameplayStart = () => {
  if (P.inGameplay) return; P.inGameplay = true;
  if (P.name === 'poki') safe(() => window.PokiSDK.gameplayStart());
  if (P.cg) safe(() => P.cg.game.gameplayStart());
  if (P.ysdk) safe(() => P.ysdk.features.GameplayAPI?.start());
};
P.gameplayStop = () => {
  if (!P.inGameplay) return; P.inGameplay = false;
  if (P.name === 'poki') safe(() => window.PokiSDK.gameplayStop());
  if (P.cg) safe(() => P.cg.game.gameplayStop());
  if (P.ysdk) safe(() => P.ysdk.features.GameplayAPI?.stop());
};
P.happy = () => { if (P.cg) safe(() => P.cg.game.happytime()); };

// Hooks set by the game.
// onAdRequest/onAdDone: block input with a spinner from the moment an ad is requested until it is finished (CrazyGames rule).
// onAdStart/onAdEnd: mute + freeze only while the ad is actually playing.
P.onAdRequest = () => {}; P.onAdDone = () => {};
P.onAdStart = () => {}; P.onAdEnd = () => {};

// Midgame / interstitial: only at natural breaks (between waves, before a retry). The platform decides if one shows.
P.midgameAd = async function () {
  if (P._adActive || P.name === 'local') return;
  // the player just watched a rewarded ad: don't stack an interstitial right after it
  if (Date.now() - (P._lastRewarded || 0) < 90000) return;
  P._adActive = true; P.onAdRequest();
  let started = false;
  const start = () => { if (!started) { started = true; P.onAdStart(); } };
  try {
    if (P.name === 'poki') {
      await window.PokiSDK.commercialBreak(start);
    } else if (P.cg) {
      await new Promise((res) => {
        try { P.cg.ad.requestAd('midgame', { adStarted: start, adFinished: () => res(), adError: () => res() }); } catch (e) { res(); }
      });
    } else if (P.name === 'youtube') {
      if (window.ytgame.ads && window.ytgame.ads.requestInterstitialAd) { await window.ytgame.ads.requestInterstitialAd().catch(() => {}); }
    } else if (P.ysdk) {
      await new Promise((res) => {
        try {
          P.ysdk.adv.showFullscreenAdv({ callbacks: { onOpen: start, onClose: () => res(), onError: () => res() } });
        } catch (e) { res(); }
        setTimeout(res, 60000); // never hang the game if the SDK never answers
      });
    }
  } catch (e) { console.warn('midgame ad', e); }
  P._adActive = false;
  if (started) P.onAdEnd();
  P.onAdDone();
};

// Rewarded ads exist on this platform right now (hidden for adblock users on CrazyGames)
P.hasRewarded = () => {
  if (P.name === 'local') return !!window.SOE_DEV && location.search.includes('fakeads');
  if (P.cg && P.adblock) return false;
  if (P.name === 'youtube') return !!(window.ytgame.ads && window.ytgame.ads.requestRewardedAd);
  return true;
};

// Rewarded: resolves true only when the reward was earned. The game announces the ad on the button before calling.
P.rewardedAd = async function (rewardId) {
  if (P._adActive) return false;
  P._adActive = true; P.onAdRequest();
  let ok = false, started = false;
  const start = () => { if (!started) { started = true; P.onAdStart(); } };
  try {
    if (P.name === 'poki') {
      ok = await window.PokiSDK.rewardedBreak({ size: 'medium', onStart: start });
    } else if (P.cg) {
      ok = await new Promise((res) => {
        try { P.cg.ad.requestAd('rewarded', { adStarted: start, adFinished: () => res(true), adError: () => res(false) }); } catch (e) { res(false); }
      });
    } else if (P.name === 'youtube') {
      start();
      ok = await window.ytgame.ads.requestRewardedAd(rewardId).catch(() => false);
    } else if (P.ysdk) {
      ok = await new Promise((res) => {
        let rewarded = false;
        try {
          P.ysdk.adv.showRewardedVideo({ callbacks: {
            onOpen: start, onRewarded: () => { rewarded = true; }, onClose: () => res(rewarded), onError: () => res(false),
          } });
        } catch (e) { res(false); }
      });
    } else {
      start(); await wait(1200); ok = true; // local test mode (?fakeads)
    }
  } catch (e) { console.warn('rewarded ad', e); ok = false; }
  P._adActive = false;
  if (started) { P.onAdEnd(); P._lastRewarded = Date.now(); }
  P.onAdDone();
  return !!ok;
};

// Poki mobile: the Poki "pill" sits at the top-left of the game. Move it down below our HUD.
P.placePill = (topPx) => { if (P.name === 'poki' && window.PokiSDK.movePill) safe(() => window.PokiSDK.movePill(0, topPx)); };

// ---- Saves ----
const LS_KEY = 'siege_of_eternity_save_v1';
let ytLoaded = false;
P.loadSave = async function () {
  try {
    if (P.name === 'youtube') { const s = await window.ytgame.game.loadData(); ytLoaded = true; return s || null; }
    if (P.cg && P.cg.data) return P.cg.data.getItem(LS_KEY);
    if (P.ysdk && P.yplayer) {
      const d = await P.yplayer.getData(['save']);
      if (d && d.save) return d.save;
      try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
    }
    return localStorage.getItem(LS_KEY);
  } catch (e) { console.warn('load save', e); if (P.name === 'youtube') ytLoaded = false; return null; }
};
P.writeSave = async function (str) {
  try {
    if (P.name === 'youtube') { if (ytLoaded) await window.ytgame.game.saveData(str); return; }
    if (P.cg && P.cg.data) { P.cg.data.setItem(LS_KEY, str); return; }
    if (P.ysdk && P.yplayer) { await P.yplayer.setData({ save: str }, true); }
    localStorage.setItem(LS_KEY, str);
  } catch (e) { console.warn('write save', e); }
};

P.sendScore = (value) => {
  if (P.name === 'youtube') safe(() => window.ytgame.engagement.sendScore({ value: Math.floor(value) }).catch(() => {}));
};

P.onAudioChange = (cb) => P._audioCbs.push(cb);
P.onPause = (cb) => P._pauseCbs.push(cb);
P.onResume = (cb) => P._resumeCbs.push(cb);

export const Platform = P;
