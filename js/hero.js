// Playable heroes (KayKit Adventurers) — combo, parry, dodge, wrath
import * as THREE from 'three';
import { Actor } from './actor.js?v=202611131442';
import { Assets } from './assets.js?v=202611131442';
import { Audio2 } from './audio.js?v=202611131442';
import { angleDiff, clamp, dampAngle } from './util.js?v=202611131442';

const CH = 'chars/', W = 'weapons/';
export const HEROES = {
  knight: {
    name: 'The Warden', cls: 'Knight', model: CH + 'kk_Knight.glb', icon: '🛡️',
    blurb: 'Balanced sword & shield. Master of the perfect parry.',
    unlock: null, hp: 130, speed: 6.3, dmg: 24, blockReduce: 0.85, dodges: 1, crit: 0.06,
    weapons: [[W + 'sword_1handed.glb', 'handslotr'], [W + 'shield_round.glb', 'handslotl']],
    idle: 'Idle_A', run: 'Running_A', block: 'Melee_Blocking', blockHit: 'Melee_Block_Hit', riposte: 'Melee_Block_Attack',
    combo: [
      { anim: 'Melee_1H_Attack_Slice_Diagonal', dur: 0.40, hit: 0.42, dmg: 1.0, range: 2.7, arc: 120, tilt: 0.5, lunge: 1.4 },
      { anim: 'Melee_1H_Attack_Slice_Horizontal', dur: 0.44, hit: 0.45, dmg: 1.15, range: 2.8, arc: 160, tilt: -0.1, lunge: 1.4, flip: true },
      { anim: 'Melee_1H_Attack_Jump_Chop', dur: 0.62, hit: 0.62, dmg: 2.3, range: 3.0, arc: 140, tilt: 1.45, lunge: 2.6, aoe: 2.6, knock: 9, shake: 0.55, heavy: true },
    ],
  },
  barbarian: {
    name: 'Grom the Unchained', cls: 'Barbarian', model: CH + 'kk_Barbarian.glb', icon: '🪓',
    blurb: 'Slow, huge damage. Third hit is a 360° spinning axe storm.',
    unlock: { type: 'wave', v: 8, text: 'Reach wave 8' }, hp: 160, speed: 5.9, dmg: 34, blockReduce: 0.6, dodges: 1, crit: 0.05,
    weapons: [[W + 'axe_2handed.glb', 'handslotr']],
    idle: 'Melee_2H_Idle', run: 'Running_A', block: 'Melee_Blocking', blockHit: 'Melee_Block_Hit', riposte: 'Melee_2H_Attack_Chop',
    combo: [
      { anim: 'Melee_2H_Attack_Chop', dur: 0.62, hit: 0.48, dmg: 1.1, range: 3.0, arc: 110, tilt: 1.4, lunge: 1.2, shake: 0.2 },
      { anim: 'Melee_2H_Attack_Slice', dur: 0.55, hit: 0.45, dmg: 1.2, range: 3.1, arc: 170, tilt: 0.1, lunge: 1.2, flip: true },
      { anim: 'Melee_2H_Attack_Spin', dur: 0.95, hit: 0.35, dmg: 1.0, range: 3.4, arc: 360, multi: 3, multiGap: 0.17, lunge: 0.8, knock: 7, shake: 0.35, heavy: true },
    ],
  },
  rogue: {
    name: 'Vex the Shade', cls: 'Rogue', model: CH + 'kk_Rogue.glb', icon: '🗡️',
    blurb: 'Lightning-fast dual daggers. Two dodges, deadly critical hits.',
    unlock: { type: 'wave', v: 15, text: 'Reach wave 15' }, hp: 100, speed: 7.3, dmg: 17, blockReduce: 0.5, dodges: 2, crit: 0.22,
    weapons: [[W + 'dagger.glb', 'handslotr'], [W + 'dagger.glb', 'handslotl']],
    idle: 'Idle_A', run: 'Running_B', block: 'Melee_Blocking', blockHit: 'Melee_Block_Hit', riposte: 'Melee_Dualwield_Attack_Stab',
    combo: [
      { anim: 'Melee_Dualwield_Attack_Slice', dur: 0.30, hit: 0.45, dmg: 1.0, range: 2.4, arc: 140, tilt: 0.2, lunge: 1.6 },
      { anim: 'Melee_Dualwield_Attack_Chop', dur: 0.32, hit: 0.5, dmg: 1.1, range: 2.4, arc: 120, tilt: 1.3, lunge: 1.6, flip: true },
      { anim: 'Melee_Dualwield_Attack_Stab', dur: 0.42, hit: 0.5, dmg: 1.9, range: 2.8, arc: 70, tilt: 0, lunge: 3.2, knock: 5, heavy: true },
    ],
  },
  ranger: {
    name: 'Kael Ironsight', cls: 'Ranger', model: CH + 'kk_Ranger.glb', icon: '🏹',
    blurb: 'Crossbow sharpshooter. Third shot fires a piercing volley.',
    unlock: { type: 'flag', v: 'goldenKnight', text: 'Defeat the Golden Knight' }, hp: 105, speed: 6.6, dmg: 20, blockReduce: 0.5, dodges: 2, crit: 0.12,
    weapons: [[W + 'crossbow_1handed.glb', 'handslotr']],
    idle: 'Idle_A', run: 'Running_A', block: 'Melee_Blocking', blockHit: 'Melee_Block_Hit', riposte: 'Melee_Unarmed_Attack_Kick',
    ranged: true,
    combo: [
      { anim: 'Ranged_1H_Shoot', dur: 0.36, hit: 0.35, dmg: 1.0, proj: { kind: 'bolt', speed: 34, count: 1, spread: 0, pierce: 1 } },
      { anim: 'Ranged_1H_Shoot', dur: 0.36, hit: 0.35, dmg: 1.0, proj: { kind: 'bolt', speed: 34, count: 1, spread: 0, pierce: 1 } },
      { anim: 'Ranged_1H_Shoot', dur: 0.5, hit: 0.35, dmg: 1.1, proj: { kind: 'bolt', speed: 38, count: 5, spread: 0.5, pierce: 3 }, heavy: true },
    ],
  },
  mage: {
    name: 'Seraphine', cls: 'Mage', model: CH + 'kk_Mage.glb', icon: '🔮',
    blurb: 'Fragile but devastating. Third cast hurls an exploding fireball.',
    unlock: { type: 'wave', v: 25, text: 'Reach wave 25' }, hp: 90, speed: 6.4, dmg: 22, blockReduce: 0.7, dodges: 1, crit: 0.08,
    weapons: [[W + 'staff.glb', 'handslotr'], [W + 'spellbook_open.glb', 'handslotl']],
    idle: 'Idle_B', run: 'Running_A', block: 'Ranged_Magic_Raise', blockHit: 'Melee_Block_Hit', riposte: 'Ranged_Magic_Shoot',
    ranged: true,
    combo: [
      { anim: 'Ranged_Magic_Shoot', dur: 0.38, hit: 0.4, dmg: 1.0, proj: { kind: 'arcane', speed: 22, count: 1, spread: 0, pierce: 0, homing: 3 } },
      { anim: 'Ranged_Magic_Shoot', dur: 0.38, hit: 0.4, dmg: 1.0, proj: { kind: 'arcane', speed: 22, count: 2, spread: 0.25, pierce: 0, homing: 3 } },
      { anim: 'Ranged_Magic_Spellcasting', dur: 0.6, hit: 0.5, dmg: 2.6, proj: { kind: 'fireball', speed: 18, count: 1, spread: 0, pierce: 0, aoe: 3.4 }, heavy: true },
    ],
  },
  shade: {
    name: 'The Hooded One', cls: 'Rogue (Secret)', model: CH + 'kk_Rogue_Hooded.glb', icon: '🥷',
    blurb: 'Secret hero. Every 3rd strike teleports behind the target.',
    unlock: { type: 'flag', v: 'dragon', text: 'Defeat the Shadow Dragon' }, hp: 110, speed: 7.6, dmg: 20, blockReduce: 0.5, dodges: 3, crit: 0.3,
    weapons: [[W + 'dagger.glb', 'handslotr'], [W + 'dagger.glb', 'handslotl']],
    idle: 'Idle_A', run: 'Running_B', block: 'Melee_Blocking', blockHit: 'Melee_Block_Hit', riposte: 'Melee_Dualwield_Attack_Stab',
    combo: [
      { anim: 'Melee_Dualwield_Attack_Slice', dur: 0.28, hit: 0.45, dmg: 1.0, range: 2.4, arc: 140, tilt: 0.2, lunge: 1.6 },
      { anim: 'Melee_Dualwield_Attack_Chop', dur: 0.3, hit: 0.5, dmg: 1.1, range: 2.4, arc: 120, tilt: 1.3, lunge: 1.6, flip: true },
      { anim: 'Melee_Dualwield_Attack_Stab', dur: 0.42, hit: 0.5, dmg: 2.2, range: 2.8, arc: 70, tilt: 0, lunge: 0, blink: true, knock: 5, heavy: true },
    ],
  },
  monk: {
    name: 'Oren the Wanderer', cls: 'Monk', model: 'rpg/Monk.fbx', icon: '👊', ownClips: true,
    blurb: 'Bare-fisted and blindingly fast. The best dodger, but fragile.',
    unlock: { type: 'wave', v: 20, text: 'Reach wave 20' }, hp: 105, speed: 7.1, dmg: 15, blockReduce: 0.55, dodges: 2, crit: 0.15,
    weapons: [],
    alias: { Dodge_Forward: 'CharacterArmature|Roll', Hit_A: 'CharacterArmature|RecieveHit', Hit_B: 'CharacterArmature|RecieveHit', Death_A: 'CharacterArmature|Death' },
    idle: 'CharacterArmature|Idle', run: 'CharacterArmature|Run', block: 'CharacterArmature|Idle_Attacking', blockHit: 'CharacterArmature|RecieveHit_Attacking', riposte: 'CharacterArmature|Attack2',
    combo: [
      { anim: 'CharacterArmature|Attack', dur: 0.26, hit: 0.5, dmg: 1.0, range: 2.2, arc: 120, tilt: 0.2, lunge: 1.8 },
      { anim: 'CharacterArmature|Attack2', dur: 0.28, hit: 0.5, dmg: 1.1, range: 2.3, arc: 120, tilt: -0.2, lunge: 1.8, flip: true },
      { anim: 'CharacterArmature|Attack', dur: 0.24, hit: 0.5, dmg: 1.1, range: 2.2, arc: 120, tilt: 0.3, lunge: 1.6 },
      { anim: 'CharacterArmature|Attack2', dur: 0.46, hit: 0.5, dmg: 2.4, range: 2.8, arc: 160, tilt: 0, lunge: 2.6, aoe: 2.6, knock: 10, shake: 0.4, heavy: true },
    ],
  },
};
export const HERO_ORDER = ['knight', 'barbarian', 'rogue', 'ranger', 'mage', 'monk', 'shade'];
export const heroAssets = (k) => [HEROES[k].model, ...HEROES[k].weapons.map((w) => w[0])];

