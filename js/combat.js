// Damage, projectiles, AoE, hazards and all the upgrade-card effects
import * as THREE from 'three';
import { Assets } from './assets.js?v=202611131113';
import { Audio2 } from './audio.js?v=202611131113';
import { angleDiff, frand } from './util.js?v=202611131113';

const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const PROJ = {
  bolt: { model: 'weapons/arrow_crossbow.glb', len: 0.9, color: [1, 0.85, 0.5], trail: 0.12 },
  arrow: { model: 'weapons/Skeleton_Arrow.glb', len: 0.9, color: [0.7, 0.8, 1], trail: 0.1 },
  dagger: { model: 'weapons/dagger.glb', len: 0.7, color: [0.9, 0.9, 1], trail: 0.12, spin: true },
  arcane: { sphere: 0.24, emissive: 0x8a5cff, color: [0.55, 0.35, 1], trail: 0.35 },
  fireball: { sphere: 0.36, emissive: 0xff6a10, color: [1, 0.45, 0.1], trail: 0.5, fire: true },
  dark: { sphere: 0.3, emissive: 0x7a20ff, color: [0.5, 0.1, 0.9], trail: 0.4 },
  curse: { sphere: 0.3, emissive: 0x33ff66, color: [0.2, 1, 0.4], trail: 0.4 },
  meteor: { sphere: 0.7, emissive: 0xff4a10, color: [1, 0.35, 0.05], trail: 0.8, fire: true },
  boulder: { model: 'env/n_rock_largeA.glb', len: 1.6, color: [0.6, 0.55, 0.5], trail: 0 },
};

