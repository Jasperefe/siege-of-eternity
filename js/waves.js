// Wave director: budgets, difficulty curve, events, elites, hazards and boss AI
import { ENEMIES } from './enemies.js';
import { Audio2 } from './audio.js';
import { angleDiff, clamp, frand } from './util.js';

export const EVENTS = {
  bloodmoon: { name: 'Blood Moon', icon: '🩸', desc: 'Enemies are faster and stronger — but drop double shards', min: 6 },
  necro: { name: 'Necromancer Rises', icon: '💀', desc: 'Kill the Necromancer before he raises an army', min: 7 },
  hunt: { name: 'The Hunt', icon: '🐺', desc: 'A pack of Demon Hounds charges in', min: 8 },
  barrage: { name: 'Trebuchet Barrage', icon: '🪨', desc: 'Boulders rain on the arena — watch the shadows', min: 10 },
  goldrush: { name: 'Gold Rush', icon: '💰', desc: 'A goblin thief stole the treasury — catch him!', min: 4 },
  champion: { name: "Champion's Duel", icon: '⚔️', desc: 'A champion challenges you to single combat', min: 12 },
  swarm: { name: 'Bat Swarm', icon: '🦇', desc: 'The sky darkens with bloodthirsty bats', min: 11 },
};

// 40-wave cycle: courtyard 1-10, village 11-20, forest 21-29, Dragon's Peak 30-40, then it loops (harder)
export function sceneForWave(n) {
  const w = ((n - 1) % 40) + 1;
  return w <= 10 ? 'courtyard' : w <= 20 ? 'village' : w <= 29 ? 'forest' : 'peak';
}
export function bossForWave(n) {
  if (n % 10 !== 0) return null;
  return ['golden_knight', 'drake', 'shadow_dragon', 'behemoth'][((n / 10) - 1) % 4];
}
export function tierForWave(n) { return n < 8 ? 0 : n < 14 ? 1 : n < 20 ? 2 : n < 30 ? 3 : 4; }

export class Director {
  constructor(game) { this.game = game; this.active = false; }