export class Hero extends Actor {
  constructor(game, key) {
    super(game, { radius: 0.55 });
    this.key = key; this.def = HEROES[key];
    this.team = 'hero';
    this.build(this.def.model, this.def.ownClips ? game.assets.clips(this.def.model) : game.kkClips, 1.9);
    this.alias = this.def.alias || null;
    for (const [w, bone] of this.def.weapons) this.attach(w, bone);
    this.state = 'idle'; this.stateT = 0;
    this.comboIdx = 0; this.comboWindow = 0; this.queued = false;
    this.dodgeCharges = this.def.dodges; this.dodgeRecharge = 0; this.iframes = 0;
    this.blockStart = -10; this.wrath = 0; this.wrathT = 0; this.riposte = 0;
    this.hitDone = 0; this.lastDamage = 0; this.secondWindUsed = false;
    this.aura = null;
    this.stats = {};
    this.recalc();
    this.hp = this.maxHp;
    this.play(this.def.idle);
  }

  // stats = hero base + shrine upgrades + cards
  recalc() {
    const d = this.def, u = this.game.save.upg, m = this.game.run?.mods || {};
    const s = this.stats;
    // stacking bonuses get weaker past a soft cap, so late runs can't become untouchable
    const soft = (x, knee, k, cap = Infinity) => Math.min(cap, x <= knee ? x : knee + (x - knee) * k);
    s.maxHp = Math.round((d.hp + u.vitality * 12 + (m.maxHp || 0)) * (m.hpMul || 1));
    s.speed = d.speed * (1 + soft(u.swift * 0.03 + (m.speed || 0), 0.25, 0.4, 0.5));
    s.dmg = d.dmg * (1 + soft(u.might * 0.06 + (m.dmg || 0), 1.0, 0.5)) * (m.dmgMul || 1);
    s.crit = Math.min(0.5, d.crit + (m.crit || 0)); s.critMul = 2 + soft(m.critMul || 0, 0.6, 0.5);
    s.atkSpeed = 1 + soft(m.atkSpeed || 0, 0.3, 0.4, 0.6);
    s.dodgeCd = 0.55 * (1 - Math.min(0.4, m.dodgeCd || 0));
    s.dodges = Math.min(d.dodges + 2, d.dodges + (m.dodges || 0));
    s.blockReduce = Math.min(0.9, d.blockReduce + (m.block || 0));
    s.wrathGain = 1 + u.wrath * 0.1 + soft(m.wrathGain || 0, 0.6, 0.5);
    s.parryWin = 0.2 + (m.parryWin || 0);
    const old = this.maxHp; this.maxHp = s.maxHp;
    if (this.maxHp > old && old > 0) this.hp += this.maxHp - old;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  get isBlocking() { return this.state === 'block'; }
  get invulnerable() { return this.iframes > 0 || this.state === 'dead'; }

  update(dt, input) {
    const g = this.game;
    this.stateT += dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.riposte > 0) this.riposte -= dt;
    if (this.comboWindow > 0) { this.comboWindow -= dt; if (this.comboWindow <= 0) this.comboIdx = 0; }
    // dodge charges
    if (this.dodgeCharges < this.stats.dodges) { this.dodgeRecharge -= dt; if (this.dodgeRecharge <= 0) { this.dodgeCharges++; this.dodgeRecharge = this.stats.dodgeCd; } }
    // wrath timer
    if (this.wrathT > 0) {
      this.wrathT -= dt;
      if (Math.random() < dt * 30) g.fx.add.emit(this.pos.x + (Math.random() - 0.5), 0.3 + Math.random() * 1.6, this.pos.z + (Math.random() - 0.5), 0, 2, 0, 1, 0.45, 0.1, 0.35, 0.5, -1, 1);
      if (this.wrathT <= 0) { this.setTint(null); g.ui.wrathEnd(); }
    }
    if (this.state === 'dead') { this.baseUpdate(dt); return; }

    const mv = input.move; // world-space vector (x,z), len <= 1
    const moving = mv.lengthSq() > 0.02;

    // ---- inputs that interrupt ----
    if (input.wrath && this.wrath >= 100 && this.state !== 'dodge') this.activateWrath();
    if (input.dodge && this.dodgeCharges > 0 && (this.state !== 'attack' || this.stateT > this.cur?.getClip().duration / (this.cur?.timeScale || 1) * 0.35 || this.hitDone)) {
      this.startDodge(moving ? Math.atan2(mv.x, mv.z) : this.facing);
    }
    if (input.blockPressed && this.state !== 'dodge' && this.state !== 'hit' && (this.state !== 'attack' || this.hitDone)) {
      this.state = 'block'; this.stateT = 0; this.blockStart = g.time;
      this.play(this.def.block, { fade: 0.06 });
    }

    switch (this.state) {
      case 'idle': case 'move': {
        if (input.attack) { this.startAttack(mv, moving); break; }
        const sp = this.stats.speed * (this.status.slow > 0 ? 1 - this.status.slowAmt : 1);
        if (moving) {
          this.vel.set(mv.x * sp, 0, mv.z * sp);
          this.facing = dampAngle(this.facing, Math.atan2(mv.x, mv.z), 16, dt);
          if (this.state !== 'move') { this.state = 'move'; }
          this.play(this.def.run, { speed: clamp(mv.length() * sp / 6.3, 0.6, 1.4) });
          this._stepT = (this._stepT || 0) - dt;
          if (this._stepT <= 0) { this._stepT = 0.32; Audio2.play('step', { vol: 0.18 }); }
        } else {
          this.vel.set(0, 0, 0);
          if (this.state !== 'idle') { this.state = 'idle'; }
          this.play(this.def.idle);
        }
        break;
      }
      case 'attack': {
        const st = this.def.combo[this.comboIdx];
        const dur = st.dur / this.atkSpeedNow();
        // lunge during the first part
        const lt = this.stateT / dur;
        if (lt < 0.45 && st.lunge) { const sp = st.lunge / (dur * 0.45) * (1 - lt / 0.45) * 2; this.vel.set(Math.sin(this.facing) * sp, 0, Math.cos(this.facing) * sp); }
        else this.vel.set(0, 0, 0);
        if (this.target && this.target.alive && lt < st.hit) this.facing = dampAngle(this.facing, this.angleTo(this.target), 14, dt);
        // hits (multi-hit for spins)
        const hits = st.multi || 1;
        while (this.hitDone < hits && lt >= st.hit + this.hitDone * (st.multiGap || 0) / dur) {
          g.combat.heroStrike(this, st, this.comboIdx, this.hitDone);
          this.hitDone++;
        }
        if (input.attack && lt > 0.3) this.queued = true;
        if (lt >= 1) {
          if (this.queued) { this.comboIdx = (this.comboIdx + 1) % this.def.combo.length; this.startAttack(mv, moving, true); }
          else { this.comboWindow = 0.55; this.comboIdx = (this.comboIdx + 1) % this.def.combo.length; this.state = 'idle'; this.stateT = 0; }
        } else if (moving && lt > 0.8 && !this.queued) { this.comboWindow = 0.45; this.comboIdx = (this.comboIdx + 1) % this.def.combo.length; this.state = 'move'; }
        break;
      }
      case 'dodge': {
        const d = 0.42, k = this.stateT / d;
        const sp = 14 * (1 - k * 0.7) * (1 + (g.run?.mods.dodgeDist || 0));
        this.vel.set(Math.sin(this.dodgeDir) * sp, 0, Math.cos(this.dodgeDir) * sp);
        if (Math.random() < 0.5) g.fx.dust(this.pos, 1, 0.5);
        if (this.stateT >= d) { this.state = moving ? 'move' : 'idle'; this.stateT = 0; this.vel.set(0, 0, 0); }
        break;
      }
      case 'block': {
        const sp = this.stats.speed * 0.32;
        this.vel.set(mv.x * sp, 0, mv.z * sp);
        // face nearest threat while blocking
        const t = g.nearestEnemy(this.pos, 8);
        if (t) this.facing = dampAngle(this.facing, this.angleTo(t), 10, dt);
        else if (moving) this.facing = dampAngle(this.facing, Math.atan2(mv.x, mv.z), 8, dt);
        if (!input.blockHeld && this.stateT > 0.12) { this.state = 'idle'; this.stateT = 0; }
        if (input.attack && this.riposte > 0) { this.comboIdx = 2; this.startAttack(mv, moving, true); }
        break;
      }
      case 'hit': {
        this.vel.multiplyScalar(0.85);
        if (this.stateT > 0.28) { this.state = 'idle'; this.stateT = 0; }
        break;
      }
    }
    // move + collide
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.baseUpdate(dt);
    g.world.resolve(this.pos, this.radius);
    this.root.rotation.y = this.facing;
    if (this.status.slow > 0) this.status.slow -= dt;
  }

