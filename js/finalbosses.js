// Wave 90 (Vex the Shade) and wave 100 (the Eternal King): the two story bosses.
// Both are scaled to the player's own build when they appear, so the fight is decided by skill:
// Vex is tuned to be beaten by roughly one player in four, the King by about one in fifty.
import * as THREE from 'three';
import { Audio2 } from './audio.js?v=202611161136';
import { angleDiff, frand } from './util.js?v=202611161136';

const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));

// ---------------------------------------------------------------- helpers
function heroDps(h) {
  const st = h.stats;
  return st.dmg * (st.atkSpeed || 1) * (1 + (st.crit || 0) * ((st.critMul || 2) - 1));
}
// damage per hit as a share of the hero's max health
function setHitShare(e, h, share) { e.dmgMul = (h.maxHp * share) / e.def.dmg; }

export function addEyes(e, color) {
  if (e._eyes) return;
  const g = e.game; let head = null;
  e.model.traverse((c) => { if (!head && /^head$/i.test(c.name)) head = c; });
  e.root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(e.model);
  const H = bb.max.y - bb.min.y, y = bb.max.y - H * (e.def.boss === 'king' ? 0.35 : 0.32);
  const fwd = new THREE.Vector3(Math.sin(e.facing), 0, Math.cos(e.facing)), right = new THREE.Vector3(fwd.z, 0, -fwd.x);
  const geo = new THREE.SphereGeometry(H * 0.022, 10, 8), mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  e._eyes = [];
  for (const sd of [-1, 1]) {
    const eye = new THREE.Mesh(geo, mat); eye.scale.set(1.6, 0.6, 1);
    const glow = new THREE.Mesh(geo, glowMat); glow.scale.setScalar(2.2); eye.add(glow);
    eye.position.set(e.pos.x + right.x * H * 0.075 * sd + fwd.x * H * 0.16, y, e.pos.z + right.z * H * 0.075 * sd + fwd.z * H * 0.16);
    g.scene.add(eye); (head || e.root).attach(eye); e._eyes.push(eye);
  }
}
export function addCrown(e) {
  if (e._crown) return;
  const g = e.game; let head = null;
  e.model.traverse((c) => { if (!head && /^head$/i.test(c.name)) head = c; });
  e.root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(e.model), H = bb.max.y - bb.min.y;
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c040, metalness: 0.9, roughness: 0.25, emissive: 0x5a3000, side: THREE.DoubleSide });
  const crown = new THREE.Group(), R = H * 0.085;
  crown.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.05, H * 0.04, 20, 1, true), gold));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(H * 0.016, H * 0.06, 5), gold); sp.position.set(Math.sin(a) * R, H * 0.045, Math.cos(a) * R); crown.add(sp); }
  crown.position.set(e.pos.x, bb.max.y - H * 0.03, e.pos.z);
  g.scene.add(crown); (head || e.root).attach(crown); e._crown = crown;
}
export function removeEyes(e) { for (const m of e._eyes || []) m.parent?.remove(m); e._eyes = null; }

// subtitles: a short speech, one line after another, while the game keeps running
export function speak(g, lines, who = '') {
  g.ui.speech(lines.map((l) => ({ who, text: l })));
}

// ---------------------------------------------------------------- story lines
export const STORY = {
  golden: ['You again… how many times must we do this?'],
  dragon: ['The King sends his regards… Warden.'],
  warlord: ['You fight so well. Just like he did.'],
  vex: ['I followed you once, Warden.', 'I saw what you become.', "I'm sorry, friend."],
  kingSelf: ['I am you, Warden. A thousand years from now.', 'I held this gate until eternity broke me.', 'I became the King… and the King sends the siege.', 'Every monster you slew, I sent — to make you strong enough to take my place.', 'Now prove it. Kill me… or become me.'],
  kingOther: ['You are not the Warden… but you will do.', 'I held this gate until eternity broke me.', 'Someone must wear the crown when I fall.', 'Prove you are worthy. Kill me… or kneel.'],
  kingMirror: ['You face your own reflection.'],
  kingLose: 'Not yet. You are not ready. Again.',
  kingWin: ['The cycle… is broken.'],
};

// ---------------------------------------------------------------- Vex
export function setupVex(g, e) {
  const h = g.hero;
  e.maxHp = heroDps(h) * 70; e.hp = e.maxHp;
  setHitShare(e, h, 0.15);
  e.atkSpeed = 1.1; e.lastHurt = g.time; e.cloneT = 7; e.veilT = 9; e.noDashT = 0; e.retreatT = 0;
  e.habit = { left: 0, right: 0 }; e._lastHeroState = null;
  e.setTint(0x4a0a9a, 0.4);
  addEyes(e, e.def.eyes);
  speak(g, STORY.vex, 'Vex');
}

