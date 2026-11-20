// Upgrade cards (pick 1 of 3 after each wave), synergies and cursed shrine deals
export const RARITY = {
  common: { label: 'Common', w: 60, color: '#c9c3b5' },
  rare: { label: 'Rare', w: 28, color: '#4aa3ff' },
  epic: { label: 'Epic', w: 10, color: '#b45cff' },
  legendary: { label: 'Legendary', w: 0, color: '#ffb02e' },
};

const add = (k, v) => (m) => { m[k] = (m[k] || 0) + v; };

export const CARDS = {
  sharpen: { name: 'Honed Edge', icon: '⚔️', rarity: 'common', max: 5, desc: (l) => `+15% damage`, apply: add('dmg', 0.15) },
  vitality: { name: 'Iron Skin', icon: '🛡️', rarity: 'common', max: 5, desc: () => '+25 max health and heal fully', apply: (m, h) => { m.maxHp = (m.maxHp || 0) + 25; h && setTimeout(() => (h.hp = h.maxHp), 0); } },
  swift: { name: 'Swift Boots', icon: '👢', rarity: 'common', max: 3, desc: () => '+10% move speed, dodge recharges 15% faster', apply: (m) => { add('speed', 0.1)(m); add('dodgeCd', 0.15)(m); } },
  fury: { name: 'Battle Fury', icon: '💢', rarity: 'common', max: 3, desc: () => '+15% attack speed', apply: add('atkSpeed', 0.15) },
  keen: { name: 'Keen Eye', icon: '🎯', rarity: 'common', max: 3, desc: () => '+8% critical chance, +30% critical damage', apply: (m) => { add('crit', 0.08)(m); add('critMul', 0.3)(m); } },
  wrathful: { name: 'Wrath Engine', icon: '😡', rarity: 'common', max: 3, desc: () => 'Warden\'s Wrath fills 30% faster', apply: add('wrathGain', 0.3) },
  regen: { name: 'Second Heart', icon: '💗', rarity: 'common', max: 3, desc: () => 'Regenerate health when you avoid damage for 3s', apply: add('regen', 1) },
  bloodthirst: { name: 'Bloodthirst', icon: '🧛', rarity: 'rare', max: 3, desc: () => 'Every kill heals you', apply: add('lifesteal', 1) },
  flame: { name: 'Flame Edge', icon: '🔥', rarity: 'rare', max: 3, desc: () => 'Your hits set enemies on fire', apply: add('burn', 1) },
  storm: { name: 'Storm Caller', icon: '⚡', rarity: 'rare', max: 2, desc: () => 'Every few hits unleash chain lightning', apply: add('chain', 1) },
  frost: { name: 'Frostbite', icon: '❄️', rarity: 'rare', max: 2, desc: () => 'Hits can freeze enemies solid', apply: add('frost', 1) },
  whirl: { name: 'Whirlwind', icon: '🌀', rarity: 'rare', max: 1, desc: () => 'Your combo finisher pulls enemies in', apply: add('whirl', 1) },
  riposte: { name: 'Riposte', icon: '🔔', rarity: 'rare', max: 2, desc: () => 'Perfect parries release a damaging shockwave', apply: add('riposteWave', 1) },
  thorns: { name: 'Spiked Guard', icon: '🌵', rarity: 'rare', max: 2, desc: () => 'Blocked and taken hits damage attackers', apply: (m, h) => { add('thorns', 1)(m); if (h) h.thorns = (h.thorns || 0) + 0.6; } },
  daggers: { name: 'Throwing Knives', icon: '🗡️', rarity: 'rare', max: 3, desc: () => 'Automatically throw knives at nearby enemies', apply: add('daggers', 1) },
  orbit: { name: 'Spectral Blades', icon: '💫', rarity: 'epic', max: 3, desc: () => 'Ghostly swords orbit and cut enemies', apply: add('orbit', 1) },
  frostaura: { name: 'Frost Aura', icon: '🧊', rarity: 'rare', max: 2, desc: () => 'Enemies near you are slowed', apply: add('frostAura', 1) },
  executioner: { name: 'Executioner', icon: '🪓', rarity: 'rare', max: 2, desc: () => 'Execute staggered enemies at higher health', apply: add('execute', 0.12) },
  quake: { name: 'Earthshaker', icon: '🌋', rarity: 'epic', max: 2, desc: () => 'Combo finishers cause an earthquake', apply: add('quake', 1) },
  second: { name: 'Second Wind', icon: '🪽', rarity: 'epic', max: 1, desc: () => 'Survive one lethal blow per wave', apply: add('secondWind', 1) },
  berserk: { name: 'Berserker Blood', icon: '🩸', rarity: 'epic', max: 1, desc: () => 'Deal up to +80% damage the lower your health', apply: add('berserk', 0.8) },
  shadow: { name: 'Shadow Step', icon: '👤', rarity: 'epic', max: 1, desc: () => 'Dodging through an attack slows time. +1 dodge', apply: (m) => { add('shadowStep', 1)(m); add('dodges', 1)(m); } },
  soulburst: { name: 'Soul Burst', icon: '👻', rarity: 'epic', max: 2, desc: () => 'Kills can explode in a soul blast', apply: add('soulburst', 1) },
  multishot: { name: 'Multishot', icon: '🏹', rarity: 'rare', max: 2, desc: () => 'Ranged attacks fire an extra projectile', apply: add('multishot', 1), only: 'ranged' },
  pierce: { name: 'Piercing Shots', icon: '📌', rarity: 'common', max: 2, desc: () => 'Projectiles pierce through more enemies', apply: add('pierce', 1), only: 'ranged' },
  reach: { name: 'Long Reach', icon: '📏', rarity: 'common', max: 2, desc: () => '+15% melee reach', apply: add('reach', 0.15), only: 'melee' },
  mend: { name: 'Field Dressing', icon: '🩹', rarity: 'common', max: 99, desc: () => 'Restore 60% of your health', apply: (m, h) => { h && setTimeout(() => h.heal(h.maxHp * 0.6, false), 0); } },
  parryHeal: { name: 'Perfect Guard', icon: '✨', rarity: 'rare', max: 2, desc: () => 'Perfect parries heal you', apply: add('parryHeal', 1) },
  // boss-only legendaries
  crown: { name: 'Crown of Aurelius', icon: '👑', rarity: 'legendary', max: 1, desc: () => '+30% damage, +40 health, +10% crit', apply: (m) => { add('dmg', 0.3)(m); add('maxHp', 40)(m); add('crit', 0.1)(m); } },
  emberheart: { name: 'Emberheart', icon: '❤️‍🔥', rarity: 'legendary', max: 1, desc: () => 'Fire + lightning on every hit. Wrath lasts 4s longer', apply: (m) => { add('burn', 1)(m); add('chain', 1)(m); add('wrathDur', 4)(m); } },
  winter: { name: 'Heart of Winter', icon: '💙', rarity: 'legendary', max: 1, desc: () => 'Frost on every hit, a freezing aura and +25% damage', apply: (m) => { add('frost', 2)(m); add('frostAura', 1)(m); add('dmg', 0.25)(m); } },
  eternity: { name: 'Shard of Eternity', icon: '💎', rarity: 'legendary', max: 1, desc: () => '+50% damage, +1 dodge, revive once per wave', apply: (m) => { add('dmg', 0.5)(m); add('dodges', 1)(m); add('secondWind', 1)(m); } },
};

