// Boot sequence: platform SDK first (Playgama: Bridge must finish initializing before the engine loads),
// then the game code (three.js and everything else) is imported and started.
import { Platform } from './platform.js?v=202611200408';
import { installIcons } from './icons.js?v=202611200408';

async function boot() {
  // Drawn icons instead of emoji (Playgama rule 4.3.2); other platforms keep their current look for now
  if (window.SOE_PLATFORM === 'playgama' || /[?&]icons\b/.test(location.search)) installIcons(document.body);
  await Platform.init();
  const app = await import('./app.js?v=202611200408');
  await app.start();
}
boot();
