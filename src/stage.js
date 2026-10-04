'use strict';
/* ===== 잔향선 · 전투 무대 (배경 · 인물 루프 · 좌표) ===== */

const BGTH = {
  ash:      { sky: ['#1b2230', '#4a5568'], floor: ['#3b4048', '#30343b'], mote: '#cfd8e3', deco: 'clock', rain: 1 },
  market:   { sky: ['#1a0a0a', '#5c1f1a'], floor: ['#3b2a26', '#2e211e'], mote: '#ff8787', deco: 'market' },
  library:  { sky: ['#06121f', '#1e3a5f'], floor: ['#13314f', '#0f2742'], mote: '#a5d8ff', deco: 'library', water: 1 },
  theater:  { sky: ['#1a0505', '#6b1414'], floor: ['#3a1f14', '#2e180f'], mote: '#ffa94d', deco: 'theater' },
  workshop: { sky: ['#150f1f', '#3b2a4a'], floor: ['#2b2236', '#231c2c'], mote: '#e599f7', deco: 'workshop' },
  tracks:   { sky: ['#03110f', '#0f3a33'], floor: ['#1c2a28', '#162220'], mote: '#96f2d7', deco: 'tracks' },
  festival: { sky: ['#140a24', '#4a1f5c'], floor: ['#3a2a1a', '#2e2214'], mote: '#ffd43b', deco: 'festival' },
  quarry:   { sky: ['#2b1205', '#b3541e'], floor: ['#5c4030', '#4a3326'], mote: '#ffc078', deco: 'quarry' },
  sewing:   { sky: ['#1f0a1a', '#5c2048'], floor: ['#3b2236', '#2f1b2b'], mote: '#f783ac', deco: 'sewing' },
  garden:   { sky: ['#070a1f', '#2b3480'], floor: ['#1e2a40', '#182235'], mote: '#dbe4ff', deco: 'garden' },
  mirror:   { sky: ['#140f24', '#4c3a7a'], floor: ['#2b2547', '#231e3b'], mote: '#e5dbff', deco: 'mirror' },
  lethe:    { sky: ['#9aa9c2', '#e7edf5'], floor: ['#c5d3e0', '#b5c5d5'], mote: '#ffffff', deco: 'lethe', water: 1 },
  maze:     { sky: ['#0b0614', '#2a1640'], floor: ['#1f1530', '#191126'], mote: '#b197fc', deco: 'maze' },
  cabin:    { sky: ['#1a120b', '#4a3220'], floor: ['#3b2a1c', '#302216'], mote: '#ffd8a8', deco: 'cabin' },
};

