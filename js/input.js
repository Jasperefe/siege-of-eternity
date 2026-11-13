// Keyboard + mouse + touch (virtual joystick & buttons)
import * as THREE from 'three';

export class Input {
  constructor() {
    this.keys = new Set();
    this.edges = new Set();
    this.mouse = { left: false, right: false };
    this.touch = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.btn = { attack: false, block: false, dodge: false, wrath: false };
    this.move = new THREE.Vector2();
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window && navigator.maxTouchPoints > 0;
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code; this.keys.add(k); this.edges.add(k);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.left = true; this.edges.add('Mouse0'); }
      if (e.button === 2) { this.mouse.right = true; this.edges.add('Mouse2'); }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    this._setupTouch();
  }

  _setupTouch() {
    const zone = document.getElementById('stick-zone'), knob = document.getElementById('stick-knob'), base = document.getElementById('stick-base');
    const start = (e) => {
      for (const t of e.changedTouches) {
        if (this.touch.active) break;
        this.touch.active = true; this.touch.id = t.identifier; this.touch.ox = t.clientX; this.touch.oy = t.clientY; this.touch.x = t.clientX; this.touch.y = t.clientY;
        base.style.display = 'block'; base.style.left = t.clientX + 'px'; base.style.top = t.clientY + 'px';
        knob.style.transform = 'translate(-50%,-50%)';
      }
      e.preventDefault();
    };
    const mv = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.touch.id) {
        this.touch.x = t.clientX; this.touch.y = t.clientY;
        let dx = t.clientX - this.touch.ox, dy = t.clientY - this.touch.oy; const l = Math.hypot(dx, dy), m = 55;
        if (l > m) { dx *= m / l; dy *= m / l; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.touch.id) { this.touch.active = false; this.touch.id = null; base.style.display = 'none'; }
    };
    zone.addEventListener('touchstart', start, { passive: false });
    zone.addEventListener('touchmove', mv, { passive: false });
    zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
    for (const b of ['attack', 'block', 'dodge', 'wrath']) {
      const el = document.getElementById('btn-' + b);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.btn[b] = true; this.edges.add('Btn_' + b); el.classList.add('down'); }, { passive: false });
      const up = (e) => { e.preventDefault(); this.btn[b] = false; el.classList.remove('down'); };
      el.addEventListener('touchend', up, { passive: false }); el.addEventListener('touchcancel', up, { passive: false });
    }
  }

  // Snapshot for this frame. Camera is fixed-angle, so screen up = world -Z.
  read() {
    const k = this.keys, e = this.edges;
    let x = 0, z = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (this.touch.active) {
      const dx = this.touch.x - this.touch.ox, dy = this.touch.y - this.touch.oy, l = Math.hypot(dx, dy);
      if (l > 8) { const s = Math.min(1, l / 55); x = dx / l * s; z = dy / l * s; }
    }
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    this.move.set(x, z);
    const out = {
      moveRaw: this.move,
      attack: e.has('KeyJ') || e.has('Mouse0') || e.has('Btn_attack') || e.has('Enter'),
      attackHeld: k.has('KeyJ') || this.mouse.left || this.btn.attack,
      blockPressed: e.has('KeyK') || e.has('Mouse2') || e.has('Btn_block') || e.has('KeyE'),
      blockHeld: k.has('KeyK') || this.mouse.right || this.btn.block || k.has('KeyE'),
      dodge: e.has('Space') || e.has('ShiftLeft') || e.has('ShiftRight') || e.has('KeyL') || e.has('Btn_dodge'),
      wrath: e.has('KeyQ') || e.has('KeyR') || e.has('KeyF') || e.has('Btn_wrath'),
      pause: e.has('Escape') || e.has('KeyP'),
    };
    // holding attack keeps the combo going
    if (!out.attack && out.attackHeld) out.attackHold = true;
    this.edges.clear();
    if (!this.enabled) { out.attack = out.blockPressed = out.blockHeld = out.dodge = out.wrath = false; this.move.set(0, 0); }
    return out;
  }
}
