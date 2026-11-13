// One adapter for Poki, CrazyGames, YouTube Playables (and plain web/local).
// The build script sets window.SOE_PLATFORM and injects the matching SDK <script> in index.html.
// Every call is wrapped so a failing/blocked SDK can never break the game (all three platforms require this).

const P = {
  name: 'local',
  ready: false,
  muted: false,           // platform-forced mute (YouTube mute button / CrazyGames muteAudio)
  _audioCbs: [],
  _pauseCbs: [],
  _resumeCbs: [],
  _adActive: false,
  inGameplay: false,
  cg: null,
};

function safe(fn, fallback) {
  try { const r = fn(); return r; } catch (e) { console.warn('[platform]', e); return fallback; }
}

function detect() {
  const want = (window.SOE_PLATFORM || '').toLowerCase();
  if ((want === 'youtube' || !want) && typeof window.ytgame !== 'undefined' && window.ytgame.IN_PLAYABLES_ENV) return 'youtube';
  if ((want === 'crazygames' || !want) && window.CrazyGames && window.CrazyGames.SDK) return 'crazygames';
  if ((want === 'poki' || !want) && typeof window.PokiSDK !== 'undefined') return 'poki';
  return 'local';
}

P.init = async function () {
  P.name = detect();
  // Stop arrow keys / space / wheel from scrolling the host page (Poki requirement, good everywhere)
  window.addEventListener('keydown', (ev) => {
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(ev.key)) ev.preventDefault();
  });
  window.addEventListener('wheel', (ev) => ev.preventDefault(), { passive: false });

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
    }
  } else if (P.name === 'youtube') {
    const yt = window.ytgame;
    safe(() => { P.muted = !yt.system.isAudioEnabled(); });
    safe(() => yt.system.onAudioEnabledChange((enabled) => { P.muted = !enabled; P._audioCbs.forEach((cb) => cb(enabled)); }));
    safe(() => yt.system.onPause(() => P._pauseCbs.forEach((cb) => cb('platform'))));
    safe(() => yt.system.onResume(() => P._resumeCbs.forEach((cb) => cb('platform'))));
    window.addEventListener('error', () => safe(() => yt.health.logError()));
  }
  // Outside YouTube we may use the Page Visibility API to auto-pause (YouTube forbids it — it uses onPause/onResume)
  if (P.name !== 'youtube') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) P._pauseCbs.forEach((cb) => cb('hidden'));
    });
  }
  P.ready = true;
  return P.name;
};

P.loadingStart = () => { if (P.cg) safe(() => P.cg.game.loadingStart()); };
// Called once the loading screen has painted its first frame
P.firstFrame = () => { if (P.name === 'youtube') safe(() => window.ytgame.game.firstFrameReady()); };
// Loading finished and the main menu is interactive
P.gameReady = () => {
  if (P.name === 'poki') safe(() => window.PokiSDK.gameLoadingFinished());
  if (P.cg) safe(() => P.cg.game.loadingStop());
  if (P.name === 'youtube') safe(() => window.ytgame.game.gameReady());
};

P.gameplayStart = () => {
  if (P.inGameplay) return; P.inGameplay = true;
  if (P.name === 'poki') safe(() => window.PokiSDK.gameplayStart());
  if (P.cg) safe(() => P.cg.game.gameplayStart());
};
P.gameplayStop = () => {
  if (!P.inGameplay) return; P.inGameplay = false;
  if (P.name === 'poki') safe(() => window.PokiSDK.gameplayStop());
  if (P.cg) safe(() => P.cg.game.gameplayStop());
};
P.happy = () => { if (P.cg) safe(() => P.cg.game.happytime()); };

// Hooks the game sets so ads can mute + freeze it
P.onAdStart = () => {};
P.onAdEnd = () => {};

// Midgame / interstitial: only at natural breaks (between waves, before a retry). Platform decides if one shows.
P.midgameAd = async function () {
  if (P._adActive) return;
  P._adActive = true;
  try {
    if (P.name === 'poki') {
      await window.PokiSDK.commercialBreak(() => P.onAdStart());
    } else if (P.cg) {
      await new Promise((res) => {
        try {
          P.cg.ad.requestAd('midgame', {
            adStarted: () => P.onAdStart(),
            adFinished: () => res(),
            adError: () => res(),
          });
        } catch (e) { res(); }
      });
    } else if (P.name === 'youtube') {
      if (window.ytgame.ads && window.ytgame.ads.requestInterstitialAd) {
        P.onAdStart();
        await window.ytgame.ads.requestInterstitialAd().catch(() => {});
      }
    }
  } catch (e) { console.warn('midgame ad', e); }
  P._adActive = false;
  P.onAdEnd();
};

P.hasRewarded = () => P.name !== 'local' || (!!window.SOE_DEV && location.search.includes('fakeads'));

// Rewarded: resolves true only when the reward was earned. Game must announce the ad before calling.
P.rewardedAd = async function (rewardId) {
  if (P._adActive) return false;
  P._adActive = true;
  let ok = false;
  try {
    if (P.name === 'poki') {
      ok = await window.PokiSDK.rewardedBreak({ size: 'medium', onStart: () => P.onAdStart() });
    } else if (P.cg) {
      ok = await new Promise((res) => {
        try {
          P.cg.ad.requestAd('rewarded', {
            adStarted: () => P.onAdStart(),
            adFinished: () => res(true),
            adError: () => res(false),
          });
        } catch (e) { res(false); }
      });
    } else if (P.name === 'youtube') {
      P.onAdStart();
      ok = await window.ytgame.ads.requestRewardedAd(rewardId).catch(() => false);
    } else {
      // local test mode (?fakeads): simulate a short ad
      P.onAdStart();
      await new Promise((r) => setTimeout(r, 1200));
      ok = true;
    }
  } catch (e) { console.warn('rewarded ad', e); ok = false; }
  P._adActive = false;
  P.onAdEnd();
  return !!ok;
};

// ---- Saves ----
const LS_KEY = 'siege_of_eternity_save_v1';
let ytLoaded = false;
P.loadSave = async function () {
  try {
    if (P.name === 'youtube') {
      const s = await window.ytgame.game.loadData();
      ytLoaded = true;
      return s || null;
    }
    if (P.cg && P.cg.data) return P.cg.data.getItem(LS_KEY);
    return localStorage.getItem(LS_KEY);
  } catch (e) { console.warn('load save', e); if (P.name === 'youtube') ytLoaded = false; return null; }
};
P.writeSave = async function (str) {
  try {
    if (P.name === 'youtube') { if (ytLoaded) await window.ytgame.game.saveData(str); return; }
    if (P.cg && P.cg.data) { P.cg.data.setItem(LS_KEY, str); return; }
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
