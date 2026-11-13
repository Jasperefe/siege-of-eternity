// Enemy roster, elite modifiers, AI and boss behaviours
import * as THREE from 'three';
import { Actor } from './actor.js';
import { Audio2 } from './audio.js';
import { angleDiff, clamp, dampAngle, frand } from './util.js';

const CH = 'chars/', W = 'weapons/', FB = 'fbx/';
const QF = ['FistR'], KR = ['handslotr'], KL = ['handslotl'];
const QROT = [0, 1.57, 1.57];
const KK = 'kk';

// Quaternius humanoid anims
const QANIM = { idle: 'Idle', run: 'Run', walk: 'Walk', hit: 'RecieveHit', death: 'Death', victory: 'Victory', roll: 'Roll' };
// Ultimate Monsters "Big"
const MANIM = { idle: 'Idle', run: 'Run', walk: 'Walk', hit: 'HitReact', death: 'Death', victory: 'Wave' };
// Ultimate Monsters "Flying"
const FANIM = { idle: 'Flying_Idle', run: 'Fast_Flying', hit: 'HitReact', death: 'Death' };
// KayKit
const KANIM = { idle: 'Idle_A', run: 'Running_A', walk: 'Walking_B', hit: 'Hit_A', death: 'Death_A', victory: 'Cheering', block: 'Melee_Blocking', roll: 'Dodge_Backward' };
const SKANIM = { ...KANIM, idle: 'Skeletons_Idle', walk: 'Skeletons_Walking', death: 'Skeletons_Death', spawn: 'Skeletons_Spawn_Ground', victory: 'Skeletons_Taunt' };