function spawnClones(g, e, n) {
  const lvl = g.levelFor(g.run.wave), h = g.hero;
  g.ui.announce('THE SHADE DIVIDES', 'boss', 1.4); Audio2.magic(0.35, 0.5); g.shake(0.35);
  e.noDashT = 2.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + frand(-0.2, 0.2), d = frand(5, 9);
    const c = g.spawnEnemy('vex_clone', { x: h.pos.x + Math.sin(a) * d, z: h.pos.z + Math.cos(a) * d, mode: 'portal', level: lvl });
    if (!c) continue;
    c.maxHp = e.maxHp * 0.012; c.hp = c.maxHp; setHitShare(c, h, 0.035);
    c.cloneOf = e; c.born = g.time; c.tier = 3; c.cd = frand(0.6, 2);
    c.setTint(0x6a1aff, 0.35); c.setOpacity(0.62);
  }
}

// a clone that lives too long rejoins Vex and heals him
function mergeClone(g, c, boss) {
  g.fx.magic({ x: c.pos.x, y: 1.2, z: c.pos.z }, [0.7, 0.3, 1], 12, 4);
  c.dead = true; c.alive = false; c.removed = true;
  if (!boss.dead) { const heal = boss.maxHp * 0.012; boss.hp = Math.min(boss.maxHp, boss.hp + heal); g.fx.number(boss.pos, '+' + Math.round(heal), 'heal'); g.ui.bossHp(boss); }
}

export function onCloneKilled(g, c) {
  const b = c.cloneOf;
  if (!b || b.dead) return;
  g.combat.dealToEnemy(b, b.maxHp * 0.012, null, { dot: true, color: 'crit' });
  g.fx.trail?.({ x: b.pos.x, y: 1.5, z: b.pos.z }, [0.7, 0.3, 1], 6, 0.3);
}

export function vexAI(g, e, dt) {
  const h = g.hero, hpK = e.hp / e.maxHp, dist = e.dist(h);
  // regeneration: stop hitting him for 3 s and he heals 2% a second
  if (g.time - e.lastHurt > 3 && e.hp < e.maxHp) {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
    if (Math.random() < dt * 3) g.fx.magic({ x: e.pos.x, y: 1.5, z: e.pos.z }, [0.6, 0.2, 1], 3, 2);
    g.ui.bossHp(e);
  }
  // the real Vex has a faint purple glow and shadow smoke; his clones don't
  if (Math.random() < dt * 6) g.fx.magic({ x: e.pos.x + frand(-0.6, 0.6), y: frand(0.3, 2.4), z: e.pos.z + frand(-0.6, 0.6) }, [0.6, 0.2, 1], 1, 1);
  // phase 2
  if (e.bossPhase === 1 && hpK < 0.5) {
    e.bossPhase = 2; e.atkSpeed *= 1.25; e.speedMul *= 1.15; e.cloneT = Math.min(e.cloneT, 2);
    g.ui.announce('THE SHADE UNLEASHED', 'boss'); Audio2.roar(0.7); g.shake(0.8); e.setTint(0x9a2aff, 0.7);
  }
  // mirror clones
  e.cloneT -= dt;
  if (e.cloneT <= 0 && e.state !== 'attack') { spawnClones(g, e, e.bossPhase === 2 ? 15 : 12); e.cloneT = e.bossPhase === 2 ? 15 : 20; }
  for (const c of g.enemies) if (c.cloneOf === e && !c.dead && g.time - c.born > 10) mergeClone(g, c, e);
  // shadow veil: half-invisible for 2 s while repositioning
  e.veilT -= dt;
  if (e.veilT <= 0 && e.state === 'chase') { e.veiled = 2; e.veilT = frand(8, 12); g.fx.smoke(e.pos, 10, 0.08); Audio2.magic(0.15, 1.6); }
  if (e.veiled > 0) { e.veiled -= dt; e.setOpacity(e.veiled > 0 ? 0.3 : 1); }
  // no phantom dash while a clone wave is forming (gives the player a breather)
  e.noDashT -= dt;
  if (e.noDashT > 0 && e.state === 'chase') e.cd = Math.max(e.cd, 0.3);
  // human-like reading: learn which way the hero dodges, punish whiffs and spent dodges
  if (h.state === 'dodge' && e._lastHeroState !== 'dodge') {
    const side = angleDiff(e.angleTo(h), Math.atan2(h.vel.x, h.vel.z)) > 0 ? 'left' : 'right'; e.habit[side]++;
  }
  const punish = (e._lastHeroState === 'dodge' && h.state !== 'dodge') || (h.state === 'attack' && h.stateT > 0.35);
  if (punish && dist < 6 && e.state === 'chase' && Math.random() < 0.6) e.cd = Math.min(e.cd, 0.08);
  e._lastHeroState = h.state;
  // at low health he backs off behind his clones to regenerate
  const clones = g.enemies.filter((c) => c.cloneOf === e && !c.dead).length;
  if (hpK < 0.3 && clones >= 4 && dist < 5 && e.retreatT <= 0 && Math.random() < dt * 0.6) e.retreatT = 1.6;
  if (e.retreatT > 0 && e.state === 'chase') {
    e.retreatT -= dt;
    const a = e.angleTo(h) + Math.PI + Math.sin(e.t * 2) * 0.6, sp = e.def.speed * 1.2;
    e.vel.set(Math.sin(a) * sp, 0, Math.cos(a) * sp); e.skipThink = true; e.play(e.def.anims.run);
  }
}

