'use strict';
/* ===== 잔향선 · 이펙트 (캔버스 레이어 + 컷인) ===== */

class FXLayer {
  constructor(host) {
    this.host = host;
    this.cv = document.createElement('canvas');
    this.cv.className = 'fxcanvas';
    this.cv.setAttribute('aria-hidden', 'true');
    host.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.items = [];
    this.raf = 0;
    this.speed = 1;
    this.dpr = 1;
    this.tick = this.tick.bind(this);
  }
  alive() { return document.body.contains(this.cv); }
  fit() {
    const r = this.host.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.dpr = dpr;
  }
  add(dur, draw) {
    if (!this.alive()) return;
    this.items.push({ t0: performance.now(), dur: dur / Math.max(1, (this.speed || 1) * 0.75), draw });
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }
  tick(now) {
    if (!this.alive()) { this.raf = 0; this.items = []; return; }
    this.fit();
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.items = this.items.filter(it => {
      const p = (now - it.t0) / it.dur;
      if (p >= 1) return false;
      c.save(); it.draw(c, Math.max(0, p)); c.restore();
      return true;
    });
    this.raf = this.items.length ? requestAnimationFrame(this.tick) : 0;
    if (!this.raf) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height); }
  }

  /* 입자 묶음: 속도·중력·수명 */
  particles(x, y, o) {
    const n = o.n || 10, ps = [];
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed || 80) * (0.4 + Math.random() * 0.8);
      ps.push({ x: x + (Math.random() - 0.5) * (o.jitter || 0), y: y + (Math.random() - 0.5) * (o.jitterY != null ? o.jitterY : (o.jitter || 0)), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: (o.size || 3) * (0.6 + Math.random() * 0.8), d: Math.random() * 0.3, r: Math.random() * Math.PI });
    }
    const dur = o.dur || 700, g = o.grav || 0, col = o.color || '#fff', shape = o.shape || 'dot';
    this.add(dur, (c, p) => {
      for (const q of ps) {
        const t = Math.max(0, p - q.d) / (1 - q.d);
        if (t <= 0) continue;
        const T = t * dur / 1000;
        const px = q.x + q.vx * T, py = q.y + q.vy * T + 0.5 * g * T * T;
        const al = (1 - t) * (o.alpha || 1);
        c.globalAlpha = al;
        c.fillStyle = typeof col === 'function' ? col(t) : col;
        c.strokeStyle = c.fillStyle;
        const s = q.s * (o.shrink ? 1 - t * 0.7 : 1) * (o.grow ? 1 + t * 1.5 : 1);
        if (shape === 'dot') { c.beginPath(); c.arc(px, py, s, 0, 7); c.fill(); }
        else if (shape === 'streak') { c.lineWidth = Math.max(1, s * 0.6); c.beginPath(); c.moveTo(px, py); c.lineTo(px - q.vx * 0.05, py - q.vy * 0.05); c.stroke(); }
        else if (shape === 'drop') { c.beginPath(); c.moveTo(px, py - s * 1.6); c.quadraticCurveTo(px + s, py, px, py + s * 0.8); c.quadraticCurveTo(px - s, py, px, py - s * 1.6); c.fill(); }
        else if (shape === 'flame') { c.beginPath(); c.moveTo(px, py - s * 2); c.quadraticCurveTo(px + s, py, px, py + s); c.quadraticCurveTo(px - s, py, px, py - s * 2); c.fill(); }
        else if (shape === 'ring') { c.lineWidth = 1.2; c.beginPath(); c.arc(px + Math.sin(T * 9 + q.r) * 3, py, s, 0, 7); c.stroke(); }
        else if (shape === 'diamond') { const k = s * (0.6 + 0.4 * Math.sin(T * 20 + q.r)); c.beginPath(); c.moveTo(px, py - k * 1.6); c.lineTo(px + k, py); c.lineTo(px, py + k * 1.6); c.lineTo(px - k, py); c.closePath(); c.fill(); }
        else if (shape === 'shard') { c.save(); c.translate(px, py); c.rotate(q.r + T * 6); c.beginPath(); c.moveTo(0, -s * 1.8); c.lineTo(s, s); c.lineTo(-s, s * 0.6); c.closePath(); c.fill(); c.restore(); }
        else if (shape === 'plus') { c.lineWidth = Math.max(1.4, s * 0.5); c.beginPath(); c.moveTo(px - s, py); c.lineTo(px + s, py); c.moveTo(px, py - s); c.lineTo(px, py + s); c.stroke(); }
        else if (shape === 'square') { c.fillRect(px - s / 2, py - s / 2, s, s); }
      }
    });
  }
  ring(x, y, o = {}) {
    const r0 = o.r0 || 4, r1 = o.r1 || 40, col = o.color || '#fff', w = o.width || 3, sq = o.squash || 1;
    this.add(o.dur || 450, (c, p) => {
      const e = 1 - Math.pow(1 - p, 3);
      c.globalAlpha = (1 - p) * (o.alpha || 1);
      c.strokeStyle = col; c.lineWidth = w * (1 - p * 0.6);
      c.beginPath(); c.ellipse(x, y, r0 + (r1 - r0) * e, (r0 + (r1 - r0) * e) * sq, 0, 0, 7); c.stroke();
    });
  }
  flashDot(x, y, r, col, dur = 220) {
    this.add(dur, (c, p) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r * (1 + p));
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 1 - p; c.fillStyle = g; c.beginPath(); c.arc(x, y, r * (1 + p), 0, 7); c.fill();
    });
  }
  star(x, y, r, col, pts = 4, dur = 320) {
    this.add(dur, (c, p) => {
      const k = r * (p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7 * 0.5);
      c.globalAlpha = 1 - p * p; c.fillStyle = col;
      c.beginPath();
      for (let i = 0; i < pts * 2; i++) { const a = i * Math.PI / pts + p; const rr = i % 2 ? k * 0.22 : k; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    });
  }

  /* ----- 공격 속성별 타격 ----- */
  slash(x, y, col, big) {
    const a0 = -Math.PI * (0.75 + Math.random() * 0.35), sweep = Math.PI * (0.7 + Math.random() * 0.25), R = big ? 44 : 32;
    const flip = Math.random() < 0.5 ? 1 : -1;
    this.add(300, (c, p) => {
      const e = Math.min(1, p / 0.45), fade = p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
      c.translate(x, y); c.scale(flip, 1); c.rotate(0.2);
      c.globalAlpha = fade;
      c.lineCap = 'round';
      c.shadowColor = col; c.shadowBlur = 12;
      c.strokeStyle = col; c.lineWidth = big ? 9 : 6;
      c.beginPath(); c.arc(0, 0, R, a0 + sweep * Math.max(0, e - 0.35), a0 + sweep * e); c.stroke();
      c.shadowBlur = 0; c.strokeStyle = '#fffaf0'; c.lineWidth = big ? 3 : 2;
      c.beginPath(); c.arc(0, 0, R, a0 + sweep * Math.max(0, e - 0.3), a0 + sweep * e); c.stroke();
    });
    this.particles(x, y, { n: big ? 12 : 7, color: '#fff2d0', speed: 140, dur: 380, shape: 'streak', size: 4 });
  }
  pierce(x, y, col, fromX, fromY, big) {
    const ang = Math.atan2(y - fromY, x - fromX) || -Math.PI / 2;
    const L0 = big ? 90 : 64;
    this.add(260, (c, p) => {
      const e = Math.min(1, p / 0.35), fade = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
      c.translate(x, y); c.rotate(ang);
      c.globalAlpha = fade; c.lineCap = 'round';
      c.shadowColor = col; c.shadowBlur = 10;
      c.strokeStyle = col; c.lineWidth = big ? 6 : 4;
      c.beginPath(); c.moveTo(-L0 + L0 * e * 0.6, 0); c.lineTo(-L0 * 0.1 + 22 * e, 0); c.stroke();
      c.shadowBlur = 0; c.strokeStyle = '#ffffff'; c.lineWidth = big ? 2.4 : 1.6;
      c.beginPath(); c.moveTo(-L0 * 0.7 + L0 * e * 0.6, 0); c.lineTo(-L0 * 0.1 + 22 * e, 0); c.stroke();
    });
    this.star(x, y, big ? 22 : 15, '#ffffff', 4, 260);
    this.particles(x, y, { n: 6, color: col, speed: 120, dur: 340, angle: ang, spread: 1.2, shape: 'streak', size: 3 });
  }
  blunt(x, y, col, big) {
    this.ring(x, y, { r0: 6, r1: big ? 56 : 40, color: col, width: big ? 6 : 4, dur: 420 });
    this.ring(x, y, { r0: 4, r1: big ? 34 : 24, color: '#fff2d0', width: 2, dur: 300 });
    this.flashDot(x, y, big ? 30 : 22, 'rgba(255,240,210,.9)', 200);
    this.particles(x, y + 10, { n: big ? 14 : 9, color: '#b8a888', speed: 150, grav: 520, dur: 620, angle: -Math.PI / 2, spread: 2.4, shape: 'square', size: 3.2 });
  }
  hit(dt, x, y, col, fromX, fromY, opt = {}) {
    if (dt === 'slash') this.slash(x, y, col, opt.crit);
    else if (dt === 'pierce') this.pierce(x, y, col, fromX, fromY, opt.crit);
    else this.blunt(x, y, col, opt.crit);
    if (opt.crit) { this.star(x, y, 46, '#ffd27a', 8, 380); this.particles(x, y, { n: 14, color: '#ffd27a', speed: 220, dur: 520, shape: 'diamond', size: 3 }); }
    if (opt.weak) this.particles(x, y, { n: 6, color: '#ff9a6a', speed: 90, dur: 420, shape: 'streak', size: 3 });
  }
  shieldHit(x, y) {
    this.add(380, (c, p) => {
      c.globalAlpha = (1 - p) * 0.9; c.strokeStyle = '#9fd6ea'; c.lineWidth = 2.4; c.shadowColor = '#9fd6ea'; c.shadowBlur = 8;
      const r = 26 + p * 8;
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.stroke();
      c.globalAlpha = (1 - p) * 0.18; c.fillStyle = '#9fd6ea'; c.fill();
    });
  }
  spark(x, y, strong) {
    this.flashDot(x, y, strong ? 34 : 24, 'rgba(255,236,180,.95)', 220);
    this.star(x, y, strong ? 30 : 20, '#fff6d8', 4, 240);
    this.particles(x, y, { n: strong ? 18 : 12, color: t => (t < 0.4 ? '#fffbe8' : '#ffb347'), speed: 260, grav: 300, dur: 460, shape: 'streak', size: 4 });
  }

  /* ----- 상태 ----- */
  status(key, x, y, strong) {
    const n = strong ? 1.6 : 1;
    switch (key) {
      case 'bleed': this.particles(x, y - 20, { n: Math.round(7 * n), color: '#d23a2e', speed: 40, grav: 420, dur: 700, angle: Math.PI / 2, spread: 1.6, shape: 'drop', size: 2.6, jitter: 26 }); break;
      case 'burn': this.particles(x, y + 16, { n: Math.round(12 * n), color: t => (t < 0.3 ? '#ffe08a' : t < 0.6 ? '#ff9a3a' : '#c84a2a'), speed: 60, grav: -120, dur: 800, angle: -Math.PI / 2, spread: 0.8, shape: 'flame', size: 3.4, jitter: 30, shrink: true }); break;
      case 'tremor': for (let i = 0; i < (strong ? 3 : 2); i++) setTimeout(() => this.ring(x, y + 18, { r0: 8, r1: 44, color: '#d8c060', width: 2.4, squash: 0.35, dur: 520 }), i * 110 / Math.max(1, this.speed)); break;
      case 'rupture': this.add(520, (c, p) => {
        c.globalAlpha = 1 - p; c.strokeStyle = '#4fd2bd'; c.lineWidth = 2; c.shadowColor = '#4fd2bd'; c.shadowBlur = 6;
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; c.beginPath(); c.moveTo(x, y); let px = x, py = y; for (let j = 1; j <= 3; j++) { const r = j * 9 * Math.min(1, p * 3); px = x + Math.cos(a + (j % 2 ? 0.25 : -0.25)) * r; py = y + Math.sin(a + (j % 2 ? 0.25 : -0.25)) * r; c.lineTo(px, py); } c.stroke(); }
      }); break;
      case 'sinking': this.particles(x, y + 20, { n: Math.round(9 * n), color: '#7fa6f0', speed: 50, grav: -90, dur: 900, angle: -Math.PI / 2, spread: 0.6, shape: 'ring', size: 3.4, jitter: 30, grow: true }); break;
      case 'poise': this.particles(x, y - 6, { n: Math.round(7 * n), color: '#9fe6ff', speed: 50, dur: 700, shape: 'diamond', size: 2.6, jitter: 30 }); break;
      case 'thread': this.add(520, (c, p) => { c.globalAlpha = 1 - p; c.strokeStyle = '#e0b0f0'; c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 9, y - 50); c.lineTo(x + i * 6, y - 50 + 60 * Math.min(1, p * 2.5)); c.stroke(); } }); break;
      default: this.particles(x, y, { n: 10, color: '#ffb347', speed: 120, dur: 500, size: 3 });
    }
  }
  heal(x, y) { this.particles(x, y + 14, { n: 9, color: '#8fe0ad', speed: 46, grav: -60, dur: 900, angle: -Math.PI / 2, spread: 0.9, shape: 'plus', size: 3.6, jitter: 30 }); }
  buff(x, y, good) { this.particles(x, y + (good ? 14 : -14), { n: 5, color: good ? '#9fd6b4' : '#e4a497', speed: 40, grav: good ? -70 : 70, dur: 600, angle: good ? -Math.PI / 2 : Math.PI / 2, spread: 0.6, shape: 'diamond', size: 2.2, jitter: 26 }); }
  stagger(x, y) {
    this.ring(x, y, { r0: 10, r1: 70, color: '#e8c060', width: 4, dur: 520 });
    this.particles(x, y, { n: 18, color: t => (t < 0.5 ? '#ffe7a0' : '#c8a043'), speed: 220, grav: 380, dur: 760, shape: 'shard', size: 4 });
    this.star(x, y, 40, '#fff2c0', 6, 360);
  }
  burst(x, y) {
    this.ring(x, y + 10, { r0: 8, r1: 80, color: '#e6cf6a', width: 5, squash: 0.45, dur: 560 });
    this.ring(x, y + 10, { r0: 4, r1: 54, color: '#fff2b0', width: 2.4, squash: 0.45, dur: 420 });
    this.particles(x, y + 20, { n: 14, color: '#c8b04f', speed: 160, grav: 420, dur: 650, angle: -Math.PI / 2, spread: 2.6, shape: 'square', size: 3 });
  }
  death(x, y) {
    this.particles(x, y, { n: 26, color: t => (t < 0.5 ? '#c8c2b4' : '#6a6a6a'), speed: 50, grav: -50, dur: 1200, angle: -Math.PI / 2, spread: 1.8, size: 2.2, jitter: 36, jitterY: 44 });
    this.flashDot(x, y, 40, 'rgba(230,225,211,.6)', 360);
  }
  panic(x, y) {
    this.add(800, (c, p) => {
      c.globalAlpha = 1 - p; c.strokeStyle = '#b86fa8'; c.lineWidth = 2;
      c.beginPath(); for (let i = 0; i < 60; i++) { const a = i * 0.32 + p * 8; const r = i * 0.7 * (0.6 + p); c.lineTo(x + Math.cos(a) * r, y - 24 + Math.sin(a) * r * 0.5); } c.stroke();
    });
  }
  pillar(x, y, col = '#fff6dc') {
    this.add(700, (c, p) => {
      const w = 34 * (p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7);
      const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.85; c.fillStyle = g; c.fillRect(x - w, y - 120, w * 2, 170);
    });
    this.particles(x, y + 20, { n: 12, color: col, speed: 80, grav: -140, dur: 900, angle: -Math.PI / 2, spread: 0.5, size: 2, jitter: 20 });
  }
  whoosh(x, y, dir = 1) {
    this.add(260, (c, p) => { c.globalAlpha = 1 - p; c.strokeStyle = '#e6eef6'; c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x - dir * (10 + p * 30), y + i * 10); c.lineTo(x - dir * (30 + p * 40), y + i * 10); c.stroke(); } });
  }
  ripple(x, y, col) { this.ring(x, y + 16, { r0: 6, r1: 46, color: col, width: 2.4, squash: 0.4, dur: 600 }); this.particles(x, y, { n: 6, color: col, speed: 40, grav: -40, dur: 700, shape: 'diamond', size: 2, jitter: 30 }); }
  flash(col = '#fff', alpha = 0.35, dur = 260) {
    this.add(dur, (c, p) => { c.globalAlpha = alpha * (1 - p); c.fillStyle = col; c.fillRect(0, 0, this.cv.width, this.cv.height); });
  }
  explode(x, y) { this.flashDot(x, y, 50, 'rgba(255,190,90,.95)', 300); this.particles(x, y, { n: 22, color: t => (t < 0.3 ? '#fff0b0' : t < 0.6 ? '#ff9a3a' : '#5a4a3a'), speed: 240, grav: 200, dur: 800, size: 4, shrink: true }); this.ring(x, y, { r0: 10, r1: 70, color: '#ffb347', width: 5, dur: 480 }); }
}

/* 컷인 연출 (DOM). host 안에 잠깐 띄운다 */
function cutIn(host, o, speed = 1) {
  return new Promise(res => {
    if (!host) { res(); return; }
    const el = document.createElement('div');
    el.className = 'cutin' + (o.warn ? ' warn' : '');
    el.style.setProperty('--c', o.color || '#c9a45c');
    el.style.setProperty('--ci', (1.25 / Math.max(1, speed * 0.75)) + 's');
    el.innerHTML = `<div class="ci-band"></div>${o.art ? `<div class="ci-fig">${o.art}</div>` : ''}<div class="ci-txt"><small>${esc(o.label || '')}</small><b>${esc(o.title || '')}</b><span>${esc(o.sub || '')}</span></div>`;
    host.appendChild(el);
    const ms = 1250 / Math.max(1, speed * 0.75);
    setTimeout(() => { el.remove(); res(); }, ms);
  });
}