  start(n) {
    const g = this.game, run = g.run, rng = run.rng;
    this.n = n; this.active = true; this.t = 0; this.bossPending = null; this.bossEnemy = null;
    this.queue = []; this.spawnT = 1.2; this.event = null; this.boss = null; this.hazardT = frand(6, 10);
    run.adapt = { parry: run.stats.parries / Math.max(1, run.stats.parries + run.stats.dodges), dodge: run.stats.dodges / Math.max(1, run.stats.parries + run.stats.dodges) };
    g.hero.secondWindUsed = false;
    const level = g.levelFor(n);
    const bossKey = bossForWave(n);
    if (bossKey) {
      this.boss = bossKey;
      // adds come with the boss
      const adds = { golden_knight: ['skel_minion', 'soldier'], drake: ['bat', 'hound'], shadow_dragon: ['ghost_skull', 'demon'], behemoth: ['orc_skull', 'skel_warrior'] }[bossKey];
      for (let i = 0; i < 1 + Math.floor(n / 20); i++) this.queue.push({ key: rng.pick(adds), delay: 20 + i * 8 });
      this.maxAlive = 4;
      this.bossPending = { key: bossKey, level, at: 0.9 };
      return;
    }
    // event selection
    const pool = Object.entries(EVENTS).filter(([, e]) => n >= e.min);
    const forced = window.SOE_DEV ? new URLSearchParams(location.search).get('event') : null;
    if (forced && EVENTS[forced]) { this.event = forced; run.stats.events++; g.ui.eventBanner(EVENTS[forced]); }
    else if (n >= 4 && (n % 4 === 3 || rng() < 0.3) && pool.length) {
      const [k, e] = rng.pick(pool); this.event = k; run.stats.events++;
      g.ui.eventBanner(e);
    }
    // budget: grows faster than linear — the siege gets brutal
    let budget = (5 + n * 2.1 + Math.pow(n, 1.4) * 0.45) * run.modeMul * (run.mode === 'casual' ? 0.75 : 1);
    if (this.event === 'bloodmoon') { level.dmg *= 1.25; level.speed *= 1.15; run.shardsWave = 2; } else run.shardsWave = 1;
    if (this.event === 'champion') { this.queue.push({ key: 'champion', delay: 0, champion: true }); budget *= 0.4; }
    if (this.event === 'necro') this.queue.push({ key: 'skel_mage', delay: 4, elite: true });
    if (this.event === 'hunt') for (let i = 0; i < 4 + Math.floor(n / 6); i++) this.queue.push({ key: 'hound', delay: 3 + i * 0.4, gate: 0 });
    if (this.event === 'swarm') for (let i = 0; i < 8 + Math.floor(n / 4); i++) this.queue.push({ key: 'bat', delay: 2 + i * 0.3 });
    if (this.event === 'goldrush') this.queue.push({ key: 'goblin', delay: 1.5, thief: true });
    const avail = Object.entries(ENEMIES).filter(([, d]) => d.wave <= n);
    let eliteChance = clamp((n - 6) * 0.022, 0, 0.32) + run.eliteBonus;
    let t = 0.5;
    while (budget > 0) {
      const [k, d] = rng.weighted(avail, ([, d]) => d.w * (n - d.wave < 4 ? 1.8 : 1) * (d.cost > budget + 1 ? 0.05 : 1));
      const group = d.group || 1;
      for (let i = 0; i < group; i++) this.queue.push({ key: k, delay: t + i * 0.2, elite: rng() < eliteChance && group === 1 });
      budget -= d.cost * group;
      t += frand(0.4, 1.4) * Math.max(0.45, 1 - n * 0.02);
    }
    // a guaranteed named elite every 5th wave
    if (n % 5 === 0) this.queue.push({ key: rng.weighted(avail.filter(([, d]) => d.cost >= 2), ([, d]) => d.w)[0], delay: t * 0.6, elite: true, named: true });
    this.queue.sort((a, b) => a.delay - b.delay);
    this.total = this.queue.length;
    this.maxAlive = Math.round(Math.min(7 + n * 0.6, g.quality === 'low' ? 15 : 22));
  }

  spawnBoss(key, level) {
    const g = this.game;
    if (!g.run || !this.active) return;
    const e = g.spawnEnemy(key, { x: 0, z: -g.world.radius * 0.6, mode: key === 'golden_knight' ? 'portal' : 'sky', level, boss: true });
    if (!e) return;
    const loop = Math.floor((this.n - 1) / 40);
    // bosses scale gentler than regular enemies so fights stay ~1 minute
    e.maxHp = e.def.hp * 0.7 * (1 + (level.hp - 1) * 0.3) * (1 + loop * 0.7) * g.run.modeMul * (g.run.mode === 'casual' ? 0.7 : 1); e.hp = e.maxHp;
    e.dmgMul = 0.8 * (1 + (level.dmg - 1) * 0.6) * (1 + loop * 0.25) * (g.run.mode === 'casual' ? 0.7 : 1);
    this.bossEnemy = e;
    g.ui.bossIntro(e); g.ui.bossHp(e);
    Audio2.sting('boss'); Audio2.roar(0.6);
    g.music('boss');
    g.slowmo(1.2, 0.35);
    g.camFocus(e, 2.2);
  }

  get remaining() { return this.queue.length + this.game.enemies.filter((e) => !e.dead && !e.summoned).length; }

