// Boot sequence: platform SDK first (Playgama: Bridge must finish initializing before the engine loads),
// then the game code (three.js and everything else) is imported and started.
import { Platform } from './platform.js?v=202611210925';
import { installIcons } from './icons.js?v=202611210925';

async function boot() {
  // Drawn icons instead of emoji, on every platform (Playgama rule 4.3.2; emoji look different on every device)
  installIcons(document.body);
  await Platform.init();
  const app = await import('./app.js?v=202611210925');
  await app.start();
}
boot();