function drawBG(c, key, w, h, dpr) {
  const th = BGTH[key] || BGTH.ash, hz = h * 0.58, d = th.deco;
  VR.use(c, dpr); VR.rim(null); VR.flash(0); VR.tint(null);
  let seed = key.length * 977 + 13;
  const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const P = (pts, col, o) => VR.F(pts, col, Object.assign({ rim: false }, o)), Rr = VR.Rr, ngon = VR.ngon, mx = VR.mix;
  // 하늘: 톱니 띠
  const B = 7; let prev = [[-2, -2], [w + 2, -2]];
  for (let i = 0; i < B; i++) {
    const e = []; for (let k = 0; k <= 7; k++) e.push([w * k / 7, i === B - 1 ? hz + 2 : hz * (i + 1) / B + (rr() - 0.5) * hz * 0.07]);
    P([...prev, ...e.slice().reverse()], mx(th.sky[0], th.sky[1], i / (B - 1)), { flat: 1 }); prev = e;
  }
  const sil = (pts, col = '#000000', a = 0.35) => P(pts, col, { flat: 1, a });
  if (d === 'clock') {
    for (let i = 0; i < 9; i++) { const x = i * w / 8 + rr() * 20 - 10, bh = 30 + rr() * 50, bw = 24 + rr() * 26; sil(Rr(x - bw / 2, hz - bh, bw, bh + 2), '#141922', 0.9); for (let k = 0; k < 4; k++) if (rr() > 0.5) P(Rr(x - bw / 2 + 4 + rr() * (bw - 10), hz - bh + 6 + rr() * (bh - 14), 3, 4), '#ffd43b', { flat: 1, a: 0.6 }); }
    const tx = w * 0.7; P(Rr(tx - 16, hz - 150, 32, 152), '#10141c'); P([[tx - 20, hz - 150], [tx + 20, hz - 150], [tx, hz - 182]], '#0c1017');
    P(ngon(tx, hz - 120, 12, 12), '#fff3bf', { flat: 1, a: 0.85 }); P([[tx, hz - 120], [tx + 1, hz - 129], [tx - 1, hz - 129]], '#212529', { flat: 1 }); P([[tx, hz - 120], [tx + 7, hz - 118], [tx + 7, hz - 121]], '#212529', { flat: 1 });
    for (let i = 0; i < 4; i++) { const x = w * 0.08 + i * w * 0.28; P(Rr(x, hz - 64, 4, 66), '#2b313b'); P(ngon(x + 2, hz - 66, 5, 6), '#ffe066', { flat: 1, a: 0.8 }); P(ngon(x + 2, hz - 66, 12, 8), '#ffe066', { flat: 1, a: 0.1 }); }
  }
  if (d === 'market') {
    for (let i = 0; i < 6; i++) { const x = w * 0.05 + i * w * 0.18; P(Rr(x, hz - 44, 46, 46), '#2a1210'); P([[x - 4, hz - 44], [x + 50, hz - 44], [x + 42, hz - 58], [x + 4, hz - 58]], i % 2 ? '#8a2c22' : '#c4473a'); for (let k = 0; k < 3; k++) { P(Rr(x + 8 + k * 14, hz - 44, 1, 12), '#868e96', { flat: 1 }); P(ngon(x + 8.5 + k * 14, hz - 28, 4, 5, 0, 7), '#a63c32'); } }
    for (let i = 0; i < 12; i++) { const x = rr() * w; P(Rr(x, 0, 1, 20 + rr() * 40), '#5c5f66', { flat: 1, a: 0.6 }); }
  }
  if (d === 'library') {
    for (let i = 0; i < 7; i++) { const x = i * w / 6 - 20, sh = 90 + rr() * 60; P(Rr(x, hz - sh, 44, sh + 2), '#0c1a2b'); for (let r = 0; r < 5; r++) { P(Rr(x + 2, hz - sh + 8 + r * 18, 40, 2), '#1e3a5f', { flat: 1 }); for (let k = 0; k < 6; k++) P(Rr(x + 4 + k * 6, hz - sh + 10 + r * 18, 4, 8 + rr() * 6), ['#1864ab', '#5f3dc4', '#2b8a3e', '#862e9c'][(k + r) % 4], { flat: 1, a: 0.5 }); } }
    for (let i = 0; i < 6; i++) { const x = rr() * w; P(Rr(x, 0, 2, hz), '#a5d8ff', { flat: 1, a: 0.05 }); }
  }
  if (d === 'theater') {
    P(Rr(0, 0, w, 18), '#5c0f0f'); for (let i = 0; i < 12; i++) P([[i * w / 12, 18], [(i + 1) * w / 12, 18], [(i + 0.5) * w / 12, 30]], '#8b1a1a');
    for (const s of [0, 1]) { const x0 = s ? w - 60 : 0; for (let i = 0; i < 4; i++) P([[x0 + i * 15, 0], [x0 + i * 15 + 15, 0], [x0 + i * 15 + 12 + (s ? -6 : 6), hz + 2], [x0 + i * 15 + (s ? -6 : 6), hz + 2]], i % 2 ? '#8b1a1a' : '#a61e1e'); }
    for (let i = 0; i < 3; i++) { const x = w * 0.3 + i * w * 0.2; P([[x - 4, 0], [x + 4, 0], [x + 40, hz], [x - 40, hz]], '#fff3bf', { flat: 1, a: 0.06 }); }
    for (let i = 0; i < 16; i++) { const x = rr() * w, y = rr() * hz; P([[x, y - 3], [x + 2, y], [x - 2, y]], '#ffa94d', { flat: 1, a: 0.7 }); }
  }
  if (d === 'workshop') {
    for (let i = 0; i < 5; i++) { const cx = rr() * w, cy = rr() * hz * 0.7, r = 16 + rr() * 26; const pts = []; for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, rad = k % 2 ? r : r * 0.8; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } P(pts, '#2a1f38'); P(ngon(cx, cy, r * 0.3, 8), '#150f1f', { flat: 1 }); }
    for (let i = 0; i < 8; i++) { const x = w * 0.06 + i * w * 0.12, y = hz - 50 - (i % 2) * 14; P([[x - 8, y - 9], [x + 8, y - 9], [x + 9, y + 4], [x + 5, y + 10], [x - 5, y + 10], [x - 9, y + 4]], '#e9ecef', { flat: 1, a: 0.55 }); P(Rr(x - 5, y - 2, 3, 2), '#141017', { flat: 1 }); P(Rr(x + 2, y - 2, 3, 2), '#141017', { flat: 1 }); }
    P(Rr(0, hz - 12, w, 12), '#1a1424');
  }
  if (d === 'tracks') {
    P(ngon(w * 0.2, h * 0.14, 12, 10), '#e6fcf5', { flat: 1, a: 0.8 });
    for (let i = 0; i < 4; i++) { const x = w * 0.15 + i * w * 0.24; P(Rr(x, hz - 70, 3, 72), '#1c2a28'); P(Rr(x - 5, hz - 76, 13, 10), '#0b1514'); P(ngon(x + 1.5, hz - 71, 2.4, 6), i % 2 ? '#ff6b6b' : '#63e6be', { flat: 1 }); }
    for (let i = 0; i < 5; i++) P(Rr(0, hz - 20 - i * 6, w, 3), '#96f2d7', { flat: 1, a: 0.04 });
  }
  if (d === 'festival') {
    const fx = w * 0.78, fy = hz - 70; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P([[fx, fy], [fx + Math.cos(a) * 60, fy + Math.sin(a) * 60], [fx + Math.cos(a + 0.05) * 60, fy + Math.sin(a + 0.05) * 60]], '#5c3d6e', { flat: 1, a: 0.7 }); P(ngon(fx + Math.cos(a) * 60, fy + Math.sin(a) * 60, 5, 6), ['#ffd43b', '#ff6b6b', '#74c0fc'][i % 3], { flat: 1, a: 0.8 }); }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 14; i++) { const x = i * w / 13, y = 30 + r * 40 + Math.sin(i * 0.9) * 8; P([[x, y], [x + 8, y], [x + 4, y + 10]], ['#e03131', '#fcc419', '#4dabf7', '#40c057'][(i + r) % 4], { flat: 1 }); }
    for (let i = 0; i < 6; i++) { const x = w * 0.05 + i * w * 0.16; P(Rr(x, hz - 40, 28, 42), '#2a1a3a'); P([[x - 3, hz - 40], [x + 31, hz - 40], [x + 14, hz - 56]], i % 2 ? '#e03131' : '#fcc419'); }
  }
  if (d === 'quarry') {
    P(ngon(w * 0.25, h * 0.2, 22, 10), '#ffd8a8', { flat: 1, a: 0.85 });
    for (let i = 0; i < 5; i++) { const x = i * w * 0.24 - 20, hh = 60 + rr() * 60, mw = w * 0.3; P([[x, hz + 1], [x + mw, hz + 1], [x + mw * 0.82, hz - hh], [x + mw * 0.6, hz - hh - 12], [x + mw * 0.2, hz - hh + 6]], i % 2 ? '#6b3a1f' : '#7c4524'); }
    const cx = w * 0.82; P(Rr(cx, hz - 120, 4, 122), '#3b2a1a'); P(Rr(cx - 50, hz - 120, 70, 4), '#3b2a1a'); P(Rr(cx - 46, hz - 116, 1, 40), '#868e96', { flat: 1 }); P(Rr(cx - 52, hz - 76, 12, 10), '#5c4030');
  }
  if (d === 'sewing') {
    for (let i = 0; i < 5; i++) { const x = w * 0.08 + i * w * 0.22, sh = 40 + rr() * 50; P(Rr(x - 14, hz - sh, 28, 6), '#8b5a2b'); P(Rr(x - 10, hz - sh + 6, 20, sh - 12), ['#f783ac', '#9775fa', '#ffd43b', '#63e6be'][i % 4]); P(Rr(x - 14, hz - 6, 28, 6), '#8b5a2b'); }
    for (let i = 0; i < 7; i++) { const y = 20 + rr() * hz * 0.6; P([[0, y], [w, y + rr() * 40 - 20], [w, y + rr() * 40 - 19], [0, y + 1]], '#f783ac', { flat: 1, a: 0.25 }); }
  }
  if (d === 'garden') {
    P(ngon(w * 0.72, h * 0.16, 30, 14), '#f8f9fa', { flat: 1, a: 0.9 }); P(ngon(w * 0.72, h * 0.16, 44, 14), '#dbe4ff', { flat: 1, a: 0.12 });
    for (let i = 0; i < 26; i++) P(ngon(rr() * w, rr() * hz * 0.7, 1.2, 4), '#ffffff', { flat: 1, a: 0.8 });
    for (let i = 0; i < 8; i++) { const x = i * w / 7 - 10, hh = 26 + rr() * 16; P([[x - 22, hz + 1], [x - 20, hz - hh], [x - 8, hz - hh - 8], [x + 8, hz - hh - 6], [x + 22, hz - hh + 4], [x + 24, hz + 1]], i % 2 ? '#1b2a4a' : '#22335a'); P(ngon(x + rr() * 20 - 10, hz - hh + 4, 3, 5), '#e5dbff', { flat: 1, a: 0.8 }); }
  }
  if (d === 'mirror') {
    for (let i = 0; i < 6; i++) { const x = w * 0.04 + i * w * 0.165, y = hz - 110; P([[x, y], [x + 40, y], [x + 40, hz], [x, hz]], '#8a6420'); P([[x + 4, y + 4], [x + 36, y + 4], [x + 36, hz - 2], [x + 4, hz - 2]], '#b197fc', { flat: 1, a: 0.35 }); P([[x + 8, y + 10], [x + 18, y + 10], [x + 8, y + 40]], '#ffffff', { flat: 1, a: 0.2 }); if (rr() > 0.5) P([[x + 20, y + 30], [x + 28, y + 60], [x + 14, y + 80]], '#e5dbff', { flat: 1, a: 0.4 }); }
  }
  if (d === 'lethe') {
    for (let i = 0; i < 5; i++) { const cx = rr() * w, cy = 20 + rr() * hz * 0.5; P(ngon(cx, cy, 30, 8, 0, 10), '#ffffff', { flat: 1, a: 0.5 }); }
    for (let i = 0; i < 6; i++) { const x = w * 0.08 + i * w * 0.17; P(Rr(x, hz - 30, 2, 32), '#8a96ab'); P(ngon(x + 1, hz - 34, 5, 6), '#fff3bf', { flat: 1, a: 0.9 }); P(ngon(x + 1, hz - 34, 12, 8), '#fff3bf', { flat: 1, a: 0.15 }); }
  }
  if (d === 'maze') {
    for (let i = 0; i < 7; i++) { const x = i * w / 6 - 30, wd = 50 + rr() * 30, hh = 80 + rr() * 80; P([[x, hz + 1], [x + wd, hz + 1], [x + wd * 0.9, hz - hh], [x + wd * 0.1, hz - hh]], i % 2 ? '#1a1030' : '#22163d'); P(Rr(x + wd * 0.4, hz - hh * 0.6, 6, 8), '#b197fc', { flat: 1, a: 0.5 }); }
    for (let i = 0; i < 20; i++) P(ngon(rr() * w, rr() * hz, 1.2, 4), '#e5dbff', { flat: 1, a: 0.6 });
  }
  if (d === 'cabin') {
    for (let i = 0; i < 3; i++) { const x = w * 0.08 + i * w * 0.32; P(Rr(x, hz - 100, 70, 60), '#2b1d12'); P(Rr(x + 4, hz - 96, 62, 52), '#1b2a4a', { flat: 1 }); for (let k = 0; k < 4; k++) P(Rr(x + 4 + rr() * 60, hz - 96 + rr() * 48, 2, 2), '#ffffff', { flat: 1, a: 0.7 }); }
    P(Rr(0, hz - 30, w, 30), '#3b2a1c');
    for (let i = 0; i < 4; i++) { const x = w * 0.15 + i * w * 0.24; P(ngon(x, 18, 6, 6), '#ffd43b', { flat: 1, a: 0.8 }); P(ngon(x, 18, 16, 8), '#ffd43b', { flat: 1, a: 0.1 }); }
  }
  // 바닥: 원근 띠 + 소실선
  for (let r = 0; r < 8; r++) { const y0 = hz + (h - hz) * Math.pow(r / 8, 1 / 0.7), y1 = hz + (h - hz) * Math.pow((r + 1) / 8, 1 / 0.7); P(Rr(-2, y0, w + 4, y1 - y0 + 1), r % 2 ? th.floor[0] : th.floor[1], { flat: 1 }); }
  for (let i = -9; i <= 9; i++) { const x0 = w / 2 + i * 14, xb = x0 + (x0 - w / 2) * 5; P([[x0 - 0.5, hz], [x0 + 0.5, hz], [xb + 1.5, h], [xb - 1.5, h]], '#000000', { flat: 1, a: 0.14 }); }
  if (d === 'tracks') for (const s of [-1, 1]) P([[w / 2 + s * 30, hz], [w / 2 + s * 32, hz], [w / 2 + s * 200, h], [w / 2 + s * 190, h]], '#adb5bd', { flat: 1, a: 0.5 });
  if (th.water) for (let i = 0; i < 9; i++) { const x = rr() * w, y = hz + 10 + rr() * (h - hz - 20); P(Rr(x, y, 20 + rr() * 30, 1.5), '#ffffff', { flat: 1, a: 0.18 }); }
  P(Rr(0, hz, w, 1.5), '#ffffff', { flat: 1, a: 0.2 });
  // 가장자리 어둡게
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.4, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}

