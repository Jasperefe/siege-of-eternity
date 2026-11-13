// DOM user interface: menus, HUD, cards, announcements, nameplates
import * as THREE from 'three';
import { HEROES, HERO_ORDER } from './hero.js';
import { CARDS, RARITY, SYNERGIES } from './cards.js';
import { Audio2 } from './audio.js';
import { Platform } from './platform.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const UPGRADES = {
  vitality: { name: 'Vitality', icon: '❤️', desc: '+12 max health', max: 10, base: 20 },
  might: { name: 'Might', icon: '⚔️', desc: '+6% damage', max: 10, base: 25 },
  wrath: { name: 'Fury', icon: '😡', desc: '+10% wrath gain', max: 5, base: 30 },
  swift: { name: 'Swiftness', icon: '👢', desc: '+3% move speed', max: 5, base: 25 },
  revival: { name: 'Last Stand', icon: '🪽', desc: 'Start every run with Second Wind', max: 1, base: 250 },
  fortune: { name: 'Fortune', icon: '🎲', desc: '+1 free card reroll per run', max: 3, base: 60 },
};
export const upgradeCost = (k, lvl) => Math.round(UPGRADES[k].base * Math.pow(lvl + 1, 1.6));

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
      if (!b || b.disabled) return;
      Audio2.play('click', { vol: 0.4 });
      this.onAct(b.dataset.act, b.dataset.arg, b);
    });
    $('#pause-btn').addEventListener('click', () => this.game.togglePause(true));
    this.handlers = {};
  }
  on(act, fn) { this.handlers[act] = fn; }
  onAct(act, arg, el) { const h = this.handlers[act]; if (h) h(arg, el); }

  // ------------- loading -------------
  loading(p, text) {
    $('#load-bar-fill').style.width = Math.round(p * 100) + '%';
    if (text) $('#load-text').textContent = text;
  }
  hideLoading() { $('#loading').classList.add('gone'); setTimeout(() => $('#loading').remove(), 700); }

  show(html, cls = '') { this.screens.innerHTML = `<div class="screen ${cls}">${html}</div>`; this.screens.classList.add('on'); }
  hideScreens() { this.screens.classList.remove('on'); this.screens.innerHTML = ''; }

  // ------------- main menu -------------
  showMenu() {
    const s = this.game.save, best = s.best, hero = HEROES[this.game.selHero];
    const daily = this.game.dailyKey === s.daily.key ? s.daily.best : 0;
    this.setHud(false);
    this.show(`
      <div class="title-block">
        <div class="logo"><span class="l1">SIEGE</span><span class="l2">of</span><span class="l1">ETERNITY</span></div>
        <div class="tag">Hold the line. The night is endless.</div>
      </div>
      <div class="menu-col">
        <button class="btn big gold" data-act="play">⚔️ Defend the Castle</button>
        <button class="btn" data-act="daily">📅 Daily Siege ${daily ? `<small>best: wave ${daily}</small>` : '<small>new!</small>'}</button>
        <div class="row2">
          <button class="btn" data-act="heroes">${hero.icon} Heroes</button>
          <button class="btn" data-act="shrine">💎 Shrine <small>${s.shards}</small></button>
        </div>
        <div class="row2">
          <button class="btn" data-act="modes">🎚️ Mode: ${this.game.mode === 'normal' ? 'Normal' : this.game.mode === 'nightmare' ? 'Nightmare' : 'Eternity'}</button>
          <button class="btn" data-act="settings">⚙️ Settings</button>
        </div>
        <button class="btn ghost" data-act="howto">❔ How to play</button>
      </div>
      <div class="menu-foot">Best: <b>Wave ${best.wave}</b> · Score <b>${best.score.toLocaleString()}</b> · Hero: <b>${hero.name}</b></div>
    `, 'menu');
  }

  showHeroes() {
    const s = this.game.save;
    const cards = HERO_ORDER.map((k) => {
      const h = HEROES[k], owned = this.game.heroUnlocked(k), sel = this.game.selHero === k;
      return `<button class="hero-card ${owned ? '' : 'locked'} ${sel ? 'sel' : ''}" data-act="${owned ? 'pickHero' : 'noop'}" data-arg="${k}">
        <div class="hc-icon">${owned ? h.icon : '🔒'}</div>
        <div class="hc-name">${esc(h.name)}</div><div class="hc-cls">${h.cls}</div>
        <div class="hc-desc">${owned ? esc(h.blurb) : esc(h.unlock.text)}</div>
        ${owned ? `<div class="hc-stats"><span>❤️ ${h.hp}</span><span>⚔️ ${h.dmg}</span><span>👢 ${h.speed}</span></div>` : ''}
      </button>`;
    }).join('');
    this.show(`<h2>Choose your Hero</h2><div class="hero-grid">${cards}</div><button class="btn" data-act="back">Back</button>`, 'heroes');
  }

  showShrine() {
    const s = this.game.save;
    const rows = Object.entries(UPGRADES).map(([k, u]) => {
      const lvl = s.upg[k] || 0, maxed = lvl >= u.max, cost = upgradeCost(k, lvl);
      return `<div class="up-row"><div class="up-icon">${u.icon}</div><div class="up-info"><b>${u.name}</b> <span class="lvl">${'◆'.repeat(lvl)}${'◇'.repeat(u.max - lvl)}</span><div>${u.desc}</div></div>
        <button class="btn sm ${maxed ? '' : 'gold'}" data-act="buyUp" data-arg="${k}" ${maxed || s.shards < cost ? 'disabled' : ''}>${maxed ? 'MAX' : '💎 ' + cost}</button></div>`;
    }).join('');
    this.show(`<h2>Shrine of Souls</h2><div class="shards-big">💎 ${s.shards} Soul Shards</div><div class="up-list">${rows}</div>
      <p class="hint">Soul Shards are kept when you fall. Spend them to grow stronger for every run.</p><button class="btn" data-act="back">Back</button>`, 'shrine');
  }

  showModes() {
    const s = this.game.save, m = this.game.mode;
    const row = (k, name, desc, ok) => `<button class="mode-card ${m === k ? 'sel' : ''} ${ok ? '' : 'locked'}" data-act="${ok ? 'pickMode' : 'noop'}" data-arg="${k}"><b>${ok ? '' : '🔒 '}${name}</b><div>${ok ? desc : 'Defeat the Shadow Dragon to unlock'}</div></button>`;
    this.show(`<h2>Difficulty</h2><div class="mode-list">
      ${row('normal', 'Normal', 'The full siege. Starts gentle, ends brutal.', true)}
      ${row('nightmare', 'Nightmare', 'Enemies start at wave-10 strength. +50% Soul Shards.', s.modes.nightmare)}
      ${row('eternity', 'Eternity', 'One life. No healing. +100% Soul Shards. Leaderboard glory.', s.modes.eternity)}
    </div><button class="btn" data-act="back">Back</button>`, 'modes');
  }

  showSettings() {
    const st = this.game.save.settings;
    const ytNote = Platform.name === 'youtube' ? '<p class="hint">Sound also follows YouTube\'s mute button.</p>' : '';
    this.show(`<h2>Settings</h2><div class="settings">
      <label>🎵 Music <input type="range" min="0" max="1" step="0.05" value="${st.music}" id="set-music"></label>
      <label>🔊 Effects <input type="range" min="0" max="1" step="0.05" value="${st.sfx}" id="set-sfx"></label>
      <label>🖥️ Graphics <select id="set-q"><option value="auto">Auto</option><option value="high">High</option><option value="low">Low (faster)</option></select></label>
      <label>📳 Screen shake <input type="checkbox" id="set-shake" ${st.shake ? 'checked' : ''}></label>
    </div>${ytNote}<button class="btn" data-act="back">Back</button>`, 'settings');
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
    this.show(`<h2>How to Play</h2><div class="howto">
      <div class="ht"><b>${touch ? '🕹️ Left thumb' : 'WASD / Arrows'}</b><span>Move</span></div>
      <div class="ht"><b>${touch ? '⚔️ button' : 'Left click / J'}</b><span>Attack — press 3× for a combo. Hold to keep swinging.</span></div>
      <div class="ht"><b>${touch ? '🛡️ button' : 'Right click / K'}</b><span>Block. Block <i>just</i> before a hit lands for a <b class="gold-t">PERFECT PARRY</b>: slow-mo + 3× damage counter. Parry arrows and fireballs to <b>reflect</b> them!</span></div>
      <div class="ht"><b>${touch ? '💨 button' : 'Space / Shift'}</b><span>Dodge roll — invincible while rolling. Roll through <span class="red-t">red glowing</span> attacks: they can't be blocked.</span></div>
      <div class="ht"><b>${touch ? '🔥 button' : 'Q'}</b><span>Warden's Wrath when the bar is full: 6s of unstoppable power.</span></div>
      <div class="ht"><b>Tips</b><span>Stunned enemies (⭐) can be <b>executed</b> for a heal. Shielded enemies block from the front: break their guard with your combo finisher or hit them from behind.</span></div>
    </div><button class="btn gold" data-act="${back}">${back === 'back' ? 'Back' : 'Begin!'}</button>`, 'howto');
  }

  // ------------- cards -------------
  showCards(keys, { title = 'Choose a Blessing', sub = '', rerolls = 0, adReroll = false, legendary = false } = {}) {
    const run = this.game.run;
    const html = keys.map((k, i) => {
      const c = CARDS[k], lvl = run.cards[k] || 0, r = RARITY[c.rarity];
      const syn = SYNERGIES.find((s) => s.need.includes(k) && !run.synergies.has(s.id) && s.need.some((n) => n !== k && run.cards[n]));
      return `<button class="card r-${c.rarity}" data-act="pickCard" data-arg="${k}" style="--rc:${r.color};animation-delay:${i * 0.08}s">
        <div class="card-rar">${r.label}${lvl ? ` · Lv ${lvl + 1}` : ''}</div>
        <div class="card-icon">${c.icon}</div><div class="card-name">${c.name}</div>
        <div class="card-desc">${c.desc(lvl + 1)}</div>
        ${syn ? `<div class="card-syn">✨ Completes <b>${syn.icon} ${syn.name}</b></div>` : ''}
      </button>`;
    }).join('');
    const owned = Object.entries(run.cards).map(([k, n]) => `<span title="${CARDS[k].name}">${CARDS[k].icon}${n > 1 ? `<sub>${n}</sub>` : ''}</span>`).join('');
    this.show(`<h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}<div class="cards">${html}</div>
      <div class="card-tools">
        ${rerolls > 0 ? `<button class="btn sm" data-act="reroll">🎲 Reroll (${rerolls} left)</button>` : ''}
        ${adReroll ? `<button class="btn sm" data-act="adReroll">🎬 Watch an ad to reroll</button>` : ''}
      </div>
      <div class="owned">${owned}</div>`, 'cards-screen' + (legendary ? ' legendary' : ''));
    Audio2.play('card', { vol: 0.6 });
  }

  showDeal(deal) {
    this.show(`<h2 class="red-t">A Cursed Shrine Appears…</h2><div class="sub">"Power has a price, Warden."</div>
      <div class="deal"><div class="deal-icon">${deal.icon}</div><div class="deal-name">${deal.name}</div>
      <div class="deal-good">✔ ${deal.good}</div><div class="deal-bad">✘ ${deal.bad}</div></div>
      <div class="row2"><button class="btn red" data-act="dealYes">Accept the curse</button><button class="btn" data-act="dealNo">Walk away</button></div>`, 'deal-screen');
  }

  travel(sceneTitle, n) {
    this.show(`<div class="travel"><div class="sub">Wave ${n}</div><h1>${sceneTitle}</h1><div class="sub">The siege moves on…</div></div>`, 'travel-screen');
  }

  showPause() {
    this.show(`<h2>Paused</h2><div class="menu-col">
      <button class="btn gold big" data-act="resume">▶ Resume</button>
      <button class="btn" data-act="howtoPause">❔ Controls</button>
      <button class="btn" data-act="settingsPause">⚙️ Settings</button>
      <button class="btn red" data-act="quit">🏳️ Abandon run</button></div>
      <div class="owned">${Object.entries(this.game.run?.cards || {}).map(([k, n]) => `<span title="${CARDS[k].name}: ${CARDS[k].desc(n)}">${CARDS[k].icon}${n > 1 ? `<sub>${n}</sub>` : ''}</span>`).join('')}</div>`, 'pause');
  }

  showGameOver(info) {
    const s = this.game.save;
    const offers = [];
    if (info.canRevive) {
      if (info.adRevive) offers.push(`<button class="btn gold" data-act="reviveAd">🎬 Watch an ad to revive</button>`);
      offers.push(`<button class="btn ${info.adRevive ? '' : 'gold'}" data-act="reviveShards" ${s.shards < info.reviveCost ? 'disabled' : ''}>💎 Revive for ${info.reviveCost} shards</button>`);
    }
    this.show(`
      <h1 class="red-t">YOU HAVE FALLEN</h1>
      <div class="sub">${info.newBest ? '🏆 NEW BEST! ' : ''}Wave ${info.wave} · ${esc(info.sceneTitle)}</div>
      <div class="go-stats">
        <div><b>${info.score.toLocaleString()}</b><span>Score</span></div>
        <div><b>${info.kills}</b><span>Kills</span></div>
        <div><b>${info.parries}</b><span>Parries</span></div>
        <div><b>+${info.shards}</b><span>Soul Shards</span></div>
      </div>
      ${info.unlocks.length ? `<div class="unlocks">${info.unlocks.map((u) => `<div>🔓 ${u}</div>`).join('')}</div>` : ''}
      ${offers.length ? `<div class="revive-box"><div class="sub">Rise again? <small>(once per run)</small></div><div class="row2">${offers.join('')}</div></div>` : ''}
      <div class="row2"><button class="btn big ${offers.length ? '' : 'gold'}" data-act="retry">⚔️ Try again</button><button class="btn" data-act="menu">Menu</button></div>
      ${info.daily ? `<button class="btn ghost sm" data-act="share">📋 Copy result</button>` : ''}
    `, 'gameover');
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
    $('#wave-sub').textContent = g.director.boss ? 'BOSS' : `${rem} enemies`;
    $('#score').textContent = run.score.toLocaleString();
    $('#dodges').innerHTML = '💨'.repeat(h.dodgeCharges) + '<span class="dim">' + '💨'.repeat(Math.max(0, h.stats.dodges - h.dodgeCharges)) + '</span>';
    $('#vignette').style.opacity = hpK < 0.3 ? (0.55 + Math.sin(g.time * 6) * 0.2).toFixed(2) : '0';
  }

  updatePlates(camera, w, h) {
    const g = this.game, v = this._v;
    const seen = new Set();
    for (const e of g.enemies) {
      if (e.dead || (!e.elite && !e.thief && !(e.status.stagger > 0))) continue;
      if (e.isBoss) continue;
      seen.add(e);
      let el = this.plateEls.get(e);
      if (!el) {
        el = document.createElement('div'); el.className = 'plate';
        el.innerHTML = `<div class="pn"></div><div class="pb"><i></i></div>`;
        this.plates.appendChild(el); this.plateEls.set(e, el);
      }
      const name = e.elite || e.thief ? `${e.affixes.map((a) => AFFIX_ICON[a] || '').join('')} ${e.name}` : '';
      if (el._n !== name) { el.querySelector('.pn').textContent = name; el._n = name; }
      el.classList.toggle('stun', e.status.stagger > 0);
      el.querySelector('i').style.width = (e.hp / e.maxHp * 100).toFixed(1) + '%';
      v.set(e.pos.x, e.pivot.position.y + e.height * e.root.scale.x + 0.5, e.pos.z).project(camera);
      el.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%,-100%)`;
      el.style.display = v.z < 1 ? 'block' : 'none';
    }
    for (const [e, el] of this.plateEls) if (!seen.has(e)) { el.remove(); this.plateEls.delete(e); }
  }

  bossIntro(e) {
    this.bossBar.classList.remove('hidden');
    $('#boss-name').textContent = e.def.name; $('#boss-title').textContent = e.def.title;
    this.annEl.innerHTML = `<div class="ann boss-intro"><small>${esc(e.def.title)}</small><div>${esc(e.def.name)}</div></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3200);
  }
  bossHp(e) { $('#boss-fill').style.width = Math.max(0, e.hp / e.maxHp * 100).toFixed(1) + '%'; }
  bossDone() { this.bossBar.classList.add('hidden'); }

  announce(text, cls = '', dur = 1.6) {
    this.annEl.innerHTML = `<div class="ann ${cls}">${esc(text)}</div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), dur * 1000);
  }
  eventBanner(ev) {
    this.annEl.innerHTML = `<div class="ann event"><small>EVENT</small><div>${ev.icon} ${esc(ev.name)}</div><p>${esc(ev.desc)}</p></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3200);
    Audio2.sting('bad');
  }
  waveBanner(n, sub) {
    this.annEl.innerHTML = `<div class="ann wave"><small>${esc(sub)}</small><div>WAVE ${n}</div></div>`;
    clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 2200);
  }
  streak(text) {
    const el = $('#streak'); el.textContent = text; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  toast(msg) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; this.toasts.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }
  eliteSpawn(e) { this.toast(`☠️ ${e.name} has entered the arena!`); }
  killFeed() {}
  heroHurt(blocked) { if (!blocked) { const v = $('#hurt'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); } }
  wrathReady() { this.toast('🔥 Wrath is ready! Press Q'); }
  wrathStart() { $('#wrath').classList.add('active'); }
  wrathEnd() { $('#wrath').classList.remove('active'); }
  synergy(s) { this.annEl.innerHTML = `<div class="ann synergy"><small>SYNERGY UNLOCKED</small><div>${s.icon} ${esc(s.name)}</div><p>${esc(s.desc)}</p></div>`; clearTimeout(this._annT); this._annT = setTimeout(() => (this.annEl.innerHTML = ''), 3000); }
  adOverlay(on) { $('#ad-overlay').classList.toggle('hidden', !on); }
}

const AFFIX_ICON = { giant: '⛰️', armored: '🛡️', enraged: '🔥', swift: '⚡', vampiric: '🩸', explosive: '💥', frozen: '❄️' };