export const ENEMIES = {
  goblin: { name: 'Goblin Raider', model: CH + 'q_Goblin_Male.glb', h: 1.55, r: 0.45, hp: 26, dmg: 7, speed: 4.6, mass: 0.1, cost: 1, wave: 1, w: 10, mat: 'flesh', blood: [0.25, 0.4, 0.05],
    anims: QANIM, weapons: [[W + 'axe_1handed.glb', QF, { length: 0.75, rot: QROT }]],
    attacks: [{ anim: 'SwordSlash', dur: 0.9, hit: 0.5, range: 1.9, arc: 100, dmg: 1, cd: 1.6 }] },
  goblin_f: { name: 'Goblin Cutthroat', model: CH + 'q_Goblin_Female.glb', h: 1.5, r: 0.45, hp: 22, dmg: 8, speed: 5.2, mass: 0.1, cost: 1, wave: 2, w: 7, mat: 'flesh', blood: [0.25, 0.4, 0.05],
    anims: QANIM, weapons: [[W + 'dagger.glb', QF, { length: 0.55, rot: QROT }]], traits: ['dodger'],
    attacks: [{ anim: 'SwordSlash', dur: 0.75, hit: 0.5, range: 1.8, arc: 90, dmg: 1, cd: 1.3 }] },
  zombie: { name: 'Plague Zombie', model: CH + 'q_Zombie_Male.glb', h: 1.85, r: 0.5, hp: 52, dmg: 11, speed: 2.0, mass: 0.25, cost: 1.3, wave: 1, w: 9, mat: 'flesh', blood: [0.2, 0.3, 0.1],
    anims: { ...QANIM, run: 'Walk' }, attacks: [{ anim: 'Punch', dur: 1.0, hit: 0.55, range: 1.9, arc: 100, dmg: 1, cd: 1.8 }], groan: true },
  zombie_f: { name: 'Ghoul', model: CH + 'q_Zombie_Female.glb', h: 1.75, r: 0.5, hp: 44, dmg: 10, speed: 2.6, mass: 0.2, cost: 1.2, wave: 3, w: 6, mat: 'flesh', blood: [0.2, 0.3, 0.1],
    anims: { ...QANIM, run: 'Walk' }, attacks: [{ anim: 'Punch', dur: 0.9, hit: 0.55, range: 1.9, arc: 100, dmg: 1, cd: 1.6 }], groan: true },
  crypt_skel: { name: 'Crypt Skeleton', model: FB + 'Skeleton.fbx', h: 1.7, r: 0.45, hp: 30, dmg: 9, speed: 3.8, mass: 0.15, cost: 1, wave: 4, w: 7, mat: 'bone', yaw: 0,
    anims: { idle: 'SkeletonArmature|Skeleton_Idle', run: 'SkeletonArmature|Skeleton_Running', hit: null, death: 'SkeletonArmature|Skeleton_Death', spawn: 'SkeletonArmature|Skeleton_Spawn' },
    attacks: [{ anim: 'SkeletonArmature|Skeleton_Attack', dur: 0.9, hit: 0.5, range: 1.9, arc: 100, dmg: 1, cd: 1.5 }], ground: true },
  skel_minion: { name: 'Skeleton Minion', model: CH + 'kk_Skeleton_Minion.glb', clips: KK, h: 1.75, r: 0.45, hp: 34, dmg: 9, speed: 3.7, mass: 0.15, cost: 1.1, wave: 3, w: 9, mat: 'bone',
    anims: SKANIM, weapons: [[W + 'Skeleton_Blade.glb', KR]], ground: true,
    attacks: [{ anim: 'Melee_1H_Attack_Chop', dur: 0.9, hit: 0.5, range: 2.0, arc: 100, dmg: 1, cd: 1.5 }] },
  soldier: { name: 'Cursed Soldier', model: CH + 'q_Soldier_Male.glb', h: 1.85, r: 0.5, hp: 80, dmg: 13, speed: 3.6, mass: 0.35, cost: 2.2, wave: 5, w: 6, mat: 'metal',
    anims: QANIM, weapons: [[W + 'sword_1handed.glb', QF, { length: 1.0, rot: QROT }]], traits: ['blocker'],
    attacks: [{ anim: 'SwordSlash', dur: 0.85, hit: 0.5, range: 2.2, arc: 110, dmg: 1, cd: 1.5 }] },
  skel_warrior: { name: 'Skeleton Warrior', model: CH + 'kk_Skeleton_Warrior.glb', clips: KK, h: 1.95, r: 0.5, hp: 85, dmg: 14, speed: 3.2, mass: 0.4, cost: 2.5, wave: 6, w: 8, mat: 'bone',
    anims: SKANIM, weapons: [[W + 'Skeleton_Blade.glb', KR], [W + 'Skeleton_Shield_Large_A.glb', KL]], traits: ['blocker'], ground: true,
    attacks: [{ anim: 'Melee_1H_Attack_Slice_Diagonal', dur: 0.8, hit: 0.5, range: 2.2, arc: 120, dmg: 1, cd: 1.5 },
      { anim: 'Melee_Block_Attack', dur: 0.8, hit: 0.5, range: 2.0, arc: 100, dmg: 1.2, cd: 2 }] },
  slime: { name: 'Gloom Slime', model: FB + 'Slime.fbx', h: 1.3, r: 0.6, hp: 70, dmg: 10, speed: 2.8, mass: 0.3, cost: 2, wave: 6, w: 5, mat: 'goo', blood: [0.3, 0.9, 0.4], yaw: 0,
    anims: { idle: 'Armature|Slime_Idle', run: 'Armature|Slime_Walk', death: 'Armature|Slime_Death' }, traits: ['splitter'],
    attacks: [{ anim: 'Armature|Slime_Attack', dur: 0.9, hit: 0.55, range: 1.9, arc: 140, dmg: 1, cd: 1.6 }] },
  skel_archer: { name: 'Skeleton Archer', model: CH + 'kk_Skeleton_Minion.glb', clips: KK, h: 1.75, r: 0.45, hp: 32, dmg: 10, speed: 3.4, mass: 0.15, cost: 2, wave: 7, w: 6, mat: 'bone',
    anims: SKANIM, weapons: [[W + 'Skeleton_Crossbow.glb', KR]], ground: true, ranged: [7, 13], color: 0xbbccff,
    attacks: [{ anim: 'Ranged_1H_Shoot', dur: 1.2, hit: 0.7, range: 16, kind: 'ranged', proj: 'arrow', speed: 20, dmg: 1, cd: 2.4 }] },
  cultist: { name: 'Fire Cultist', model: CH + 'q_Wizard.glb', h: 1.8, r: 0.45, hp: 45, dmg: 13, speed: 3.3, mass: 0.2, cost: 2.5, wave: 8, w: 6, mat: 'flesh',
    anims: QANIM, ranged: [8, 14],
    attacks: [{ anim: 'Shoot_OneHanded', dur: 1.1, hit: 0.55, range: 16, kind: 'ranged', proj: 'fireball', speed: 13, aoe: 2.2, dmg: 1, cd: 2.8 }] },
  hound: { name: 'Demon Hound', model: FB + 'Wolf.fbx', h: 1.2, r: 0.55, hp: 40, dmg: 10, speed: 8.2, mass: 0.15, cost: 1.6, wave: 8, w: 7, mat: 'flesh', yaw: -Math.PI / 2,
    color: 0x5a2a2a, emissive: 0x500800, anims: { idle: 'WolfArmature|Idle', run: 'WolfArmature|Walking', walk: 'WolfArmature|Walking' }, runSpeed: 2.3, traits: ['pack'],
    attacks: [{ anim: 'WolfArmature|Walking', dur: 0.55, hit: 0.5, range: 2.3, arc: 90, dmg: 1, cd: 1.2, lunge: 9, kind: 'bite' }] },
  orc: { name: 'Orc Brute', model: CH + 'm_Orc.glb', h: 2.2, r: 0.7, hp: 120, dmg: 16, speed: 3.6, mass: 0.5, cost: 3, wave: 9, w: 6, mat: 'flesh',
    anims: MANIM, attacks: [{ anim: 'Weapon', dur: 1.0, hit: 0.55, range: 2.5, arc: 120, dmg: 1, cd: 1.8 }, { anim: 'Punch', dur: 0.8, hit: 0.5, range: 2.2, arc: 100, dmg: 0.8, cd: 1.4 }] },
  bat: { name: 'Blood Bat', model: FB + 'Bat.fbx', h: 0.9, r: 0.4, hp: 16, dmg: 6, speed: 7.2, mass: 0.05, cost: 0.6, wave: 9, w: 5, mat: 'flesh', yaw: 0, flying: 1.8, group: 4, darkTo: 0x4a1a2a,
    anims: { idle: 'BatArmature|Bat_Flying', run: 'BatArmature|Bat_Flying', hit: 'BatArmature|Bat_Hit', death: 'BatArmature|Bat_Death' }, screech: true,
    attacks: [{ anim: 'BatArmature|Bat_Attack', dur: 0.6, hit: 0.5, range: 1.8, arc: 120, dmg: 1, cd: 1.3, lunge: 7, kind: 'bite' }] },
  skel_rogue: { name: 'Skeleton Rogue', model: CH + 'kk_Skeleton_Rogue.glb', clips: KK, h: 1.8, r: 0.45, hp: 55, dmg: 12, speed: 5.0, mass: 0.2, cost: 2, wave: 9, w: 6, mat: 'bone',
    anims: SKANIM, weapons: [[W + 'Skeleton_Blade.glb', KR], [W + 'Skeleton_Blade.glb', KL]], traits: ['dodger'], ground: true,
    attacks: [{ anim: 'Melee_Dualwield_Attack_Slice', dur: 0.6, hit: 0.5, range: 2.0, arc: 120, dmg: 1, cd: 1.1 }, { anim: 'Melee_Dualwield_Attack_Stab', dur: 0.75, hit: 0.5, range: 2.4, arc: 70, dmg: 1.3, cd: 1.6 }] },
  viking: { name: 'Berserker', model: CH + 'q_Viking_Male.glb', h: 2.0, r: 0.55, hp: 140, dmg: 18, speed: 4.2, mass: 0.5, cost: 3.5, wave: 10, w: 5, mat: 'flesh',
    anims: QANIM, weapons: [[W + 'axe_2handed.glb', QF, { length: 1.25, rot: QROT }]], traits: ['charger'],
    attacks: [{ anim: 'SwordSlash', dur: 0.95, hit: 0.5, range: 2.4, arc: 130, dmg: 1, cd: 1.6 },
      { anim: 'Run', dur: 1.4, hit: 0.3, range: 11, kind: 'charge', dmg: 1.3, cd: 5, telegraph: true, knock: 10 }] },
  skel_mage: { name: 'Necromancer', model: CH + 'kk_Skeleton_Mage.glb', clips: KK, h: 1.85, r: 0.45, hp: 60, dmg: 12, speed: 3.0, mass: 0.2, cost: 4, wave: 11, w: 4, mat: 'bone',
    anims: SKANIM, weapons: [[W + 'Skeleton_Staff.glb', KR]], ground: true, ranged: [9, 15], traits: ['necro'], elitePrio: true,
    attacks: [{ anim: 'Ranged_Magic_Shoot', dur: 1.0, hit: 0.5, range: 17, kind: 'ranged', proj: 'dark', speed: 14, dmg: 1, cd: 2.6 },
      { anim: 'Ranged_Magic_Summon', dur: 2.0, hit: 0.6, range: 30, kind: 'raise', cd: 9, dmg: 0 }] },
  orc_skull: { name: 'Bone Crusher', model: CH + 'm_Orc_Skull.glb', h: 2.6, r: 0.8, hp: 200, dmg: 22, speed: 3.0, mass: 0.7, cost: 5, wave: 12, w: 4, mat: 'bone',
    anims: MANIM, attacks: [{ anim: 'Weapon', dur: 1.3, hit: 0.6, range: 3.2, kind: 'slam', aoe: 3.0, dmg: 1, cd: 2.4, telegraph: true },
      { anim: 'Punch', dur: 0.9, hit: 0.5, range: 2.6, arc: 110, dmg: 0.7, cd: 1.5 }] },
  ninja: { name: 'Shadow Assassin', model: CH + 'q_Ninja_Male.glb', h: 1.8, r: 0.45, hp: 60, dmg: 16, speed: 6.3, mass: 0.2, cost: 3, wave: 13, w: 4, mat: 'flesh',
    anims: QANIM, weapons: [[W + 'dagger.glb', QF, { length: 0.6, rot: QROT }]], traits: ['dodger', 'blink'],
    attacks: [{ anim: 'SwordSlash', dur: 0.6, hit: 0.5, range: 2.0, arc: 100, dmg: 1, cd: 1.0 }] },
  witch: { name: 'Hexblood Witch', model: CH + 'q_Witch.glb', h: 1.8, r: 0.45, hp: 55, dmg: 9, speed: 3.2, mass: 0.2, cost: 3, wave: 14, w: 4, mat: 'flesh',
    anims: QANIM, ranged: [9, 15], traits: ['healer'], elitePrio: true,
    attacks: [{ anim: 'Shoot_OneHanded', dur: 1.0, hit: 0.55, range: 16, kind: 'ranged', proj: 'curse', speed: 11, dmg: 1, cd: 2.6, slow: 0.4 },
      { anim: 'Victory', dur: 1.4, hit: 0.5, range: 30, kind: 'heal', dmg: 0, cd: 7 }] },
  demon: { name: 'Pit Demon', model: CH + 'm_Demon.glb', h: 2.5, r: 0.75, hp: 180, dmg: 20, speed: 4.5, mass: 0.6, cost: 5, wave: 15, w: 4, mat: 'flesh', blood: [0.6, 0.1, 0.0],
    anims: MANIM, attacks: [{ anim: 'Weapon', dur: 0.9, hit: 0.5, range: 3.0, arc: 70, dmg: 1, cd: 1.5, lunge: 4 }, { anim: 'Jump', dur: 1.2, hit: 0.75, range: 9, kind: 'leap', aoe: 2.6, dmg: 1.2, cd: 5, telegraph: true }] },
  ghost_skull: { name: 'Wailing Skull', model: CH + 'm_Ghost_Skull.glb', h: 1.7, r: 0.55, hp: 60, dmg: 14, speed: 4.5, mass: 0.1, cost: 2.5, wave: 16, w: 4, mat: 'ghost', flying: 1.0, traits: ['phaser'],
    anims: FANIM, attacks: [{ anim: 'Headbutt', dur: 0.9, hit: 0.55, range: 2.2, arc: 100, dmg: 1, cd: 1.6, lunge: 6 }] },
  champion: { name: 'Royal Champion', model: CH + 'q_Knight_Golden_Male.glb', h: 2.05, r: 0.55, hp: 240, dmg: 20, speed: 4.2, mass: 0.6, cost: 7, wave: 16, w: 2, mat: 'metal',
    anims: QANIM, weapons: [[W + 'sword_2handed.glb', QF, { length: 1.5, rot: QROT }]], traits: ['blocker', 'dodger'],
    attacks: [{ anim: 'SwordSlash', dur: 0.75, hit: 0.5, range: 2.6, arc: 130, dmg: 1, cd: 1.1 }, { anim: 'SwordSlash', dur: 1.2, hit: 0.65, range: 2.8, arc: 140, dmg: 1.6, cd: 2.5, unblockable: true }] },
  yeti: { name: 'Frost Behemoth', model: CH + 'm_Yeti.glb', h: 3.1, r: 1.0, hp: 380, dmg: 30, speed: 3.2, mass: 0.85, cost: 8, wave: 18, w: 3, mat: 'flesh',
    anims: MANIM, attacks: [{ anim: 'Weapon', dur: 1.6, hit: 0.65, range: 3.5, kind: 'slam', aoe: 4.2, dmg: 1, cd: 3, telegraph: true, unblockable: true, freeze: 1.2 },
      { anim: 'Punch', dur: 1.0, hit: 0.5, range: 3.0, arc: 120, dmg: 0.7, cd: 1.6 }] },
  blue_demon: { name: 'Infernal Warlock', model: CH + 'm_BlueDemon.glb', h: 2.5, r: 0.75, hp: 200, dmg: 16, speed: 3.8, mass: 0.6, cost: 6, wave: 20, w: 3, mat: 'flesh', ranged: [7, 12],
    anims: MANIM, attacks: [{ anim: 'Wave', dur: 1.2, hit: 0.5, range: 15, kind: 'ranged', proj: 'fireball', speed: 14, count: 3, spread: 0.35, aoe: 2, dmg: 1, cd: 3.2 },
      { anim: 'Weapon', dur: 0.9, hit: 0.5, range: 2.8, arc: 90, dmg: 1.2, cd: 1.6 }] },
  drakeling: { name: 'Drakeling', model: FB + 'Dragon.fbx', h: 1.8, r: 0.7, hp: 140, dmg: 14, speed: 5.0, mass: 0.3, cost: 6, wave: 22, w: 2, mat: 'flesh', yaw: 0, flying: 2.2, ranged: [7, 12], darkTo: 0x2a3a20,
    anims: { idle: 'DragonArmature|Dragon_Flying', run: 'DragonArmature|Dragon_Flying', hit: 'DragonArmature|Dragon_Hit', death: 'DragonArmature|Dragon_Death' },
    attacks: [{ anim: 'DragonArmature|Dragon_Attack2', dur: 1.0, hit: 0.5, range: 14, kind: 'ranged', proj: 'fireball', speed: 15, aoe: 2.2, dmg: 1, cd: 2.4 }] },
};