  atkSpeedNow() { return this.stats.atkSpeed * (this.wrathT > 0 ? 1.3 : 1); }

  startAttack(mv, moving, chained = false) {
    const g = this.game;
    if (!chained && this.comboWindow <= 0) this.comboIdx = 0;
    const st = this.def.combo[this.comboIdx];
    this.state = 'attack'; this.stateT = 0; this.hitDone = 0; this.queued = false;
    const want = moving ? Math.atan2(mv.x, mv.z) : this.facing;
    this.target = g.autoTarget(this.pos, want, st.proj ? 22 : 7.5);
    if (this.target) this.facing = this.angleTo(this.target); else this.facing = want;
    if (st.blink && this.target) { // shade: teleport behind target
      const a = this.target.facing; g.fx.smoke(this.pos, 6, 0.1);
      this.pos.set(this.target.pos.x - Math.sin(a) * 1.6, 0, this.target.pos.z - Math.cos(a) * 1.6);
      this.facing = this.angleTo(this.target); g.fx.magic(this.pos, [0.4, 0.2, 0.6], 14);
    }
    this.play(st.anim, { once: true, restart: true, dur: st.dur / this.atkSpeedNow(), fade: 0.06 });
    if (!st.proj) setTimeout(() => (st.heavy ? Audio2.whoosh(0.55, 0.7) : Audio2.play('swing', { vol: 0.5 })), st.dur * st.hit * 600 / this.atkSpeedNow());
  }

