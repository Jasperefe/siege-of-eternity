import { Platform } from './platform.js?v=202611132226';

const DEFAULT = () => ({
  v: 1,
  shards: 0,
  best: { wave: 0, score: 0 },
  heroes: { knight: true },
  upg: { vitality: 0, might: 0, wrath: 0, swift: 0, revival: 0, fortune: 0 },
  flags: { goldenKnight: false, drake: false, dragon: false, tutorial: false },
  modes: { nightmare: false, eternity: false },
  daily: { key: 0, best: 0 },
  settings: { music: 0.6, sfx: 0.9, quality: 'auto', shake: true },
  stats: { runs: 0, kills: 0, deaths: 0 },
});

export const Save = {
  data: DEFAULT(),
  async load() {
    const raw = await Platform.loadSave();
    if (raw) {
      try {
        const d = JSON.parse(raw);
        const base = DEFAULT();
        // merge so older saves keep working when new fields are added
        for (const k of Object.keys(base)) {
          if (d[k] === undefined) continue;
          base[k] = typeof base[k] === 'object' && !Array.isArray(base[k]) ? { ...base[k], ...d[k] } : d[k];
        }
        this.data = base;
      } catch (e) { console.warn('bad save, starting fresh', e); }
    }
    return this.data;
  },
  _t: 0,
  write() {
    clearTimeout(this._t);
    this._t = setTimeout(() => Platform.writeSave(JSON.stringify(this.data)), 250);
  },
  now() { clearTimeout(this._t); return Platform.writeSave(JSON.stringify(this.data)); },
};
