// Base class for anything animated that fights: hero, enemies, bosses
import * as THREE from 'three';
import { Assets, measure, findBone } from './assets.js?v=202611131442';

const _v = new THREE.Vector3();
let _id = 1;

export class Actor {
  constructor(game, opts) {
    this.game = game; this.id = _id++;
    this.root = new THREE.Group();
    this.opts = opts;
    this.radius = opts.radius || 0.6;
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.alive = true;
    this.hp = this.maxHp = 100;
    this.facing = 0;
    this.actions = {}; this.cur = null; this.curName = '';
    this.flashT = 0; this.tint = null;
    this.status = { burn: 0, burnDps: 0, slow: 0, slowAmt: 0, stagger: 0, freeze: 0 };
    this.hover = 0;
  }

  // Build visual from a cached model path
  build(path, clips, height, yawOffset = 0) {
    const model = Assets.clone(path);
    const box = measure(model);
    const h = box.max.y - box.min.y;
    const s = height / Math.max(0.001, h);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    model.rotation.y = yawOffset;
    this.model = model; this.scale = s; this.height = height;
    this.pivot = new THREE.Group(); this.pivot.add(model);
    this.root.add(this.pivot);
    this.mixer = new THREE.AnimationMixer(model);
    this.clipMap = {};
    for (const c of clips) this.clipMap[c.name] = c;
    // per-actor materials so hit-flash / tint doesn't affect clones
    this.mats = [];
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (!m.emissive) return;
          m.userData.baseEmissive = m.emissive.clone(); m.userData.baseEI = m.emissiveIntensity ?? 1;
          if (m.color) m.userData.baseColor = m.color.clone();
          this.mats.push(m);
        });
      }
    });
    return model;
  }

  attach(path, boneNames, { length = null, rot = null, pos = null } = {}) {
    const bone = findBone(this.model, boneNames);
    if (!bone) return null;
    const w = Assets.clone(path);
    w.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); this.mats.push(o.material); o.material.userData.baseEmissive = o.material.emissive?.clone(); o.material.userData.baseEI = o.material.emissiveIntensity ?? 1; if (o.material.color) o.material.userData.baseColor = o.material.color.clone(); } });
    if (length) {
      this.model.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(w); const dim = Math.max(...bb.getSize(_v).toArray());
      const ws = new THREE.Vector3(); bone.getWorldScale(ws);
      w.scale.setScalar(length / (dim * ws.x) * (this.root.scale.x || 1));
    }
    if (rot) w.rotation.set(rot[0], rot[1], rot[2]);
    if (pos) w.position.set(pos[0], pos[1], pos[2]);
    bone.add(w);
    return w;
  }

  hideMeshes(names) {
    this.model.traverse((o) => { if (o.isMesh && names.some((n) => o.name.includes(n))) o.visible = false; });
  }

  action(name) {
    if (this.alias && this.alias[name]) name = this.alias[name];
    if (this.actions[name]) return this.actions[name];
    let clip = this.clipMap[name];
    if (!clip && Assets.kkMap[name]) { clip = Assets.kkMap[name]; this.clipMap[name] = clip; } // late-loaded KayKit clips
    if (!clip) return null;
    const a = this.mixer.clipAction(clip);
    this.actions[name] = a;
    return a;
  }

  // play(name, {once, fade, dur (seconds to fit), speed, from})
  play(name, o = {}) {
    const a = this.action(name);
    if (!a) return null;
    const fade = o.fade ?? 0.12;
    if (this.cur === a && !o.restart) { if (o.dur) a.timeScale = a.getClip().duration / o.dur; else if (o.speed) a.timeScale = o.speed; return a; }
    a.reset();
    a.enabled = true;
    a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !!o.once;
    a.timeScale = o.dur ? a.getClip().duration / o.dur : (o.speed || 1);
    if (o.from) a.time = o.from * a.getClip().duration;
    a.setEffectiveWeight(1);
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, fade, false);
    a.play();
    this.cur = a; this.curName = name;
    return a;
  }

  get pos() { return this.root.position; }
  dist(o) { return Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z); }
  angleTo(o) { return Math.atan2(o.pos.x - this.pos.x, o.pos.z - this.pos.z); }
  faceTo(yaw) { this.facing = yaw; this.root.rotation.y = yaw; }

  flash(color = 0xffffff, t = 0.09) { this.flashT = t; this.flashColor = color; this._applyFlash(true); }
  _applyFlash(on) {
    for (const m of this.mats) {
      if (!m.emissive) continue;
      if (on) { m.emissive.set(this.flashColor); m.emissiveIntensity = 0.9; }
      else if (this.tint) { m.emissive.copy(this.tint); m.emissiveIntensity = this.tintI || 0.5; }
      else { m.emissive.copy(m.userData.baseEmissive || new THREE.Color(0)); m.emissiveIntensity = m.userData.baseEI ?? 1; }
    }
  }
  setTint(color, intensity = 0.4) { this.tint = color ? new THREE.Color(color) : null; this.tintI = intensity; this._applyFlash(false); }
  setColorMul(color) {
    for (const m of this.mats) if (m.color && m.userData.baseColor) { m.color.copy(m.userData.baseColor).multiply(new THREE.Color(color)); }
  }
  setOpacity(a) {
    for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a >= 1; }
  }

  baseUpdate(dt) {
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this._applyFlash(false); }
    this.mixer.update(dt);
    // knockback
    if (this.knock.lengthSq() > 0.001) {
      this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt;
      this.knock.multiplyScalar(Math.max(0, 1 - 8 * dt));
    }
  }
}