  startDodge(dir) {
    this.dodgeCharges--; if (this.dodgeRecharge <= 0) this.dodgeRecharge = this.stats.dodgeCd;
    this.state = 'dodge'; this.stateT = 0; this.dodgeDir = dir; this.facing = dir;
    this.iframes = 0.34 + (this.game.run?.mods.iframes || 0);
    this.play('Dodge_Forward', { once: true, restart: true, dur: 0.42, fade: 0.05 });
    Audio2.play('swing', { vol: 0.35, rate: 0.8 });
    this.game.run && this.game.run.stats.dodges++;
    if (this.game.run?.mods.dodgeNova) this.game.combat.frostNova(this.pos, 3, this);
  }

  activateWrath() {
    const g = this.game;
    this.wrath = 0; this.wrathT = 6 + (g.run?.mods.wrathDur || 0);
    this.setTint(0xff5a10, 0.55);
    g.combat.shockwave(this, this.pos, 5, this.stats.dmg * 2, 14);
    g.fx.explosion(this.pos, 4, [1, 0.45, 0.1]);
    g.slowmo(0.35, 0.35);
    g.shake(0.8);
    Audio2.roar(0.45); Audio2.boom(0.6);
    g.ui.announce('WARDEN\'S WRATH', 'wrath');
    g.ui.wrathStart();
  }