// ---------------------------------------------------------------- the Eternal King
const CRYSTAL_GEO = new THREE.OctahedronGeometry(0.75, 0);
function makeCrystal(g, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xff4a00, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.15 });
  const mesh = new THREE.Mesh(CRYSTAL_GEO, mat); mesh.scale.set(1, 1.7, 1); mesh.castShadow = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 40), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -1.9; mesh.add(ring);
  mesh.position.set(x, 2.1, z); g.scene.add(mesh);
  return { mesh, mat, pos: { x, z }, r: 1.1, hp: 1, maxHp: 1, alive: true, shieldT: 0, prop: 'crystal' };
}

function placeCrystals(g, e) {
  clearCrystals(g, e);
  const R = g.world.effectiveRadius * 0.55, a0 = Math.random() * Math.PI * 2;
  e.crystals = [0, 1, 2].map((i) => { const a = a0 + (i / 3) * Math.PI * 2; return makeCrystal(g, Math.sin(a) * R, Math.cos(a) * R); });
  const hpEach = heroDps(g.hero) * 3.2;
  for (const c of e.crystals) { c.hp = c.maxHp = hpEach; c.owner = e; }
  g.props = (g.props || []).filter((p) => p.owner !== e).concat(e.crystals);
  e.immortal = true; e.lockHp = e.hp;
  Audio2.magic(0.4, 0.5); g.ui.announce('THE CRYSTALS BURN AGAIN', 'boss', 1.4);
}

export function clearCrystals(g, e) {
  for (const c of e?.crystals || []) { c.alive = false; g.scene.remove(c.mesh); }
  if (e) e.crystals = [];
  if (g.props) g.props = g.props.filter((p) => p.alive);
}

// hero hits a crystal (melee or projectile)
export function hitProp(g, p, dmg) {
  if (!p.alive) return;
  const k = p.shieldT > 0 ? 0.2 : 1;
  dmg = Math.max(1, Math.round(dmg * k));
  p.hp -= dmg;
  g.fx.number(new THREE.Vector3(p.pos.x, 0, p.pos.z), p.shieldT > 0 ? 'SHIELDED' : String(dmg), p.shieldT > 0 ? 'miss' : '');
  g.fx.sparks({ x: p.pos.x, y: 2, z: p.pos.z }, 8, [1, 0.7, 0.2], 5); Audio2.play('glass', { vol: 0.5 });
  const e = p.owner;
  if (p.hp <= 0) {
    p.alive = false; g.scene.remove(p.mesh);
    g.fx.explosion({ x: p.pos.x, y: 2, z: p.pos.z }, 3, [1, 0.6, 0.2]); g.shake(0.5); Audio2.boom(0.5, 0.8);
    g.props = g.props.filter((q) => q.alive);
    const left = e.crystals.filter((c) => c.alive);
    if (!left.length) kingWindow(g, e);
    else if (left.length === 1) g.ui.toast('One crystal left. He will guard it with his life.');
  } else if (e && !e.dead) {
    // AI: protect the next-weakest crystal, and come to defend this one
    const others = e.crystals.filter((c) => c.alive && c !== p).sort((a, b) => a.hp - b.hp);
    if (others[0] && others[0].shieldT <= 0) { others[0].shieldT = 2.5; }
    e.defend = p;
  }
}