export const SYNERGIES = [
  { id: 'firestorm', name: 'Fire Storm', icon: '🔥⚡', need: ['flame', 'storm'], desc: 'Lightning ignites enemies and deals +50% damage', apply: (m) => (m.firestorm = 1) },
  { id: 'blizzard', name: 'Blizzard', icon: '❄️🌀', need: ['frost', 'whirl'], desc: 'Whirlwind freezes everything it pulls', apply: (m) => (m.blizzard = 1) },
  { id: 'reaper', name: 'The Reaper', icon: '🧛🪓', need: ['bloodthirst', 'executioner'], desc: 'Executions heal 20% health', apply: (m) => (m.reaper = 1) },
  { id: 'fortress', name: 'Iron Fortress', icon: '🔔🌵', need: ['riposte', 'thorns'], desc: 'Blocking takes 50% less damage', apply: (m) => (m.block = (m.block || 0) + 0.5) },
  { id: 'shatter', name: 'Shatter', icon: '🧊⚔️', need: ['frostaura', 'frost'], desc: 'Frozen enemies take double damage', apply: (m) => (m.shatter = 1) },
  { id: 'phantom', name: 'Phantom Dance', icon: '👤💫', need: ['shadow', 'orbit'], desc: 'Dodging releases a frost nova', apply: (m) => (m.dodgeNova = 1) },
];

