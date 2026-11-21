// Playgama telemetry (Bridge analytics). Only active on Playgama; every call is wrapped so it can never break the game.
// Waves go through Bridge's standard level messages (Bridge records them as analytics itself);
// custom events cover what only the game knows. Names are fixed; changing values go in the data. No personal data.
import { Platform } from './platform.js?v=202611210925';

export const BUILD = 'pg-3';
const TARGET_FPS = 60, WINDOW_MS = 30000;

const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] : 0;
const r1 = (v) => Math.round(v * 10) / 10;

export const Tel = {
  on: false,
  dts: [], activeMs: 0, last: 0, winStart: 0,
  errs: 0, rejects: 0, glLost: 0,

  init(canvas) {
    this.on = !!(Platform.pg && Platform.pg.analytics);
    if (!this.on) return;
    addEventListener('error', () => { this.errs++; });
    addEventListener('unhandledrejection', () => { this.rejects++; });
    if (canvas) canvas.addEventListener('webglcontextlost', () => { this.glLost++; });
  },
  // Bridge platform message: level_started / level_completed / level_failed / gameplay_started ...
  msg(m, level) {
    if (!this.on) return;
    try { const p = Platform.pg.platform.sendMessage(m, level != null ? { level } : undefined); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  },
  ev(name, data = {}) {
    if (!this.on) return;
    try { Platform.pg.analytics.send(name, { ...data, game_version: BUILD }); } catch (e) {}
  },

  // Called for every drawn frame. Only visible, active gameplay counts; anything else ends the frame chain
  // so a pause, menu or hidden tab never shows up as one long frame.
  frame(now, active) {
    if (!this.on) return;
    if (!active) { this.last = 0; return; }
    if (!this.winStart) this.winStart = now;
    if (this.last) { const dt = now - this.last; this.dts.push(dt); this.activeMs += dt; }
    this.last = now;
    if (this.activeMs >= WINDOW_MS) this.flush(now);
  },
  flush(now) {
    const d = this.dts.slice().sort((a, b) => a - b), n = d.length;
    if (n >= 10) {
      const over = (ms) => d.filter((x) => x > ms).length;
      const s = {
        target_fps: TARGET_FPS,
        window_ms: Math.round(now - this.winStart),
        active_ms: Math.round(this.activeMs),
        frame_count: n,
        fps_avg: r1(n / (this.activeMs / 1000)),
        fps_p10: r1(1000 / Math.max(1, pct(d, 0.9))), // the slowest 10% of frames
        frame_time_p50_ms: r1(pct(d, 0.5)),
        frame_time_p95_ms: r1(pct(d, 0.95)),
        frame_time_p99_ms: r1(pct(d, 0.99)),
        frame_time_max_ms: r1(d[n - 1]),
        frames_over_50ms: over(50), frames_over_100ms: over(100), frames_over_250ms: over(250),
        frames_over_500ms: over(500), frames_over_1000ms: over(1000),
        js_error_count: this.errs, unhandled_rejection_count: this.rejects, webgl_context_loss_count: this.glLost,
      };
      const mem = performance.memory;
      if (mem && mem.usedJSHeapSize) { s.memory_used_mb = Math.round(mem.usedJSHeapSize / 1048576); s.memory_measurement_supported = true; s.memory_measurement_type = 'js_heap'; }
      this.ev('performance_sample', s);
    }
    this.dts = []; this.activeMs = 0; this.winStart = now; this.errs = 0; this.rejects = 0; this.glLost = 0;
  },
};