  addWrath(v) { if (this.wrathT > 0) return; const was = this.wrath; this.wrath = Math.min(100, this.wrath + v * this.stats.wrathGain); if (was < 100 && this.wrath >= 100) { this.game.ui.wrathReady(); Audio2.sting('good'); } }

  // returns: 'parry' | 'block' | 'hit' | 'dodge'
  receive(dmg, from, { unblockable = false, ranged = false, knock = 0 } = {}) {
    const g = this.game;
    if (this.state === 'dead') return 'none';
    if (this.iframes > 0) { if (this.state === 'dodge' && !this._perfectDodge && g.run) { this._perfectDodge = true; g.combat.perfectDodge(this); setTimeout(() => (this._perfectDodge = false), 400); } return 'dodge'; }
    const src = from?.pos || from;
    const front = src ? Math.abs(angleDiff(this.facing, Math.atan2(src.x - this.pos.x, src.z - this.pos.z))) < 1.75 : true;
    if (this.state === 'block' && front && !unblockable) {
      if (g.time - this.blockStart <= this.stats.parryWin) return 'parry';
      const taken = dmg * (1 - this.stats.blockReduce) * (this.wrathT > 0 ? 0.5 : 1);
      this.damage(taken, from, true);
      this.play(this.def.blockHit, { once: true, restart: true, fade: 0.04 });
      setTimeout(() => { if (this.state === 'block') this.play(this.def.block, { fade: 0.1 }); }, 260);
      if (src) { const a = Math.atan2(this.pos.x - src.x, this.pos.z - src.z); this.knock.set(Math.sin(a) * 5, 0, Math.cos(a) * 5); }
      return 'block';
    }
    const taken = dmg * (this.wrathT > 0 ? 0.5 : 1) * (g.run?.mods.dmgTaken || 1);
    this.damage(taken, from, false);
    if (this.state !== 'dead' && taken > this.maxHp * 0.08 && this.state !== 'attack') {
      this.state = 'hit'; this.stateT = 0; this.play(Math.random() < 0.5 ? 'Hit_A' : 'Hit_B', { once: true, restart: true, fade: 0.05 });
    }
    if (src && knock) { const a = Math.atan2(this.pos.x - src.x, this.pos.z - src.z); this.knock.set(Math.sin(a) * knock, 0, Math.cos(a) * knock); }
    this.iframes = Math.max(this.iframes, 0.45);
    return 'hit';
  }