export const BOSSES = {
  golden_knight: { name: 'Sir Aurelius, the Golden Knight', title: 'Fallen Champion of the Crown', model: CH + 'kk_Knight.glb', clips: KK, h: 2.9, r: 0.9,
    hp: 2400, dmg: 24, speed: 5.4, mass: 0.92, mat: 'metal', boss: 'golden', color: 0xffd36b, emissive: 0x3a2400,
    anims: { ...KANIM, idle: 'Melee_2H_Idle' }, weapons: [[W + 'sword_2handed_color.glb', KR]], traits: ['blocker'],
    attacks: [
      { anim: 'Melee_2H_Attack_Chop', dur: 1.15, hit: 0.6, range: 3.4, arc: 110, dmg: 1, cd: 1.6 },
      { anim: 'Melee_2H_Attack_Slice', dur: 1.05, hit: 0.55, range: 3.6, arc: 170, dmg: 1, cd: 1.6 },
      { anim: 'Melee_2H_Attack_Stab', dur: 1.2, hit: 0.65, range: 4.2, arc: 60, dmg: 1.2, cd: 1.8, lunge: 6 },
      { anim: 'Melee_2H_Attack_Spin', dur: 2.0, hit: 0.4, range: 4.0, kind: 'spin', aoe: 3.6, dmg: 0.6, multi: 3, cd: 3.5, telegraph: true, unblockable: true },
      { anim: 'Melee_1H_Attack_Jump_Chop', dur: 1.7, hit: 0.72, range: 14, kind: 'leap', aoe: 3.0, dmg: 1.2, cd: 4.5, telegraph: true, unblockable: true },
    ] },
  drake: { name: 'Vyrmax the Ember Drake', title: 'Terror of the Skies', model: FB + 'Dragon.fbx', h: 3.8, r: 1.3, hp: 3800, dmg: 22, speed: 6.5, mass: 0.95, mat: 'flesh', yaw: 0,
    boss: 'drake', flying: 3.4, darkTo: 0x8a1e10, emissive: 0x3a0800,
    anims: { idle: 'DragonArmature|Dragon_Flying', run: 'DragonArmature|Dragon_Flying', hit: 'DragonArmature|Dragon_Hit', death: 'DragonArmature|Dragon_Death' },
    attacks: [
      { anim: 'DragonArmature|Dragon_Attack2', dur: 1.2, hit: 0.5, range: 20, kind: 'ranged', proj: 'fireball', speed: 16, count: 5, spread: 0.7, aoe: 2.4, dmg: 1, cd: 1.5 },
      { anim: 'DragonArmature|Dragon_Attack', dur: 2.2, hit: 0.45, range: 22, kind: 'dive', dmg: 1.5, cd: 2.5, telegraph: true, unblockable: true },
      { anim: 'DragonArmature|Dragon_Flying', dur: 1.6, hit: 0.5, range: 30, kind: 'summon', summon: 'bat', count: 5, dmg: 0, cd: 9 },
    ] },
  shadow_dragon: { name: 'Nyxthara, the Shadow Dragon', title: 'Devourer of Eternity', model: CH + 'm_Dragon_Evolved.glb', h: 7.5, r: 2.4, hp: 7200, dmg: 28, speed: 5.0, mass: 1, mat: 'flesh',
    boss: 'dragon', flying: 1.0, color: 0x6a4a8a, emissive: 0x220833,
    anims: { ...FANIM },
    attacks: [
      { anim: 'Punch', dur: 1.3, hit: 0.55, range: 6.5, arc: 130, dmg: 1, cd: 1.2, telegraph: true },
      { anim: 'Headbutt', dur: 1.6, hit: 0.55, range: 18, kind: 'charge', dmg: 1.4, cd: 3, telegraph: true, unblockable: true, knock: 16 },
      { anim: 'Flying_Idle', dur: 2.6, hit: 0.25, range: 40, kind: 'breath', dmg: 0.35, cd: 4, unblockable: true },
      { anim: 'Fast_Flying', dur: 2.0, hit: 0.4, range: 40, kind: 'meteor', count: 8, aoe: 2.6, dmg: 1, cd: 5 },
      { anim: 'Flying_Idle', dur: 1.6, hit: 0.5, range: 40, kind: 'summon', summon: 'ghost_skull', count: 3, dmg: 0, cd: 12 },
    ] },
};

