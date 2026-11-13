// Game orchestration: loop, camera, run flow, waves, platform hooks
import * as THREE from 'three';
import { Assets } from './assets.js';
import { Audio2 } from './audio.js';
import { Platform } from './platform.js';
import { Save } from './save.js';
import { FX } from './fx.js';
import { World, SCENES, SCENE_ASSETS } from './world.js';
import { Hero, HEROES, heroAssets } from './hero.js';
import { Enemy, ALL_DEFS, defAssets } from './enemies.js';
import { Combat } from './combat.js';
import { Director, sceneForWave, tierForWave, EVENTS } from './waves.js';
import { rollCards, applyCard, DEALS, CARDS } from './cards.js';
import { UI, UPGRADES, upgradeCost } from './ui.js';
import { Input } from './input.js';
import { makeRng, todaySeed, angleDiff, clamp, damp, frand } from './util.js';

const DEV = !!window.SOE_DEV;
export const DEV_EVENT = DEV ? new URLSearchParams(location.search).get('event') : null; // test cheats (?god, ?wave=N, ?fast, ?overview) only in dev builds

export class Game {
  constructor() {
    this.save = Save.data;
    this.assets = Assets;
    this.state = 'boot';
    this.time = 0;
    this.enemies = []; this.pool = {}; this.corpses = [];
    this.hitstopT = 0; this.slowT = 0; this.slowScale = 1; this.shakeAmt = 0;
    this.selHero = 'knight'; this.mode = 'normal';
    this.dailyKey = todaySeed().key;
    this.input = new Input();
    const q = this.save.settings.quality;
    this.quality = q === 'auto' ? (this.input.isTouch ? 'low' : 'high') : q;
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 220);
    this.camTarget = new THREE.Vector3(); this.camPos = new THREE.Vector3(0, 18, 20);
    this.fx = new FX(this);
    this.world = new World(this);
    this.combat = new Combat(this);
    this.director = new Director(this);
    this.ui = new UI(this);
    this.applyQuality();
    addEventListener('resize', () => this.resize()); this.resize();
    this.bindUI();
    // platform: ads and YouTube pause/resume
    Platform.onAdStart = () => { this.adPause = true; Audio2.setAdMute(true); this.ui.adOverlay(true); };
    Platform.onAdEnd = () => { this.adPause = false; Audio2.setAdMute(false); this.ui.adOverlay(false); };
    Platform.onPause((why) => {
      if (why === 'platform') { this.sysPause = true; Audio2.pauseAll(true); Save.now(); }
      else if (this.state === 'play') this.togglePause(true);
    });
    Platform.onResume(() => { this.sysPause = false; Audio2.pauseAll(false); this._last = performance.now(); this.loop(); });
    this._tick = (t) => this.loop(t);
    if (DEV && location.search.includes('fast')) this._maxDt = 0.2;
  }

  heroUnlocked(k) {
    const u = HEROES[k].unlock; if (!u) return true;
    if (this.save.heroes[k]) return true;
    if (u.type === 'wave' && this.save.best.wave >= u.v) return true;
    if (u.type === 'flag' && this.save.flags[u.v]) return true;
    return false;
  }

  applyQuality() {
    const q = this.save.settings.quality;
    this.quality = q === 'auto' ? (this.input.isTouch || Math.min(innerWidth, innerHeight) < 500 ? 'low' : 'high') : q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(this.quality === 'high' ? Math.min(dpr, 1.75) : Math.min(dpr, 1.0));
    const sh = this.quality === 'high';
    if (this.renderer.shadowMap.enabled !== sh) {
      this.renderer.shadowMap.enabled = sh;
      this.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); });
    }
    this.world.sun.shadow.mapSize.set(2048, 2048);
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.portrait = h > w;
    this.fx.setPixelScale(h * this.renderer.getPixelRatio());
    this.w = w; this.h = h;
  }

  // ========================= BOOT =========================
  async boot(progress) {
    const core = [
      ...['General', 'MovementBasic', 'MovementAdvanced', 'CombatMelee', 'CombatRanged', 'Special', 'Simulation'].map((f) => `anims/kk_${f}.glb`),
      ...heroAssets('knight'), ...SCENE_ASSETS.courtyard,
      ...['goblin', 'goblin_f', 'zombie', 'zombie_f', 'skel_minion', 'crypt_skel', 'soldier'].flatMap(defAssets),
      'weapons/arrow_crossbow.glb', 'weapons/Skeleton_Arrow.glb', 'weapons/dagger.glb', 'env/n_rock_largeA.glb', 'weapons/sword_1handed.glb',
    ];
    const uniq = [...new Set(core)];
    let done = 0;
    await Promise.all(uniq.map((p) => (p.endsWith('.hdr') ? Assets.hdr(p) : Assets.any(p)).then(() => progress(++done / (uniq.length + 2)))));
    this.kkClips = await Assets.kkAnims();
    Audio2.init(); Audio2.setVolumes(this.save.settings.music, this.save.settings.sfx);
    await Audio2.loadSfx('./assets/audio'); progress((uniq.length + 1) / (uniq.length + 2));
    await this.world.build('courtyard'); progress(1);
    this.selHero = this.heroUnlocked(this.save.lastHero || 'knight') ? (this.save.lastHero || 'knight') : 'knight';
    this.spawnHero(this.selHero);
    this.state = 'menu';
    this._last = performance.now();
    this.loop();
  }

  // Load everything else quietly after the menu is up
  async backgroundLoad() {
    const rest = [];
    for (const k of Object.keys(ALL_DEFS)) rest.push(...defAssets(k));
    for (const k of Object.keys(HEROES)) rest.push(...heroAssets(k));
    for (const k of ['village', 'forest', 'peak']) rest.push(...SCENE_ASSETS[k]);
    for (const p of [...new Set(rest)]) {
      if (Assets.has(p)) continue;
      try { await (p.endsWith('.hdr') ? this.world.envFor(p) : Assets.any(p)); } catch (e) { console.warn('bg load', p, e); }
    }
    this.bgLoaded = true;
  }
  async ensure(paths) {
    await Promise.all([...new Set(paths)].map((p) => (Assets.has(p) ? null : p.endsWith('.hdr') ? this.world.envFor(p) : Assets.any(p))));
  }

  spawnHero(key) {
    if (this.hero) { this.scene.remove(this.hero.root); }
    this.hero = new Hero(this, key);
    this.hero.pos.set(0, 0, 2); this.hero.faceTo(0);
    this.scene.add(this.hero.root);
  }

  // ========================= UI BINDINGS =========================
  bindUI() {
    const ui = this.ui;
    ui.on('play', () => this.startRun(false));
    ui.on('daily', () => this.startRun(true));
    ui.on('heroes', () => ui.showHeroes());
    ui.on('shrine', () => ui.showShrine());
    ui.on('settings', () => ui.showSettings());
    ui.on('modes', () => ui.showModes());
    ui.on('howto', () => ui.showHowTo());
    ui.on('back', () => ui.showMenu());
    ui.on('noop', () => {});
    ui.on('pickHero', async (k) => {
      this.selHero = k; this.save.lastHero = k; Save.write();
      await this.ensure(heroAssets(k)); this.spawnHero(k); ui.showHeroes();
    });
    ui.on('pickMode', (k) => { this.mode = k; ui.showMenu(); });
    ui.on('buyUp', (k) => {
      const lvl = this.save.upg[k] || 0, cost = upgradeCost(k, lvl);
      if (this.save.shards < cost || lvl >= UPGRADES[k].max) return;
      this.save.shards -= cost; this.save.upg[k] = lvl + 1; Save.write(); Audio2.play('coins'); ui.showShrine();
      this.hero.recalc(); this.hero.hp = this.hero.maxHp;
    });
    ui.on('pickCard', (k) => this.pickCard(k));
    ui.on('reroll', () => { this.run.rerolls--; this.offerCards(true); });
    ui.on('adReroll', async () => { this.run.adRerollUsed = true; const ok = await Platform.rewardedAd('reroll'); if (ok) this.offerCards(true); else { this.ui.toast('No ad available right now — try again later.'); this.offerCards(false, true); } });
    ui.on('dealYes', () => { this.pendingDeal.apply(this.run.mods, this.run); this.hero.recalc(); this.ui.toast(`${this.pendingDeal.icon} ${this.pendingDeal.name} accepted`); Audio2.sting('bad'); this.afterDeal(); });
    ui.on('dealNo', () => this.afterDeal());
    ui.on('resume', () => this.togglePause(false));
    ui.on('howtoPause', () => ui.showHowTo('pauseBack'));
    ui.on('settingsPause', () => { ui.showSettings(); this.screens_back = 'pause'; });
    ui.on('pauseBack', () => ui.showPause());
    ui.on('quit', () => { this.togglePause(false, true); this.endRun(true); });
    ui.on('retry', async () => { await Platform.midgameAd(); this.startRun(this.run?.daily); });
    ui.on('menu', () => this.toMenu());
    ui.on('reviveAd', async () => {
      this.ui.hideScreens();
      const ok = await Platform.rewardedAd('revive');
      if (ok) this.revive(); else { this.ui.toast('The ad could not be shown — revive with shards or try again.'); this.showGameOver(true); }
    });
    ui.on('reviveShards', () => { const c = this.reviveCost(); if (this.save.shards < c) return; this.save.shards -= c; Save.write(); this.revive(); });
    ui.on('share', () => {
      const r = this.lastResult;
      const txt = `⚔️ Siege of Eternity — Daily Siege ${new Date().toISOString().slice(0, 10)}\nI survived to wave ${r.wave} with ${r.kills} kills and ${r.parries} perfect parries! Can you beat me?`;
      navigator.clipboard?.writeText(txt).then(() => this.ui.toast('📋 Copied!')).catch(() => this.ui.toast(txt));
    });
    ui.on('beginRun', () => { this.save.flags.tutorial = true; Save.write(); this.ui.hideScreens(); this.beginWave(1); });
    // settings "Back" while paused returns to the pause menu
    const origBack = ui.handlers.back;
    ui.on('back', () => { if (this.state === 'paused') ui.showPause(); else origBack(); });
  }

  // ========================= RUN FLOW =========================
  levelFor(n) {
    const m = this.run?.mode === 'nightmare' ? 9 : 0;
    const k = n - 1 + m;
    return {
      hp: (1 + 0.11 * k + 0.0035 * k * k) * (this.run?.enemyHp || 1),
      dmg: (1 + 0.06 * k) * (this.run?.enemyDmg || 1),
      speed: Math.min(1.35, 1 + 0.01 * k),
      tier: tierForWave(n + m),
    };
  }

  async startRun(daily) {
    Audio2.init(); Audio2.ctx?.resume();
    this.ui.hideScreens();
    const seed = daily ? todaySeed().seed : (Math.random() * 2 ** 31) | 0;
    const mode = daily ? 'normal' : this.mode;
    this.run = {
      daily, mode, rng: makeRng(seed), wave: 0, score: 0, mods: {}, cards: {}, synergies: new Set(),
      stats: { kills: 0, parries: 0, dodges: 0, dealt: 0, taken: 0, executions: 0, events: 0, bosses: 0 },
      modeMul: mode === 'nightmare' ? 1.25 : 1, enemyHp: 1, enemyDmg: 1, shardMul: mode === 'nightmare' ? 1.5 : mode === 'eternity' ? 2 : 1,
      eliteBonus: 0, shardsBonus: 0, revived: false, rerolls: this.save.upg.fortune || 0, adRerollUsed: false,
      heroDef: HEROES[this.selHero], adapt: { parry: 0, dodge: 0 }, shardsWave: 1,
    };
    if (this.save.upg.revival) this.run.mods.secondWind = 1;
    this.save.stats.runs++;
    this.clearEnemies(); this.combat.clear(); this.fx.clear(); this.corpses = [];
    if (this.world.key !== 'courtyard') { this.ui.travel(SCENES.courtyard.title, 1); await this.world.build('courtyard'); }
    await this.ensure(heroAssets(this.selHero));
    this.spawnHero(this.selHero);
    this.hero.recalc(); this.hero.hp = this.hero.maxHp;
    this.ui.setHud(true);
    this.music('battle');
    const qs = new URLSearchParams(DEV ? location.search : ''), sw = +qs.get('wave') || 1;
    if (qs.has('god')) this.hero.stats.maxHp = this.hero.maxHp = this.hero.hp = 99999;
    if (sw > 1) { await this.world.build(sceneForWave(sw)); this.hero.pos.set(0, 0, 2); this.save.flags.tutorial = true; }
    if (!this.save.flags.tutorial) { this.state = 'menuRun'; this.ui.showHowTo('beginRun'); return; }
    this.beginWave(sw);
  }

  async beginWave(n) {
    const run = this.run;
    run.wave = n;
    this.director.start(n);
    // make sure every model this wave needs is loaded
    const keys = new Set(this.director.queue.map((q) => q.key)); if (this.director.boss) keys.add(this.director.boss);
    for (const q of ['bat', 'skel_minion', 'skel_warrior', 'ghost_skull', 'slime']) keys.add(q);
    await this.ensure([...keys].flatMap(defAssets));
    this.ui.hideScreens(); this.ui.setHud(true);
    this.ui.waveBanner(n, this.director.boss ? 'BOSS WAVE' : SCENES[this.world.key].title);
    this.state = 'play';
    this.input.enabled = true;
    Platform.gameplayStart();
    if (!this.director.boss) this.music('battle');
  }

  onWaveCleared() {
    const run = this.run;
    this.state = 'cleared';
    run.score += 100 * run.wave;
    this.ui.announce('WAVE CLEARED', 'gold', 1.6);
    Audio2.sting('good');
    this.slowmo(0.8, 0.4);
    this.hero.heal(this.hero.maxHp * 0.15);
    setTimeout(() => {
      if (this.state !== 'cleared') return;
      Platform.gameplayStop();
      this.input.enabled = false;
      this.offerCards();
    }, 1600);
  }

  offerCards(reroll = false, keep = false) {
    const run = this.run, boss = run.wave % 10 === 0;
    run.heroHpK = this.hero.hp / this.hero.maxHp;
    if (!keep) {
      let o = boss && !reroll ? rollCards(run, run.rng, 3, true) : [];
      if (o.length < 3) o = o.concat(rollCards(run, run.rng, 3).filter((k) => !o.includes(k))).slice(0, 3);
      this.cardOffer = o;
    }
    this.state = 'cards';
    this.ui.showCards(this.cardOffer, {
      title: boss ? 'A Legendary Reward' : `Wave ${run.wave} survived`,
      sub: boss ? 'The boss has fallen. Claim its power.' : 'Choose a blessing for the next wave',
      rerolls: run.rerolls, adReroll: !run.adRerollUsed && Platform.hasRewarded() && !boss, legendary: boss,
    });
  }

  pickCard(k) {
    const fresh = applyCard(this.run, k, this.hero);
    if (k === 'second' || CARDS[k].apply.toString().includes('secondWind')) this.hero.secondWindUsed = false;
    this.hero.recalc();
    Audio2.play('coins', { vol: 0.5 }); Audio2.magic(0.2, 1.4);
    this.fx.magic({ x: this.hero.pos.x, y: 1.2, z: this.hero.pos.z }, [1, 0.85, 0.4], 30, 4);
    this.ui.hideScreens();
    if (fresh.length) { this.ui.synergy(fresh[0]); Audio2.sting('good'); }
    // occasional cursed shrine deal
    const run = this.run;
    if (run.wave >= 5 && run.wave % 10 !== 0 && run.rng() < 0.28) {
      this.pendingDeal = run.rng.pick(DEALS);
      setTimeout(() => this.ui.showDeal(this.pendingDeal), fresh.length ? 1400 : 300);
      return;
    }
    this.afterDeal(fresh.length ? 1200 : 0);
  }

  async afterDeal(delay = 0) {
    this.ui.hideScreens();
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const next = this.run.wave + 1;
    const scene = sceneForWave(next);
    if (scene !== this.world.key) {
      this.ui.travel(SCENES[scene].title, next);
      this.clearEnemies(); this.combat.clear();
      await this.world.build(scene);
      this.hero.pos.set(0, 0, 2); this.hero.vel.set(0, 0, 0);
      await new Promise((r) => setTimeout(r, 900));
    }
    // natural break: let the platform show an ad if it wants (it decides frequency)
    await Platform.midgameAd();
    this.beginWave(next);
  }

  onHeroDeath() {
    const run = this.run;
    if (!run) return;
    this.state = 'dying';
    this.slowmo(1.5, 0.25);
    Audio2.sting('bad');
    this.save.stats.deaths++;
    setTimeout(() => { Platform.gameplayStop(); this.input.enabled = false; this.showGameOver(); }, 1800);
  }

  reviveCost() { return 40 + this.run.wave * 5; }

  showGameOver(fromAdFail = false) {
    const run = this.run, s = this.save;
    if (!this.lastResult || !fromAdFail) {
      const shards = Math.round((run.wave * 2 + run.stats.kills / 8 + run.shardsBonus + run.stats.bosses * 25) * run.shardMul * (run.shardsWave || 1));
      if (!run.paid) { s.shards += shards; run.paid = shards; }
      const unlocks = [];
      const before = Object.fromEntries(Object.keys(HEROES).map((k) => [k, this.heroUnlocked(k)]));
      const newBest = run.wave > s.best.wave || run.score > s.best.score;
      s.best.wave = Math.max(s.best.wave, run.wave); s.best.score = Math.max(s.best.score, run.score);
      for (const k of Object.keys(HEROES)) if (!before[k] && this.heroUnlocked(k)) { s.heroes[k] = true; unlocks.push(`New hero: ${HEROES[k].icon} ${HEROES[k].name}`); }
      if (run.daily) { if (s.daily.key !== this.dailyKey) s.daily = { key: this.dailyKey, best: 0 }; s.daily.best = Math.max(s.daily.best, run.wave); }
      Save.now();
      Platform.sendScore(s.best.score);
      this.lastResult = { wave: run.wave, score: run.score, kills: run.stats.kills, parries: run.stats.parries, shards: run.paid, unlocks, newBest, sceneTitle: SCENES[this.world.key].title, daily: run.daily };
    }
    const canRevive = !run.revived && run.mode !== 'eternity' && run.wave >= 3;
    this.state = 'dead';
    this.ui.setHud(false);
    this.ui.showGameOver({ ...this.lastResult, canRevive, adRevive: canRevive && Platform.hasRewarded() && !fromAdFail, reviveCost: this.reviveCost() });
  }

  revive() {
    const run = this.run;
    run.revived = true;
    // shards already granted stay; a revived run can earn more
    run.paid = 0; this.lastResult = null;
    this.save.shards -= 0;
    this.ui.hideScreens(); this.ui.setHud(true);
    this.hero.revive();
    this.state = 'play'; this.input.enabled = true;
    Platform.gameplayStart();
    this.ui.announce('RISE AGAIN, WARDEN', 'gold');
  }

  endRun(quit) {
    if (quit && this.run && this.state !== 'dead') { this.hero.hp = 0; this.state = 'dying'; Platform.gameplayStop(); this.showGameOver(true); }
  }

  async toMenu() {
    Platform.gameplayStop();
    this.run = null; this.state = 'menu';
    this.clearEnemies(); this.combat.clear(); this.fx.clear(); this.director.active = false;
    this.ui.setHud(false);
    if (this.world.key !== 'courtyard') await this.world.build('courtyard');
    this.spawnHero(this.selHero);
    this.music('menu');
    this.ui.showMenu();
  }

  togglePause(on, silent = false) {
    if (on && this.state === 'play') {
      this.state = 'paused'; Platform.gameplayStop(); Audio2.music?.pause();
      if (!silent) this.ui.showPause();
    } else if (!on && this.state === 'paused') {
      this.state = 'play'; this.ui.hideScreens(); Audio2.music?.play().catch(() => {});
      this._last = performance.now();
      Platform.gameplayStart();
    }
  }

  onBossDefeated(e) {
    const run = this.run, s = this.save;
    run.stats.bosses++;
    this.ui.bossDone();
    this.ui.announce(`${e.def.name.split(',')[0].toUpperCase()} DEFEATED`, 'gold', 2.5);
    this.slowmo(2, 0.2); this.shake(1);
    this.fx.explosion(e.pos, 6, [1, 0.8, 0.3]);
    Audio2.sting('good');
    Platform.happy();
    run.score += 5000 * (1 + Math.floor(run.wave / 40));
    if (e.def.boss === 'golden') s.flags.goldenKnight = true;
    if (e.def.boss === 'drake') s.flags.drake = true;
    if (e.def.boss === 'dragon') { s.flags.dragon = true; s.modes.nightmare = true; s.modes.eternity = true; }
    if (e.def.boss === 'behemoth') s.flags.behemoth = true;
    // the rest of the wave's adds flee
    for (const o of this.enemies) if (!o.dead && o !== e) this.combat.kill(o, null, {});
    this.director.queue = [];
    Save.write();
  }
  onThiefCaught(e) {
    this.run.shardsBonus += 15; this.run.score += 1500;
    this.ui.announce('TREASURE RECOVERED! +15 💎', 'gold'); Audio2.play('coins', { vol: 0.9 });
    this.fx.sparks({ x: e.pos.x, y: 1, z: e.pos.z }, 40, [1, 0.85, 0.2], 8);
  }
  onChampionDefeated() { this.run.shardsBonus += 10; this.ui.announce('CHAMPION SLAIN', 'gold'); }

  // ========================= ENEMIES =========================
  spawnEnemy(key, { x, z, mode = 'portal', level, boss = false }) {
    const def = ALL_DEFS[key];
    if (!def || !defAssets(key).every((p) => Assets.has(p))) { defAssets(key).forEach((p) => Assets.any(p)); return null; }
    let e = (this.pool[key] || []).pop();
    if (!e) e = new Enemy(this, key);
    e.reset(level || this.levelFor(this.run?.wave || 1));
    this.scene.add(e.root);
    const yaw = Math.atan2(-x, -z);
    e.spawnAt(x, z, yaw, mode);
    this.enemies.push(e);
    return e;
  }
  spawnFromGate(key, q) {
    const def = ALL_DEFS[key], w = this.world, hero = this.hero;
    const level = this.levelFor(this.run.wave);
    if (def.flying && Math.random() < 0.7) { const a = Math.random() * 6.28, d = frand(6, w.radius * 0.8); return this.spawnEnemy(key, { x: Math.sin(a) * d, z: Math.cos(a) * d, mode: 'sky', level }); }
    if (def.ground && Math.random() < 0.6) {
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * 6.28, d = frand(5, 11);
        const x = hero.pos.x + Math.sin(a) * d, z = hero.pos.z + Math.cos(a) * d;
        if (Math.hypot(x, z) < w.radius - 1.5) return this.spawnEnemy(key, { x, z, mode: 'ground', level });
      }
    }
    // gates: prefer ones away from the hero
    const gates = w.spawns.slice().sort((a, b) => Math.hypot(b.x - hero.pos.x, b.z - hero.pos.z) - Math.hypot(a.x - hero.pos.x, a.z - hero.pos.z));
    const gsel = q.gate !== undefined ? gates[q.gate] : gates[Math.floor(Math.random() * Math.min(3, gates.length))];
    return this.spawnEnemy(key, { x: gsel.x + frand(-1.2, 1.2), z: gsel.z + frand(-1.2, 1.2), mode: 'portal', level });
  }
  clearEnemies() {
    for (const e of this.enemies) { this.scene.remove(e.root); (this.pool[e.key] ||= []).push(e); }
    this.enemies = [];
    this.ui.bossDone();
  }
  nearestEnemy(p, maxD = 99, exclude = null) {
    let best = null, bd = maxD;
    for (const e of this.enemies) { if (e.dead || e.state === 'spawning' || (exclude && exclude.has(e))) continue; const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  autoTarget(p, yaw, maxD) {
    let best = null, bs = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e.state === 'spawning' || e.phased) continue;
      const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d > maxD) continue;
      const ad = Math.abs(angleDiff(yaw, Math.atan2(e.pos.x - p.x, e.pos.z - p.z)));
      if (ad > 1.7 && d > 2.6) continue;
      const s = d + ad * 3 - (e.isBoss ? 2 : 0);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  slotAngle(e) { return this._slots?.get(e) ?? e.slot; }
  woundedAllies(src) { return this.enemies.some((e) => !e.dead && e !== src && src.dist(e) < 12 && e.hp < e.maxHp * 0.7); }
  bossAI(e, dt) { this.director.bossAI(e, dt); }

  // ========================= FEEL =========================
  hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); }
  slowmo(dur, scale) { this.slowT = Math.max(this.slowT, dur); this.slowScale = Math.min(scale, this.slowT > 0 ? this.slowScale : 1); if (this.slowScale >= 1) this.slowScale = scale; }
  shake(a) { if (this.save.settings.shake) this.shakeAmt = Math.min(1.2, this.shakeAmt + a); }
  camFocus(e, t) { this.focus = e; this.focusT = t; }
  streak(e) {
    const now = this.time;
    if (now - (this._lastKill || -9) < 2.5) this._streak++; else this._streak = 1;
    this._lastKill = now;
    const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 5: 'MASSACRE', 8: 'UNSTOPPABLE', 12: 'GODLIKE', 20: 'ETERNAL' };
    if (names[this._streak]) { this.ui.streak(names[this._streak]); this.run.score += this._streak * 50; if (this._streak >= 5) Audio2.sting('good'); }
  }
  music(name) { if (!Audio2.ctx) return; Audio2.playMusic(name, `./assets/music/${name}.mp3`); }

  // ========================= LOOP =========================
  loop() {
    if (this.sysPause) return; // YouTube onPause: stop everything (rendering included)
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._tick);
    try { this.frame(); } catch (err) {
      console.error('frame error', err);
      if (!this._errLogged) { this._errLogged = true; try { window.ytgame?.health?.logError(); } catch (e) {} }
      try { this.renderer.render(this.scene, this.camera); } catch (e) {}
    }
  }

  frame() {
    const now = performance.now();
    let raw = Math.min(this._maxDt || 0.05, (now - (this._last || now)) / 1000); this._last = now;
    this._fc = (this._fc || 0) + 1; if (now - (this._fpsT || 0) > 1000) { this._fps = this._fc; this._fc = 0; this._fpsT = now; }
    if (this.adPause) { return; }
    const playing = this.state === 'play' || this.state === 'cleared' || this.state === 'dying';
    if (this.slowT > 0) { this.slowT -= raw; if (this.slowT <= 0) this.slowScale = 1; }
    let dt = raw * (this.slowT > 0 ? this.slowScale : 1);
    if (this.hitstopT > 0) { this.hitstopT -= raw; dt *= 0.05; }
    if (this.state === 'paused' || this.state === 'dead' || this.state === 'cards') dt = playing ? dt : 0;
    this.time += dt;

    const inp = this.input.read();
    if (inp.pause && (this.state === 'play' || this.state === 'paused')) this.togglePause(this.state === 'play');
    if (this.hero) {
      if (playing) {
        const mv = new THREE.Vector3(inp.moveRaw.x, 0, inp.moveRaw.y);
        const hin = { ...inp, move: mv, attack: inp.attack || inp.attackHeld };
        if (this.state !== 'play') { mv.set(0, 0, 0); hin.attack = hin.dodge = hin.blockPressed = hin.wrath = false; }
        this.hero.update(dt, hin);
      } else {
        this.hero.update(this.state === 'menu' || this.state === 'menuRun' ? raw : 0, { move: new THREE.Vector3(), attack: false, blockHeld: false, blockPressed: false, dodge: false, wrath: false });
      }
    }
    if (playing) {
      // surround slots
      const near = this.enemies.filter((e) => !e.dead && !e.def.ranged && !e.flying && e.state !== 'spawning' && e.dist(this.hero) < 7);
      if (near.length > 1) {
        near.sort((a, b) => this.hero.angleTo(a) - this.hero.angleTo(b));
        const a0 = this.hero.angleTo(near[0]) + Math.PI; this._slots = new Map();
        near.forEach((e, i) => this._slots.set(e, a0 + Math.PI + i / near.length * Math.PI * 2));
      } else this._slots = null;
      for (const e of this.enemies) {
        try { e.update(dt); } catch (err) {
          console.error('enemy error', e.key, err);
          if (!e.dead) { e.dead = true; e.alive = false; e.removed = true; }
        }
      }
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.removed) { this.scene.remove(e.root); this.enemies.splice(i, 1); (this.pool[e.key] ||= []).push(e); }
      }
      this.corpses = this.corpses.filter((c) => this.time - c.t < 20);
      this.combat.updateProjectiles(dt);
      this.combat.updateHazards(dt);
      if (this.state === 'play') this.director.update(dt);
    }
    this.world.update(dt || raw * 0.3, this.time + now * 0);
    this.updateCamera(raw);
    this.fx.update(playing ? dt : raw, this.camera, this.w, this.h);
    if (playing || this.state === 'paused' || this.state === 'cards') { this.ui.updateHud(); this.ui.updatePlates(this.camera, this.w, this.h); }
    // keep the shadow camera on the hero
    const s = this.world.sun, hp = this.hero ? this.hero.pos : new THREE.Vector3();
    s.target.position.set(hp.x * 0.5, 0, hp.z * 0.5); s.position.set(hp.x * 0.5 + s.userData.ox, 40, hp.z * 0.5 + s.userData.oz);
    this.renderer.render(this.scene, this.camera);
    if (!this._firstFrame) { this._firstFrame = true; }
  }

  updateCamera(raw) {
    const h = this.hero; if (!h) return;
    const s = this.world.sun; if (s.userData.ox === undefined) { s.userData.ox = s.position.x; s.userData.oz = s.position.z; }
    if (this.state === 'menu' || this.state === 'boot') {
      const t = Math.sin(performance.now() / 1000 * 0.12) * 0.5;
      const r = this.portrait ? 9 : 6.5;
      const hp = h.pos;
      this.camPos.set(hp.x + Math.sin(t) * r, 2.6, hp.z + Math.cos(t) * r);
      const side = this.portrait ? 0 : 2.6; // keep the hero to the right of the menu
      this.camTarget.set(hp.x - Math.cos(t) * side, 1.5, hp.z + Math.sin(t) * side);
      this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTarget);
      this.camera.fov = 45; this.camera.updateProjectionMatrix();
      return;
    }
    if (DEV && location.search.includes('overview')) { this.camera.position.set(0, 42, 34); this.camera.lookAt(0, 0, 0); return; }
    let tx = h.pos.x + h.vel.x * 0.12, tz = h.pos.z + h.vel.z * 0.12;
    if (this.focus && this.focusT > 0) { this.focusT -= raw; tx = (h.pos.x + this.focus.pos.x) / 2; tz = (h.pos.z + this.focus.pos.z) / 2; }
    const boss = this.director.bossEnemy && !this.director.bossEnemy.dead && this.state !== 'menu' ? this.director.bossEnemy : null;
    const zoom = this.portrait ? 1.3 : 1;
    let bigK = 1;
    if (boss) { // frame the hero and the boss together
      const d = h.dist(boss);
      if (d < 34) { tx += (boss.pos.x - h.pos.x) * 0.32; tz += (boss.pos.z - h.pos.z) * 0.32; }
      bigK = 1 + clamp((d - 6) / 22, 0, 0.55) + (boss.def.h > 5 ? 0.15 : 0);
    }
    this._bigK = damp(this._bigK || 1, bigK, 2, raw); bigK = this._bigK;
    const off = new THREE.Vector3(0, 12.5 * zoom * bigK, 10 * zoom * bigK);
    this.camTarget.x = damp(this.camTarget.x, tx, 7, raw); this.camTarget.z = damp(this.camTarget.z, tz, 7, raw); this.camTarget.y = 1;
    this.camera.position.set(this.camTarget.x + off.x, off.y, this.camTarget.z + off.z);
    if (this.shakeAmt > 0) {
      const a = this.shakeAmt * this.shakeAmt * 0.6;
      this.camera.position.x += frand(-a, a); this.camera.position.y += frand(-a, a); this.camera.position.z += frand(-a, a);
      this.shakeAmt = Math.max(0, this.shakeAmt - raw * 2.2);
    }
    this.camera.lookAt(this.camTarget);
    if (this.camera.fov !== (this.portrait ? 52 : 45)) { this.camera.fov = this.portrait ? 52 : 45; this.camera.updateProjectionMatrix(); }
  }
}