function kingWindow(g, e) {
  e.immortal = false; e.windowT = e.bossPhase >= 3 ? 6 : 8;
  g.ui.announce('HIS REGENERATION FALTERS — STRIKE NOW', 'gold', 2.2); Audio2.sting('good'); g.slowmo(0.6, 0.35);
  e.staggered(1.0);
  if (e.bossPhase < 3) { // royal guard
    const lvl = g.levelFor(g.run.wave), h = g.hero;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2, m = g.spawnEnemy('champion', { x: e.pos.x + Math.sin(a) * 5, z: e.pos.z + Math.cos(a) * 5, mode: 'portal', level: lvl });
      if (m) { m.maxHp = heroDps(h) * 4; m.hp = m.maxHp; setHitShare(m, h, 0.07); m.name = 'Royal Guard'; }
    }
  }
}

export function setupKing(g, e) {
  const h = g.hero;
  e.maxHp = heroDps(h) * 30; e.hp = e.maxHp;
  setHitShare(e, h, 0.2);
  e.atkSpeed = 1.15; e.learn = 0.15; e.judgeT = 5; e.dashGuardT = 0; e.windowT = 0; e.defend = null; e.chaseT = 0;
  e.state = 'spawning'; e.stateT = 0; e.spawnDur = 4.5; // he speaks first
  e.setTint(0x5a0a00, 0.25);
  addEyes(e, e.def.eyes); addCrown(e);
  placeCrystals(g, e);
  g.ui.toast('Break his three Eternity Crystals to stop his regeneration');
  const self = g.run.heroDef === g.hero.def && g.selHero === 'knight';
  if (self) g.ui.speech([{ who: '', text: STORY.kingMirror[0] }, ...STORY.kingSelf.map((text) => ({ who: 'Your future self', text }))]);
  else speak(g, STORY.kingOther, 'The Eternal King');
}

function judgement(g, e, x, z) {
  const r = 3.0, warn = e.bossPhase >= 3 ? 0.9 : 1.15;
  const tele = g.fx.telegraph({ x, z }, r, warn, [1, 0.12, 0.04]);
  (e.pending ||= []).push({ t: g.time + warn, fn: () => {
    if (tele) tele.visible = false;
    g.combat.enemyAoe(e, { x, z }, r, g.hero.maxHp * 0.48, { unblockable: true, knock: 12 });
    g.fx.explosion({ x, y: 0.5, z }, 4, [1, 0.75, 0.25]); g.fx.shockwave({ x, z }, r * 1.4, [1, 0.6, 0.2]);
    g.fx.sparks({ x, y: 6, z }, 40, [1, 0.85, 0.4], 14);
    g.shake(0.9); Audio2.boom(0.8, 0.55);
  } });
  Audio2.magic(0.3, 0.4);
}