BOSSES.behemoth = { name: 'Gorrath the Frost Behemoth', title: 'The Mountain That Walks', model: CH + 'm_Yeti.glb', h: 6.2, r: 2.0,
  hp: 9500, dmg: 32, speed: 3.8, mass: 1, mat: 'flesh', boss: 'behemoth', color: 0xcfe6ff, emissive: 0x0a1a33,
  anims: MANIM,
  attacks: [
    { anim: 'Punch', dur: 1.2, hit: 0.5, range: 5.5, arc: 120, dmg: 1, cd: 1.0, telegraph: true },
    { anim: 'Weapon', dur: 1.8, hit: 0.65, range: 6, kind: 'slam', aoe: 6.5, dmg: 1.2, cd: 2.5, telegraph: true, unblockable: true, freeze: 1.5 },
    { anim: 'Jump', dur: 1.6, hit: 0.75, range: 16, kind: 'leap', aoe: 5, dmg: 1.4, cd: 4, telegraph: true, unblockable: true },
    { anim: 'Run', dur: 1.6, hit: 0.3, range: 16, kind: 'charge', dmg: 1.2, cd: 5, telegraph: true, unblockable: true, knock: 14 },
  ] };

export const ALL_DEFS = { ...ENEMIES, ...BOSSES };
export function defAssets(key) {
  const d = ALL_DEFS[key];
  return [d.model, ...(d.weapons || []).map((w) => w[0])];
}