  update(dt) {
    if (!this.active) return;
    const g = this.game, run = g.run;
    this.t += dt;
    if (this.bossPending && this.t >= this.bossPending.at) { const b = this.bossPending; this.bossPending = null; this.spawnBoss(b.key, b.level); if (!this.bossEnemy) this.bossPending = { ...b, at: this.t + 0.5 }; }
    const alive = g.enemies.filter((e) => !e.dead).length;
    // spawn from the queue (respecting the alive cap)
    while (this.queue.length && this.queue[0].delay <= this.t && alive < this.maxAlive) {
      const q = this.queue.shift();
      const e = g.spawnFromGate(q.key, q);
      if (!e) continue;
      if (q.elite || q.named) e.makeElite(run.rng, q.named);
      if (q.elite || q.named) { e.hp = e.maxHp; g.ui.eliteSpawn(e); }
      if (q.thief) { e.thief = true; e.name = 'Treasure Goblin'; e.maxHp *= 3; e.hp = e.maxHp; e.speedMul *= 1.4; e.setTint(0x6a5200, 0.6); e.fleeT = 16; g.ui.eliteSpawn(e); }
      if (q.champion) { e.champion = true; e.makeElite(run.rng, true); e.hp = e.maxHp; g.ui.eliteSpawn(e); }
      break; // at most one per frame
    }
    if (this.queue.length && this.queue[0].delay <= this.t && alive >= this.maxAlive) this.t -= dt; // hold the clock
    // treasure goblin runs away from the hero and escapes after a while
    for (const e of g.enemies) if (e.thief && !e.dead) {
      e.fleeT -= dt;
      if (e.fleeT <= 0) { g.ui.toast('💨 The treasure goblin escaped!'); g.fx.smoke(e.pos, 12, 0.1); e.dead = true; e.removed = true; e.root.visible = false; }
    }
    // hazards
    if (this.n >= 10 || this.event === 'barrage') {
      this.hazardT -= dt;
      if (this.hazardT <= 0) {
        this.hazardT = this.event === 'barrage' ? frand(0.6, 1.2) : frand(7, 12) / (1 + (this.n - 10) * 0.03);
        const h = g.hero.pos;
        const near = Math.random() < 0.6;
        const x = near ? h.x + frand(-3, 3) : frand(-1, 1) * g.world.radius * 0.8, z = near ? h.z + frand(-3, 3) : frand(-1, 1) * g.world.radius * 0.8;
        g.combat.fallingRock('boulder', x, z, 2.4, 18 * g.levelFor(this.n).dmg, 1.4);
      }
    }
    if (this.n >= 20 && Math.random() < dt * 0.06) {
      const a = Math.random() * 6.28, d = Math.random() * g.world.radius * 0.8;
      g.combat.hazards.push({ kind: 'fire', x: Math.sin(a) * d, z: Math.cos(a) * d, r: 1.8, t: 7, dps: 10 * g.levelFor(this.n).dmg });
    }
    if (this.n >= 30) {
      g.world.fogWall.visible = true;
      g.world.shrink = Math.max(0.68, 1 - (this.t / 90) * 0.32);
      if (Math.hypot(g.hero.pos.x, g.hero.pos.z) > g.world.effectiveRadius - 0.8) g.hero.receive(25 * dt, null, { unblockable: true });
    }
    // wave complete?
    if (!this.queue.length && alive === 0 && this.t > 1.5 && !this.bossPending) { this.active = false; g.onWaveCleared(); }
  }