const Stage = {
  cv: null, c: null, W: 360, H: 360, dpr: 1, me: null, foe: null, raf: 0, bg: null, motes: [], theme: 'ash', fps: 24, lastQ: -1, extra: [], rain: [],
  mount(host, theme, heroLook, foeLook, o = {}) {
    this.unmount(); this.preview = !!o.preview;
    const cv = document.createElement('canvas'); cv.className = 'stagecv'; host.prepend(cv);
    this.cv = cv; this.c = cv.getContext('2d'); this.theme = theme; this.host = host;
    this.resize(true);
    const k = this.k;
    this.me = RIG.make({ kind: 'hero', look: heroLook, x: this.W * 0.25, y: this.H * 0.84, face: 1, sc: 1.42 * k, box: { w: 40, h: 82 } });
    this.setFoe(foeLook, o.foeGim);
    this.me.t0 = RIG.now() - 500;
    if (!this.raf) this.raf = requestAnimationFrame(t => this.loop(t));
  },
  setFoe(look, gim) {
    if (!look) { this.foe = null; return; }
    const k = this.k, boss = !!look.boss;
    this.foe = RIG.make({ kind: look.human ? 'foe' : 'foe', look, x: this.W * 0.72, y: this.H * (boss ? 0.8 : 0.82), face: -1, sc: (look.sc || 1.4) * k * (boss ? 1 : 1), box: { w: look.box ? look.box[0] : 50, h: look.box ? look.box[1] : 80 }, gim: gim || {} });
    this.foe.t0 = RIG.now() - 1700;
  },
  resize(first) {
    if (!this.cv) return;
    const r = this.host.getBoundingClientRect();
    const W = Math.max(280, r.width || 360), H = Math.max(260, r.height || 360);
    this.W = W; this.H = H; this.dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    this.k = clamp(Math.min(W / 400, H / 380), 0.75, 1.35);
    const dw = Math.ceil(W * this.dpr), dh = Math.ceil(H * this.dpr);
    this.cv.width = dw; this.cv.height = dh; this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    this.bg = document.createElement('canvas'); this.bg.width = dw; this.bg.height = dh;
    const b = this.bg.getContext('2d'); b.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); drawBG(b, this.theme, W, H, this.dpr);
    const th = BGTH[this.theme] || BGTH.ash;
    this.motes = []; for (let i = 0; i < 18; i++) this.motes.push({ x: Math.random() * W, y: Math.random() * H, v: 0.1 + Math.random() * 0.25, p: Math.random() * 7, s: 1.5 + Math.random() * 1.6, c: th.mote });
    this.rain = th.rain ? Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 5 })) : [];
    if (!first) {
      const k = this.k;
      if (this.me && this.preview) { this.me.x = W * 0.5; this.me.y = H * 0.84; this.me.sc = Math.min(2.4, H / 120); }
      else if (this.me) { this.me.x = W * 0.25; this.me.y = H * 0.84; this.me.sc = 1.42 * k; }
      if (this.foe) { const L = this.foe.look; this.foe.x = W * 0.72; this.foe.y = H * (L.boss ? 0.8 : 0.82); this.foe.sc = (L.sc || 1.4) * k; }
    }
  },
  unmount() { if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv); this.cv = null; this.me = null; this.foe = null; },
  loop(t) {
    if (!this.cv || !this.cv.isConnected) { this.raf = 0; return; }
    this.raf = requestAnimationFrame(tt => this.loop(tt));
    const q = this.fps >= 60 ? 1 : 1000 / this.fps;
    const now = Math.floor(RIG.now() / q) * q;
    if (now === this.lastQ) return; this.lastQ = now;
    const d = this.c, W = this.W, H = this.H;
    d.setTransform(1, 0, 0, 1, 0, 0); d.clearRect(0, 0, this.cv.width, this.cv.height);
    if (this.shakeT > now) { const s = this.shakeP * (this.shakeT - now) / this.shakeD; d.translate((Math.random() - 0.5) * s * this.dpr, (Math.random() - 0.5) * s * this.dpr); }
    d.drawImage(this.bg, 0, 0);
    d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const m of this.motes) {
      m.y -= m.v * 4; m.x += Math.sin(now / 700 + m.p) * 0.5; if (m.y < 0) { m.y = H * (0.5 + Math.random() * 0.5); m.x = Math.random() * W; }
      const a = now / 400 + m.p, s = m.s; d.fillStyle = m.c; d.globalAlpha = 0.6; d.beginPath();
      for (let i = 0; i < 3; i++) { const b = a + i * 2.094; i ? d.lineTo(m.x + Math.cos(b) * s, m.y + Math.sin(b) * s) : d.moveTo(m.x + Math.cos(b) * s, m.y + Math.sin(b) * s); }
      d.fill();
    }
    d.globalAlpha = 1;
    if (this.rain.length) { d.strokeStyle = 'rgba(200,215,235,.35)'; d.lineWidth = 1; d.beginPath(); for (const r of this.rain) { r.y += r.v; r.x -= r.v * 0.25; if (r.y > H) { r.y = -10; r.x = Math.random() * W * 1.2; } d.moveTo(r.x, r.y); d.lineTo(r.x + 3, r.y - 12); } d.stroke(); }
    if (this.under) try { this.under(d, now); } catch (e) { /* 연출 오류는 무시 */ }
    const list = [this.foe, this.me].filter(Boolean);
    const poses = list.map(a => [a, RIG.pose(a, now)]);
    for (const [a, p] of poses) {
      if (p.alpha > 0.3) { const air = Math.max(0, -p.dy); d.fillStyle = 'rgba(5,3,12,.4)'; d.beginPath(); d.ellipse(a.x + p.dx * a.face, a.y + 2, Math.max(8, a.box.w * 0.5 * a.sc * (a.look.shadow || 1) * (1 - Math.min(0.6, air / 200))), 5 * Math.max(0.6, a.sc * 0.7), 0, 0, 7); d.fill(); }
    }
    for (const [a, p] of poses) {
      RIG.draw(d, a, p, now, this.dpr);
      a.lastP = p;
      if (a.stun) { const x = a.x + p.dx * a.face, y = a.y + p.dy - a.box.h * a.sc - 8; VR.use(d, this.dpr); for (let i = 0; i < 3; i++) { const an = now / 300 + i * 2.1; VR.star(x + Math.cos(an) * 20, y + Math.sin(an) * 6, 5, '#ffd43b'); } }
    }
    if (this.over) try { this.over(d, now); } catch (e) { /* 연출 오류는 무시 */ }
  },
  shake(p, d) { this.shakeP = p; this.shakeD = d; this.shakeT = RIG.now() + d; },
  /* 화면(클라이언트) 좌표: 몸 중심·머리 위·발밑·무기 끝 */
  pt(a, where = 'c') {
    if (!a || !this.cv) return { x: 0, y: 0, w: 0, h: 0 };
    const r = this.cv.getBoundingClientRect(), p = a.lastP || a.cur || {};
    const x = r.left + a.x + (p.dx || 0) * a.face, gy = r.top + a.y + (p.dy || 0), h = a.box.h * a.sc, w = a.box.w * a.sc;
    if (where === 'top') return { x, y: gy - h, w, h };
    if (where === 'feet') return { x, y: gy, w, h };
    if (where === 'tip') return a.tip ? { x: r.left + a.tip[0], y: r.top + a.tip[1], w, h } : { x: x + a.face * w * 0.5, y: gy - h * 0.55, w, h };
    return { x, y: gy - h * 0.5, w, h };
  },
  /* 돌진 거리 (스테이지 px) */
  dist(from, to) { if (!from || !to) return 100; return Math.max(30, Math.abs(to.x - from.x) - (to.box.w * to.sc * 0.5 + from.box.w * from.sc * 0.4) - 8); },
};
if (typeof window !== 'undefined') window.addEventListener('resize', () => { if (Stage.cv && Stage.cv.isConnected) Stage.resize(false); });