  damage(v, from, blocked) {
    const g = this.game;
    v = Math.max(1, Math.round(v));
    this.hp -= v; this.lastDamage = g.time;
    g.run && (g.run.stats.taken += v);
    this.flash(blocked ? 0x8888ff : 0xff2222, 0.1);
    g.fx.number(this.pos, '-' + v, blocked ? 'hero blocked' : 'hero');
    g.ui.heroHurt(blocked);
    if (!blocked) { g.shake(0.25); g.fx.blood({ x: this.pos.x, y: 1.1, z: this.pos.z }, 6); Audio2.play('hitFlesh', { vol: 0.6, rate: 0.8 }); }
    else Audio2.play('block', { vol: 0.7 });
    if (this.thorns && from && from.alive && from.team === 'enemy') g.combat.dealToEnemy(from, v * this.thorns, this, { noWrath: true, color: 'thorns' });
    if (this.hp <= 0) {
      if (g.run?.mods.secondWind && !this.secondWindUsed) {
        this.secondWindUsed = true; this.hp = Math.round(this.maxHp * 0.3); this.iframes = 1.5;
        g.ui.announce('SECOND WIND', 'gold'); g.fx.explosion(this.pos, 3, [1, 0.9, 0.5]); g.slowmo(0.6, 0.3); Audio2.sting('good');
        g.combat.shockwave(this, this.pos, 4, this.stats.dmg, 12);
        return;
      }
      this.hp = 0; this.die();
    }
  }

