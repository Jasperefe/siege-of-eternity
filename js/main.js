// Boot sequence: platform SDK -> loading screen -> assets -> menu
import { Platform } from './platform.js';
import { Save } from './save.js';
import { Game } from './game.js';

async function boot() {
  const ui = { bar: document.getElementById('load-bar-fill'), text: document.getElementById('load-text') };
  await Platform.init();
  Platform.loadingStart();
  // first frame of the loading screen is on screen
  requestAnimationFrame(() => requestAnimationFrame(() => Platform.firstFrame()));
  await Save.load();
  const game = new Game();
  window.__game = game;
  const tips = ['Block just before a hit lands to PARRY', 'Roll through red attacks — they cannot be blocked', 'Stunned enemies can be EXECUTED for health', 'Hit shielded enemies from behind', 'Parry fireballs to send them back'];
  let ti = 0; const tipT = setInterval(() => { ui.text.textContent = tips[ti++ % tips.length]; }, 2200);
  try {
    await game.boot((p) => { ui.bar.style.width = Math.round(p * 100) + '%'; });
  } catch (e) {
    console.error(e);
    ui.text.textContent = 'Failed to load: ' + e.message;
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
  game.backgroundLoad();
}
boot();
