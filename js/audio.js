// Web Audio: sampled SFX + streamed music + a few synthesized sounds (growls, roars, magic, fire)
import { Platform } from './platform.js';

const SFX_GROUPS = {
  swing: ['drawKnife1', 'drawKnife2', 'drawKnife3', 'cloth1', 'cloth2'],
  slash: ['knifeSlice', 'knifeSlice2', 'chop'],
  hitFlesh: ['impactPunch_heavy_0', 'impactPunch_heavy_1', 'impactPunch_heavy_2', 'impactSoft_heavy_0', 'impactSoft_heavy_1'],
  hitMetal: ['impactMetal_heavy_0', 'impactMetal_heavy_1', 'impactMetal_heavy_2', 'impactMetal_medium_0', 'impactMetal_medium_1'],
  block: ['impactPlate_heavy_0', 'impactPlate_heavy_1', 'impactPlate_heavy_2', 'impactPlate_medium_0'],
  parry: ['impactBell_heavy_0', 'impactBell_heavy_1', 'impactBell_heavy_2'],
  bone: ['impactWood_heavy_0', 'impactWood_heavy_1', 'impactWood_heavy_2'],
  step: ['footstep_concrete_0', 'footstep_concrete_1', 'footstep_concrete_2'],
  rock: ['impactMining_0', 'impactMining_1', 'impactMining_2'],
  glass: ['impactGlass_heavy_0', 'impactGlass_heavy_1'],
  coins: ['handleCoins', 'handleCoins2'],
  card: ['bookFlip1', 'bookFlip2'],
  click: ['metalClick', 'metalLatch'],
  thud: ['impactSoft_medium_0', 'impactSoft_medium_1', 'dropLeather'],
};

class AudioSys {
  constructor() {
    this.ctx = null; this.buffers = {}; this.music = null; this.musicName = null;
    this.vol = { music: 0.6, sfx: 0.9 };
    this.paused = false; this.adMuted = false;
    this._lastPlay = {};
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    // shared noise buffer for synth sounds
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    Platform.onAudioChange(() => this.applyVolumes());
    // iOS/Chrome autoplay: resume inside a real user gesture
    const unlock = () => { if (this.ctx.state !== 'running' && !this.paused) this.ctx.resume(); };
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  }
  get enabled() { return !Platform.muted && !this.adMuted; }
  applyVolumes() {
    if (!this.ctx) return;
    const on = this.enabled ? 1 : 0;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    if (this.music) this.music.muted = !this.enabled;
  }
  setVolumes(music, sfx) { this.vol.music = music; this.vol.sfx = sfx; this.applyVolumes(); }
  setAdMute(m) {
    this.adMuted = m; this.applyVolumes();
    if (this.music) { if (m) this.music.pause(); else if (!this.paused) this.music.play().catch(() => {}); }
  }
  pauseAll(p) {
    this.paused = p;
    if (!this.ctx) return;
    if (p) { this.ctx.suspend(); if (this.music) this.music.pause(); }
    else { this.ctx.resume(); if (this.music && !this.adMuted) this.music.play().catch(() => {}); }
  }

  async loadSfx(base) {
    const names = new Set(Object.values(SFX_GROUPS).flat());
    await Promise.all([...names].map(async (n) => {
      try {
        const r = await fetch(`${base}/${n}.mp3`);
        const ab = await r.arrayBuffer();
        this.buffers[n] = await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
      } catch (e) { console.warn('sfx fail', n); }
    }));
  }