// Elite modifiers
export const AFFIXES = {
  giant: { label: 'Giant', icon: '⛰️', apply: (e) => { e.root.scale.multiplyScalar(1.45); e.maxHp *= 2.6; e.dmgMul *= 1.5; e.speedMul *= 0.85; e.mass = Math.min(0.95, e.mass + 0.35); e.radius *= 1.4; } },
  armored: { label: 'Armored', icon: '🛡️', apply: (e) => { e.armor = 0.45; e.setColorMul(0x9aa4b8); e.maxHp *= 1.4; } },
  enraged: { label: 'Enraged', icon: '🔥', apply: (e) => { e.enrage = true; e.maxHp *= 1.3; } },
  swift: { label: 'Swift', icon: '⚡', apply: (e) => { e.speedMul *= 1.55; e.atkSpeed *= 1.35; e.maxHp *= 1.2; } },
  vampiric: { label: 'Vampiric', icon: '🩸', apply: (e) => { e.vampiric = 0.5; e.maxHp *= 1.4; } },
  explosive: { label: 'Volatile', icon: '💥', apply: (e) => { e.explosive = true; e.maxHp *= 1.3; } },
  frozen: { label: 'Frostbound', icon: '❄️', apply: (e) => { e.frostTouch = true; e.maxHp *= 1.4; e.setColorMul(0xaaddff); } },
};
const NAME_A = ['Grak', 'Vexra', 'Morgul', 'Skarn', 'Ulthar', 'Brakka', 'Zhul', 'Krell', 'Nyssa', 'Draven', 'Hroth', 'Sylka', 'Vorn', 'Ishkar', 'Mal\'gor', 'Thessa'];
const NAME_B = ['the Unbreakable', 'the Swift', 'Bonegnasher', 'the Butcher', 'Doomhowl', 'the Hollow', 'Bloodmaw', 'the Cruel', 'Ironhide', 'the Undying', 'Skullsplitter', 'the Wretched'];

const _v = new THREE.Vector3();

export class Enemy extends Actor {
  constructor(game, key) {
    const def = ALL_DEFS[key];
    super(game, { radius: def.r });
    this.key = key; this.def = def; this.team = 'enemy';
    const clips = def.clips === KK ? game.kkClips : game.assets.clips(def.model);
    this.build(def.model, clips, def.h, def.yaw || 0);
    for (const [p, bone, o] of def.weapons || []) this.attach(p, bone, o || {});
    if (def.darkTo) { // recolor near-black materials (FBX bats/dragons are very dark)
      for (const m of this.mats) if (m.color && m.color.r + m.color.g + m.color.b < 0.12) { m.color.set(def.darkTo); m.userData.baseColor = m.color.clone(); }
    }
    if (def.color) this.setColorMul(def.color);
    this.baseScale = 1;
  }

  reset(level) {
    const d = this.def, g = this.game;
    this.alive = true; this.dead = false; this.deathT = 0; this.removed = false;
    this.root.visible = true; this.root.scale.setScalar(1); this.radius = d.r; this.root.position.set(0, 0, 0);
    this.pivot.position.y = 0;
    this.setOpacity(1); this.setTint(d.emissive || null, d.emissive ? 0.6 : 0.4);
    if (d.color) this.setColorMul(d.color); else this.setColorMul(0xffffff);
    this.mixer.stopAllAction(); this.cur = null; this.actions = {};
    this.mixer.uncacheRoot(this.model);
    this.maxHp = d.hp * level.hp; this.dmgMul = level.dmg; this.speedMul = level.speed; this.atkSpeed = 1; this.mass = d.mass;
    this.armor = 0; this.enrage = false; this.vampiric = 0; this.explosive = false; this.frostTouch = false;
    this.elite = null; this.name = d.name; this.affixes = [];
    this.tier = level.tier;
    this.state = 'chase'; this.stateT = 0; this.atk = null; this.atkT = 0;
    this.cd = frand(0.6, 1.6); this.hitstun = 0; this.guardT = 0; this.phaseT = frand(2, 4); this.phased = false;
    this.status = { burn: 0, burnDps: 0, slow: 0, slowAmt: 0, stagger: 0, freeze: 0 };
    this.knock.set(0, 0, 0); this.vel.set(0, 0, 0);
    this.slot = Math.random() * Math.PI * 2; this.thinkT = 0; this.bossPhase = 1;
    this.lastHitBy = null; this.flying = d.flying || 0; this.hover = 0; this.t = Math.random() * 10;
    this.summoned = false; this.isBoss = !!d.boss;
    this.thief = false; this.champion = false; this.isSplit = false; this.fleeT = 0; this.vulnerable = false; this.resting = 0;
    return this;
  }

  makeElite(rng, forceName = false) {
    const keys = Object.keys(AFFIXES).filter((k) => !(this.flying && k === 'giant'));
    const n = this.tier >= 3 ? 2 : 1;
    rng.shuffle(keys);
    for (let i = 0; i < n; i++) { AFFIXES[keys[i]].apply(this); this.affixes.push(keys[i]); }
    this.elite = true;
    this.maxHp *= 1.5; this.dmgMul *= 1.15;
    this.name = (forceName || rng() < 0.6) ? `${rng.pick(NAME_A)} ${rng.pick(NAME_B)}` : `Elite ${this.def.name}`;
    this.setTint(this.affixes.includes('enraged') ? 0x661100 : 0x332200, 0.5);
  }

  spawnAt(x, z, yaw, mode) {
    this.root.position.set(x, 0, z); this.faceTo(yaw);
    this.hp = this.maxHp;
    const d = this.def;
    if (mode === 'ground' && d.anims.spawn) {
      this.state = 'spawning'; this.stateT = 0;
      this.play(d.anims.spawn, { once: true, dur: 1.6 }); this.spawnDur = 1.6;
      this.game.fx.dust(this.pos, 14, 1.2); Audio2.play('rock', { vol: 0.4 });
    } else if (mode === 'sky' && this.flying) {
      this.state = 'spawning'; this.stateT = 0; this.spawnDur = 1.0; this.pivot.position.y = 12;
      this.play(d.anims.run || d.anims.idle);
    } else {
      this.state = 'spawning'; this.stateT = 0; this.spawnDur = 0.6;
      this.play(d.anims.idle); this.setOpacity(0.01);
      this.game.fx.smoke({ x, y: 0.2, z }, 8, 0.05, 1.3);
      this.game.fx.magic({ x, y: 1, z }, [0.6, 0.2, 0.9], 12, 3);
    }
  }

  get dmg() { return this.def.dmg * this.dmgMul * (this.enrage && this.hp < this.maxHp * 0.5 ? 1.4 : 1); }