export function rollCards(run, rng, n = 3, legendary = false) {
  const heroRanged = run.heroDef.ranged;
  const pool = Object.entries(CARDS).filter(([k, c]) => {
    if (c.rarity === 'legendary') return legendary && !run.cards[k];
    if (legendary) return false;
    if ((run.cards[k] || 0) >= c.max) return false;
    if (k === 'mend' && (run.heroHpK ?? 1) > 0.65) return false;
    if (c.only === 'ranged' && !heroRanged) return false;
    if (c.only === 'melee' && heroRanged) return false;
    return true;
  });
  const out = [];
  const used = new Set();
  // nudge towards completing a synergy now and then
  const hint = SYNERGIES.find((s) => !run.synergies.has(s.id) && s.need.some((k) => run.cards[k]) && s.need.some((k) => !run.cards[k]));
  while (out.length < n && pool.length > used.size) {
    let pick;
    if (!legendary && hint && out.length === 0 && rng() < 0.45) {
      const missing = hint.need.find((k) => !run.cards[k] && pool.some(([pk]) => pk === k));
      if (missing) pick = pool.find(([pk]) => pk === missing);
    }
    if (!pick) pick = rng.weighted(pool.filter(([k]) => !used.has(k)), ([, c]) => (legendary ? 1 : RARITY[c.rarity].w * (run.wave > 10 && c.rarity !== 'common' ? 1.5 : 1)));
    if (!pick || used.has(pick[0])) continue;
    used.add(pick[0]); out.push(pick[0]);
  }
  return out;
}

export function applyCard(run, key, hero) {
  const c = CARDS[key];
  run.cards[key] = (run.cards[key] || 0) + 1;
  c.apply(run.mods, hero);
  const fresh = [];
  for (const s of SYNERGIES) {
    if (!run.synergies.has(s.id) && s.need.every((k) => run.cards[k])) { run.synergies.add(s.id); s.apply(run.mods); fresh.push(s); }
  }
  return fresh;
}

// Cursed shrine deals: power for a price
export const DEALS = [
  { name: 'Glass Cannon', icon: '🗡️💔', good: '+50% damage', bad: '-30% max health', apply: (m) => { m.dmg = (m.dmg || 0) + 0.5; m.hpMul = (m.hpMul || 1) * 0.7; } },
  { name: 'Blood Pact', icon: '🩸', good: 'Kills heal a lot more', bad: 'Enemies have +30% health', apply: (m, run) => { m.lifesteal = (m.lifesteal || 0) + 3; run.enemyHp *= 1.3; } },
  { name: 'Haste of the Damned', icon: '⚡💀', good: '+30% attack & move speed', bad: 'You take +25% damage', apply: (m) => { m.atkSpeed = (m.atkSpeed || 0) + 0.3; m.speed = (m.speed || 0) + 0.3; m.dmgTaken = (m.dmgTaken || 1) * 1.25; } },
  { name: 'Greed', icon: '💰', good: 'Double Soul Shards this run', bad: 'Enemies deal +20% damage', apply: (m, run) => { run.shardMul *= 2; run.enemyDmg *= 1.2; } },
  { name: 'Hunter\'s Mark', icon: '🎯', good: '+20% crit chance, +60% crit damage', bad: 'More elites will hunt you', apply: (m, run) => { m.crit = (m.crit || 0) + 0.2; m.critMul = (m.critMul || 0) + 0.6; run.eliteBonus += 0.15; } },
];
