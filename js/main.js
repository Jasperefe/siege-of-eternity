// Boot sequence: platform SDK -> loading screen -> assets -> menu
import { Platform } from './platform.js?v=202611131113';
import { Save } from './save.js?v=202611131113';
import { Game } from './game.js?v=202611131113';
import { setLang, t } from './i18n.js?v=202611131113';
import { Audio2 } from './audio.js?v=202611131113';

async function boot() {
  const ui = { bar: document.getElementById('load-bar-fill'), text: document.getElementById('load-text') };
  await Platform.init();
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
  game.ui.hideLoading();
  game.ui.showMenu();
  Platform.gameReady();
  window.__ready = true;
  // start menu music on the first interaction (browsers block autoplay)
  const startMusic = () => { if (game.state === 'menu') game.music('menu'); removeEventListener('pointerdown', startMusic); removeEventListener('keydown', startMusic); };
  addEventListener('pointerdown', startMusic); addEventListener('keydown', startMusic);
  // iOS Safari: unlock/resume audio on a real tap (CrazyGames requirement)
  const unlock = () => { const c = Audio2.ctx; if (c && c.state !== 'running' && !Audio2.paused && !Audio2.adMuted) c.resume().catch(() => {}); };
  addEventListener('touchend', unlock, { passive: true }); addEventListener('click', unlock);
  game.backgroundLoad();
}
boot();