  update(dt) {
    const g = this.game, d = this.def, hero = g.hero;
    this.t += dt;
    if (this.dead) {
      this.deathT += dt;
      this.baseUpdate(dt);
      if (this.flying) this.pivot.position.y = Math.max(0, this.pivot.position.y - dt * 6);
      if (this.deathT > 2.2) { this.root.position.y -= dt * 0.8; this.setOpacity(Math.max(0, 1 - (this.deathT - 2.2))); }
      if (this.deathT > 3.3) this.removed = true;
      return;
    }
    // status effects
    const st = this.status;
    if (st.burn > 0) {
      st.burn -= dt; this._burnTick = (this._burnTick || 0) + dt;
      if (Math.random() < dt * 14) g.fx.fire({ x: this.pos.x, y: 0.6 + this.pivot.position.y, z: this.pos.z }, 1, 0.6);
      if (this._burnTick >= 0.5) { this._burnTick = 0; g.combat.dealToEnemy(this, st.burnDps * 0.5, null, { dot: true, color: 'burn' }); if (this.dead) return; }
    }
    if (st.slow > 0) st.slow -= dt;
    if (st.freeze > 0) { st.freeze -= dt; this.mixer.update(0); if (st.freeze <= 0) this.setTint(this.elite ? 0x332200 : this.def.emissive || null); this.baseUpdatePos(dt); return; }
    if (st.stagger > 0) {
      st.stagger -= dt;
      if (Math.random() < dt * 8) g.fx.add.emit(this.pos.x, this.height * this.root.scale.x + 0.3, this.pos.z, frand(-1, 1), 0.5, frand(-1, 1), 1, 0.9, 0.3, 0.25, 0.4);
      this.baseUpdate(dt); this.baseUpdatePos(dt); return;
    }
    if (this.state === 'spawning') {
      this.stateT += dt;
      if (this.flying && this.pivot.position.y > this.flying) this.pivot.position.y = Math.max(this.flying, this.pivot.position.y - dt * 14);
      if (!this.flying || this.stateT > 0.3) this.setOpacity(Math.min(1, this.stateT / this.spawnDur * 1.5));
      this.baseUpdate(dt);
      if (this.stateT >= this.spawnDur) { this.state = 'chase'; this.setOpacity(1); this.play(d.anims.run); }
      return;
    }
    // phasing ghosts
    if (d.traits?.includes('phaser')) {
      this.phaseT -= dt;
      if (this.phaseT <= 0) { this.phased = !this.phased; this.phaseT = this.phased ? 1.3 : frand(2.5, 4); this.setOpacity(this.phased ? 0.25 : 1); }
    }
    if (this.hitstun > 0) { this.hitstun -= dt; this.baseUpdate(dt); this.baseUpdatePos(dt); return; }
    if (this.guardT > 0) { this.guardT -= dt; if (this.guardT <= 0) this.play(d.anims.run); }

    const speedK = this.speedMul * (st.slow > 0 ? 1 - st.slowAmt : 1) * (this.enrage && this.hp < this.maxHp * 0.5 ? 1.35 : 1);
    this.skipThink = false;
    if (d.boss) g.bossAI(this, dt);
    if (this.state === 'attack') this.updateAttack(dt, speedK);
    else if (!hero || hero.state === 'dead') {
      this.vel.set(0, 0, 0); if (this.curName !== (d.anims.victory || d.anims.idle)) this.play(d.anims.victory || d.anims.idle);
    } else if (!this.skipThink) this.think(dt, speedK);

    this.baseUpdate(dt);
    this.baseUpdatePos(dt);
    if (this.flying) this.pivot.position.y = (this.flyOverride ?? this.flying) + Math.sin(this.t * 2.2) * 0.25;
  }

  baseUpdatePos(dt) {
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (!this.ignoreBounds) this.game.world.resolve(this.pos, this.radius * this.root.scale.x);
    this.root.rotation.y = this.facing;
  }

