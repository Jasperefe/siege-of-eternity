// Arenas ("scenes") built from the Kenney castle/nature kits + Quaternius buildings
import * as THREE from 'three';
import { Assets, measure } from './assets.js';
import { frand, makeRng } from './util.js';

export const ARENA_R = 19;

export const SCENES = {
  courtyard: {
    title: 'Castle Courtyard', sky: 'sky/dawn.hdr', skyInt: 0.9, envInt: 0.55, bgBlur: 0.06,
    fog: [0x8a8f9e, 34, 100], sun: { color: 0xffd7a8, int: 2.1, pos: [-30, 40, 18] }, hemi: [0xbfd0ff, 0x4a3f35, 0.45],
    ground: 'cobble', exposure: 0.85, music: 'battle',
  },
  village: {
    title: 'Burning Village', sky: 'sky/day.hdr', skyInt: 0.75, envInt: 0.7, bgBlur: 0.06,
    fog: [0x6b5348, 30, 95], sun: { color: 0xffb070, int: 2.4, pos: [35, 30, -20] }, hemi: [0xffd0a0, 0x3a2a20, 0.55],
    ground: 'dirt', exposure: 0.95, music: 'battle',
  },
  forest: {
    title: 'The Dark Forest', sky: 'sky/night.hdr', skyInt: 1.6, envInt: 0.9, bgBlur: 0.04,
    fog: [0x101a26, 22, 75], sun: { color: 0xa8bcff, int: 2.0, pos: [20, 40, 25] }, hemi: [0x6a80c0, 0x1a2018, 0.8],
    ground: 'grass', exposure: 1.35, music: 'battle', lantern: 2.2,
  },
  peak: {
    title: "Dragon's Peak", sky: 'sky/night.hdr', skyInt: 0.9, envInt: 0.6, bgBlur: 0.04,
    fog: [0x1e0a08, 26, 85], sun: { color: 0xffa070, int: 2.0, pos: [-25, 35, -25] }, hemi: [0x9a6a60, 0x1a0805, 0.7],
    ground: 'lava', exposure: 1.15, music: 'boss', lantern: 1.4,
  },
};
export const SCENE_ORDER = ['courtyard', 'village', 'forest', 'peak'];

// Assets each scene needs (so they can be preloaded per scene)
export const SCENE_ASSETS = {
  courtyard: ['env/c_wall.glb', 'env/c_gate.glb', 'env/c_tower-square-base.glb', 'env/c_tower-square-mid.glb', 'env/c_tower-square-top-roof.glb',
    'env/c_flag-banner-long.glb', 'env/c_siege-catapult.glb', 'env/c_siege-trebuchet.glb', 'env/c_siege-ballista.glb', 'env/c_tower-hexagon-base.glb', 'env/n_pot_large.glb',
    'env/n_tree_oak_dark.glb', 'env/n_tree_default_dark.glb', 'env/n_rock_largeA.glb', 'env/n_campfire_stones.glb', 'env/n_log_stackLarge.glb', 'sky/dawn.hdr'],
  village: ['fbx/b_House_1.fbx', 'fbx/b_House_2.fbx', 'fbx/b_House_3.fbx', 'fbx/b_House_4.fbx', 'fbx/b_Inn.fbx', 'fbx/b_Blacksmith.fbx', 'fbx/b_Mill.fbx',
    'fbx/b_Stable.fbx', 'fbx/b_Bell_Tower.fbx', 'env/n_fence_planks.glb', 'env/n_log_stackLarge.glb', 'env/n_tree_oak_dark.glb', 'env/n_crop_pumpkin.glb',
    'env/n_pot_large.glb', 'env/n_campfire_logs.glb', 'env/c_siege-catapult-demolished.glb', 'sky/day.hdr'],
  forest: ['env/n_tree_pineTallA_detailed.glb', 'env/n_tree_pineTallB_detailed.glb', 'env/n_tree_detailed_dark.glb', 'env/n_tree_fat_darkh.glb',
    'env/n_tree_tall_dark.glb', 'env/n_tree_thin_dark.glb', 'env/n_rock_tallA.glb', 'env/n_rock_largeB.glb', 'env/n_mushroom_redGroup.glb',
    'env/n_mushroom_tanGroup.glb', 'env/n_stump_old.glb', 'env/n_log_large.glb', 'env/n_plant_bushLarge.glb', 'env/n_grass_large.glb', 'env/n_tent_detailedOpen.glb', 'sky/night.hdr'],
  peak: ['env/n_cliff_large_rock.glb', 'env/n_cliff_block_rock.glb', 'env/n_rock_tallE.glb', 'env/n_rock_largeD.glb', 'env/c_tower-hexagon-base.glb',
    'env/c_tower-hexagon-mid.glb', 'env/c_siege-trebuchet-demolished.glb', 'env/c_rocks-large.glb', 'sky/night.hdr'],
};