  play(group, { vol = 1, rate = 1, jitter = 0.08, minGap = 0.03 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    if (this._lastPlay[group] && now - this._lastPlay[group] < minGap) return;
    this._lastPlay[group] = now;
    const list = SFX_GROUPS[group] || [group];
    const buf = this.buffers[list[Math.floor(Math.random() * list.length)]];
    if (!buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(this.sfxGain); src.start();
  }

  // ---- Synthesized sounds ----
  _noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; }
  whoosh(vol = 0.5, pitch = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime, n = this._noiseSrc();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(500 * pitch, t); f.frequency.exponentialRampToValueAtTime(2600 * pitch, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(700 * pitch, t + 0.24);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    n.connect(f); f.connect(g); g.connect(this.sfxGain); n.start(t, Math.random()); n.stop(t + 0.3);
  }
  growl(vol = 0.35, pitch = 1, dur = 0.7) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(95 * pitch, t); o.frequency.exponentialRampToValueAtTime(55 * pitch, t + dur);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 23 + Math.random() * 10;
    const lg = this.ctx.createGain(); lg.gain.value = 18 * pitch; lfo.connect(lg); lg.connect(o.frequency);
    const n = this._noiseSrc(); const nf = this.ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 500 * pitch;
    const ng = this.ctx.createGain(); ng.gain.value = 0.5;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650 * pitch; f.Q.value = 6;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08); g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); n.connect(nf); nf.connect(ng); ng.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); lfo.start(t); n.start(t, Math.random()); o.stop(t + dur); lfo.stop(t + dur); n.stop(t + dur);
  }
  roar(vol = 0.6) { this.growl(vol, 0.55, 1.8); setTimeout(() => this.growl(vol * 0.7, 0.8, 1.2), 120); }
  screech(vol = 0.25) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.25);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 3;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(f); f.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.32);
  }
  magic(vol = 0.3, pitch = 1) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime((600 + i * 300) * pitch, t); o.frequency.exponentialRampToValueAtTime((1400 + i * 500) * pitch, t + 0.25);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(vol / 3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.36);
    }
  }
  boom(vol = 0.7, dur = 0.9) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime, n = this._noiseSrc();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(60, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + dur);
    const og = this.ctx.createGain(); og.gain.setValueAtTime(vol * 0.8, t); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.sfxGain); o.connect(og); og.connect(this.sfxGain);
    n.start(t, Math.random()); n.stop(t + dur); o.start(t); o.stop(t + dur);
  }
  fire(vol = 0.35, dur = 0.8) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime, n = this._noiseSrc();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.sfxGain); n.start(t, Math.random()); n.stop(t + dur);
  }
  sting(type = 'good') {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const notes = type === 'good' ? [523, 659, 784, 1047] : type === 'boss' ? [110, 104, 98, 82] : [392, 330, 262];
    notes.forEach((fr, i) => {
      const o = this.ctx.createOscillator(); o.type = type === 'boss' ? 'sawtooth' : 'triangle';
      o.frequency.value = fr;
      const g = this.ctx.createGain(); const st = t + i * (type === 'boss' ? 0.22 : 0.09);
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(type === 'boss' ? 0.2 : 0.15, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + (type === 'boss' ? 0.6 : 0.35));
      o.connect(g); g.connect(this.sfxGain); o.start(st); o.stop(st + 0.7);
    });
  }

  // ---- Music (streamed <audio>, low memory) ----
  playMusic(name, url) {
    if (!this.ctx) return;
    if (this.musicName === name) return;
    const old = this.music;
    if (old) { const o = old; this._fade(o, 0, 0.8, () => { o.pause(); o.src = ''; }); }
    const a = new Audio(); a.loop = true; a.crossOrigin = 'anonymous'; a.volume = 0;
    a.muted = !this.enabled;
    try { const src = this.ctx.createMediaElementSource(a); src.connect(this.musicGain); a.volume = 1; } catch (e) { a.volume = this.vol.music * 0.55; }
    this.music = a; this.musicName = name;
    (window.SOE_RESOLVE ? window.SOE_RESOLVE(url) : Promise.resolve(url)).then((u) => {
      if (this.music !== a) return;
      a.src = u;
      if (!this.paused && !this.adMuted) a.play().catch(() => {});
    }).catch(() => {});
  }
  _fade(a, to, dur, done) {
    const from = a.volume, st = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - st) / (dur * 1000));
      a.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step); else done && done();
    };
    step();
  }
}

export const Audio2 = new AudioSys();
