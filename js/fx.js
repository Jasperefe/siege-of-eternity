// Visual effects: particles, slash arcs, rings/telegraphs, projectiles visuals, floating numbers
import * as THREE from 'three';
import { frand } from './util.js?v=202611131814';

// ---------- GPU particle system (Points) ----------
const PVERT = `
attribute float size; attribute float alpha; attribute vec3 pcolor;
varying float vA; varying vec3 vC;
uniform float uScale;
void main(){
  vA = alpha; vC = pcolor;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = size * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const PFRAG = `
varying float vA; varying vec3 vC; uniform float uSoft;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, uSoft, d) * vA;
  gl_FragColor = vec4(vC, a);
}`;

class Particles {
  constructor(scene, max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max);
    this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.size0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('pcolor', this.aCol);
    g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 300 }, uSoft: { value: additive ? 0.0 : 0.25 } },
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, r, g, b, size, life, grav = 0, drag = 0, grow = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b;
    this.size[i] = size; this.size0[i] = size; this.alpha[i] = 1; this.life[i] = life; this.maxLife[i] = life;
    this.grav[i] = grav; this.drag[i] = drag; this.grow[i] = grow;
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this._kill(i); continue; }
      const i3 = i * 3, k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt; this.vel[i3 + 2] *= k;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.02 && this.grav[i] > 0) { this.pos[i3 + 1] = 0.02; this.vel[i3 + 1] *= -0.3; this.vel[i3] *= 0.6; this.vel[i3 + 2] *= 0.6; }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.2);
      this.size[i] = this.size0[i] * (1 + this.grow[i] * (1 - t));
      i++;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true; this.aAlpha.needsUpdate = true;
  }
  _kill(i) {
    const j = --this.n;
    if (i === j) return;
    const i3 = i * 3, j3 = j * 3;
    for (let k = 0; k < 3; k++) { this.pos[i3 + k] = this.pos[j3 + k]; this.vel[i3 + k] = this.vel[j3 + k]; this.col[i3 + k] = this.col[j3 + k]; }
    this.size[i] = this.size[j]; this.size0[i] = this.size0[j]; this.alpha[i] = this.alpha[j]; this.life[i] = this.life[j];
    this.maxLife[i] = this.maxLife[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.grow[i] = this.grow[j];
  }
  clear() { this.n = 0; this.points.geometry.setDrawRange(0, 0); }
}

// ---------- Slash arc ----------
function makeArcGeo(arcDeg = 150, inner = 0.55, segs = 24) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const a0 = -THREE.MathUtils.degToRad(arcDeg) / 2, a1 = -a0;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, a = a0 + (a1 - a0) * t;
    const s = Math.sin(a), c = Math.cos(a);
    pos.push(s * inner, 0, c * inner, s, 0, c);
    uv.push(t, 0, t, 1);
    if (i < segs) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const ARC_FRAG = `