  heal(v, capped = true) {
    if (this.game.run?.mode === 'eternity') return;
    if (capped) { // healing from hits/kills is limited per second so lifesteal can't out-heal a crowd
      const now = this.game.time; if (now - (this._healWin || 0) > 1) { this._healWin = now; this._healUsed = 0; }
      const room = this.maxHp * 0.12 - this._healUsed; v = Math.max(0, Math.min(v, room)); this._healUsed += v;
      if (v <= 0) return;
    }
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + v);
    if (this.hp - before >= 1) this.game.fx.number(this.pos, '+' + Math.round(this.hp - before), 'heal');
  }

  die() {
    this.state = 'dead'; this.stateT = 0; this.vel.set(0, 0, 0);
    this.play('Death_A', { once: true, restart: true, fade: 0.1 });
    this.game.onHeroDeath();
  }

  revive() {
    this.state = 'idle'; this.stateT = 0; this.hp = this.maxHp; this.iframes = 2.5; this.alive = true;
    this.play(this.def.idle, { restart: true });
    this.game.combat.shockwave(this, this.pos, 7, this.stats.dmg * 3, 18);
    this.game.fx.explosion(this.pos, 5, [1, 0.9, 0.5]);
    this.game.fx.magic({ x: this.pos.x, y: 1, z: this.pos.z }, [1, 0.9, 0.5], 40, 6);
  }
}