  // ---------------- boss behaviour on top of normal enemy AI ----------------
  bossAI(e, dt) {
    const g = this.game, hero = g.hero, hpK = e.hp / e.maxHp;
    if (e.def.boss === 'golden') {
      if (e.bossPhase === 1 && hpK < 0.5) {
        e.bossPhase = 2; e.atkSpeed = 1.3; e.speedMul *= 1.2; e.setTint(0xff5a10, 0.5);
        g.ui.announce('THE GOLDEN KNIGHT IS ENRAGED', 'boss'); Audio2.roar(0.5); g.shake(0.6);
        g.combat.summon(e, 'skel_minion', 2);
        g.hero.heal(g.hero.maxHp * 0.2); g.ui.toast('💚 A second wind fills you (+20% health)');
      }
      if (e.bossPhase === 2 && Math.random() < dt * 4) g.fx.fire({ x: e.pos.x, y: 1.5, z: e.pos.z }, 1, 0.6);
      // he blocks a lot: you must parry or flank him
      if (e.state === 'chase' && e.guardT <= 0 && e.dist(hero) < 4 && hero.state === 'attack' && hero.stateT < 0.1 && Math.random() < 0.25) e.guard(0.9);
    } else if (e.def.boss === 'drake') {
      // lands to rest after dives (vulnerable)
      if (e.state === 'chase' && e._lastAtk === 'dive' && !e.resting) { e.resting = 2.8; e._lastAtk = null; }
      if (e.resting > 0 && e.state !== 'attack') {
        e.resting -= dt; e.flyOverride = 0.7; e.vel.set(0, 0, 0); e.skipThink = true; e.vulnerable = true;
        if (Math.random() < dt * 3) g.fx.smoke({ x: e.pos.x, y: 0.5, z: e.pos.z }, 1, 0.2);
        if (e.resting <= 0) { e.flyOverride = null; e.resting = 0; e.vulnerable = false; e.cd = 0.5; }
      }
      if (e.state === 'attack') e._lastAtk = e.atk.kind;
      if (e.bossPhase === 1 && hpK < 0.5) { e.bossPhase = 2; e.atkSpeed = 1.25; g.ui.announce('VYRMAX TAKES TO THE SKY', 'boss'); Audio2.roar(0.6); g.combat.summon(e, 'bat', 6); }
    } else if (e.def.boss === 'dragon') {
      if (e.bossPhase === 1 && hpK < 0.66) { e.bossPhase = 2; e.flying = 0.2; g.ui.announce('NYXTHARA LANDS', 'boss'); g.shake(1); Audio2.roar(0.7); g.fx.dust(e.pos, 40, 4); }
      if (e.bossPhase === 2 && hpK < 0.33) {
        e.bossPhase = 3; e.atkSpeed = 1.35; e.speedMul *= 1.25; e.setTint(0x8a10ff, 0.7);
        g.ui.announce('THE ARENA BURNS', 'boss'); Audio2.roar(0.8); g.world.fogWall.visible = true; g.world.shrink = 0.78;
        g.combat.summon(e, 'ghost_skull', 4);
      }
      if (e.bossPhase === 1) { // circles the arena, prefers ranged attacks
        e.flying = 4.5;
        if (e.state === 'chase') {
          const a = Math.atan2(e.pos.x, e.pos.z) + dt * 0.35, r = g.world.radius * 0.75;
          const tx = Math.sin(a) * r, tz = Math.cos(a) * r;
          e.vel.set((tx - e.pos.x) * 2, 0, (tz - e.pos.z) * 2);
          e.facing = e.angleTo(hero); e.cd -= dt;
          if (e.cd <= 0) e.startAttack(e.def.attacks[Math.random() < 0.6 ? 3 : 2]);
          else { e.skipThink = true; e.play(e.def.anims.run); }
        }
      }
      if (e.bossPhase === 3 && Math.random() < dt * 0.4) g.combat.meteors(e, { count: 3, aoe: 2.4, dmg: 0.8 });
    } else if (e.def.boss === 'behemoth') {
      // freezing aura: the closer you are, the slower you move
      if (e.dist(hero) < 7) { hero.status.slow = 0.2; hero.status.slowAmt = 0.25; }
      if (Math.random() < dt * 6) { const a = Math.random() * 6.28; g.fx.add.emit(e.pos.x + Math.sin(a) * 4, 0.3, e.pos.z + Math.cos(a) * 4, 0, 1, 0, 0.6, 0.85, 1, 0.4, 1); }
      if (e.bossPhase === 1 && hpK < 0.5) {
        e.bossPhase = 2; e.atkSpeed = 1.3; e.speedMul *= 1.3; e.setTint(0x2a6aff, 0.5);
        g.ui.announce('GORRATH SHATTERS THE GROUND', 'boss'); Audio2.roar(0.8); g.shake(1);
        g.combat.summon(e, 'yeti', 1);
      }
    }
  }
}
