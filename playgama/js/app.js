// Everything after the platform SDK is ready: loading screen -> assets -> menu
import { Platform } from './platform.js?v=202611210855';
import { Save } from './save.js?v=202611210855';
import { Game } from './game.js?v=202611210855';
import { setLang, t } from './i18n.js?v=202611210855';
import { Audio2 } from './audio.js?v=202611210855';

export async function start() {
  const ui = { bar: document.getElementById('load-bar-fill'), text: document.getElementById('load-text') };
  setLang(Platform.lang);
  document.documentElement.lang = Platform.lang === 'ru' ? 'ru' : 'en';
  ui.text.textContent = t('Loading the siege…');
  Platform.loadingStart();
  // first frame of the loading screen is on screen
  requestAnimationFrame(() => requestAnimationFrame(() => Platform.firstFrame()));
  await Save.load();
  const game = new Game();
  window.__game = game;
  const tips = ['Block just before a hit lands to parry', "Roll through red attacks — they can't be blocked", 'Stunned enemies can be executed for health', 'Hit shielded enemies from behind', 'Parry fireballs to send them back'];
  let ti = 0; const tipT = setInterval(() => { ui.text.textContent = t(tips[ti++ % tips.length]); }, 2200);
  try {
    await game.boot((p) => { ui.bar.style.width = Math.round(p * 100) + '%'; });
  } catch (e) {
    console.error(e);
    ui.text.textContent = t('Failed to load. Please reload the page.');
    return;
  }
  clearInterval(tipT);
  // First visit: no menu to get past, straight into wave 1 (the menu appears after the first run).
  // The loading screen stays up until wave 1 is ready, so "game ready" goes out only when the player can play.
  const qs = new URLSearchParams(location.search);
  if (!game.save.stats.runs && !qs.has('menu') && !qs.has('wave')) {
    ui.text.textContent = t('Preparing the battlefield…');
    try { await game.startRun(false); } catch (e) { console.error(e); game.ui.showMenu(); }
  } else game.ui.showMenu();
  game.ui.hideLoading();
  Platform.gameReady();
  window.__ready = true;
  if (game._deferStart && game.state === 'play') { Platform.gameplayStart(); game.telLevel?.(game._deferStart); }
  game._deferStart = 0;
  // start menu music on the first interaction (browsers block autoplay)
  const startMusic = () => { if (game.state === 'menu') game.music('menu'); removeEventListener('pointerdown', startMusic); removeEventListener('keydown', startMusic); };
  addEventListener('pointerdown', startMusic); addEventListener('keydown', startMusic);
  // iOS Safari: unlock/resume audio on a real tap (CrazyGames requirement)
  // (also starts music that a browser refused to autoplay, e.g. a first run that began without a tap)
  const unlock = () => {
    const c = Audio2.ctx; if (c && c.state !== 'running' && !Audio2.paused && !Audio2.adMuted) c.resume().catch(() => {});
    const m = Audio2.music; if (m && m.paused && m.src && !Audio2.paused && !Audio2.adMuted && !game.sysPause && game.state !== 'paused') m.play().catch(() => {});
  };
  addEventListener('touchend', unlock, { passive: true }); addEventListener('click', unlock); addEventListener('keydown', unlock);
  Audio2.loadSfx('./assets/audio'); // sound effects are small (~0.35 MB); the rest downloads once the player starts
}