varying vec2 vUv; uniform float uT; uniform vec3 uColor; uniform float uOpacity;
void main(){
  float head = uT;               // sweep progress 0..1
  float tail = max(0.0, uT - 0.65);
  float along = smoothstep(tail, head, vUv.x) * (1.0 - smoothstep(head, head + 0.02, vUv.x));
  float edge = pow(vUv.y, 2.2);
  float a = along * edge * uOpacity;
  gl_FragColor = vec4(uColor * (1.0 + edge), a);
}`;
const ARC_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

// ---------- Ring (telegraph / shockwave) ----------
const RING_FRAG = `
varying vec2 vUv; uniform vec3 uColor; uniform float uOpacity; uniform float uFill; uniform float uMode;
void main(){
  vec2 c = vUv - 0.5; float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float a;
  if (uMode < 0.5) { // telegraph: outer ring + filling disc
    float ring = smoothstep(0.86, 0.93, d) * (1.0 - smoothstep(0.97, 1.0, d));
    float fill = step(d, uFill) * 0.35 + smoothstep(uFill - 0.06, uFill, d) * step(d, uFill) * 0.5;
    a = (ring * 0.9 + fill * 0.6 + 0.12) * uOpacity;
  } else { // shockwave
    a = smoothstep(0.55, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d)) * uOpacity;
  }
  gl_FragColor = vec4(uColor, a);
}`;

export class FX {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.add = new Particles(scene, 3000, true);
    this.norm = new Particles(scene, 2000, false);
    this.arcs = []; this.rings = []; this.numbers = []; this.lights = [];
    this.arcGeos = { 110: makeArcGeo(110), 150: makeArcGeo(150), 200: makeArcGeo(200), 360: makeArcGeo(359, 0.4, 48) };
    this.ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 10, 2); l.userData.t = 0; scene.add(l); this.lights.push(l);
    }
    this.numLayer = document.getElementById('numbers');
    this._v = new THREE.Vector3();
  }
  setPixelScale(h) { this.add.mat.uniforms.uScale.value = h * 0.9; this.norm.mat.uniforms.uScale.value = h * 0.9; }

  // ---- presets ----
  sparks(p, n = 14, color = [1, 0.8, 0.4], speed = 7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, u = frand(-0.2, 1);
      this.add.emit(p.x, p.y, p.z, Math.cos(a) * speed * frand(0.3, 1), u * speed * 0.8 + 2, Math.sin(a) * speed * frand(0.3, 1),
        color[0], color[1], color[2], frand(0.12, 0.28), frand(0.2, 0.5), 18, 2);
    }
  }
  blood(p, n = 10, color = [0.45, 0.02, 0.03]) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.norm.emit(p.x, p.y, p.z, Math.cos(a) * frand(1, 4), frand(1, 5), Math.sin(a) * frand(1, 4),
        color[0], color[1], color[2], frand(0.15, 0.32), frand(0.4, 0.8), 14, 1);
    }
  }
  bones(p, n = 8) { this.blood(p, n, [0.85, 0.82, 0.7]); }
  dust(p, n = 10, r = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.norm.emit(p.x + Math.cos(a) * r * 0.3, 0.15, p.z + Math.sin(a) * r * 0.3, Math.cos(a) * frand(1, 3) * r, frand(0.3, 1.2), Math.sin(a) * frand(1, 3) * r,
        0.55, 0.5, 0.45, frand(0.5, 1.0) * r, frand(0.5, 1.0), 0, 2.5, 2);
    }
  }
  smoke(p, n = 6, dark = 0.18, size = 1) {
    for (let i = 0; i < n; i++) {
      this.norm.emit(p.x + frand(-0.4, 0.4), p.y + frand(0, 0.5), p.z + frand(-0.4, 0.4), frand(-0.5, 0.5), frand(0.8, 2), frand(-0.5, 0.5),
        dark, dark, dark * 1.1, frand(0.8, 1.4) * size, frand(0.8, 1.5), -0.5, 1, 2.5);
    }
  }
  fire(p, n = 3, size = 1) {
    for (let i = 0; i < n; i++) {
      const hot = Math.random();
      this.add.emit(p.x + frand(-0.3, 0.3) * size, p.y + frand(0, 0.2), p.z + frand(-0.3, 0.3) * size, frand(-0.3, 0.3), frand(1.5, 3.5) * size, frand(-0.3, 0.3),
        1, 0.35 + hot * 0.4, 0.08, frand(0.4, 0.8) * size, frand(0.35, 0.7), -1, 1.5, -0.6);
    }
  }
  embers(p, n = 2) {
    for (let i = 0; i < n; i++) this.add.emit(p.x + frand(-0.5, 0.5), p.y, p.z + frand(-0.5, 0.5), frand(-0.6, 0.6), frand(1.5, 3), frand(-0.6, 0.6), 1, 0.5, 0.1, frand(0.06, 0.12), frand(1, 2.2), -0.4, 0.4);
  }
  magic(p, color = [0.5, 0.3, 1], n = 12, speed = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = frand(-1, 1);
      this.add.emit(p.x, p.y, p.z, Math.cos(a) * speed * frand(0.3, 1), b * speed * 0.6, Math.sin(a) * speed * frand(0.3, 1),
        color[0], color[1], color[2], frand(0.2, 0.45), frand(0.3, 0.6), 0, 3, -0.5);
    }
  }
  trail(p, color, size = 0.35, life = 0.3) { this.add.emit(p.x + frand(-0.05, 0.05), p.y + frand(-0.05, 0.05), p.z + frand(-0.05, 0.05), 0, 0, 0, color[0], color[1], color[2], size, life, 0, 0, -0.7); }
  explosion(p, r = 3, color = [1, 0.5, 0.15]) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = frand(2, 7) * r / 3;
      this.add.emit(p.x, p.y + 0.4, p.z, Math.cos(a) * s, frand(1, 6), Math.sin(a) * s, color[0], color[1] * frand(0.6, 1.2), color[2], frand(0.5, 1.1) * r / 3, frand(0.3, 0.7), 2, 2.5, -0.3);
    }
    this.smoke(p, 10, 0.15, r / 2.5);
    this.shockwave(p, r * 1.2, color);
    this.flash(p, color, 3, 0.25, r * 4);
  }
  lightning(a, b, color = [0.6, 0.8, 1]) {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, j = i === 0 || i === steps ? 0 : 0.5;
      const x = a.x + (b.x - a.x) * t + frand(-j, j), y = a.y + (b.y - a.y) * t + frand(-j, j), z = a.z + (b.z - a.z) * t + frand(-j, j);
      this.add.emit(x, y, z, 0, 0, 0, color[0], color[1], color[2], 0.45, 0.22);
      this.add.emit(x, y, z, frand(-1, 1), frand(-1, 1), frand(-1, 1), 1, 1, 1, 0.18, 0.15);
    }
    this.flash(b, color, 2, 0.12, 8);
  }

  slash(origin, yaw, { color = [1, 0.85, 0.55], radius = 2.6, arc = 150, dur = 0.16, tilt = 0, height = 1.1, flip = false } = {}) {
    let a = this.arcs.find((x) => !x.visible);
    if (!a) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color() }, uOpacity: { value: 1 } },
      });
      a = new THREE.Mesh(this.arcGeos[150], mat); a.frustumCulled = false; a.renderOrder = 11;
      this.game.scene.add(a); this.arcs.push(a);
    }
    const key = arc >= 300 ? 360 : arc >= 180 ? 200 : arc >= 130 ? 150 : 110;
    a.geometry = this.arcGeos[key];
    a.visible = true; a.userData = { t: 0, dur };
    a.position.set(origin.x, origin.y + height, origin.z);
    a.rotation.set(0, yaw, 0); a.rotateZ(tilt);
    a.scale.set(flip ? -radius : radius, 1, radius);
    a.material.uniforms.uColor.value.setRGB(color[0], color[1], color[2]);
    a.material.uniforms.uOpacity.value = 1;
    a.material.uniforms.uT.value = 0;
  }

  // Telegraph circle on the ground. Returns a handle; fill animates over `time`.
  telegraph(p, radius, time, color = [1, 0.15, 0.1]) {
    const r = this._ring(); r.userData = { t: 0, dur: time, mode: 0, follow: null };
    r.position.set(p.x, 0.06, p.z); r.scale.set(radius * 2, 1, radius * 2);
    r.material.uniforms.uColor.value.setRGB(color[0], color[1], color[2]);
    r.material.uniforms.uMode.value = 0; r.material.uniforms.uOpacity.value = 1; r.material.uniforms.uFill.value = 0;
    return r;
  }
  shockwave(p, radius, color = [1, 0.8, 0.5], dur = 0.35) {
    const r = this._ring(); r.userData = { t: 0, dur, mode: 1, maxR: radius };
    r.position.set(p.x, 0.08, p.z); r.scale.set(0.1, 1, 0.1);
    r.material.uniforms.uColor.value.setRGB(color[0], color[1], color[2]);
    r.material.uniforms.uMode.value = 1; r.material.uniforms.uOpacity.value = 1;
    return r;
  }
  _ring() {
    let r = this.rings.find((x) => !x.visible);
    if (!r) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: ARC_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 1 }, uFill: { value: 0 }, uMode: { value: 0 } },
      });
      r = new THREE.Mesh(this.ringGeo, mat); r.renderOrder = 8; r.frustumCulled = false;
      this.game.scene.add(r); this.rings.push(r);
    }
    r.visible = true;
    return r;
  }
  flash(p, color = [1, 0.7, 0.4], intensity = 3, dur = 0.2, dist = 10) {
    const l = this.lights.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
    l.position.set(p.x, (p.y || 0) + 1.5, p.z); l.color.setRGB(color[0], color[1], color[2]);
    l.userData = { t: dur, dur, peak: intensity * 8 }; l.distance = dist; l.intensity = intensity * 8;
  }

  number(worldPos, text, cls = '') {
    let el = this.numbers.find((n) => !n.alive);
    if (!el) {
      const d = document.createElement('div'); d.className = 'dmg'; this.numLayer.appendChild(d);
      el = { d, alive: false }; this.numbers.push(el);
    }
    el.alive = true; el.t = 0; el.life = cls.includes('big') ? 1.1 : 0.8;
    el.p = worldPos.clone(); el.p.y += 1.8; el.vx = frand(-0.6, 0.6);
    el.d.textContent = text; el.d.className = 'dmg ' + cls; el.d.style.display = 'block';
  }

  update(dt, camera, w, h) {
    this.add.update(dt); this.norm.update(dt);
    for (const a of this.arcs) {
      if (!a.visible) continue;
      a.userData.t += dt;
      const k = a.userData.t / a.userData.dur;
      a.material.uniforms.uT.value = Math.min(1.65, k * 1.65);
      if (k > 1) a.material.uniforms.uOpacity.value = Math.max(0, 1 - (k - 1) * 4);
      if (k > 1.25) a.visible = false;
    }
    for (const r of this.rings) {
      if (!r.visible) continue;
      const u = r.userData; u.t += dt;
      const k = u.t / u.dur;
      if (u.mode === 0) {
        if (u.follow) r.position.set(u.follow.x, 0.06, u.follow.z);
        r.material.uniforms.uFill.value = Math.min(1, k);
        if (k >= 1) { r.material.uniforms.uOpacity.value = Math.max(0, 1 - (k - 1) * 8); if (k > 1.15) r.visible = false; }
      } else {
        const s = u.maxR * 2 * (0.2 + 0.8 * Math.min(1, k));
        r.scale.set(s, 1, s); r.material.uniforms.uOpacity.value = Math.max(0, 1 - k);
        if (k >= 1) r.visible = false;
      }
    }
    for (const l of this.lights) {
      if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = l.userData.peak * Math.max(0, l.userData.t / l.userData.dur); }
      else l.intensity = 0;
    }
    const v = this._v;
    for (const n of this.numbers) {
      if (!n.alive) continue;
      n.t += dt;
      if (n.t > n.life) { n.alive = false; n.d.style.display = 'none'; continue; }
      n.p.y += dt * 1.6; n.p.x += n.vx * dt;
      v.copy(n.p).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const k = n.t / n.life;
      n.d.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${(k < 0.15 ? 0.6 + k * 4 : 1.2 - k * 0.3).toFixed(2)})`;
      n.d.style.opacity = (1 - Math.max(0, k - 0.6) / 0.4).toFixed(2);
    }
  }
  clear() {
    this.add.clear(); this.norm.clear();
    this.arcs.forEach((a) => (a.visible = false)); this.rings.forEach((r) => (r.visible = false));
    this.numbers.forEach((n) => { n.alive = false; n.d.style.display = 'none'; });
  }
}