export class Combat {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
    this.pool = {};
    this.hazards = [];   // fire patches, falling boulders/meteors
    this.orbits = [];    // orbiting blades card
    this.sphereGeo = new THREE.IcosahedronGeometry(1, 2);
    this.hitCount = 0;
  }

  // ===================== HERO -> ENEMIES =====================
  heroStrike(hero, st, comboIdx, hitIdx) {
    const g = this.game, m = g.run.mods;
    const base = hero.stats.dmg * st.dmg * (hero.wrathT > 0 ? 1.5 : 1) * (hero.riposte > 0 ? 3 : 1);
    if (hero.riposte > 0 && hitIdx === (st.multi || 1) - 1) hero.riposte = 0;
    if (st.proj) { this.heroProjectiles(hero, st, base); return; }
    const range = st.range * (1 + (m.reach || 0)) * (hero.wrathT > 0 ? 1.15 : 1);
    const arc = st.arc * Math.PI / 360;
    const col = hero.wrathT > 0 ? [1, 0.45, 0.1] : m.burn ? [1, 0.55, 0.2] : m.frost ? [0.6, 0.85, 1] : m.chain ? [0.6, 0.8, 1] : [1, 0.9, 0.65];
    g.fx.slash(hero.pos, hero.facing, { radius: range * 0.95, arc: st.arc, tilt: st.tilt || 0, flip: st.flip ^ (hitIdx % 2 === 1), color: col, dur: st.arc >= 300 ? 0.2 : 0.14, height: 1.0 });
    let hits = 0;
    for (const e of g.enemies) {
      if (e.dead || e.state === 'spawning') continue;
      const d = hero.dist(e) - e.radius * e.root.scale.x;
      if (d > range) continue;
      if (st.arc < 300 && Math.abs(angleDiff(hero.facing, hero.angleTo(e))) > arc + 0.15) continue;
      hits++;
      this.dealToEnemy(e, base, hero, { heavy: st.heavy, knock: st.knock || 2.5, combo: comboIdx });
    }
    if (st.aoe) {
      const c = { x: hero.pos.x + Math.sin(hero.facing) * 1.6, z: hero.pos.z + Math.cos(hero.facing) * 1.6 };
      g.fx.shockwave(c, st.aoe, col); g.fx.dust(c, 12, 1.2); g.shake(st.shake || 0.3);
      for (const e of g.enemies) if (!e.dead && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < st.aoe && hero.dist(e) > range) this.dealToEnemy(e, base * 0.6, hero, { knock: st.knock, aoe: true });
      Audio2.play('rock', { vol: 0.5 });
    }
    if (hits) { g.hitstop(st.heavy ? 0.085 : 0.045); if (st.shake) g.shake(st.shake); }
    if (st.heavy && m.whirl) this.pullEnemies(hero.pos, 6.5, hero);
    if (st.heavy && m.quake) { const c = hero.pos; g.fx.shockwave(c, 5, [0.9, 0.7, 0.4]); for (const e of g.enemies) if (!e.dead && hero.dist(e) < 5) this.dealToEnemy(e, base * 0.5 * m.quake, hero, { knock: 8, aoe: true }); }
  }

  heroProjectiles(hero, st, base) {
    const g = this.game, p = st.proj, m = g.run.mods;
    const n = p.count + (m.multishot || 0);
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i / (n - 1) - 0.5) * (p.spread || 0.3) * 2 : 0;
      const yaw = hero.facing + spread;
      this.spawnProj({
        kind: p.kind, team: 'hero', from: hero, dmg: base * (n > p.count ? 0.85 : 1), speed: p.speed,
        x: hero.pos.x + Math.sin(yaw) * 0.8, y: 1.25, z: hero.pos.z + Math.cos(yaw) * 0.8, yaw,
        pierce: p.pierce + (m.pierce || 0), aoe: p.aoe, homing: p.homing, heavy: st.heavy, life: 1.6,
      });
    }
    Audio2.play(p.kind === 'bolt' ? 'swing' : 'swing', { vol: 0.3, rate: 1.4 });
    if (p.kind !== 'bolt') Audio2.magic(0.18, p.kind === 'fireball' ? 0.6 : 1);
    g.fx.magic({ x: hero.pos.x + Math.sin(hero.facing), y: 1.3, z: hero.pos.z + Math.cos(hero.facing) }, PROJ[p.kind].color, 6, 2);
  }

  dealToEnemy(e, dmg, src, o = {}) {
    const g = this.game, run = g.run, m = run ? run.mods : {}, hero = g.hero;
    if (e.dead) return 0;
    if (e.phased && !o.dot) { g.fx.number(e.pos, 'PHASED', 'miss'); return 0; }
    let crit = false;
    if (src === hero && !o.dot) {
      if (Math.random() < hero.stats.crit + (e.status.stagger > 0 ? 0.25 : 0)) { crit = true; dmg *= hero.stats.critMul; }
      if (e.status.stagger > 0) dmg *= 1.5;
      if (e.status.freeze > 0 && m.shatter) dmg *= 2;
      if (m.berserk) dmg *= 1 + (1 - hero.hp / hero.maxHp) * m.berserk;
    }
    // guarding enemies block hits from the front unless the hit is heavy (guard break)
    if (e.guardT > 0 && src && !o.dot && !o.aoe) {
      const front = Math.abs(angleDiff(e.facing, e.angleTo(src))) < 1.3;
      if (front) {
        if (o.heavy || (hero.wrathT > 0)) { e.guardT = 0; e.staggered(1.2); g.fx.sparks({ x: e.pos.x, y: 1.3, z: e.pos.z }, 18, [1, 0.8, 0.3]); g.fx.number(e.pos, 'GUARD BREAK', 'crit'); Audio2.play('parry', { vol: 0.6, rate: 0.7 }); }
        else { g.fx.sparks({ x: e.pos.x, y: 1.3, z: e.pos.z }, 10, [0.8, 0.9, 1]); g.fx.number(e.pos, 'BLOCKED', 'miss'); Audio2.play('block', { vol: 0.7 }); g.hitstop(0.03); return 0; }
      }
    }
    if (e.armor && !(e.status.stagger > 0)) dmg *= 1 - e.armor;
    if (e.def.thorns && src === hero && !o.dot && !o.proj && !o.aoe && hero.state !== 'dead' && g.time > (e._thornT || 0)) {
      e._thornT = g.time + 0.35;
      hero.receive(hero.maxHp * e.def.thorns, e, { unblockable: true, thorns: true, knock: 0 });
      g.fx.sparks({ x: hero.pos.x, y: 1.2, z: hero.pos.z }, 8, [0.5, 1, 0.4], 4);
    }
    if (e.isBoss && e.bossShield) dmg *= 0.2;
    if (e.vulnerable) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.lastHitBy = src;
    run && (run.stats.dealt += dmg);
    // execution: a killing blow on a staggered/frozen enemy
    let execute = false;
    if (src === hero && !o.dot && e.hp > 0 && (e.status.stagger > 0 || e.status.freeze > 0) && e.hp < e.maxHp * (0.18 + (m.execute || 0)) && !e.isBoss) { execute = true; e.hp = 0; }
    // feedback
    const p = { x: e.pos.x, y: 1.1 + e.pivot.position.y, z: e.pos.z };
    e.flash(o.dot ? 0xff6600 : 0xffffff, 0.08);
    g.fx.number(e.pos, (crit ? '' : '') + dmg + (crit ? '!' : ''), o.color || (crit ? 'crit big' : o.dot ? 'dot' : ''));
    if (!o.dot) {
      const mat = e.def.mat;
      if (mat === 'bone') { g.fx.bones(p, 7); Audio2.play('bone', { vol: 0.55 }); }
      else if (mat === 'metal') { g.fx.sparks(p, 12); Audio2.play('hitMetal', { vol: 0.5 }); }
      else if (mat === 'ghost') { g.fx.magic(p, [0.6, 0.5, 1], 8, 3); Audio2.play('glass', { vol: 0.3 }); }
      else { g.fx.blood(p, 9, e.def.blood); Audio2.play('hitFlesh', { vol: 0.55 }); }
      if (crit) { g.fx.sparks(p, 16, [1, 0.95, 0.5], 9); Audio2.play('slash', { vol: 0.5 }); }
      if (src === hero) {
        hero.addWrath((o.aoe ? 1.5 : 3.2) * (crit ? 1.5 : 1));
        // knockback
        if (o.knock) { const a = Math.atan2(e.pos.x - hero.pos.x, e.pos.z - hero.pos.z), k = o.knock * (1 - e.mass); e.knock.set(Math.sin(a) * k, 0, Math.cos(a) * k); }
        // light enemies flinch
        if (e.mass < 0.45 && e.hp > 0 && !e.isBoss && (e.state !== 'attack' || o.heavy || e.mass < 0.2)) { e.state = 'chase'; e.atk = null; e.hitstun = o.heavy ? 0.45 : 0.22; if (e.def.anims.hit) e.play(e.def.anims.hit, { once: true, restart: true, fade: 0.04 }); if (e.tele) { e.tele.visible = false; e.tele = null; } }
        this.onHitEffects(e, dmg, o);
      }
    }
    if (e.hp <= 0) this.kill(e, src, { execute, crit });
    else if (e.isBoss) g.ui.bossHp(e);
    return dmg;
  }

  onHitEffects(e, dmg, o) {
    const g = this.game, m = g.run.mods, hero = g.hero;
    this.hitCount++;
    if (m.burn) { e.status.burn = 3; e.status.burnDps = hero.stats.dmg * 0.35 * m.burn * (m.firestorm ? 1.5 : 1); }
    if (m.frost && Math.random() < 0.18 * m.frost && !e.isBoss) this.freeze(e, 1.2 + (m.blizzard ? 0.8 : 0));
    if (m.chain && this.hitCount % Math.max(2, 4 - m.chain) === 0 && !o.chained) this.chainLightning(e, hero.stats.dmg * 0.7 * (m.firestorm ? 1.5 : 1), 3 + m.chain);
    if (m.leech) hero.heal(dmg * 0.04 * m.leech);
  }

  freeze(e, t) {
    e.status.freeze = t; e.setTint(0x88ccff, 0.8); e.vel.set(0, 0, 0);
    if (e.state === 'attack') { e.state = 'chase'; e.atk = null; if (e.tele) { e.tele.visible = false; e.tele = null; } }
    this.game.fx.magic({ x: e.pos.x, y: 1, z: e.pos.z }, [0.6, 0.85, 1], 10, 2);
    Audio2.play('glass', { vol: 0.35, rate: 1.3 });
  }

  chainLightning(start, dmg, jumps) {
    const g = this.game; let cur = start; const hit = new Set([start]);
    for (let i = 0; i < jumps; i++) {
      let best = null, bd = 7;
      for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = cur.dist(e); if (d < bd) { bd = d; best = e; } }
      if (!best) break;
      g.fx.lightning({ x: cur.pos.x, y: 1.3 + cur.pivot.position.y, z: cur.pos.z }, { x: best.pos.x, y: 1.3 + best.pivot.position.y, z: best.pos.z });
      hit.add(best); this.dealToEnemy(best, dmg, g.hero, { chained: true, color: 'shock' });
      if (g.run.mods.firestorm) { best.status.burn = 3; best.status.burnDps = g.hero.stats.dmg * 0.4; }
      cur = best;
    }
    Audio2.magic(0.2, 1.8);
  }

  pullEnemies(c, r, hero) {
    for (const e of this.game.enemies) {
      if (e.dead || e.isBoss) continue;
      const dx = c.x - e.pos.x, dz = c.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d < r && d > 1.2) { e.knock.set(dx / d * 12 * (1 - e.mass), 0, dz / d * 12 * (1 - e.mass)); if (this.game.run.mods.blizzard) this.freeze(e, 1.4); }
    }
    this.game.fx.shockwave(c, r, [0.7, 0.9, 1]);
  }

  shockwave(src, c, r, dmg, knock) {
    this.game.fx.shockwave(c, r, [1, 0.7, 0.3]);
    for (const e of this.game.enemies) {
      if (e.dead || e.state === 'spawning') continue;
      const d = Math.hypot(e.pos.x - c.x, e.pos.z - c.z);
      if (d < r) {
        this.dealToEnemy(e, dmg, src, { knock, aoe: true, heavy: true });
        const a = Math.atan2(e.pos.x - c.x, e.pos.z - c.z), k = knock * (1 - e.mass);
        e.knock.set(Math.sin(a) * k, 0, Math.cos(a) * k);
      }
    }
    for (const p of this.projectiles) if (p.team === 'enemy' && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < r) this.killProj(p);
  }

  frostNova(c, r, hero) {
    this.game.fx.shockwave(c, r, [0.6, 0.85, 1]);
    for (const e of this.game.enemies) if (!e.dead && !e.isBoss && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < r) this.freeze(e, 1.0);
  }

  parried(e) {
    const g = this.game, hero = g.hero, m = g.run.mods;
    g.run.stats.parries++;
    hero.riposte = 1.4; hero.addWrath(18);
    e.staggered(e.isBoss ? 1.6 : 1.8);
    hero.play(hero.def.riposte, { once: true, restart: true, dur: 0.35, fade: 0.04 });
    setTimeout(() => { if (hero.state === 'block') hero.play(hero.def.block, { fade: 0.12 }); }, 380);
    const p = { x: (hero.pos.x + e.pos.x) / 2, y: 1.4, z: (hero.pos.z + e.pos.z) / 2 };
    g.fx.sparks(p, 30, [1, 0.95, 0.6], 11); g.fx.shockwave(hero.pos, 2.5, [1, 0.95, 0.7]); g.fx.flash(p, [1, 0.9, 0.6], 4, 0.25);
    g.slowmo(0.55, 0.22); g.shake(0.35); g.hitstop(0.08);
    Audio2.play('parry', { vol: 0.9 });
    g.ui.announce('PERFECT PARRY', 'parry', 0.8);
    const a = hero.angleTo(e), k = 9 * (1 - e.mass);
    e.knock.set(Math.sin(a) * k, 0, Math.cos(a) * k);
    if (m.riposteWave) this.shockwave(hero, hero.pos, 4.5, hero.stats.dmg * 1.5 * m.riposteWave, 12);
    if (m.parryHeal) hero.heal(hero.maxHp * 0.05 * m.parryHeal);
  }

  perfectDodge(hero) {
    const g = this.game, m = g.run.mods;
    hero.addWrath(8);
    if (m.shadowStep) { g.slowmo(0.4, 0.4); g.fx.magic({ x: hero.pos.x, y: 1, z: hero.pos.z }, [0.5, 0.3, 0.9], 14, 3); }
  }

  kill(e, src, { execute, crit } = {}) {
    const g = this.game, hero = g.hero, run = g.run, m = run.mods;
    if (e.dead) return;
    e.dead = true; e.alive = false; e.deathT = 0; e.state = 'dead'; e.vel.set(0, 0, 0);
    if (e.tele) { e.tele.visible = false; e.tele = null; }
    if (e.def.anims.death) e.play(e.def.anims.death, { once: true, restart: true, fade: 0.08 });
    else { e.pivot.rotation.x = -Math.PI / 2; }
    run.stats.kills++; g.save.stats.kills++;
    const val = Math.round((e.def.cost || 10) * 10 * (e.elite ? 3 : 1) * (1 + run.wave * 0.08));
    run.score += val;
    g.ui.killFeed(e, val);
    g.streak(e);
    if (e.def.mat === 'bone' && e.def.ground) g.corpses.push({ key: e.key, x: e.pos.x, z: e.pos.z, t: g.time, enemy: e });
    if (execute) {
      g.slowmo(0.45, 0.18); g.shake(0.4);
      g.fx.number(e.pos, 'EXECUTED', 'crit big'); g.fx.sparks({ x: e.pos.x, y: 1.2, z: e.pos.z }, 30, [1, 0.3, 0.1], 10);
      hero.heal(hero.maxHp * (0.05 + (m.reaper ? 0.15 : 0)));
      Audio2.play('slash', { vol: 0.8, rate: 0.7 });
      run.stats.executions++;
    }
    if (m.lifesteal) hero.heal(m.lifesteal * 3);
    if (m.soulburst && Math.random() < 0.25 * m.soulburst) this.shockwave(hero, e.pos, 3, hero.stats.dmg * 0.8, 6);
    if (e.explosive) {
      const c = { x: e.pos.x, z: e.pos.z };
      const t = g.fx.telegraph(c, 2.8, 0.7, [1, 0.3, 0.05]);
      this.hazards.push({ kind: 'bomb', x: c.x, z: c.z, r: 2.8, t: 0.7, dmg: e.dmg * 1.4, tele: t });
    }
    if (e.def.traits?.includes('splitter') && !e.isSplit) {
      for (let i = 0; i < 2; i++) {
        const s = g.spawnEnemy('slime', { x: e.pos.x + frand(-1, 1), z: e.pos.z + frand(-1, 1), mode: 'instant', level: g.levelFor(run.wave) });
        if (s) { s.isSplit = true; s.root.scale.setScalar(0.55); s.maxHp *= 0.35; s.hp = s.maxHp; s.radius *= 0.6; }
      }
    }
    if (e.elite) { run.shardsBonus += 3; g.fx.magic({ x: e.pos.x, y: 1.2, z: e.pos.z }, [1, 0.8, 0.3], 30, 5); Audio2.play('coins', { vol: 0.6 }); }
    if (e.isBoss) g.onBossDefeated(e);
    if (e.thief) g.onThiefCaught(e);
    if (e.champion) g.onChampionDefeated(e);
  }

  // ===================== ENEMIES -> HERO =====================
  enemyAoe(e, c, r, dmg, { unblockable = false, knock = 6, freeze = 0 } = {}) {
    const hero = this.game.hero;
    if (Math.hypot(hero.pos.x - c.x, hero.pos.z - c.z) < r + hero.radius) {
      const res = hero.receive(dmg, e, { unblockable, knock });
      if (res === 'parry') this.parried(e);
      if (res === 'hit' && freeze) { hero.status.slow = freeze; hero.status.slowAmt = 0.6; }
    }
  }

  enemyProjectile(e, a, spread = 0) {
    const g = this.game, hero = g.hero;
    // lead the target a little at higher tiers
    const lead = e.tier >= 3 ? 0.35 : 0;
    const tx = hero.pos.x + hero.vel.x * lead, tz = hero.pos.z + hero.vel.z * lead;
    const yaw = Math.atan2(tx - e.pos.x, tz - e.pos.z) + spread;
    const h = e.flying ? e.pivot.position.y + 0.6 : e.height * 0.65 * e.root.scale.x;
    this.spawnProj({ kind: a.proj, team: 'enemy', from: e, dmg: e.dmg * (a.dmg || 1), speed: a.speed * (1 + e.tier * 0.06), x: e.pos.x + Math.sin(yaw) * 0.8, y: h, z: e.pos.z + Math.cos(yaw) * 0.8, yaw, aoe: a.aoe, slow: a.slow, homing: a.homing, life: a.homing ? 3.5 : 3, dropTo: 1.1 });
    if (a.proj === 'fireball') Audio2.fire(0.25, 0.5); else if (a.proj === 'arrow') Audio2.play('swing', { vol: 0.25, rate: 1.6 }); else Audio2.magic(0.15, 0.7);
  }

  spawnProj(o) {
    const g = this.game, def = PROJ[o.kind];
    let mesh = (this.pool[o.kind] || []).pop();
    if (!mesh) {
      if (def.model) {
        mesh = new THREE.Group(); const inner = Assets.clone(def.model);
        const box = new THREE.Box3().setFromObject(inner); const s = def.len / Math.max(...box.getSize(_v).toArray());
        inner.scale.setScalar(s); inner.rotation.x = Math.PI / 2; mesh.add(inner);
      } else {
        mesh = new THREE.Mesh(this.sphereGeo, new THREE.MeshBasicMaterial({ color: def.emissive }));
        mesh.scale.setScalar(def.sphere);
        // no per-projectile lights: adding a light forces every shader to recompile (1-3s freeze on phones)
      }
      g.scene.add(mesh);
    }
    mesh.visible = true;
    if (mesh.userData.glow) mesh.userData.glow.intensity = 6;
    const p = { ...o, mesh, def, pos: new THREE.Vector3(o.x, o.y, o.z), vel: new THREE.Vector3(Math.sin(o.yaw) * o.speed, o.vy || 0, Math.cos(o.yaw) * o.speed), hit: new Set(), t: 0 };
    mesh.position.copy(p.pos);
    this.projectiles.push(p);
    return p;
  }

  killProj(p, explode = true) {
    p.dead = true; p.mesh.visible = false;
    if (p.mesh.userData.glow) p.mesh.userData.glow.intensity = 0;
    (this.pool[p.kind] ||= []).push(p.mesh);
    if (explode && p.aoe) this.explodeProj(p);
    else if (explode) this.game.fx.magic(p.pos, p.def.color, 6, 2);
  }

  explodeProj(p) {
    const g = this.game, hero = g.hero;
    g.fx.explosion(p.pos, p.aoe, p.def.color); Audio2.boom(0.35, 0.5); g.shake(0.2);
    if (p.team === 'hero') {
      for (const e of g.enemies) if (!e.dead && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < p.aoe + e.radius) this.dealToEnemy(e, p.dmg * (p.hit.has(e) ? 0.5 : 1), hero, { aoe: true, knock: 6 });
    } else if (Math.hypot(hero.pos.x - p.pos.x, hero.pos.z - p.pos.z) < p.aoe + hero.radius) {
      if (!p.hit.has(hero)) hero.receive(p.dmg, p.pos, { unblockable: true, knock: 5 });
    }
    if (p.kind === 'meteor') this.hazards.push({ kind: 'fire', x: p.pos.x, z: p.pos.z, r: p.aoe * 0.8, t: 4, dps: p.dmg * 0.25 });
  }

  updateProjectiles(dt) {
    const g = this.game, hero = g.hero;
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.t += dt;
      if (p.homing && p.team === 'hero') {
        const t = g.nearestEnemy(p.pos, 9, p.hit);
        if (t) { const want = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z), cur = Math.atan2(p.vel.x, p.vel.z), nw = cur + angleDiff(cur, want) * Math.min(1, p.homing * dt); p.vel.set(Math.sin(nw) * p.speed, 0, Math.cos(nw) * p.speed); }
      }
      if (p.homing && p.team === 'enemy' && p.t < 1.6 && hero) {
        const want = Math.atan2(hero.pos.x - p.pos.x, hero.pos.z - p.pos.z), cur = Math.atan2(p.vel.x, p.vel.z), nw = cur + angleDiff(cur, want) * Math.min(1, p.homing * dt); p.vel.set(Math.sin(nw) * p.speed, 0, Math.cos(nw) * p.speed);
      }
      if (p.fall) { p.vel.y -= 30 * dt; }
      else if (p.dropTo && p.pos.y > p.dropTo) p.pos.y = Math.max(p.dropTo, p.pos.y - dt * 1.2);
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      if (p.def.model) {
        _v.copy(p.vel).normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _v);
        if (p.def.spin) p.mesh.children[0].rotation.z += dt * 20;
      }
      if (p.def.trail) g.fx.trail(p.pos, p.def.color, p.def.trail, 0.25);
      if (p.def.fire && Math.random() < 0.6) g.fx.fire(p.pos, 1, p.def.sphere * 1.2);
      if (p.fall) { if (p.pos.y <= 0.3) { p.pos.y = 0.3; this.killProj(p); if (p.tele) p.tele.visible = false; } continue; }
      if (p.t > p.life || Math.hypot(p.pos.x, p.pos.z) > g.world.radius + 6) { this.killProj(p, !!p.aoe); continue; }
      // collisions with obstacles
      let blocked = false;
      for (const c of g.world.colliders) if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r) { blocked = true; break; }
      if (blocked) { this.killProj(p); continue; }
      if (p.team === 'hero') {
        for (const e of g.enemies) {
          if (e.dead || p.hit.has(e) || e.state === 'spawning') continue;
          const dy = Math.abs((e.pivot.position.y + e.height * 0.5) - p.pos.y);
          if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < e.radius * e.root.scale.x + 0.35 && dy < e.height + 1) {
            p.hit.add(e);
            this.dealToEnemy(e, p.dmg, hero, { knock: p.heavy ? 5 : 1.5, heavy: p.heavy });
            if (p.reflected) { e.staggered(1.2); }
            if (p.aoe) { this.killProj(p); break; }
            if (p.pierce-- <= 0) { this.killProj(p, false); g.fx.sparks(p.pos, 5); break; }
          }
        }
      } else if (!hero.invulnerable || hero.state === 'dodge') {
        if (Math.hypot(hero.pos.x - p.pos.x, hero.pos.z - p.pos.z) < hero.radius + 0.4 && p.pos.y < 2.6) {
          const res = hero.receive(p.dmg, p.from && !p.from.dead ? p.from : p.pos, { ranged: true, knock: 2 });
          if (res === 'dodge') continue;
          if (res === 'parry') { // reflect!
            p.team = 'hero'; p.reflected = true; p.dmg *= 3; p.hit.clear();
            const tgt = p.from && !p.from.dead ? p.from : g.nearestEnemy(p.pos, 30);
            const yaw = tgt ? Math.atan2(tgt.pos.x - p.pos.x, tgt.pos.z - p.pos.z) : Math.atan2(-p.vel.x, -p.vel.z);
            p.vel.set(Math.sin(yaw) * p.speed * 1.6, 0, Math.cos(yaw) * p.speed * 1.6); p.t = 0; p.speed *= 1.6;
            g.fx.sparks(p.pos, 20, [1, 0.95, 0.6], 8); Audio2.play('parry', { vol: 0.8, rate: 1.2 }); g.ui.announce('REFLECTED!', 'parry', 0.7); g.slowmo(0.35, 0.3);
            g.run.stats.parries++; hero.addWrath(12);
            continue;
          }
          p.hit.add(hero);
          if (res === 'hit' && p.slow) { hero.status.slow = 2.2; hero.status.slowAmt = p.slow; }
          this.killProj(p);
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ===================== SPECIAL ENEMY ACTIONS =====================
  raiseDead(necro) {
    const g = this.game; let n = 0;
    g.fx.magic({ x: necro.pos.x, y: 2, z: necro.pos.z }, [0.4, 1, 0.5], 30, 4);
    Audio2.magic(0.3, 0.5); Audio2.growl(0.2, 0.7, 1);
    for (const c of g.corpses.splice(0, 3)) {
      if (Math.random() < 0.8) {
        const key = ['skel_minion', 'skel_warrior', 'skel_rogue', 'crypt_skel'].includes(c.key) ? c.key : 'skel_minion';
        const e = g.spawnEnemy(key, { x: c.x, z: c.z, mode: 'ground', level: g.levelFor(g.run.wave) });
        if (e) { g.fx.lightning({ x: necro.pos.x, y: 2, z: necro.pos.z }, { x: c.x, y: 0.5, z: c.z }, [0.4, 1, 0.5]); n++; }
      }
    }
    if (n) g.ui.toast('The Necromancer raised the dead!');
  }

  healAllies(src) {
    const g = this.game;
    g.fx.magic({ x: src.pos.x, y: 2, z: src.pos.z }, [0.3, 1, 0.4], 30, 5); Audio2.magic(0.25, 1.2);
    for (const e of g.enemies) if (!e.dead && e !== src && src.dist(e) < 12 && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3);
      g.fx.magic({ x: e.pos.x, y: 1, z: e.pos.z }, [0.3, 1, 0.4], 10, 2);
    }
  }

  // Battle Sage: shields nearby allies (half damage) for a few seconds
  ward(src) {
    const g = this.game;
    g.fx.magic({ x: src.pos.x, y: 2, z: src.pos.z }, [0.4, 0.6, 1], 30, 5); Audio2.magic(0.25, 0.9);
    for (const e of g.enemies) if (!e.dead && src.dist(e) < 12 && !e.isBoss) {
      if (!(e.wardT > 0)) { e._armorBase = e.armor; e.armor = Math.max(e.armor, 0.5); e.setTint(0x2244ff, 0.5); }
      e.wardT = 6; g.fx.magic({ x: e.pos.x, y: 1, z: e.pos.z }, [0.4, 0.6, 1], 8, 2);
    }
  }
  // Sporelord: poison clouds around the hero
  spores(src, dmg) {
    const g = this.game, h = g.hero;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * 6.28, d = i === 0 ? 0.5 : frand(2, 4);
      this.hazards.push({ kind: 'poison', x: h.pos.x + Math.sin(a) * d, z: h.pos.z + Math.cos(a) * d, r: 2.2, t: 6, dps: dmg * 0.45 });
    }
    Audio2.magic(0.2, 0.5);
  }
  // Ascended Archmage: a ring of runes closes around the hero, then detonates
  runes(src, dmg) {
    const g = this.game, h = g.hero, n = 8, cx = h.pos.x, cz = h.pos.z;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = cx + Math.sin(a) * 2.6, z = cz + Math.cos(a) * 2.6;
      g.fx.telegraph({ x, y: 0, z }, 1.5, 1.3, [0.7, 0.3, 1]);
      this.hazards.push({ kind: 'bomb', x, z, r: 1.5, t: 1.3, dmg, color: [0.7, 0.4, 1] });
    }
    g.fx.telegraph({ x: cx, y: 0, z: cz }, 1.3, 1.3, [0.7, 0.3, 1]);
    this.hazards.push({ kind: 'bomb', x: cx, z: cz, r: 1.3, t: 1.45, dmg, color: [0.7, 0.4, 1] });
    Audio2.magic(0.3, 0.6);
  }
  // Ascended Warlord: war cry empowers every enemy on the field
  warcry(src) {
    const g = this.game;
    g.fx.shockwave(src.pos, 9, [1, 0.3, 0.1]); g.shake(0.5); Audio2.roar(0.6);
    g.ui.announce('THE WARLORD ROARS', 'boss', 1.4);
    for (const e of g.enemies) if (!e.dead && !(e.buffT > 0)) { e.buffT = 8; e.dmgMul *= 1.3; e.speedMul *= 1.2; e.setTint(0x661100, 0.55); }
  }

  summon(src, key, n) {
    const g = this.game;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = frand(3, 7);
      g.spawnEnemy(key, { x: src.pos.x + Math.sin(a) * d, z: src.pos.z + Math.cos(a) * d, mode: ALL_FLY(key) ? 'sky' : 'portal', level: g.levelFor(g.run.wave) });
    }
    Audio2.screech(0.2); Audio2.magic(0.2, 0.6);
  }

  meteors(src, a) {
    const g = this.game, hero = g.hero;
    for (let i = 0; i < a.count; i++) {
      setTimeout(() => {
        if (!g.run || g.state !== 'play') return;
        const near = i < 3;
        const x = near ? hero.pos.x + frand(-2.5, 2.5) : frand(-1, 1) * g.world.radius * 0.8, z = near ? hero.pos.z + frand(-2.5, 2.5) : frand(-1, 1) * g.world.radius * 0.8;
        this.fallingRock('meteor', x, z, a.aoe, src.dmg * a.dmg, 1.2);
      }, i * 260);
    }
    Audio2.roar(0.4);
  }

  fallingRock(kind, x, z, r, dmg, warn) {
    const g = this.game;
    const tele = g.fx.telegraph({ x, z }, r, warn, kind === 'meteor' ? [1, 0.35, 0.05] : [1, 0.6, 0.2]);
    const h = 22, vy = -h / warn * 0.6;
    const p = this.spawnProj({ kind, team: 'enemy', from: null, dmg, speed: 0, x: x + 3, y: h, z: z - 3, yaw: 0, aoe: r, life: 9, fall: true, vy });
    p.vel.set(-3 / warn, 0, 3 / warn);
    p.vel.y = -(h - 0.3) / warn - 0.5 * -30 * warn; // reach ground at ~warn seconds with gravity
    p.tele = tele;
  }

  breath(e, a, dt) {
    const g = this.game, hero = g.hero;
    // sweeping cone of fire in front of the dragon
    e.facing += Math.sin(e.atkT * 2.4) * dt * 1.4;
    const mouth = { x: e.pos.x + Math.sin(e.facing) * e.radius * 1.3, y: e.pivot.position.y + e.height * 0.55, z: e.pos.z + Math.cos(e.facing) * e.radius * 1.3 };
    for (let i = 0; i < 5; i++) {
      const sp = frand(9, 16), yaw = e.facing + frand(-0.25, 0.25);
      g.fx.add.emit(mouth.x, mouth.y, mouth.z, Math.sin(yaw) * sp, -mouth.y * 0.9, Math.cos(yaw) * sp, 1, frand(0.3, 0.6), 0.08, frand(0.6, 1.2), frand(0.5, 0.8), 0, 0.8, 1.2);
    }
    if (Math.random() < dt * 8) Audio2.fire(0.3, 0.4);
    const d = e.dist(hero), ad = Math.abs(angleDiff(e.facing, e.angleTo(hero)));
    if (d < 13 && ad < 0.38) {
      e._breathTick = (e._breathTick || 0) + dt;
      if (e._breathTick > 0.25) { e._breathTick = 0; hero.receive(e.dmg * a.dmg, e, { unblockable: true }); }
    }
    if (Math.random() < dt * 3) { const r = frand(5, 12); this.hazards.push({ kind: 'fire', x: e.pos.x + Math.sin(e.facing) * r, z: e.pos.z + Math.cos(e.facing) * r, r: 1.6, t: 4, dps: e.dmg * 0.25 }); }
  }

  // ===================== HAZARDS & PASSIVES =====================
  updateHazards(dt) {
    const g = this.game, hero = g.hero;
    for (const h of this.hazards) {
      h.t -= dt;
      if (h.kind === 'fire') {
        if (Math.random() < dt * 14 * h.r) g.fx.fire({ x: h.x + frand(-h.r, h.r) * 0.7, y: 0.1, z: h.z + frand(-h.r, h.r) * 0.7 }, 1, 0.8);
        if (Math.hypot(hero.pos.x - h.x, hero.pos.z - h.z) < h.r && !hero.invulnerable) { h.tick = (h.tick || 0) + dt; if (h.tick > 0.4) { h.tick = 0; hero.receive(h.dps * 0.4, { x: h.x, z: h.z }, { unblockable: true }); } }
      } else if (h.kind === 'poison') {
        if (Math.random() < dt * 10 * h.r) g.fx.add.emit(h.x + frand(-h.r, h.r) * 0.7, 0.2, h.z + frand(-h.r, h.r) * 0.7, 0, frand(0.4, 1), 0, 0.35, 1, 0.25, frand(0.4, 0.8), 1.2, -0.2, 1, -0.3);
        if (Math.hypot(hero.pos.x - h.x, hero.pos.z - h.z) < h.r && !hero.invulnerable) { h.tick = (h.tick || 0) + dt; if (h.tick > 0.5) { h.tick = 0; hero.receive(h.dps * 0.5, { x: h.x, z: h.z }, { unblockable: true, knock: 0 }); } }
      } else if (h.kind === 'bomb' && h.t <= 0) {
        g.fx.explosion({ x: h.x, y: 0, z: h.z }, h.r, h.color || [1, 0.5, 0.1]); Audio2.boom(0.5); g.shake(0.3);
        if (Math.hypot(hero.pos.x - h.x, hero.pos.z - h.z) < h.r) hero.receive(h.dmg, { x: h.x, z: h.z }, { unblockable: true, knock: 8 });
        for (const e of g.enemies) if (!e.dead && Math.hypot(e.pos.x - h.x, e.pos.z - h.z) < h.r) this.dealToEnemy(e, h.dmg, null, { aoe: true });
      }
    }
    this.hazards = this.hazards.filter((h) => h.t > 0);

    // card passives
    const m = g.run?.mods; if (!m || hero.state === 'dead') return;
    if (m.frostAura) {
      for (const e of g.enemies) if (!e.dead && hero.dist(e) < 4.5) { e.status.slow = 0.3; e.status.slowAmt = 0.3 * m.frostAura; }
      if (Math.random() < dt * 10) { const a = Math.random() * 6.28; g.fx.add.emit(hero.pos.x + Math.sin(a) * 4, 0.3, hero.pos.z + Math.cos(a) * 4, 0, 0.6, 0, 0.6, 0.85, 1, 0.25, 0.8); }
    }
    if (m.orbit) {
      const n = 1 + m.orbit;
      while (this.orbits.length < n) { const o = Assets.clone('weapons/sword_1handed.glb'); o.scale.setScalar(0.55); o.rotation.x = Math.PI / 2; const gr = new THREE.Group(); gr.add(o); g.scene.add(gr); this.orbits.push({ obj: gr, hit: new Map() }); }
      this.orbits.forEach((o, i) => {
        const a = g.time * 3.2 + i / n * Math.PI * 2;
        o.obj.position.set(hero.pos.x + Math.sin(a) * 2.6, 1.0, hero.pos.z + Math.cos(a) * 2.6); o.obj.rotation.y = a + Math.PI / 2;
        if (Math.random() < 0.3) g.fx.trail(o.obj.position, [0.7, 0.8, 1], 0.2, 0.2);
        for (const e of g.enemies) {
          if (e.dead || (o.hit.get(e) || 0) > g.time) continue;
          if (Math.hypot(e.pos.x - o.obj.position.x, e.pos.z - o.obj.position.z) < e.radius + 0.6) { o.hit.set(e, g.time + 0.5); this.dealToEnemy(e, hero.stats.dmg * 0.45, hero, { knock: 3, aoe: true }); }
        }
      });
    }
    if (m.daggers) {
      this._dagT = (this._dagT || 0) - dt;
      if (this._dagT <= 0) {
        this._dagT = 2.2 / m.daggers;
        const t = g.nearestEnemy(hero.pos, 14);
        if (t) { const yaw = hero.angleTo(t); this.spawnProj({ kind: 'dagger', team: 'hero', from: hero, dmg: hero.stats.dmg * 0.7, speed: 26, x: hero.pos.x, y: 1.3, z: hero.pos.z, yaw, pierce: 1, life: 1 }); Audio2.play('swing', { vol: 0.2, rate: 1.8 }); }
      }
    }
    if (m.regen && g.time - hero.lastDamage > 3) hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.012 * m.regen * dt);
  }

  clear() {
    for (const p of this.projectiles) this.killProj(p, false);
    this.projectiles = []; this.hazards = [];
    this.orbits.forEach((o) => this.game.scene.remove(o.obj)); this.orbits = [];
  }
}

import { ALL_DEFS } from './enemies.js?v=202611131113';
const ALL_FLY = (k) => !!ALL_DEFS[k]?.flying;