export function kingAI(g, e, dt) {
  const h = g.hero, hpK = e.hp / e.maxHp;
  // timed effects
  if (e.pending?.length) { const now = g.time; e.pending = e.pending.filter((p) => { if (now >= p.t) { if (!e.dead) p.fn(); return false; } return true; }); }
  // crystals: spin, shields fade
  for (const c of e.crystals || []) if (c.alive) {
    c.mesh.rotation.y += dt * 1.6; c.mesh.position.y = 2.1 + Math.sin(g.time * 2 + c.pos.x) * 0.25;
    if (c.shieldT > 0) { c.shieldT -= dt; c.mat.emissive.setHex(0xffffff); c.mat.emissiveIntensity = 2.2; } else { c.mat.emissive.setHex(0xff4a00); c.mat.emissiveIntensity = 1.4; }
    if (Math.random() < dt * 4) g.fx.magic({ x: c.pos.x, y: 2, z: c.pos.z }, [1, 0.6, 0.2], 1, 1);
  }
  // instant regeneration while any crystal stands
  if (e.immortal) {
    if (e.hp < e.lockHp) { e.hp = approach(e.hp, e.lockHp, e.maxHp * 0.6 * dt); g.ui.bossHp(e); if (Math.random() < dt * 6) g.fx.magic({ x: e.pos.x, y: 1.6, z: e.pos.z }, [1, 0.75, 0.2], 3, 3); }
  } else if (e.windowT > 0) {
    e.windowT -= dt;
    if (e.windowT <= 0 && !e.dead) placeCrystals(g, e);
  }
  // phases
  if (e.bossPhase === 1 && hpK < 0.6) { e.bossPhase = 2; e.atkSpeed *= 1.12; g.ui.announce('THE KING DRAWS ON ETERNITY', 'boss'); Audio2.roar(0.8); }
  if (e.bossPhase === 2 && hpK < 0.25) {
    e.bossPhase = 3; e.atkSpeed *= 1.2; e.speedMul *= 1.15; e.judgeT = Math.min(e.judgeT, 2);
    g.ui.announce('LAST STAND', 'boss', 2); Audio2.toll?.(); g.shake(1); e.setTint(0xaa1000, 0.7);
  }
  // judgement: lands where the hero is going, not where he stands
  e.judgeT -= dt;
  if (e.judgeT <= 0 && e.state !== 'spawning') {
    const lead = 0.9, x = h.pos.x + h.vel.x * lead, z = h.pos.z + h.vel.z * lead;
    judgement(g, e, x, z); e.judgeT = e.bossPhase >= 3 ? 5 : frand(7, 9);
  }
  // learns the hero's attack timing: blocks just before the usual combo lands
  if (h.state === 'attack' && h.stateT < 0.06 && e.dist(h) < 4.2 && e.state === 'chase' && e.guardT <= 0) {
    if (Math.random() < e.learn) e.guard(0.7);
    e.learn = Math.min(0.55, e.learn + 0.01);
  }
  // after an Eternal Dash, chain a Judgement onto where it ended
  if (e.state === 'attack' && e.atk?.eternalDash && e.atkT / e.atkDur > 0.95 && !e._chained) { e._chained = true; judgement(g, e, h.pos.x, h.pos.z); }
  if (e.state !== 'attack') e._chained = false;
  // crystal defence
  const alive = (e.crystals || []).filter((c) => c.alive);
  if (e.immortal && alive.length && e.state === 'chase') {
    let guard = e.defend && e.defend.alive ? e.defend : null;
    if (!guard) for (const c of alive) if (Math.hypot(h.pos.x - c.pos.x, h.pos.z - c.pos.z) < 6.5) { guard = c; break; }
    if (alive.length === 1) { // last one: stand next to it, only leave briefly to chase
      const c = alive[0], hd = Math.hypot(h.pos.x - c.pos.x, h.pos.z - c.pos.z);
      if (hd > 9) { e.chaseT += dt; if (e.chaseT > 4) guard = c; } else { e.chaseT = 0; guard = c; }
    }
    if (guard) {
      const far = Math.hypot(e.pos.x - guard.pos.x, e.pos.z - guard.pos.z);
      e.dashGuardT -= dt;
      if (far > 13 && e.dashGuardT <= 0) { // teleport to defend it
        e.dashGuardT = 6; g.fx.smoke(e.pos, 12, 0.1);
        const a = Math.atan2(h.pos.x - guard.pos.x, h.pos.z - guard.pos.z);
        e.pos.x = guard.pos.x + Math.sin(a) * 2.6; e.pos.z = guard.pos.z + Math.cos(a) * 2.6; g.world.resolve(e.pos, e.radius);
        g.fx.explosion({ x: e.pos.x, y: 1, z: e.pos.z }, 2, [1, 0.5, 0.15]); Audio2.boom(0.4, 0.9);
      } else if (e.dist(h) > 3.5) { // step between the hero and the crystal
        const a = Math.atan2(h.pos.x - guard.pos.x, h.pos.z - guard.pos.z), d = Math.min(2.8, Math.hypot(h.pos.x - guard.pos.x, h.pos.z - guard.pos.z) * 0.5);
        const tx = guard.pos.x + Math.sin(a) * d, tz = guard.pos.z + Math.cos(a) * d, dx = tx - e.pos.x, dz = tz - e.pos.z, l = Math.hypot(dx, dz);
        if (l > 0.6) { const sp = e.def.speed * 1.35 * e.speedMul; e.vel.set(dx / l * sp, 0, dz / l * sp); e.facing = Math.atan2(dx, dz); e.play(e.def.anims.run); e.skipThink = true; }
      }
    }
  }
  if (Math.random() < dt * 4) g.fx.fire({ x: e.pos.x + frand(-0.6, 0.6), y: 0.4, z: e.pos.z + frand(-0.6, 0.6) }, 1, 0.3);
}

export function onKingDefeated(g, e) {
  clearCrystals(g, e);
  g.save.flags.eternal = true;
  speak(g, STORY.kingWin, 'The Eternal King');
  g.ui.siegeEnded?.();
}
