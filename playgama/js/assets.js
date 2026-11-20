// Asset loading, caching and cloning
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

let BASE = './assets/';
const gltfL = new GLTFLoader();
const fbxL = new FBXLoader();
const rgbeL = new RGBELoader();
const texL = new THREE.TextureLoader();

const cache = new Map();   // key -> {scene, clips}
const pending = new Map();
let kkClips = null;        // shared KayKit Rig_Medium clips

export const Assets = {
  setBase(b) { BASE = b; },
  stats: { loaded: 0, bytes: 0 },

  async gltf(path) {
    if (cache.has(path)) return cache.get(path);
    if (pending.has(path)) return pending.get(path);
    const p = gltfL.loadAsync(BASE + path).then((g) => {
      const entry = { scene: g.scene, clips: g.animations || [] };
      prepare(entry.scene);
      entry.clips.forEach(stripRootMotion);
      cache.set(path, entry); pending.delete(path); this.stats.loaded++;
      return entry;
    }).catch((e) => { pending.delete(path); throw e; });
    pending.set(path, p);
    return p;
  },

  async fbx(path) {
    if (cache.has(path)) return cache.get(path);
    if (pending.has(path)) return pending.get(path);
    const p = fbxL.loadAsync(BASE + path).then((obj) => {
      const entry = { scene: obj, clips: obj.animations || [] };
      prepare(entry.scene, true);
      // FBX files whose textures sit next to them as <MaterialName>.png (RPG Characters pack)
      if (path.startsWith('rpg/')) obj.traverse((o) => { if (!o.isMesh) return; [].concat(o.material).forEach((m) => {
        if (m && !m.map && /_Texture$/.test(m.name)) { m.map = texL.load(BASE + 'rpg/' + m.name + '.png'); m.map.colorSpace = THREE.SRGBColorSpace; m.color.setRGB(1, 1, 1); m.needsUpdate = true; }
      }); });
      entry.clips.forEach(stripRootMotion);
      cache.set(path, entry); pending.delete(path); this.stats.loaded++;
      return entry;
    }).catch((e) => { pending.delete(path); throw e; });
    pending.set(path, p);
    return p;
  },

  async any(path) { return path.endsWith('.fbx') ? this.fbx(path) : this.gltf(path); },

  async hdr(path) {
    if (cache.has(path)) return cache.get(path);
    const t = await rgbeL.loadAsync(BASE + path);
    t.mapping = THREE.EquirectangularReflectionMapping;
    cache.set(path, t);
    return t;
  },

  // Shared KayKit animation library. Loaded in two steps (core first, extras later) into ONE growing array,
  // so actors built early still find clips that arrive later.
  KK_CORE: ['General', 'MovementBasic', 'MovementAdvanced', 'CombatMelee'],
  KK_ALL: ['General', 'MovementBasic', 'MovementAdvanced', 'CombatMelee', 'CombatRanged', 'Special', 'Simulation'],
  kkMap: {},
  async kkAnims(files = this.KK_ALL) {
    kkClips ||= [];
    const res = await Promise.all(files.map((f) => this.gltf(`anims/kk_${f}.glb`)));
    for (const r of res) for (const c of r.clips) if (!this.kkMap[c.name]) { this.kkMap[c.name] = c; kkClips.push(c); }
    return kkClips;
  },
  kkReady(files = this.KK_ALL) { return files.every((f) => this.has(`anims/kk_${f}.glb`)); },

  has(path) { return cache.has(path); },
  get(path) { return cache.get(path); },

  // Deep clone that keeps skinning working
  clone(path) {
    const e = cache.get(path);
    if (!e) throw new Error('not loaded: ' + path);
    const c = SkeletonUtils.clone(e.scene);
    return c;
  },
  clips(path) { return cache.get(path)?.clips || []; },
  // Dress a skinned character with a separately skinned outfit that uses the same bone names
  dress(model, outfitPath) {
    const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const host = []; model.traverse((o) => { if (o.isSkinnedMesh) host.push(o); });
    const parent = host[0]?.parent || model;
    const src = SkeletonUtils.clone(cache.get(outfitPath).scene);
    const meshes = []; src.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    for (const m of meshes) {
      const sk = new THREE.Skeleton(m.skeleton.bones.map((b) => bones[b.name] || b), m.skeleton.boneInverses);
      parent.add(m); m.bind(sk, host[0] ? host[0].bindMatrix : m.bindMatrix);
      m.castShadow = true; m.frustumCulled = false;
    }
    return meshes;
  },
};

// Shadows + material fixes on load
function toStandard(m) {
  if (!m || !(m.isMeshPhongMaterial || m.isMeshLambertMaterial)) return m;
  const s = new THREE.MeshStandardMaterial({ color: m.color, map: m.map, roughness: 0.82, metalness: 0, emissive: m.emissive, emissiveMap: m.emissiveMap, name: m.name });
  s.color.multiplyScalar(1.15);
  return s;
}
function prepare(root, isFbx = false) {
  root.traverse((o) => {
    if (isFbx && o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(toStandard) : toStandard(o.material);
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = true;
      o.frustumCulled = !o.isSkinnedMesh; // skinned meshes can be culled wrongly when animated
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        if (isFbx) {
          if (m.opacity === 0 || (m.transparent && !m.map)) { m.opacity = 1; m.transparent = false; }
          if (m.isMeshPhongMaterial) { m.shininess = 8; m.specular?.setScalar(0.05); }
        }
        if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; }
        if ('roughness' in m && m.roughness < 0.5 && !m.metalness) m.roughness = 0.75;
        m.side = THREE.FrontSide;
      });
    }
  });
}

// Remove horizontal root drift from clips: gameplay code moves the actor, not the animation
function stripRootMotion(clip) {
  for (const tr of clip.tracks) {
    if (!tr.name.endsWith('.position')) continue;
    const bone = tr.name.slice(0, -9).toLowerCase();
    if (!(bone.endsWith('hips') || bone === 'pelvis' || bone.endsWith('root') || bone.endsWith('root_1') || bone === 'body' || bone.endsWith('armature'))) continue;
    const v = tr.values;
    const x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
}

// Measure the height of a model in bind pose
export function measure(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((o) => {
    if (o.isMesh) {
      if (o.isSkinnedMesh) { o.computeBoundingBox(); }
      else if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = (o.boundingBox || o.geometry.boundingBox).clone().applyMatrix4(o.matrixWorld);
      box.union(b);
    }
  });
  return box;
}

export function findBone(root, names) {
  let found = null;
  const list = Array.isArray(names) ? names : [names];
  root.traverse((o) => { if (!found && list.includes(o.name)) found = o; });
  return found;
}

export { THREE, SkeletonUtils };
