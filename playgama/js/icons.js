// Drawn line icons that replace emoji in the interface (Playgama rule 4.3.2: no emoji in place of icons).
// Same style as the menu icons in ui.js: 24x24, round stroke, tinted per meaning. Paths with class "f" get a soft fill.
const S = (d, f = '') => (f ? f.split('|').map((p) => `<path class="f" d="${p}"/>`).join('') : '') + d.split('|').map((p) => `<path d="${p}"/>`).join('');

const HEART = 'M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 8 2.5C20 15.4 12 20 12 20Z';
const SKULL = 'M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.5 3 5.6V19h9v-2.9c1.7-1.1 3-3 3-5.6A7.5 7.5 0 0 0 12 3Z';
const SWORD = 'M3 3l12 10 -2 2L3 3Z|M10.8 17.8l7-7|M14.3 14.3l5.2 5.2|M19.5 19.5h.01';

export const GLYPH = {
  fire: [S('M9 15.4c.3 3 1.6 4.8 3 5.1 1.6-.4 3-2 3-4.3 0-1.4-.5-2.4-1.3-3.4-.2 1-.7 1.7-1.5 2.1-.2-1-.6-1.8-1.4-2.6-.7 1-1.5 1.8-1.8 3.1Z', 'M12 21.5c-4 0-6.5-2.7-6.5-6.2 0-3.3 2.4-5.1 3.4-8.2.9 1.6 1.4 2.8 1.6 4.1 1.4-1.3 2.7-3.8 2.7-7.2 3.5 2.5 5.5 6.4 5.5 10.8 0 3.7-2.6 6.7-6.7 6.7Z') + S('M12 21.5c-4 0-6.5-2.7-6.5-6.2 0-3.3 2.4-5.1 3.4-8.2.9 1.6 1.4 2.8 1.6 4.1 1.4-1.3 2.7-3.8 2.7-7.2 3.5 2.5 5.5 6.4 5.5 10.8 0 3.7-2.6 6.7-6.7 6.7Z'), '#ff8a4c'],
  swords: [S(SWORD) + `<g transform="matrix(-1 0 0 1 24 0)">${S(SWORD)}</g>`, ''],
  sword: [S(SWORD), ''],
  shield: [S('M12 3v18|M4.8 11h14.4', 'M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z') + S('M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z'), ''],
  bolt: [S('M13 2 5 13.5h6L10 22l9-12.5h-6L13 2Z', 'M13 2 5 13.5h6L10 22l9-12.5h-6L13 2Z'), '#ffd84d'],
  blood: [S('M12 3c3 4.5 6 7.7 6 11.2A6 6 0 0 1 6 14.2C6 10.7 9 7.5 12 3Z|M9.5 15a2.5 2.5 0 0 0 2.5 2.5', 'M12 3c3 4.5 6 7.7 6 11.2A6 6 0 0 1 6 14.2C6 10.7 9 7.5 12 3Z'), '#ef5a62'],
  snow: [S('M12 2v20|M3.3 7l17.4 10|M3.3 17 20.7 7|M9.5 3.5 12 6l2.5-2.5|M9.5 20.5 12 18l2.5 2.5|M3.6 10.4l3.5-1L6 6|M18 18l-1.2-3.4 3.6-1|M3.6 13.6l3.5 1L6 18|M18 6l-1.2 3.4 3.6 1'), '#8fd3ff'],
  crown: [S('M5 21h14|M8.5 15h7', 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z') + S('M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z'), '#f5c650'],
  gem: [S('M3 9h18|M9 3l3 18 3-18', 'M6 3h12l3 6-9 12L3 9l3-6Z') + S('M6 3h12l3 6-9 12L3 9l3-6Z'), '#7fe3ff'],
  dagger: [S('M7 14h10|M12 14v4|M10 18h4v3.5h-4z', 'M12 2l2 3v9h-4V5l2-3Z') + S('M12 2l2 3v9h-4V5l2-3Z|M12 5v8'), ''],
  axe: [`<g transform="rotate(28 12 12)">${S('M9.5 2.5v19', 'M9.5 5h3.5L20 2.8c1 3.6 1 8.6 0 12.2L13 12.5H9.5Z') + S('M9.5 5h3.5L20 2.8c1 3.6 1 8.6 0 12.2L13 12.5H9.5|M9.5 6H6.8v5.5h2.7')}</g>`, ''],
  mountain: [S('M6.8 11 9 13l2.2-1.6', 'M2 20 9 7l4 6 2.5-3.5L22 20H2Z') + S('M2 20 9 7l4 6 2.5-3.5L22 20H2Z'), ''],
  burst: [S('M12 2l1.8 5.5L19 5l-2.5 5.2L22 12l-5.5 1.8L19 19l-5.2-2.5L12 22l-1.8-5.5L5 19l2.5-5.2L2 12l5.5-1.8L5 5l5.2 2.5L12 2Z', 'M12 2l1.8 5.5L19 5l-2.5 5.2L22 12l-5.5 1.8L19 19l-5.2-2.5L12 22l-1.8-5.5L5 19l2.5-5.2L2 12l5.5-1.8L5 5l5.2 2.5L12 2Z'), '#ffa04d'],
  boot: [S('M4 17h17|M7 7.5h6', 'M7 3h6v9l6 2.5c1.3.5 2 1.6 2 3V20H4v-3l3-2V3Z') + S('M7 3h6v9l6 2.5c1.3.5 2 1.6 2 3V20H4v-3l3-2V3Z'), ''],
  wing: [S('M4.5 19.5 14 10|M8.5 18 17.5 12', 'M4 20c0-8 4.5-14 16-16-1 3-2.5 5-4.5 6 1.5.2 2.5.1 3.5-.3-1.3 2.8-3.4 4.4-6 5 1.2.4 2.3.5 3.3.3C14.5 18 10 20 4 20Z') + S('M4 20c0-8 4.5-14 16-16-1 3-2.5 5-4.5 6 1.5.2 2.5.1 3.5-.3-1.3 2.8-3.4 4.4-6 5 1.2.4 2.3.5 3.3.3C14.5 18 10 20 4 20Z'), '#e9e2cf'],
  lock: ['<rect x="5" y="10.5" width="14" height="10" rx="2"/>' + S('M8 10.5V7.5a4 4 0 0 1 8 0v3|M12 14.5v2.5'), '#b9b2a2'],
  unlock: ['<rect x="5" y="10.5" width="14" height="10" rx="2"/>' + S('M8 10.5V7.5a4 4 0 0 1 7.6-1.8|M12 14.5v2.5'), ''],
  sparkle: [S('M19 15c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z', 'M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z') + S('M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z'), '#ffe08a'],
  target: ['<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle class="f" cx="12" cy="12" r="1.6"/>' + S('M12 1.5v4|M12 18.5v4|M1.5 12h4|M18.5 12h4'), '#ef5a62'],
  fang: [S('M3.5 6.5c2.5 2 5.2 3 8.5 3s6-1 8.5-3|M7.5 8.4 9 15.5l1.6-6.2|M16.5 8.4 15 15.5l-1.6-6.2', 'M15 17c.8 1.2 1.3 2 1.3 2.6a1.3 1.3 0 0 1-2.6 0c0-.6.5-1.4 1.3-2.6Z'), '#ef5a62'],
  vortex: [S('M21 12a9 9 0 1 1-5.4-8.2|M17.2 12a5.2 5.2 0 1 1-3.4-4.9|M13.4 12a1.4 1.4 0 1 1-1.4-1.4'), '#8fd3ff'],
  bell: [S('M10 20.5a2 2 0 0 0 4 0|M12 2.5v2', 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2Z') + S('M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2Z'), '#f5c650'],
  spikes: [S('M3 20h18', 'M4 20l2-7.5 2 7.5|M9 20l3-13 3 13|M16 20l2-7.5 2 7.5') + S('M4 20l2-7.5 2 7.5|M9 20l3-13 3 13|M16 20l2-7.5 2 7.5'), '#9fd27a'],
  orbit: ['<circle class="f" cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4.3" transform="rotate(-28 12 12)"/>' + S('M18.6 3.6l2.6-.8-.8 2.6|M5.4 20.4l-2.6.8.8-2.6'), '#c9b8ff'],
  ice: [S('M4 7.5 12 12l8-4.5|M12 12v9|M7.5 11v2.5|M15.5 15.2l1.6-.9', 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z') + S('M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z'), '#8fd3ff'],
  shadow: ['<circle class="f" cx="14" cy="6.5" r="3"/>' + S('M2 11.5h5|M3 15.5h4|M4.5 7.5h3', 'M8 21c0-5 2.6-8.5 6-8.5s6 3.5 6 8.5') + S('M8 21c0-5 2.6-8.5 6-8.5s6 3.5 6 8.5'), '#b7a6e8'],
  bow: [S('M4 4c9 0 16 7 16 16|M4 4l16 16|M5.5 18.5 18.5 5.5|M14 5h5v5'), ''],
  skull: [S('M10.5 19v2.2|M13.5 19v2.2|M12 14v1.5', SKULL) + S(SKULL) + '<circle cx="9" cy="11" r="1.7"/><circle cx="15" cy="11" r="1.7"/>', '#ece4d2'],
  coins: [S('M9 4h6l-1.5 3h-3L9 4Z|M14 11.5c-.5-.7-1.2-1-2-1-1.2 0-2 .6-2 1.5 0 2 4 1 4 3 0 .9-.9 1.5-2 1.5-.9 0-1.6-.3-2.1-1|M12 9.5v1|M12 16.5v1', 'M10.5 7C6 9 4 13 4 16a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5c0-3-2-7-6.5-9Z') + S('M10.5 7C6 9 4 13 4 16a5 5 0 0 0 5 5h6a5 5 0 0 0 5-5c0-3-2-7-6.5-9'), '#f5c650'],
  heart: [S(HEART, HEART), '#ff6b74'],
  heartplus: [S(HEART + '|M12 10v5|M9.5 12.5h5', HEART), '#ff8fb0'],
  heartice: [S(HEART + '|M12 9.5v6|M9.4 11 14.6 14|M9.4 14 14.6 11', HEART), '#7fc4ff'],
  heartfire: [S(HEART, HEART) + S('M12 17c-1.4 0-2.4-1-2.4-2.3 0-1.3 1.2-2.1 1.6-3.3.7.6 1.1 1.3 1.2 2 .6-.3 1-.9 1.1-1.6.7.8.9 1.6.9 2.6 0 1.5-1 2.6-2.4 2.6Z'), '#ff7a4c'],
  heartbreak: [S(HEART + '|M12 7.3 10.6 11l2.8 2.2-1.9 4.3', HEART), '#ff6b74'],
  fury: [S('M9 3v4.5A1.5 1.5 0 0 1 7.5 9H3|M15 3v4.5A1.5 1.5 0 0 0 16.5 9H21|M9 21v-4.5A1.5 1.5 0 0 0 7.5 15H3|M15 21v-4.5a1.5 1.5 0 0 1 1.5-1.5H21'), '#ef5a62'],
  rage: ['<circle cx="12" cy="12" r="9"/><circle class="f" cx="9.5" cy="12.3" r="1"/><circle class="f" cx="14.5" cy="12.3" r="1"/>' + S('M6.8 8.6l3.7 1.8|M17.2 8.6l-3.7 1.8|M8.5 17.2c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8'), '#ff7a4c'],
  quake: [S('M2 15h6l2-3 2 5 2.5-6L17 15h5|M4 19.5h16|M7.5 9 6 5|M12 8V3.5|M16.5 9 18 5'), '#ffa04d'],
  ghost: [S('M5 21V11a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2L5 21Z', 'M5 21V11a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2L5 21Z') + '<circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/>', '#c9b8ff'],
  pierce: [S('M2.5 12h17|M15.5 8l4 4-4 4|M9 6.5v11|M2.5 9.5 5 12l-2.5 2.5'), ''],
  reach: [S('M3 12h18|M6 9l-3 3 3 3|M18 9l3 3-3 3|M8 6.5v2|M12 5.5v3|M16 6.5v2'), ''],
  bandage: [`<g transform="rotate(-45 12 12)"><rect class="f" x="2.5" y="8.3" width="19" height="7.4" rx="3.7"/><rect x="2.5" y="8.3" width="19" height="7.4" rx="3.7"/><path d="M9.5 8.3v7.4M14.5 8.3v7.4"/></g>`, '#f0d9b5'],
  orb: [S('M7 20.5h10|M8.6 16.6 7 20.5|M15.4 16.6 17 20.5|M9 8a3.5 3.5 0 0 1 3-2.5', 'M12 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z') + '<circle cx="12" cy="10" r="7"/>', '#b48cff'],
  hood: [S('M8 13c1.2-1.3 2.5-2 4-2s2.8.7 4 2M8 13c.5 2.5 2 4 4 4s3.5-1.5 4-4', 'M4 21c0-7 2-13 8-17 6 4 8 10 8 17Z') + S('M4 21c0-7 2-13 8-17 6 4 8 10 8 17') + '<circle cx="10.2" cy="14" r=".9"/><circle cx="13.8" cy="14" r=".9"/>', '#b7a6e8'],
  fist: [S('M6 10V7.5a1.5 1.5 0 0 1 3 0V10|M9 9.5v-3a1.5 1.5 0 0 1 3 0V10|M12 9.5V7a1.5 1.5 0 0 1 3 0v3|M6 13h4.5a1.5 1.5 0 0 0 0-3H6', 'M15 10V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a4 4 0 0 1-4-4v-7') + S('M15 10V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a4 4 0 0 1-4-4v-7'), ''],
  wolf: [S('M9 11.5l1.2 1|M15 11.5l-1.2 1|M10.6 16.6h2.8L12 18l-1.4-1.4Z', 'M4 3l4 5h8l4-5v9l-3 4-5 5-5-5-3-4V3Z') + S('M4 3l4 5h8l4-5v9l-3 4-5 5-5-5-3-4V3Z'), '#c8c2b4'],
  boulder: [S('M7 5l1.5 5 5.5 1 6-3.5|M8.5 10 4.2 16.8|M14 11l1.5 8', 'M4 17 3 11l4-6 7-1.5 6 4 1.5 6.5-3 5H7.5L4 17Z') + S('M4 17 3 11l4-6 7-1.5 6 4 1.5 6.5-3 5H7.5L4 17Z'), '#c8b89a'],
  bat: [S('M12 16.5c-1.5-1.6-2.6-2-4-1.6-.3-1.5-1.4-2.4-3-2.4.2-1.8-.4-3.3-2.5-4.5 4.5-.4 7.5.8 9.5 3.5 2-2.7 5-3.9 9.5-3.5-2.1 1.2-2.7 2.7-2.5 4.5-1.6 0-2.7.9-3 2.4-1.4-.4-2.5 0-4 1.6Z|M10.5 9.6 10 7l1.3 1.2h1.4L14 7l-.5 2.6', 'M12 16.5c-1.5-1.6-2.6-2-4-1.6-.3-1.5-1.4-2.4-3-2.4.2-1.8-.4-3.3-2.5-4.5 4.5-.4 7.5.8 9.5 3.5 2-2.7 5-3.9 9.5-3.5-2.1 1.2-2.7 2.7-2.5 4.5-1.6 0-2.7.9-3 2.4-1.4-.4-2.5 0-4 1.6Z'), '#b7a6e8'],
  wind: [S('M3 8h11a3 3 0 1 0-3-3|M3 12h15a3 3 0 1 1-3 3|M3 16h7'), '#bfe6ff'],
  dice: ['<rect x="4" y="4" width="16" height="16" rx="3"/><circle class="f" cx="9" cy="9" r="1.2"/><circle class="f" cx="15" cy="15" r="1.2"/><circle class="f" cx="15" cy="9" r="1.2"/><circle class="f" cx="9" cy="15" r="1.2"/>', ''],
  gear: [S('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z') + '<circle cx="12" cy="12" r="3"/>', ''],
};

// Every emoji the game shows, mapped to its icon (variation selectors are ignored when matching)
export const EMOJI = {
  '🔥': 'fire', '⚙': 'gear', '⚔': 'swords', '🛡': 'shield', '⚡': 'bolt', '🩸': 'blood', '❄': 'snow', '👑': 'crown', '💎': 'gem',
  '🗡': 'dagger', '🪓': 'axe', '⛰': 'mountain', '💥': 'burst', '👢': 'boot', '🪽': 'wing', '🔒': 'lock', '🔓': 'unlock', '✨': 'sparkle',
  '🎯': 'target', '🧛': 'fang', '🌀': 'vortex', '🔔': 'bell', '🌵': 'spikes', '💫': 'orbit', '🧊': 'ice', '👤': 'shadow', '🏹': 'bow',
  '💀': 'skull', '☠': 'skull', '💰': 'coins', '❤️‍🔥': 'heartfire', '❤': 'heart', '💗': 'heartplus', '💙': 'heartice', '💔': 'heartbreak',
  '🎲': 'dice', '💢': 'fury', '😡': 'rage', '🌋': 'quake', '👻': 'ghost', '📌': 'pierce', '📏': 'reach', '🩹': 'bandage', '🔮': 'orb',
  '🥷': 'hood', '👊': 'fist', '🐺': 'wolf', '🪨': 'boulder', '🦇': 'bat', '💨': 'wind',
};

export const svgIcon = (key) => {
  const g = GLYPH[key]; if (!g) return '';
  return `<svg class="gi gi-${key}" viewBox="0 0 24 24" aria-hidden="true"${g[1] ? ` style="color:${g[1]}"` : ''}>${g[0]}</svg>`;
};

const keys = Object.keys(EMOJI).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RE = new RegExp(`(?:${keys.join('|')})\\uFE0F?`, 'gu');
const TEST = new RegExp(RE.source, 'u');
export const hasEmoji = (s) => TEST.test(s);
export const iconize = (s) => String(s).replace(RE, (m) => svgIcon(EMOJI[m.replace(/️/g, '')] || EMOJI[m]));

// Replace emoji in every text node under root, now and whenever the interface changes
function fixText(node) {
  const s = node.nodeValue; if (!s || !TEST.test(s)) return;
  const p = node.parentNode; if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TITLE') return;
  const span = document.createElement('span'); span.className = 'gi-wrap';
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  span.innerHTML = iconize(esc);
  p.replaceChild(span, node);
}
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (TEST.test(n.nodeValue)) list.push(n);
  list.forEach(fixText);
}
export function installIcons(root = document.body) {
  document.documentElement.classList.add('icons');
  walk(root);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') fixText(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