// ---------- procedural ground textures ----------
function groundTexture(kind) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const r = makeRng(kind.length * 977);
  const emis = document.createElement('canvas'); emis.width = emis.height = S; const ge = emis.getContext('2d');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  const wrap = (fn) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); };
  if (kind === 'cobble') {
    g.fillStyle = '#3a3631'; g.fillRect(0, 0, S, S);
    const rows = 14;
    for (let row = 0; row < rows; row++) {
      let x = r() * 30; const h = S / rows;
      while (x < S + 40) {
        const w = 26 + r() * 30, l = 34 + r() * 22;
        const col = `hsl(${30 + r() * 14},${8 + r() * 8}%,${l}%)`;
        wrap((dx, dy) => {
          g.fillStyle = col; g.beginPath();
          g.roundRect(x + dx + 2, row * h + dy + 2, w - 4, h - 4, 7); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + dx + 5, row * h + dy + 4, w - 12, 3);
        });
        x += w;
      }
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * S, r() * S, 2, 2); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(60,80,40,${0.15 + r() * 0.2})`; const x = r() * S, y = r() * S; wrap((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, 4 + r() * 10, 0, 7); g.fill(); }); }
  } else if (kind === 'dirt') {
    g.fillStyle = '#5b4535'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 400; i++) { const x = r() * S, y = r() * S, rad = 6 + r() * 40, l = 22 + r() * 16; g.fillStyle = `hsla(${22 + r() * 10},${25 + r() * 15}%,${l}%,0.25)`; wrap((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, 7); g.fill(); }); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,200'},${r() * 0.1})`; g.fillRect(r() * S, r() * S, 2, 2); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(20,15,10,${0.2 + r() * 0.3})`; const x = r() * S, y = r() * S; wrap((dx, dy) => { g.beginPath(); g.ellipse(x + dx, y + dy, 3 + r() * 6, 2 + r() * 3, r() * 3, 0, 7); g.fill(); }); }
  } else if (kind === 'grass') {
    g.fillStyle = '#1d2a1c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) { const x = r() * S, y = r() * S, rad = 8 + r() * 40; g.fillStyle = `hsla(${95 + r() * 30},${25 + r() * 15}%,${10 + r() * 10}%,0.3)`; wrap((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, 7); g.fill(); }); }
    for (let i = 0; i < 9000; i++) { const x = r() * S, y = r() * S; g.strokeStyle = `hsla(${90 + r() * 30},40%,${14 + r() * 16}%,0.7)`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 3 - 1.5, y - 3 - r() * 5); g.stroke(); }
  } else if (kind === 'lava') {
    g.fillStyle = '#231a18'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 300; i++) { const x = r() * S, y = r() * S, rad = 10 + r() * 50; g.fillStyle = `hsla(10,${8 + r() * 10}%,${8 + r() * 12}%,0.4)`; wrap((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, 7); g.fill(); }); }
    // glowing cracks
    for (let i = 0; i < 12; i++) {
      let x = r() * S, y = r() * S, a = r() * 6.28; const pts = [[x, y]];
      for (let k = 0; k < 9; k++) { a += r() * 1.4 - 0.7; x += Math.cos(a) * 18; y += Math.sin(a) * 18; pts.push([x, y]); }
      for (const [ctx, col, w] of [[g, '#120604', 5], [g, '#ff5a10', 1.6], [ge, '#ff6a20', 2.4]]) wrap((dx, dy) => {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([px, py], j) => (j ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy))); ctx.stroke();
      });
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  let e = null;
  if (kind === 'lava') { e = new THREE.CanvasTexture(emis); e.wrapS = e.wrapT = THREE.RepeatWrapping; e.colorSpace = THREE.SRGBColorSpace; }
  return { map: t, emissive: e };
}

// Instance every mesh of a loaded model at many transforms (one draw call per mesh)
const _tinted = new Map();
function instanced(path, mats4, tint = null) {
  const src = Assets.get(path).scene;
  if (tint == null && path.includes('/c_')) tint = 0xb8aca2;
  src.updateMatrixWorld(true);
  const group = new THREE.Group();
  src.traverse((o) => {
    if (!o.isMesh) return;
    let mat = o.material;
    if (tint != null) { const key = mat.uuid + tint; if (!_tinted.has(key)) { const m = mat.clone(); m.color.multiply(new THREE.Color(tint)); _tinted.set(key, m); } mat = _tinted.get(key); }
    const im = new THREE.InstancedMesh(o.geometry, mat, mats4.length);
    const local = o.matrixWorld;
    const m = new THREE.Matrix4();
    mats4.forEach((M, i) => { m.multiplyMatrices(M, local); im.setMatrixAt(i, m); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
    group.add(im);
  });
  return group;
}
const M4 = (x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(
  new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));

export class World {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group(); game.scene.add(this.root);
    this.colliders = [];        // {x,z,r}
    this.spawns = [];           // {x,z,yaw}
    this.fires = [];            // emitters {x,y,z,size}
    this.torches = [];
    this.key = null;
    this.radius = ARENA_R;
    this.pmrem = new THREE.PMREMGenerator(game.renderer);
    this.envCache = {};
    // lights (fixed count so shaders don't recompile on scene change)
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 0.6); game.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -26; sc.right = sc.top = 26; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    game.scene.add(this.sun); game.scene.add(this.sun.target);
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xff8833, 0, 14, 1.6); l.userData.base = 0; game.scene.add(l); this.torches.push(l);
    }
    // warm light that follows the hero (night scenes)
    this.lantern = new THREE.PointLight(0xffc890, 0, 13, 1.4); game.scene.add(this.lantern);
    const geo = new THREE.CircleGeometry(90, 64).rotateX(-Math.PI / 2);
    this.groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
    this.ground = new THREE.Mesh(geo, this.groundMat); this.ground.receiveShadow = true;
    game.scene.add(this.ground);
    this.groundTex = {};
    // shrinking cursed-fog wall (wave 30+)
    const wg = new THREE.CylinderGeometry(1, 1, 7, 64, 1, true);
    this.fogWall = new THREE.Mesh(wg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.6, 0.1, 0.9) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
        void main(){ float w = sin(vUv.x*80.0 + uTime*2.0)*0.5+0.5; float a = (1.0-vUv.y) * (0.35 + 0.25*w); gl_FragColor = vec4(uColor, a*0.8); }`,
    }));
    this.fogWall.position.y = 3.5; this.fogWall.visible = false; game.scene.add(this.fogWall);
    this.shrink = 1;
  }

  get effectiveRadius() { return this.radius * this.shrink; }

  async envFor(path) {
    if (this.envCache[path]) return this.envCache[path];
    const hdr = await Assets.hdr(path);
    const env = this.pmrem.fromEquirectangular(hdr).texture;
    this.envCache[path] = { hdr, env };
    return this.envCache[path];
  }

  async build(key) {
    const def = SCENES[key];
    await Promise.all(SCENE_ASSETS[key].map((p) => (p.endsWith('.hdr') ? this.envFor(p) : Assets.any(p))));
    this.clear();
    this.key = key;
    const g = this.game, scene = g.scene;
    const { hdr, env } = await this.envFor(def.sky);
    scene.background = hdr; scene.backgroundIntensity = def.skyInt; scene.backgroundBlurriness = def.bgBlur;
    scene.environment = env; scene.environmentIntensity = def.envInt;
    scene.fog = new THREE.Fog(def.fog[0], def.fog[1], def.fog[2]);
    this.sun.color.set(def.sun.color); this.sun.intensity = def.sun.int; this.sun.position.set(...def.sun.pos);
    this.sun.userData.ox = def.sun.pos[0] * 0.8; this.sun.userData.oz = def.sun.pos[2] * 0.8;
    this.hemi.color.set(def.hemi[0]); this.hemi.groundColor.set(def.hemi[1]); this.hemi.intensity = def.hemi[2];
    g.renderer.toneMappingExposure = def.exposure;
    if (!this.groundTex[def.ground]) this.groundTex[def.ground] = groundTexture(def.ground);
    const gt = this.groundTex[def.ground];
    const rep = def.ground === 'cobble' ? 34 : def.ground === 'lava' ? 9 : 22; gt.map.repeat.set(rep, rep); this.groundMat.map = gt.map;
    if (gt.emissive) { gt.emissive.repeat.set(rep, rep); this.groundMat.emissiveMap = gt.emissive; this.groundMat.emissive.set(0xff5a1a); this.groundMat.emissiveIntensity = 0.9; }
    else { this.groundMat.emissiveMap = null; this.groundMat.emissive.set(0x000000); }
    this.groundMat.needsUpdate = true;
    this.shrink = 1; this.fogWall.visible = false;
    this.lantern.intensity = def.lantern || 0;
    this['build_' + key]();
  }

  clear() {
    while (this.root.children.length) {
      const c = this.root.children.pop();
      c.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    }
    this.colliders = []; this.spawns = []; this.fires = [];
    this.torches.forEach((t) => { t.intensity = 0; t.userData.base = 0; });
  }

  _torch(i, x, y, z, int = 2.2, color = 0xff8833) {
    const t = this.torches[i]; if (!t) return;
    t.position.set(x, y, z); t.color.set(color); t.userData.base = int; t.intensity = int;
  }
  _place(path, x, z, ry = 0, h = null, y = 0, fixedScale = null) {
    const o = Assets.clone(path);
    if (fixedScale) o.scale.setScalar(fixedScale);
    else if (h) { const b = measure(o); const s = h / Math.max(0.001, b.max.y - b.min.y); o.scale.setScalar(s); }
    o.position.set(x, y, z); o.rotation.y = ry;
    this.root.add(o); return o;
  }

  // ---------------- Castle Courtyard ----------------
  build_courtyard() {
    const R = this.radius = ARENA_R;
    const N = 32, RW = R + 2.2, L = 2 * RW * Math.sin(Math.PI / N) + 0.15;
    const walls = [], gates = [], tb = [], tm = [], tt = [];
    const gateIdx = new Set([0, 8, 16, 24]);
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) / N * Math.PI * 2;
      const x = Math.sin(a) * RW, z = Math.cos(a) * RW;
      if (gateIdx.has(i)) { gates.push(M4(x, 0, z, a, L, 4.2, 4)); this.spawns.push({ x: Math.sin(a) * (R - 0.8), z: Math.cos(a) * (R - 0.8), yaw: a + Math.PI }); }
      else walls.push(M4(x, 0, z, a, L, 4, 4));
      if (i % 4 === 2) {
        const ta = (i) / N * Math.PI * 2, tx = Math.sin(ta) * (RW + 0.4), tz = Math.cos(ta) * (RW + 0.4);
        tb.push(M4(tx, 0, tz, ta, 5)); tm.push(M4(tx, 5 * 1.0, tz, ta, 5)); tt.push(M4(tx, 5 * 2.0, tz, ta, 5));
      }
    }
    this.root.add(instanced('env/c_wall.glb', walls));
    this.root.add(instanced('env/c_gate.glb', gates));
    this.root.add(instanced('env/c_tower-square-base.glb', tb));
    this.root.add(instanced('env/c_tower-square-mid.glb', tm));
    this.root.add(instanced('env/c_tower-square-top-roof.glb', tt));
    // banners on gates
    const flags = [];
    for (const s of this.spawns) { const a = Math.atan2(s.x, s.z); for (const o of [-1.4, 1.4]) flags.push(M4(Math.sin(a) * (RW - 0.6) + Math.cos(a) * o * 1.2, 2.2, Math.cos(a) * (RW - 0.6) - Math.sin(a) * o * 1.2, a + Math.PI, 2.6)); }
    this.root.add(instanced('env/c_flag-banner-long.glb', flags));
    // pillars inside the arena (cover + colliders)
    const pillars = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, d = 10.5;
      const x = Math.sin(a) * d, z = Math.cos(a) * d;
      pillars.push(M4(x, 0, z, a, 2.4, 2.2, 2.4)); this.colliders.push({ x, z, r: 1.15 });
    }
    this.root.add(instanced('env/c_tower-hexagon-base.glb', pillars));
    // braziers with fire
    [[-4.5, 0], [4.5, 0]].forEach(([x, z], i) => {
      this._place('env/n_pot_large.glb', x, z, i, 1.1);
      this.colliders.push({ x, z, r: 0.8 }); this.fires.push({ x, y: 1.15, z, size: 0.9 });
      this._torch(i, x, 2, z, 2.6);
    });
    // siege engines + trees outside the walls
    const rng = makeRng(42);
    [['env/c_siege-trebuchet.glb', 0.7, 4], ['env/c_siege-catapult.glb', 2.2, 3.2], ['env/c_siege-ballista.glb', 3.9, 3.2], ['env/c_siege-catapult.glb', 5.3, 3.2]].forEach(([p, a, sc]) => {
      this._place(p, Math.sin(a) * (RW + 9), Math.cos(a) * (RW + 9), a + Math.PI, null, 0, sc);
    });
    const trees = [], trees2 = [], rocks = [];
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2, d = RW + 6 + rng() * 40;
      const m = M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6.28, 5 + rng() * 4);
      (rng() < 0.5 ? trees : trees2).push(m);
    }
    for (let i = 0; i < 20; i++) { const a = rng() * 6.28, d = RW + 4 + rng() * 30; rocks.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6.28, 2 + rng() * 3)); }
    this.root.add(instanced('env/n_tree_oak_dark.glb', trees));
    this.root.add(instanced('env/n_tree_default_dark.glb', trees2));
    this.root.add(instanced('env/n_rock_largeA.glb', rocks));
    this._place('env/n_log_stackLarge.glb', -12, 13, 0.8, null, 0, 1.6);
    this.colliders.push({ x: -12, z: 13, r: 1.1 });
  }

  // ---------------- Burning Village ----------------
  build_village() {
    const R = this.radius = ARENA_R + 1;
    const houses = ['fbx/b_House_1.fbx', 'fbx/b_House_2.fbx', 'fbx/b_Inn.fbx', 'fbx/b_House_3.fbx', 'fbx/b_Blacksmith.fbx', 'fbx/b_House_4.fbx',
      'fbx/b_Stable.fbx', 'fbx/b_Mill.fbx', 'fbx/b_House_1.fbx', 'fbx/b_Bell_Tower.fbx', 'fbx/b_House_2.fbx', 'fbx/b_House_3.fbx'];
    const n = houses.length, roads = new Set([0, 3, 6, 9]);
    let ti = 0;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      if (roads.has(i)) { this.spawns.push({ x: Math.sin(a) * (R - 0.8), z: Math.cos(a) * (R - 0.8), yaw: a + Math.PI }); continue; }
      const d = R + 5.5;
      const h = houses[i].includes('Bell') || houses[i].includes('Mill') ? 13 : 8.5;
      this._place(houses[i], Math.sin(a) * d, Math.cos(a) * d, a + Math.PI, h);
      if (i % 2 === 1) { // burning houses
        const fx = Math.sin(a) * (d - 1), fz = Math.cos(a) * (d - 1);
        this.fires.push({ x: fx, y: 3.5, z: fz, size: 2.2 }, { x: fx + Math.cos(a) * 2, y: 5.5, z: fz - Math.sin(a) * 2, size: 1.8 });
        if (ti < 4) this._torch(ti++, fx, 4, fz, 3.4, 0xff6a20);
      }
    }
    // fences between houses (arena edge)
    const fences = [];
    for (let i = 0; i < 48; i++) {
      const a = (i + 0.5) / 48 * Math.PI * 2;
      const seg = Math.floor(a / (Math.PI * 2) * n + 0.5) % n;
      if (roads.has(seg)) continue;
      fences.push(M4(Math.sin(a) * (R + 1.2), 0, Math.cos(a) * (R + 1.2), a + Math.PI / 2, 2.6));
    }
    this.root.add(instanced('env/n_fence_planks.glb', fences));
    // props
    const rng = makeRng(7);
    const pumpkins = [], pots = [];
    for (let i = 0; i < 14; i++) { const a = rng() * 6.28, d = R + 1.5 + rng() * 3; (rng() < 0.5 ? pumpkins : pots).push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 1.6)); }
    this.root.add(instanced('env/n_crop_pumpkin.glb', pumpkins));
    this.root.add(instanced('env/n_pot_large.glb', pots));
    this._place('env/c_siege-catapult-demolished.glb', 8, -8, 2.2, null, 0, 2.6); this.colliders.push({ x: 8, z: -8, r: 1.6 });
    this.fires.push({ x: 8, y: 0.6, z: -8, size: 0.8 });
    this._place('env/n_log_stackLarge.glb', -9, 7, 0.4, null, 0, 1.6); this.colliders.push({ x: -9, z: 7, r: 1.2 });
    const trees = [];
    for (let i = 0; i < 50; i++) { const a = rng() * 6.28, d = R + 14 + rng() * 35; trees.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 6 + rng() * 4)); }
    this.root.add(instanced('env/n_tree_oak_dark.glb', trees));
  }

  // ---------------- Dark Forest ----------------
  build_forest() {
    const R = this.radius = ARENA_R;
    const rng = makeRng(99);
    const kinds = ['env/n_tree_pineTallA_detailed.glb', 'env/n_tree_pineTallB_detailed.glb', 'env/n_tree_detailed_dark.glb', 'env/n_tree_fat_darkh.glb', 'env/n_tree_tall_dark.glb', 'env/n_tree_thin_dark.glb'];
    const buckets = kinds.map(() => []);
    const gaps = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    gaps.forEach((a) => this.spawns.push({ x: Math.sin(a) * (R - 0.8), z: Math.cos(a) * (R - 0.8), yaw: a + Math.PI }));
    for (let i = 0; i < 260; i++) {
      const a = rng() * Math.PI * 2, d = R + 1.5 + Math.pow(rng(), 0.7) * 45;
      if (d < R + 8 && gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.13)) continue;
      buckets[Math.floor(rng() * kinds.length)].push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6.28, 5 + rng() * 5));
    }
    kinds.forEach((k, i) => this.root.add(instanced(k, buckets[i])));
    // inner obstacles: rocks + stumps
    const inner = [[7, 7, 'env/n_rock_tallA.glb', 4, 1.3], [-8, 5, 'env/n_rock_largeB.glb', 2.2, 1.6], [-5, -9, 'env/n_stump_old.glb', 1.6, 1.1], [9, -6, 'env/n_rock_tallA.glb', 3.5, 1.2]];
    for (const [x, z, p, h, r] of inner) { this._place(p, x, z, rng() * 6, h); this.colliders.push({ x, z, r }); }
    const mush = [], mush2 = [], bush = [], grass = [];
    for (let i = 0; i < 40; i++) { const a = rng() * 6.28, d = R - 1 + rng() * 6; (rng() < 0.5 ? mush : mush2).push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 1.5 + rng())); }
    for (let i = 0; i < 40; i++) { const a = rng() * 6.28, d = R + rng() * 8; bush.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 2 + rng() * 2)); }
    for (let i = 0; i < 90; i++) { const a = rng() * 6.28, d = rng() * (R - 2); grass.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 0.8 + rng() * 0.6)); }
    this.root.add(instanced('env/n_mushroom_redGroup.glb', mush));
    this.root.add(instanced('env/n_mushroom_tanGroup.glb', mush2));
    this.root.add(instanced('env/n_plant_bushLarge.glb', bush));
    this.root.add(instanced('env/n_grass_large.glb', grass));
    this._place('env/n_tent_detailedOpen.glb', -R - 3, 4, 1.2, 3.2);
    // spooky lanterns (cold blue fires)
    [[0, -R + 2], [R - 2, 0], [-R + 2, 0], [0, R - 2]].forEach(([x, z], i) => { this._torch(i, x, 2.5, z, 2.4, 0x6a8cff); this.fires.push({ x, y: 0.3, z, size: 0.6, cold: true }); });
  }

  // ---------------- Dragon's Peak ----------------
  build_peak() {
    const R = this.radius = ARENA_R + 2;
    const rng = makeRng(1234);
    const cliffs = [], cliffs2 = [], spikes = [], rubble = [];
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2;
      const d = R + 3 + rng() * 2;
      (i % 2 ? cliffs : cliffs2).push(M4(Math.sin(a) * d, -0.3, Math.cos(a) * d, a + rng(), 7 + rng() * 5, 6 + rng() * 6, 7 + rng() * 5));
    }
    for (let i = 0; i < 30; i++) { const a = rng() * 6.28, d = R + 8 + rng() * 30; spikes.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 6 + rng() * 10)); }
    for (let i = 0; i < 16; i++) { const a = rng() * 6.28, d = R - 3 + rng() * 4; rubble.push(M4(Math.sin(a) * d, 0, Math.cos(a) * d, rng() * 6, 1.5 + rng() * 2)); }
    this.root.add(instanced('env/n_cliff_large_rock.glb', cliffs));
    this.root.add(instanced('env/n_cliff_block_rock.glb', cliffs2));
    this.root.add(instanced('env/n_rock_tallE.glb', spikes));
    this.root.add(instanced('env/c_rocks-large.glb', rubble));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; this.spawns.push({ x: Math.sin(a) * (R - 1), z: Math.cos(a) * (R - 1), yaw: a + Math.PI }); }
    // ruined towers inside
    [[9, 9], [-9, -9]].forEach(([x, z]) => {
      this._place('env/c_tower-hexagon-base.glb', x, z, rng() * 6, 4.5); this.colliders.push({ x, z, r: 1.7 });
    });
    this._place('env/c_siege-trebuchet-demolished.glb', -10, 8, 0.6, null, 0, 3); this.colliders.push({ x: -10, z: 8, r: 2 });
    this._place('env/n_rock_largeD.glb', 10, -8, 0, 2.5); this.colliders.push({ x: 10, z: -8, r: 1.6 });
    // lava vents
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const x = Math.sin(a) * (R + 1.5), z = Math.cos(a) * (R + 1.5); this.fires.push({ x, y: 0.2, z, size: 1.6 }); this._torch(i, x, 2, z, 3.2, 0xff4410); }
  }

  // keep actors inside arena and out of obstacles
  resolve(p, r) {
    const R = this.effectiveRadius - r;
    const d = Math.hypot(p.x, p.z);
    if (d > R) { p.x *= R / d; p.z *= R / d; }
    for (const c of this.colliders) {
      const dx = p.x - c.x, dz = p.z - c.z, dd = Math.hypot(dx, dz), min = c.r + r;
      if (dd < min && dd > 0.0001) { p.x = c.x + dx / dd * min; p.z = c.z + dz / dd * min; }
    }
  }

  update(dt, t) {
    for (const f of this.fires) {
      if (Math.random() < dt * 22 * f.size) {
        if (f.cold) this.game.fx.add.emit(f.x + frand(-0.2, 0.2), f.y, f.z + frand(-0.2, 0.2), 0, frand(1, 2), 0, 0.35, 0.55, 1, frand(0.3, 0.6), 0.6, -0.5, 1, -0.5);
        else this.game.fx.fire(f, 1, f.size);
      }
      if (!f.cold && Math.random() < dt * 4 * f.size) this.game.fx.embers({ x: f.x, y: f.y + 1, z: f.z }, 1);
      if (f.size > 1.5 && Math.random() < dt * 3) this.game.fx.smoke({ x: f.x, y: f.y + 2, z: f.z }, 1, 0.08, f.size);
    }
    for (const l of this.torches) if (l.userData.base) l.intensity = l.userData.base * (0.85 + 0.15 * Math.sin(t * 13 + l.position.x) * Math.sin(t * 7.3 + l.position.z));
    if (this.key === 'forest' && Math.random() < dt * 6) { // fireflies
      const a = Math.random() * 6.28, d = Math.random() * this.radius;
      this.game.fx.add.emit(Math.sin(a) * d, frand(0.5, 3), Math.cos(a) * d, frand(-0.3, 0.3), frand(-0.1, 0.3), frand(-0.3, 0.3), 0.7, 1, 0.4, 0.12, 3, 0, 0);
    }
    if (this.key === 'peak' && Math.random() < dt * 10) {
      const a = Math.random() * 6.28, d = Math.random() * 40;
      this.game.fx.embers({ x: Math.sin(a) * d, y: 0.2, z: Math.cos(a) * d }, 1);
    }
    const hp = this.game.hero?.pos; if (hp && this.lantern.intensity > 0) this.lantern.position.set(hp.x, 3.2, hp.z + 0.5);
    if (this.fogWall.visible) { this.fogWall.material.uniforms.uTime.value = t; const r = this.effectiveRadius + 0.6; this.fogWall.scale.set(r, 1, r); }
  }
}