  think(dt, speedK) {
    const g = this.game, d = this.def, hero = g.hero;
    const dist = this.dist(hero), ang = this.angleTo(hero);
    if (this.thief) { // flee: run away from the hero, sliding along the arena edge
      const away = ang + Math.PI + Math.sin(this.t * 1.3 + this.id) * 0.9;
      const sp = d.speed * speedK;
      this.vel.set(Math.sin(away) * sp, 0, Math.cos(away) * sp);
      if (Math.hypot(this.pos.x, this.pos.z) > g.world.effectiveRadius - 2) { const tang = Math.atan2(this.pos.x, this.pos.z) + Math.PI / 2; this.vel.set(Math.sin(tang) * sp, 0, Math.cos(tang) * sp); }
      this.facing = dampAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), 10, dt);
      this.play(d.anims.run, { speed: 1.3 });
      if (Math.random() < dt * 6) g.fx.sparks({ x: this.pos.x, y: 1, z: this.pos.z }, 2, [1, 0.85, 0.2], 2);
      return;
    }
    this.cd -= dt;
    // reactions to the hero's swings
    if (hero.state === 'attack' && hero.stateT < 0.08 && dist < 3.6 && this.tier >= 2) {
      if (d.traits?.includes('blocker') && this.guardT <= 0 && Math.random() < 0.45 + this.tier * 0.05) { this.guard(1.0); return; }
      if (d.traits?.includes('dodger') && Math.random() < 0.35 + this.tier * 0.05) { this.evade(ang); return; }
    }
    // pick an attack
    if (this.cd <= 0 && this.guardT <= 0 && !this.thief) {
      const opts = d.attacks.filter((a) => dist <= a.range && (!a.kind || a.kind !== 'raise' || g.corpses.length > 0) && (!a.kind || a.kind !== 'heal' || g.woundedAllies(this)));
      if (opts.length) {
        const a = opts[Math.floor(Math.random() * opts.length)];
        const facingOk = Math.abs(angleDiff(this.facing, ang)) < 1.0 || a.kind === 'ranged' || a.kind === 'raise' || a.kind === 'heal';
        if (facingOk) { this.startAttack(a); return; }
      }
    }
    // movement
    let tx = hero.pos.x, tz = hero.pos.z, want = 1;
    const sep = this._sep(); let sx = sep.x, sz = sep.z;
    if (d.ranged) {
      const [mn, mx] = d.ranged;
      if (dist < mn) { tx = this.pos.x - (hero.pos.x - this.pos.x); tz = this.pos.z - (hero.pos.z - this.pos.z); }
      else if (dist < mx) { // strafe
        const s = Math.sin(this.t * 0.7 + this.id) > 0 ? 1 : -1;
        tx = this.pos.x + Math.cos(ang) * s * 3; tz = this.pos.z - Math.sin(ang) * s * 3; want = 0.5;
      }
    } else if (this.tier >= 1 && dist < 7 && !this.flying) { // surround the hero instead of lining up
      this.slot += dt * 0.25;
      const ring = Math.max(1.6, (d.attacks[0]?.range || 2) * 0.8);
      const sa = g.slotAngle(this);
      tx = hero.pos.x + Math.sin(sa) * ring; tz = hero.pos.z + Math.cos(sa) * ring;
      if (dist < ring + 0.5) want = 0.35;
    }
    const dx = tx - this.pos.x, dz = tz - this.pos.z, dl = Math.hypot(dx, dz) || 1;
    let mxv = dx / dl + sx, mzv = dz / dl + sz;
    const ml = Math.hypot(mxv, mzv) || 1;
    const close = !d.ranged && dist < ((d.attacks[0]?.range || 2) * 0.85);
    const sp = close ? 0 : d.speed * speedK * want * (this.guardT > 0 ? 0.3 : 1);
    this.vel.x = mxv / ml * sp; this.vel.z = mzv / ml * sp;
    const faceT = dist < 6 || sp < 0.1 ? ang : Math.atan2(this.vel.x, this.vel.z);
    this.facing = dampAngle(this.facing, faceT, 8, dt);
    if (this.guardT > 0) return;
    if (sp > 0.3) this.play(d.anims.run, { speed: (d.runSpeed || 1) * Math.min(1.5, speedK) });
    else this.play(d.anims.idle);
    // ambient sounds
    if (Math.random() < dt * 0.08) { if (d.groan) Audio2.growl(0.12, 1.3, 0.8); else if (d.screech) Audio2.screech(0.08); }
  }

  _sep() {
    _v.set(0, 0, 0);
    for (const o of this.game.enemies) {
      if (o === this || o.dead || (o.flying > 0) !== (this.flying > 0)) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d2 = dx * dx + dz * dz;
      const r = (this.radius * this.root.scale.x + o.radius * o.root.scale.x) * 1.15;
      if (d2 < r * r && d2 > 0.0001) { const dd = Math.sqrt(d2); _v.x += dx / dd * (r - dd) * 2.2; _v.z += dz / dd * (r - dd) * 2.2; }
    }
    return _v;
  }

  guard(t) {
    this.guardT = t; this.vel.set(0, 0, 0);
    this.play(this.def.anims.block || this.def.anims.idle, { fade: 0.06 });
    this.game.fx.sparks({ x: this.pos.x, y: 1.2, z: this.pos.z }, 3, [0.7, 0.8, 1], 2);
  }
  evade(angToHero) {
    const d = this.def, g = this.game;
    if (d.traits?.includes('blink') && Math.random() < 0.5) {
      g.fx.smoke(this.pos, 6, 0.05);
      const a = angToHero + Math.PI + frand(-1, 1);
      this.pos.x += Math.sin(a) * 4; this.pos.z += Math.cos(a) * 4;
      g.fx.smoke(this.pos, 6, 0.05); this.hitstun = 0.15; return;
    }
    const a = angToHero + Math.PI + frand(-0.8, 0.8);
    this.knock.set(Math.sin(a) * 11, 0, Math.cos(a) * 11);
    if (d.anims.roll) this.play(d.anims.roll, { once: true, restart: true, dur: 0.45 });
    this.hitstun = 0.45;
  }

  startAttack(a) {
    const g = this.game, hero = g.hero;
    this.state = 'attack'; this.atk = a; this.atkT = 0; this.hitsDone = 0; this.vel.set(0, 0, 0);
    // later waves: feints & unblockable mixes (enemies "learn")
    this.unblockable = !!a.unblockable;
    if (this.tier >= 4 && !a.kind && g.run.adapt.parry > 0.55 && Math.random() < 0.3) this.unblockable = true;
    this.feint = this.tier >= 4 && !a.kind && g.run.adapt.dodge > 0.55 && Math.random() < 0.25;
    const dur = a.dur / this.atkSpeed;
    this.atkDur = dur;
    this.play(a.anim, { once: a.kind !== 'breath', restart: true, dur: a.kind === 'charge' ? undefined : dur, fade: 0.08 });
    if (this.unblockable) { this.flash(0xff0000, dur * a.hit); g.fx.sparks({ x: this.pos.x, y: this.height * 0.9, z: this.pos.z }, 8, [1, 0.1, 0.05], 3); }
    else if (this.elite || this.def.mass >= 0.5) this.flash(0xffcc66, Math.min(0.25, dur * a.hit));
    if (a.telegraph) {
      if (a.kind === 'slam' || a.kind === 'spin') this.tele = g.fx.telegraph(_aheadOf(this, a.kind === 'spin' ? 0 : a.aoe * 0.55), a.aoe * this.root.scale.x, dur * a.hit, this.unblockable ? [1, 0.1, 0.05] : [1, 0.55, 0.1]);
      else if (a.kind === 'leap') { this.leapTo = { x: hero.pos.x, z: hero.pos.z }; this.tele = g.fx.telegraph(this.leapTo, a.aoe, dur * a.hit, [1, 0.1, 0.05]); }
      else if (a.kind === 'charge' || a.kind === 'dive') { this.chargeDir = this.angleTo(hero); }
    }
    if (a.kind === 'leap' && !this.leapTo) this.leapTo = { x: hero.pos.x, z: hero.pos.z };
    if (this.def.mass >= 0.5 && Math.random() < 0.5) Audio2.growl(0.25, this.def.h > 2.8 ? 0.6 : 0.9, 0.6);
  }

  updateAttack(dt, speedK) {
    const g = this.game, a = this.atk, hero = g.hero;
    this.atkT += dt;
    const k = this.atkT / this.atkDur;
    const ang = this.angleTo(hero);
    if (k < a.hit) {
      if (a.kind !== 'charge' && a.kind !== 'dive' && a.kind !== 'leap') this.facing = dampAngle(this.facing, ang, this.tier >= 3 ? 7 : 4.5, dt);
      if (this.feint && k > a.hit * 0.75) { this.feint = false; this.state = 'chase'; this.cd = 0.25; this.play(this.def.anims.idle, { fade: 0.15 }); return; }
    }
    if (a.lunge && k > a.hit - 0.18 && k < a.hit + 0.05) { const sp = a.lunge; this.vel.set(Math.sin(this.facing) * sp, 0, Math.cos(this.facing) * sp); }
    else if (!a.kind || a.kind === 'bite' || a.kind === 'ranged' || a.kind === 'slam') this.vel.set(0, 0, 0);
    switch (a.kind) {
      case 'charge': {
        if (k < a.hit) { this.vel.set(0, 0, 0); this.chargeDir = dampAngle(this.chargeDir, ang, 6, dt); this.facing = this.chargeDir; if (Math.random() < 0.4) g.fx.dust(this.pos, 1, 0.6); }
        else {
          const sp = this.def.speed * 3.2 * speedK;
          this.vel.set(Math.sin(this.chargeDir) * sp, 0, Math.cos(this.chargeDir) * sp);
          if (Math.random() < 0.7) g.fx.dust(this.pos, 2, 0.8);
          if (!this.hitsDone && this.dist(hero) < (this.radius * this.root.scale.x + 1.2)) { this.hitsDone = 1; this.applyHit(a, a.dmg); g.shake(0.4); }
          if (Math.hypot(this.pos.x, this.pos.z) > g.world.effectiveRadius - this.radius * 1.5 - 0.3 && k > a.hit + 0.15) { this.atkT = this.atkDur; g.shake(0.3); g.fx.dust(this.pos, 10, 1.4); Audio2.play('rock'); this.hitstun = 0.7; }
        }
        break;
      }
      case 'dive': {
        if (k < a.hit) { this.flyOverride = this.flying + 2 * (k / a.hit); this.facing = this.chargeDir = dampAngle(this.chargeDir, ang, 5, dt); }
        else {
          this.flyOverride = Math.max(0.6, this.flying * (1 - (k - a.hit) * 3));
          const sp = this.def.speed * 3.5;
          this.vel.set(Math.sin(this.chargeDir) * sp, 0, Math.cos(this.chargeDir) * sp);
          g.fx.fire({ x: this.pos.x, y: this.pivot.position.y, z: this.pos.z }, 2, 1);
          if (!this.hitsDone && this.dist(hero) < this.radius + 1.6) { this.hitsDone = 1; this.applyHit(a, a.dmg); }
        }
        break;
      }
      case 'leap': {
        if (k >= 0.25 && k < a.hit) {
          const t = (k - 0.25) / (a.hit - 0.25);
          if (!this.leapFrom) this.leapFrom = { x: this.pos.x, z: this.pos.z };
          this.pos.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * t;
          this.pos.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * t;
          this.pivot.position.y = Math.sin(t * Math.PI) * 4;
        }
        if (k >= a.hit && !this.hitsDone) {
          this.hitsDone = 1; this.pivot.position.y = 0; this.leapFrom = null;
          g.combat.enemyAoe(this, this.leapTo, a.aoe, this.dmg * a.dmg, { unblockable: this.unblockable, knock: 10 });
          g.fx.dust(this.pos, 22, 2); g.fx.shockwave(this.pos, a.aoe * 1.4, [1, 0.6, 0.3]); g.shake(0.7); Audio2.boom(0.6, 0.6);
        }
        break;
      }
      case 'breath': {
        if (k >= a.hit && k < 0.95) g.combat.breath(this, a, dt);
        break;
      }
      default: {
        const hits = a.multi || 1;
        while (this.hitsDone < hits && k >= a.hit + this.hitsDone * 0.18) { this.hitsDone++; this.resolveAttack(a); if (this.state !== 'attack') return; }
      }
    }
    if (k >= 1) {
      this.state = 'chase'; this.flyOverride = null; this.leapFrom = null; this.leapTo = null; this.tele = null;
      this.cd = a.cd * frand(0.9, 1.35) * (this.tier < 2 ? 1.25 : 1) / (1 + this.tier * 0.06) / this.atkSpeed;
      this.play(this.def.anims.run, { fade: 0.15 });
    }
  }

  resolveAttack(a) {
    const g = this.game, hero = g.hero;
    switch (a.kind) {
      case 'ranged': {
        const n = a.count || 1;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i / (n - 1) - 0.5) * (a.spread || 0.3) * 2 : 0;
          g.combat.enemyProjectile(this, a, spread);
        }
        break;
      }
      case 'slam': case 'spin': {
        const c = a.kind === 'spin' ? this.pos : _aheadOf(this, a.aoe * 0.55);
        g.combat.enemyAoe(this, c, a.aoe * this.root.scale.x, this.dmg * a.dmg, { unblockable: this.unblockable, knock: 8, freeze: a.freeze });
        g.fx.dust(c, 18, a.aoe / 2); g.fx.shockwave(c, a.aoe * 1.3, a.freeze ? [0.6, 0.85, 1] : [1, 0.6, 0.3]); g.shake(0.5); Audio2.boom(0.5, 0.5);
        if (a.kind === 'spin') g.fx.slash(this.pos, this.facing, { radius: a.aoe, arc: 360, color: [1, 0.85, 0.3], height: 1.2 });
        break;
      }
      case 'raise': g.combat.raiseDead(this); break;
      case 'heal': g.combat.healAllies(this); break;
      case 'summon': g.combat.summon(this, a.summon, a.count); break;
      case 'meteor': g.combat.meteors(this, a); break;
      default: this.applyHit(a, a.dmg);
    }
  }

  applyHit(a, mul) {
    const g = this.game, hero = g.hero;
    if (a.kind !== 'charge' && a.kind !== 'dive') {
      const reach = a.range * this.root.scale.x + hero.radius;
      const dist = this.dist(hero), ad = Math.abs(angleDiff(this.facing, this.angleTo(hero)));
      if (this.def.mat !== 'goo' && dist < reach + 0.5) g.fx.slash(this.pos, this.facing, { radius: Math.min(reach, 4) * 0.9, arc: a.arc || 120, color: this.unblockable ? [1, 0.2, 0.1] : [0.9, 0.9, 1], dur: 0.14, tilt: 0.3, height: this.height * 0.55 });
      if (dist > reach || ad > (a.arc || 120) * Math.PI / 360) return;
    }
    const res = hero.receive(this.dmg * mul, this, { unblockable: this.unblockable, knock: a.knock || (this.def.mass > 0.5 ? 6 : 2) });
    if (res === 'parry') g.combat.parried(this);
    else if (res === 'hit') {
      if (this.vampiric) { this.hp = Math.min(this.maxHp, this.hp + this.dmg * mul * this.vampiric); g.fx.blood(this.pos, 4, [0.8, 0, 0.1]); }
      if (this.frostTouch) { hero.status.slow = 1.5; hero.status.slowAmt = 0.4; }
      if (a.slow) { hero.status.slow = 2; hero.status.slowAmt = a.slow; }
    }
  }

  staggered(t) {
    this.state = 'chase'; this.atk = null; this.flyOverride = null; this.leapFrom = null;
    this.status.stagger = t; this.vel.set(0, 0, 0);
    if (this.def.anims.hit) this.play(this.def.anims.hit, { once: true, restart: true, fade: 0.05 });
    if (this.tele) { this.tele.visible = false; this.tele = null; }
  }
}

function _aheadOf(e, d) {
  return { x: e.pos.x + Math.sin(e.facing) * d, y: 0, z: e.pos.z + Math.cos(e.facing) * d };
}
