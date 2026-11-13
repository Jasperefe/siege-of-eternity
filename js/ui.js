// DOM user interface: banner title screen, forged-iron buttons, HUD, cards, announcements, nameplates
import * as THREE from 'three';
import { HEROES, HERO_ORDER } from './hero.js';
import { CARDS, RARITY, SYNERGIES } from './cards.js';
import { Audio2 } from './audio.js';
import { Platform } from './platform.js';
import { t } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const T = (s, p) => esc(t(s, p));

// Small line icons (inline SVG, no external files)
const IC = {
  sword: '<path d="M14.5 3.5 20 3l-.5 5.5L9 19l-3-3L14.5 3.5Z"/><path d="m5 14 5 5M3.5 20.5 6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  helm: '<path d="M5 13a7 7 0 0 1 14 0v5H5v-5Z"/><path d="M5 15h14M12 6v12M9 18v3h6v-3"/>',
  gem: '<path d="M6 3h12l3 6-9 12L3 9l3-6Z"/><path d="M3 9h18M9 3l3 18 3-18"/>',
  scale: '<path d="M12 3v18M7 21h10M4 8h16M4 8l-2.5 6a3 3 0 0 0 5 0L4 8ZM20 8l-2.5 6a3 3 0 0 0 5 0L20 8Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M5 6a2 2 0 1 1 4 0v2H5M9 9h7M9 13h7M9 17h4"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  play: '<path d="M8 5v14l11-7L8 5Z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const CREST = `<svg class="crest" viewBox="0 0 120 140" aria-hidden="true">
  <defs><linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc96"/><stop offset=".5" stop-color="#d4a548"/><stop offset="1" stop-color="#8a5f1d"/></linearGradient></defs>
  <path d="M60 6 106 20v44c0 34-22 56-46 70C36 120 14 98 14 64V20L60 6Z" fill="#5e1418" stroke="url(#brass)" stroke-width="5"/>
  <path d="M60 18 96 29v35c0 27-17 45-36 57-19-12-36-30-36-57V29l36-11Z" fill="none" stroke="#d4a548" stroke-opacity=".35" stroke-width="1.5"/>
  <g stroke="url(#brass)" stroke-width="6" stroke-linecap="round"><path d="M38 102 82 42M82 102 38 42"/></g>
  <g stroke="url(#brass)" stroke-width="5" stroke-linecap="round"><path d="M30 92 44 103M90 92 76 103"/></g>
  <circle cx="60" cy="72" r="9" fill="url(#brass)"/>
</svg>`;

export const UPGRADES = {
  vitality: { name: 'Vitality', icon: '❤️', desc: '+12 max health', max: 10, base: 20 },
  might: { name: 'Might', icon: '⚔️', desc: '+6% damage', max: 10, base: 25 },
  wrath: { name: 'Fury', icon: '🔥', desc: '+10% wrath gain', max: 5, base: 30 },
  swift: { name: 'Swiftness', icon: '👢', desc: '+3% move speed', max: 5, base: 25 },
  revival: { name: 'Last Stand', icon: '🪽', desc: 'Start every run with Second Wind', max: 1, base: 250 },
  fortune: { name: 'Fortune', icon: '🎲', desc: '+1 free card reroll per run', max: 3, base: 60 },
};
export const upgradeCost = (k, lvl) => Math.round(UPGRADES[k].base * Math.pow(lvl + 1, 1.6));
const MODE_NAMES = { casual: 'Casual', normal: 'Normal', nightmare: 'Nightmare', eternity: 'Eternity' };

export class UI {
  constructor(game) {
    this.game = game;
    this.screens = $('#screens');
    this.hud = $('#hud');
    this.plates = $('#plates');
    this.plateEls = new Map();
    this.annEl = $('#announce');
    this.toasts = $('#toasts');
    this.bossBar = $('#bossbar');
    this._v = new THREE.Vector3();
    this.screens.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled || this._locked) return;
      Audio2.play('click', { vol: 0.4 });
      this.onAct(b.dataset.act, b.dataset.arg, b);
    });
    $('#pause-btn').addEventListener('click', () => this.game.togglePause(true));
    this.handlers = {};
    this.localizeStatic();
  }
  on(act, fn) { this.handlers[act] = fn; }
  onAct(act, arg, el) { const h = this.handlers[act]; if (h) h(arg, el); }
  localizeStatic() {
    const lt = $('#load-text'); if (lt) lt.textContent = t('Loading the siege…');
    $('#busy-text').textContent = t('Preparing the battlefield…');
    $('#wave-word').textContent = t('WAVE');
  }

  // ------------- loading / busy / ads -------------
  loading(p, text) { $('#load-bar-fill').style.width = Math.round(p * 100) + '%'; if (text) $('#load-text').textContent = text; }
  hideLoading() { const l = $('#loading'); l.classList.add('gone'); setTimeout(() => l.remove(), 700); }
  busy(on) { $('#busy').classList.toggle('hidden', !on); }
  // From the moment an ad is requested: block every button (CrazyGames rule)
  adWait(on) { this._locked = on; $('#ad-wait').classList.toggle('hidden', !on); }
  adOverlay(on) { $('#ad-overlay').classList.toggle('hidden', !on); }

  show(html, cls = '') {
    this.screens.innerHTML = `<div class="screen ${cls}">${html}</div>`;
    this.screens.classList.add('on');
    const first = this.screens.querySelector('[data-focus]') || this.screens.querySelector('button:not([disabled])');
    if (first && !this.game.input.isTouch) first.focus({ preventScroll: true });
  }
  hideScreens() { this.screens.classList.remove('on'); this.screens.innerHTML = ''; }

  // ------------- title screen -------------
  showMenu() {
    const s = this.game.save, best = s.best, hero = HEROES[this.game.selHero];
    const daily = this.game.dailyKey === s.daily.key ? s.daily.best : 0;
    this.setHud(false);
    this.show(`
      <div class="banner">
        <div class="banner-cloth">
          ${CREST}
          <h1 class="title"><span class="t1">${T('Siege')}</span><span class="t2">${T('of Eternity')}</span></h1>
          <p class="motto">${T('Hold the gate. The night does not end.')}</p>
          <button class="btn primary" data-act="play" data-focus>${icon('sword')}<span>${T('Defend the Castle')}</span></button>
          <div class="best-line"><span>${T('Best wave {w}', { w: best.wave })}</span><span>${T('Best score')} ${best.score.toLocaleString()}</span></div>
        </div>
      </div>
      <nav class="plates">
        <button class="btn" data-act="daily">${icon('sun')}<span>${T('Daily Siege')}<small>${daily ? T('Today: wave {w}', { w: daily }) : T('New today')}</small></span></button>
        <button class="btn" data-act="heroes">${icon('helm')}<span>${T('Heroes')}<small>${esc(t(hero.name))}</small></span></button>
        <button class="btn" data-act="shrine">${icon('gem')}<span>${T('Shrine')}<small>${s.shards} ${T('Soul Shards')}</small></span></button>
        <button class="btn" data-act="modes">${icon('scale')}<span>${T('Difficulty')}<small>${T(MODE_NAMES[this.game.mode])}</small></span></button>
        <button class="btn" data-act="settings">${icon('gear')}<span>${T('Settings')}</span></button>
        <button class="btn" data-act="howto">${icon('scroll')}<span>${T('How to play')}</span></button>
      </nav>
    `, 'menu');
  }

  panel(title, body, cls = '', back = 'back') {
    this.show(`<div class="panel">
      <header class="panel-head"><button class="btn icon-only" data-act="${back}" aria-label="${T('Back')}">${icon('back')}</button><h2>${title}</h2></header>
      <div class="panel-body">${body}</div></div>`, 'subscreen ' + cls);
  }

  showHeroes() {
    const cards = HERO_ORDER.map((k) => {
      const h = HEROES[k], owned = this.game.heroUnlocked(k), sel = this.game.selHero === k;
      return `<button class="hcard ${owned ? '' : 'locked'} ${sel ? 'sel' : ''}" data-act="${owned ? 'pickHero' : 'noop'}" data-arg="${k}" ${sel ? 'data-focus' : ''}>
        <span class="hero-icon">${owned ? h.icon : '🔒'}</span>
        <span class="hero-name">${T(h.name)}</span><span class="hero-cls">${T(h.cls)}${sel ? ` — ${T('Selected')}` : ''}</span>
        <span class="hero-desc">${owned ? T(h.blurb) : T(h.unlock.text)}</span>
        ${owned ? `<span class="hero-stats"><span>${T('Health')} ${h.hp}</span><span>${T('Damage')} ${h.dmg}</span><span>${T('Speed')} ${h.speed}</span></span>` : ''}
      </button>`;
    }).join('');
    this.panel(T('Choose your hero'), `<div class="hero-grid">${cards}</div>`, 'heroes');
  }

  showShrine() {
    const s = this.game.save;
    const rows = Object.entries(UPGRADES).map(([k, u]) => {
      const lvl = s.upg[k] || 0, maxed = lvl >= u.max, cost = upgradeCost(k, lvl);
      return `<div class="up"><span class="up-icon">${u.icon}</span><span class="up-info"><b>${T(u.name)}</b><span class="pips">${'<i class="on"></i>'.repeat(lvl)}${'<i></i>'.repeat(u.max - lvl)}</span><span class="up-desc">${T(u.desc)}</span></span>
        <button class="btn sm ${maxed ? '' : 'brass'}" data-act="buyUp" data-arg="${k}" ${maxed || s.shards < cost ? 'disabled' : ''}>${maxed ? T('Max') : '💎 ' + cost}</button></div>`;
    }).join('');
    this.panel(T('Shrine of Souls'), `<div class="shards-big">💎 ${s.shards} <small>${T('Soul Shards')}</small></div><div class="up-list">${rows}</div><p class="hint">${T('Shards stay with you when you fall. Spend them to start every run stronger.')}</p>`, 'shrine');
  }

  showModes() {
    const s = this.game.save, m = this.game.mode;
    const row = (k, desc, ok) => `<button class="mode ${m === k ? 'sel' : ''} ${ok ? '' : 'locked'}" data-act="${ok ? 'pickMode' : 'noop'}" data-arg="${k}" ${m === k ? 'data-focus' : ''}><b>${ok ? '' : '🔒 '}${T(MODE_NAMES[k])}</b><span>${ok ? T(desc) : T('Defeat the Shadow Dragon to unlock')}</span></button>`;
    this.panel(T('Difficulty'), `<div class="mode-list">
      ${row('casual', 'Weaker enemies and easier bosses. Enjoy the story of the siege.', true)}
      ${row('normal', 'The full siege. Starts gentle, ends brutal.', true)}
      ${row('nightmare', 'Enemies start at wave-10 strength. +50% Soul Shards.', s.modes.nightmare)}
      ${row('eternity', 'One life. No healing. +100% Soul Shards.', s.modes.eternity)}
    </div>`, 'modes');
  }

  showSettings() {
    const st = this.game.save.settings;
    const ytNote = Platform.name === 'youtube' ? `<p class="hint">${T("Sound also follows YouTube's mute button.")}</p>` : '';
    this.panel(T('Settings'), `<div class="settings">
      <label><span>${T('Music')}</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" id="set-music"></label>
      <label><span>${T('Effects')}</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" id="set-sfx"></label>
      <label><span>${T('Graphics')}</span><select id="set-q"><option value="auto">${T('Auto')}</option><option value="high">${T('High')}</option><option value="low">${T('Low (faster)')}</option></select></label>
      <label><span>${T('Screen shake')}</span><input type="checkbox" id="set-shake" ${st.shake ? 'checked' : ''}></label>
    </div>${ytNote}`, 'settings');
    $('#set-q').value = st.quality;
    const apply = () => {
      st.music = +$('#set-music').value; st.sfx = +$('#set-sfx').value; st.shake = $('#set-shake').checked;
      const q = $('#set-q').value; if (q !== st.quality) { st.quality = q; this.game.applyQuality(); }
      Audio2.setVolumes(st.music, st.sfx); this.game.save.write();
    };
    this.screens.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', apply));
  }

  showHowTo(back = 'back') {
    const touch = this.game.input.isTouch;
    const rows = [
      [touch ? 'Left stick' : 'WASD / arrows', 'Move', ''],
      [touch ? 'Sword button' : 'Left click / J', 'Attack', 'Press three times for a combo. Hold to keep swinging.'],
      [touch ? 'Shield button' : 'Right click / K', 'Block', 'Block just before a hit lands for a perfect parry: time slows and your counter deals triple damage. Parried arrows and fireballs fly back.'],
      [touch ? 'Wind button' : 'Space / Shift', 'Dodge', "Roll through attacks. Red glowing attacks can't be blocked — dodge them."],
      [touch ? 'Fire button' : 'Q', 'Wrath', 'When the bar is full: six seconds of unstoppable power.'],
    ].map(([k, a, d]) => `<div class="ht"><kbd>${T(k)}</kbd><div><b>${T(a)}</b>${d ? `<p>${T(d)}</p>` : ''}</div></div>`).join('');
    const body = `<div class="howto">${rows}<div class="ht tip"><kbd>★</kbd><div><b>${T('Tips')}</b><p>${T('Stunned enemies (marked with a star) can be executed for health. Shielded enemies block from the front: break their guard with your combo finisher or hit them from behind.')}</p></div></div></div>
      ${back === 'beginRun' ? `<button class="btn primary" data-act="beginRun" data-focus>${icon('play')}<span>${T('Begin')}</span></button>` : ''}`;
    this.panel(T(back === 'pauseBack' ? 'Controls' : 'How to play'), body, 'howto', back === 'beginRun' ? 'menu' : back);
  }

  // ------------- cards -------------
  showCards(keys, { title, sub = '', rerolls = 0, shardReroll = 0, adReroll = false, legendary = false } = {}) {
    const run = this.game.run;
    const html = keys.map((k, i) => {
      const c = CARDS[k], lvl = run.cards[k] || 0, r = RARITY[c.rarity];
      const syn = SYNERGIES.find((s) => s.need.includes(k) && !run.synergies.has(s.id) && s.need.some((n) => n !== k && run.cards[n]));
      return `<button class="card r-${c.rarity}" data-act="pickCard" data-arg="${k}" style="--rc:${r.color};--i:${i}" ${i === 0 ? 'data-focus' : ''}>
        <span class="card-rar">${T(r.label)}${lvl ? ` · ${T('Level {n}', { n: lvl + 1 })}` : ''}</span>
        <span class="card-icon">${c.icon}</span><span class="card-name">${T(c.name)}</span>
        <span class="card-desc">${T(c.desc(lvl + 1))}</span>
        ${syn ? `<span class="card-syn">✨ ${T('Completes {name}', { name: `${syn.icon} ${t(syn.name)}` })}</span>` : ''}
      </button>`;
    }).join('');
    const owned = Object.entries(run.cards).map(([k, n]) => `<span title="${T(CARDS[k].name)}">${CARDS[k].icon}${n > 1 ? `<sub>${n}</sub>` : ''}</span>`).join('');
    const tools = [];
    if (rerolls > 0) tools.push(`<button class="btn sm" data-act="reroll">${icon('dice')}<span>${T('Reroll ({n} left)', { n: rerolls })}</span></button>`);
    else if (shardReroll) tools.push(`<button class="btn sm" data-act="shardReroll" ${this.game.save.shards < shardReroll ? 'disabled' : ''}>${icon('gem')}<span>${T('Reroll for {c} shards', { c: shardReroll })}</span></button>`);
    if (adReroll) tools.push(`<button class="btn sm" data-act="adReroll">${icon('film')}<span>${T('Watch an ad to reroll')}</span></button>`);
    this.show(`<div class="cards-wrap"><h2>${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}<div class="cards">${html}</div>
      ${tools.length ? `<div class="card-tools">${tools.join('')}</div>` : ''}<div class="owned">${owned}</div></div>`, 'cards-screen' + (legendary ? ' legendary' : ''));
    Audio2.play('card', { vol: 0.6 });
  }

  showDeal(deal) {
    this.show(`<div class="deal-wrap"><h2 class="red">${T('A cursed shrine appears')}</h2><p class="sub">${T('"Power has a price, Warden."')}</p>
      <div class="deal"><div class="deal-icon">${deal.icon}</div><div class="deal-name">${T(deal.name)}</div>
      <div class="deal-good">+ ${T(deal.good)}</div><div class="deal-bad">− ${T(deal.bad)}</div></div>
      <div class="row2"><button class="btn danger" data-act="dealYes">${T('Accept the curse')}</button><button class="btn" data-act="dealNo" data-focus>${T('Walk away')}</button></div></div>`, 'deal-screen');
  }

  travel(sceneTitle, n) {
    this.show(`<div class="travel"><p class="sub">${T('Wave {n}', { n })}</p><h1>${T(sceneTitle)}</h1><p class="sub">${T('The siege moves on…')}</p></div>`, 'travel-screen');
  }

  showPause() {
    const run = this.game.run;
    this.show(`<div class="pause-box"><h2>${T('Paused')}</h2>
      <button class="btn primary" data-act="resume" data-focus>${icon('play')}<span>${T('Resume')}</span></button>
      <button class="btn" data-act="howtoPause">${icon('scroll')}<span>${T('Controls')}</span></button>
      <button class="btn" data-act="settingsPause">${icon('gear')}<span>${T('Settings')}</span></button>
      <button class="btn danger" data-act="quit">${icon('flag')}<span>${T('Abandon run')}</span></button>
      <div class="owned">${Object.entries(run?.cards || {}).map(([k, n]) => `<span title="${T(CARDS[k].name)}: ${T(CARDS[k].desc(n))}">${CARDS[k].icon}${n > 1 ? `<sub>${n}</sub>` : ''}</span>`).join('')}</div></div>`, 'pause');
  }

  showGameOver(info) {
    const s = this.game.save;
    const offers = [];
    if (info.canRevive) {
      if (info.adRevive) offers.push(`<button class="btn equal" data-act="reviveAd">${icon('film')}<span>${T('Watch an ad to revive')}</span></button>`);
      offers.push(`<button class="btn equal" data-act="reviveShards" ${s.shards < info.reviveCost ? 'disabled' : ''}>${icon('gem')}<span>${T('Revive for {c} shards', { c: info.reviveCost })}</span></button>`);
    }
    // When a revive is on offer, every choice uses the same button style (CrazyGames: skip must match the ad button)
    const retryCls = offers.length ? 'btn equal' : 'btn primary';
    this.show(`<div class="over">
      <h1 class="red">${T('You have fallen')}</h1>
      <p class="sub">${info.newBest ? `<b class="gold">${T('New best!')}</b> ` : ''}${T('Wave {n}', { n: info.wave })} — ${T(info.sceneTitle)}</p>
      <div class="stats">
        <div><b>${info.score.toLocaleString()}</b><span>${T('Score')}</span></div>
        <div><b>${info.kills}</b><span>${T('Kills')}</span></div>
        <div><b>${info.parries}</b><span>${T('Parries')}</span></div>
        <div><b>+${info.shards}</b><span>${T('Soul Shards')}</span></div>
      </div>
      ${info.adDouble ? `<button class="btn sm brass" data-act="adDouble">${icon('film')}<span>${T('Watch an ad to double your shards (+{n})', { n: info.shards })}</span></button>` : ''}
      ${info.unlocks.length ? `<div class="unlocks">${info.unlocks.map((u) => `<div>🔓 ${esc(u)}</div>`).join('')}</div>` : ''}
      ${offers.length ? `<div class="revive"><p>${T('Rise again?')} <small>${T('Once per run')}</small></p><div class="row2">${offers.join('')}</div></div>` : ''}
      <div class="row2"><button class="${retryCls}" data-act="retry" data-focus>${icon('sword')}<span>${T('Try again')}</span></button><button class="btn ${offers.length ? 'equal' : ''}" data-act="menu"><span>${T('Menu')}</span></button></div>
      ${info.daily ? `<button class="btn sm ghost" data-act="share">${icon('copy')}<span>${T('Copy result')}</span></button>` : ''}
    </div>`, 'gameover');
  }

  // ------------- HUD -------------
  setHud(on) {
    this.hud.classList.toggle('hidden', !on);
    $('#touch').classList.toggle('hidden', !(on && this.game.input.isTouch));
    if (!on) { this.bossBar.classList.add('hidden'); this.plates.innerHTML = ''; this.plateEls.clear(); }
  }
  updateHud() {
    const g = this.game, h = g.hero, run = g.run;
    if (!h || !run) return;
    const hpK = h.hp / h.maxHp;
    $('#hp-fill').style.width = (hpK * 100).toFixed(1) + '%';
    $('#hp-text').textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    $('#hp').classList.toggle('low', hpK < 0.3);
    const wk = h.wrathT > 0 ? h.wrathT / 6 : h.wrath / 100;
    $('#wrath-fill').style.width = (wk * 100).toFixed(1) + '%';
    $('#wrath').classList.toggle('ready', h.wrath >= 100);
    $('#btn-wrath').classList.toggle('ready', h.wrath >= 100);
    $('#wave-n').textContent = run.wave;
    const rem = g.director.active ? g.director.remaining : 0;
    $('#wave-sub').textContent = g.director.boss ? t('BOSS') : t('{n} enemies', { n: rem });
    $('#score').textContent = run.score.toLocaleString();
    const dd = $('#dodges'); const key = h.dodgeCharges + '/' + h.stats.dodges;
    if (dd._k !== key) { dd._k = key; dd.innerHTML = '<i class="on"></i>'.repeat(h.dodgeCharges) + '<i></i>'.repeat(Math.max(0, h.stats.dodges - h.dodgeCharges)); }
    $('#vignette').style.opacity = hpK < 0.3 ? (0.55 + Math.sin(g.time * 6) * 0.2).toFixed(2) : '0';
  }

  updatePlates(camera, w, h) {
    const g = this.game, v = this._v;
    const seen = new Set();
    // keep name tags out of the top HUD
    if (!this._hudB || (this._hudBT = (this._hudBT || 0) + 1) % 60 === 0) {
      const a = document.getElementById('hud-mid').getBoundingClientRect(), b = document.getElementById('hud-left').getBoundingClientRect();
      this._hudB = Math.max(a.bottom, b.bottom) + 34;
    }
    for (const e of g.enemies) {
      if (e.dead || (!e.elite && !e.thief && !e.ascended && !(e.status.stagger > 0))) continue;
      if (e.isBoss) continue;
      seen.add(e);
      let el = this.plateEls.get(e);
      if (!el) {
        el = document.createElement('div'); el.className = 'plate';
        el.innerHTML = `<div class="pn"></div><div class="pb"><i></i></div>`;
        this.plates.appendChild(el); this.plateEls.set(e, el);
      }
      const name = e.ascended ? '✦ ' + t(e.name) : e.elite || e.thief ? `${e.affixes.map((a) => AFFIX_ICON[a] || '').join('')} ${t(e.name)}` : '';
      if (el._n !== name) { el.querySelector('.pn').textContent = name; el._n = name; }
      el.classList.toggle('stun', e.status.stagger > 0);
      el.querySelector('i').style.width = (e.hp / e.maxHp * 100).toFixed(1) + '%';
      v.set(e.pos.x, e.pivot.position.y + e.height * e.root.scale.x + 0.5, e.pos.z).project(camera);
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-100%)`;
      const py = (-v.y * 0.5 + 0.5) * h;
      el.style.display = v.z < 1 && py > this._hudB && !e.cloaked ? 'block' : 'none';
    }
    for (const [e, el] of this.plateEls) if (!seen.has(e)) { el.remove(); this.plateEls.delete(e); }
  }

  bossIntro(e) {
    this.bossBar.classList.remove('hidden');
    $('#boss-name').textContent = t(e.def.name); $('#boss-title').textContent = t(e.def.title);
    this.annEl.innerHTML = `<div class="ann boss-intro"><small>${T(e.def.title)}</small><div>${T(e.def.name)}</div></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3200);
  }
  bossHp(e) { $('#boss-fill').style.width = Math.max(0, e.hp / e.maxHp * 100).toFixed(1) + '%'; }
  bossDone() { this.bossBar.classList.add('hidden'); }

  announce(text, cls = '', dur = 1.6, p) {
    this.annEl.innerHTML = `<div class="ann ${cls}">${T(text, p)}</div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), dur * 1000);
  }
  eventBanner(ev) {
    this.annEl.innerHTML = `<div class="ann event"><small>${T('Event')}</small><div>${ev.icon} ${T(ev.name)}</div><p>${T(ev.desc)}</p></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3200);
    Audio2.sting('bad');
  }
  waveBanner(n, sub) {
    this.annEl.innerHTML = `<div class="ann wave"><small>${T(sub)}</small><div>${T('WAVE')} ${n}</div></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 2200);
  }
  streak(text) { const el = $('#streak'); el.textContent = t(text); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  toast(msg, p) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = t(msg, p); this.toasts.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }
  ascendedSpawn(e) {
    this.annEl.innerHTML = `<div class="ann ascended"><small>${T('An Ascended has come')}</small><div>${T(e.name)}</div></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 2600);
  }
  eliteSpawn(e) { this.toast('{name} has entered the arena!', { name: '☠️ ' + t(e.name) }); }
  killFeed() {}
  heroHurt(blocked) { if (!blocked) { const v = $('#hurt'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); } }
  wrathReady() { this.toast(this.game.input.isTouch ? 'Wrath is ready! Tap the fire button' : 'Wrath is ready! Press Q'); }
  wrathStart() { $('#wrath').classList.add('active'); }
  wrathEnd() { $('#wrath').classList.remove('active'); }
  synergy(s) { this.annEl.innerHTML = `<div class="ann synergy"><small>${T('Synergy unlocked')}</small><div>${s.icon} ${T(s.name)}</div><p>${T(s.desc)}</p></div>`; clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3000); }
}

const AFFIX_ICON = { giant: '⛰️', armored: '🛡️', enraged: '🔥', swift: '⚡', vampiric: '🩸', explosive: '💥', frozen: '❄️' };
