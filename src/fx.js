'use strict';
/* ===== 잔향선 · 이펙트 엔진 =====
 * 화면 전체를 덮는 캔버스 두 장: 빛 입자(가산 혼합) + 글자(외곽선). 좌표는 화면(클라이언트) 픽셀. */

const FX = (() => {
  let cv, cx, tv, tx, DPR = 1, raf = 0, last = 0, on = false;
  const P = [];
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;
  function init() {
    if (cv) return;
    cv = document.createElement('canvas'); cv.id = 'fxcv'; tv = document.createElement('canvas'); tv.id = 'fxtv';
    for (const c of [cv, tv]) { c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60'; document.body.appendChild(c); }
    tv.style.zIndex = 61;
    cx = cv.getContext('2d'); tx = tv.getContext('2d');
    resize(); window.addEventListener('resize', resize);
    on = true; last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [cv, tv]) { c.width = Math.ceil(innerWidth * DPR); c.height = Math.ceil(innerHeight * DPR); c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; }
  }
  function add(o) { if (P.length > 1400) return null; const p = Object.assign({ t: 0, life: 600, vx: 0, vy: 0, g: 0, drag: 1, size: 3, type: 'dot', color: '#fff' }, o); P.push(p); return p; }
  function poly(c, x, y, r, n, rot, stroke) { c.beginPath(); for (let i = 0; i < n; i++) { const t = rot + i / n * TAU; i ? c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r) : c.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.closePath(); stroke ? c.stroke() : c.fill(); }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(40, now - last); last = now;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tv.width, tv.height);
    if (!P.length) return;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0); tx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const f = dt / 16;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { P.splice(i, 1); if (p.done) p.done(); continue; }
      if (p.delay && p.t < p.delay) continue;
      if (p.type === 'fn') { if (p.upd) p.upd(p, k, dt); }
      else { p.vx *= Math.pow(p.drag, f); p.vy = p.vy * Math.pow(p.drag, f) + p.g * f; p.x += p.vx * f; p.y += p.vy * f; }
      draw(p, k);
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  function draw(p, k) {
    const c = cx; c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
    switch (p.type) {
      case 'dot': { const a = 1 - k, r = p.size * (1 - k * 0.6), ro = (p.ro == null ? (p.ro = Math.random() * 6) : p.ro) + k * 5; c.globalAlpha = a * 0.3; c.fillStyle = p.color; poly(c, p.x, p.y, r * 2.2, 6, ro); c.globalAlpha = a; poly(c, p.x, p.y, r * 1.3, 3, ro); break; }
      case 'shard': { c.globalAlpha = 1 - k; c.fillStyle = p.color; const l = Math.hypot(p.vx, p.vy) || 1, w = p.size * (1 - k * 0.5) * 0.7, nx = -p.vy / l * w, ny = p.vx / l * w; c.beginPath(); c.moveTo(p.x + p.vx / l * w * 1.6, p.y + p.vy / l * w * 1.6); c.lineTo(p.x + nx, p.y + ny); c.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); c.lineTo(p.x - nx, p.y - ny); c.closePath(); c.fill(); break; }
      case 'bubble': { c.globalAlpha = (1 - k) * 0.9; c.strokeStyle = p.color; c.lineWidth = 2; poly(c, p.x, p.y, p.size * (1 + k), 6, k, 1); break; }
      case 'ring': { const e = 1 - Math.pow(1 - k, 3); c.globalAlpha = 1 - k; c.strokeStyle = p.color; c.lineWidth = p.w * (1 - k) + 1; c.save(); c.translate(p.x, p.y); c.scale(1, p.flat || 1); poly(c, 0, 0, p.r0 + (p.r - p.r0) * e, p.n || 12, k * 0.8, 1); c.restore(); break; }
      case 'slash': {
        const grow = Math.min(1, k * 3.2), a = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7; c.globalAlpha = a;
        const a0 = p.a - p.span / 2, a1 = a0 + p.span * grow, N = 9;
        const cres = (w, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i <= N; i++) { const t = a0 + (a1 - a0) * i / N, ww = w * Math.sin(Math.PI * i / N) / 2 + 0.3; const px = p.x + Math.cos(t) * (p.r + ww) * (p.sx || 1), py = p.y + Math.sin(t) * (p.r + ww); i ? c.lineTo(px, py) : c.moveTo(px, py); } for (let i = N; i >= 0; i--) { const t = a0 + (a1 - a0) * i / N, ww = w * Math.sin(Math.PI * i / N) / 2 + 0.3; c.lineTo(p.x + Math.cos(t) * (p.r - ww) * (p.sx || 1), p.y + Math.sin(t) * (p.r - ww)); } c.closePath(); c.fill(); };
        cres(p.w * a * 1.7 + 2, p.color); cres(p.w * 0.5 * a + 0.8, '#ffffff'); break;
      }
      case 'line': { const grow = Math.min(1, k * 3.5), a = k < 0.25 ? 1 : 1 - (k - 0.25) / 0.75; c.globalAlpha = a; const x2 = p.x + (p.x2 - p.x) * grow, y2 = p.y + (p.y2 - p.y) * grow; c.lineCap = 'butt'; c.strokeStyle = p.color; c.lineWidth = p.w * a + 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = p.w * 0.3 * a + 0.5; c.stroke(); break; }
      case 'bolt': { c.globalAlpha = 1 - k; const segs = 9, pts = [[p.x, p.y]]; for (let i = 1; i < segs; i++) { const t = i / segs; pts.push([p.x + (p.x2 - p.x) * t + rnd(-16, 16), p.y + (p.y2 - p.y) * t + rnd(-6, 6)]); } pts.push([p.x2, p.y2]); c.strokeStyle = p.color; c.lineWidth = 6 * (1 - k) + 1; c.lineJoin = 'round'; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); break; }
      case 'fn': { c.save(); c.globalCompositeOperation = p.comp || 'lighter'; try { p.draw(c, k, p); } catch (e) { /* 연출 오류 무시 */ } c.restore(); break; }
      case 'text': {
        const t = tx, pop = k < 0.1 ? 1 + (0.1 - k) * 5 : 1, sz = Math.round(p.size * pop);
        t.globalAlpha = k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
        t.font = `${p.bold ? 800 : 700} ${sz}px ${p.font || "'Do Hyeon','Black Han Sans',sans-serif"}`; t.textAlign = 'center'; t.textBaseline = 'middle';
        t.lineJoin = 'round'; t.lineWidth = Math.max(3, sz / 6); t.strokeStyle = p.stroke || '#120d1f'; t.strokeText(p.txt, p.x, p.y);
        t.fillStyle = p.color; t.fillText(p.txt, p.x, p.y); t.globalAlpha = 1; break;
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  /* ---------- 기본 도구 ---------- */
  const burst = (x, y, n, cols, sp, sz, o = {}) => { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(sp * 0.3, sp); add(Object.assign({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.92, size: rnd(sz * 0.5, sz), life: rnd(350, 700), color: pick(cols) }, o)); } };
  const ring = (x, y, color, r, life = 450, w = 6, r0 = 6, o = {}) => add(Object.assign({ type: 'ring', x, y, color, r, r0, w, life }, o));
  const text = (x, y, txt, color, size = 24, o = {}) => add(Object.assign({ type: 'text', x, y, txt, color, size, vy: -1.1, drag: 0.96, life: 950 }, o));
  const fn = o => add(Object.assign({ type: 'fn', life: 600 }, o));
  const fade = (k, a = 0.15, b = 0.75) => k < a ? k / a : k > b ? Math.max(0, (1 - k) / (1 - b)) : 1;
  function glow(c, x, y, r, col, a = 1) { const g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r)); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, TAU); c.fill(); }
  function hexPath(c, r, rot = 0) { c.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
  function starPath(c, r, rot = 0) { c.beginPath(); for (let t = 0; t < 2; t++) for (let i = 0; i <= 3; i++) { const a = rot + t * Math.PI / 3 + i * TAU / 3; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } }
  /* 마법진 */
  function sigil(x, y, r, col, life, o = {}) {
    fn({ life, comp: o.comp, draw(c, k) {
      const a = fade(k, 0.12, 0.7); c.translate(x, y); c.scale(1, o.flat || 1); c.rotate(k * (o.spin || 2)); const s = 0.6 + 0.4 * Math.min(1, k * 5); c.scale(s, s);
      c.strokeStyle = col; c.globalAlpha = a * 0.3; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      c.globalAlpha = a; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r * 0.78, 0, TAU); c.stroke();
      for (let i = 0; i < 24; i++) { const an = i * TAU / 24; c.beginPath(); c.moveTo(Math.cos(an) * r * 0.8, Math.sin(an) * r * 0.8); c.lineTo(Math.cos(an) * r * (i % 3 ? 0.88 : 0.96), Math.sin(an) * r * (i % 3 ? 0.88 : 0.96)); c.stroke(); }
      c.lineWidth = 2; if (o.hex) hexPath(c, r * 0.72, -k * 4); else starPath(c, r * 0.74, -k * 4); c.stroke();
      if (o.core) glow(c, 0, 0, r * 0.6, col, a * 0.5);
    } });
  }
  /* 곡선 비행 (베지어). 약속이 도착 시 풀린다 */
  function fly(o) {
    return new Promise(res => fn({ life: o.dur, comp: o.comp, done: res, upd(p, k) {
      const e = o.ease ? o.ease(k) : k, f = o.from, t = o.to; const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2, dx = t.x - f.x, dy = t.y - f.y, L = Math.hypot(dx, dy) || 1;
      const qx = mx - dy / L * (o.arc || 0), qy = my + dx / L * (o.arc || 0), u = 1 - e;
      const x = u * u * f.x + 2 * u * e * qx + e * e * t.x, y = u * u * f.y + 2 * u * e * qy + e * e * t.y;
      if (p.x != null && (x !== p.x || y !== p.y)) p.ang = Math.atan2(y - p.y, x - p.x); else if (p.ang == null) p.ang = Math.atan2(dy, dx);
      p.x = x; p.y = y; (p.tr || (p.tr = [])).push([x, y]); if (p.tr.length > (o.trail || 1)) p.tr.shift(); if (o.emit) o.emit(x, y, k, p);
    }, draw(c, k, p) { if (p.x != null) o.draw(c, p.x, p.y, p.ang || 0, k, p); } }));
  }
  function trail(c, tr, w, col) { for (let i = 1; i < tr.length; i++) { const t = i / tr.length; c.globalAlpha = t; c.strokeStyle = col; c.lineWidth = w * t; c.lineCap = 'round'; c.beginPath(); c.moveTo(tr[i - 1][0], tr[i - 1][1]); c.lineTo(tr[i][0], tr[i][1]); c.stroke(); } c.globalAlpha = 1; }
  /* 빛·불기둥 */
  function pillar(x, yb, w, cols, life, o = {}) {
    fn({ life, upd(p, k) { if (o.fire && k < 0.8) for (let i = 0; i < 3; i++) add({ x: x + rnd(-w * 0.4, w * 0.4), y: yb - rnd(0, 20), vx: rnd(-0.6, 0.6), vy: rnd(-7, -3), drag: 0.97, size: rnd(3, 7), life: rnd(350, 650), color: pick(cols) }); },
      draw(c, k) { const grow = Math.min(1, k * 6), a = k < 0.7 ? 1 : (1 - k) / 0.3; const top = o.top == null ? -20 : o.top; const ww = w * (k < 0.2 ? 0.3 + k * 3.5 : 1) * (1 + Math.sin(k * 40) * 0.05);
        const g = c.createLinearGradient(x - ww / 2, 0, x + ww / 2, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, cols[0]); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = a * 0.85; c.fillStyle = g; const y0 = yb - (yb - top) * grow; c.fillRect(x - ww / 2, y0, ww, yb - y0);
        c.globalAlpha = a; c.fillStyle = '#fff'; c.fillRect(x - ww * 0.08, y0, ww * 0.16, yb - y0); glow(c, x, yb, ww * 1.1, cols[0], a * 0.8); } });
  }
  function beam(f, t, w, col, life) {
    fn({ life, draw(c, k) { const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85; const ww = w * (k < 0.15 ? k / 0.15 : 1) * (1 + Math.sin(k * 60) * 0.08);
      c.lineCap = 'round'; c.globalAlpha = a * 0.5; c.strokeStyle = col; c.lineWidth = ww * 2.2; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(t.x, t.y); c.stroke();
      c.globalAlpha = a; c.lineWidth = ww; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = ww * 0.35; c.stroke(); glow(c, f.x, f.y, ww * 1.8, col, a); glow(c, t.x, t.y, ww * 2.4, col, a); } });
  }
  function emitter(life, f) { fn({ life, upd: (p, k, dt) => f(k, dt), draw() {} }); }
  function cracks(x, y, n, len, col, life) {
    const Ls = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI - Math.PI + rnd(-0.2, 0.2) + (i % 2 ? 0 : Math.PI); let px = 0, py = 0; const pts = [[0, 0]]; for (let j = 0; j < 4; j++) { px += Math.cos(a) * len / 4 + rnd(-6, 6); py += Math.sin(a) * len / 4 * 0.35 + rnd(-2, 2); pts.push([px, py]); } Ls.push(pts); }
    fn({ life, draw(c, k) { const g = Math.min(1, k * 5), a = k < 0.6 ? 1 : (1 - k) / 0.4; c.translate(x, y); c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = a; for (const pts of Ls) { c.beginPath(); const m = Math.max(1, Math.ceil(pts.length * g)); for (let i = 0; i < m; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(0, 0); c.stroke(); } } });
  }
  function spikes(x, y, n, h, cols, life, comp) {
    for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * rnd(14, 20), hh = h * rnd(0.6, 1.1), w = rnd(8, 13), lean = rnd(-0.25, 0.25);
      fn({ life: life + i * 40, delay: i * 40, comp, draw(c, k0, p) { const k = Math.max(0, (p.t - i * 40) / life); const up = k < 0.25 ? easeIO(k / 0.25) : k > 0.7 ? 1 - (k - 0.7) / 0.3 * 0.4 : 1; const a = k > 0.7 ? (1 - k) / 0.3 : 1; c.globalAlpha = a; c.translate(x + ox, y); c.rotate(lean);
        const g = c.createLinearGradient(0, 0, 0, -hh); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); c.fillStyle = g; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(0, -hh * up); c.lineTo(w / 2, 0); c.closePath(); c.fill(); c.strokeStyle = '#fff'; c.globalAlpha = a * 0.6; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -hh * up * 0.9); c.stroke(); } }); }
  }
  function crescent(c, r, thick, col, edge) { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, -1.2, 1.2); c.arc(-thick, 0, r * 0.92, 1.15, -1.15, true); c.closePath(); c.fill(); if (edge) { c.strokeStyle = edge; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r, -1.2, 1.2); c.stroke(); } }
  function flame(c, r, col, col2) { const g = c.createRadialGradient(0, r * 0.2, 0, 0, 0, r * 1.3); g.addColorStop(0, col2); g.addColorStop(1, col); c.fillStyle = g; c.beginPath(); c.moveTo(0, -r * 1.6); c.quadraticCurveTo(r, -r * 0.2, r * 0.7, r * 0.4); c.arc(0, r * 0.3, r * 0.72, 0, Math.PI); c.quadraticCurveTo(-r, -r * 0.2, 0, -r * 1.6); c.fill(); }
  function sparkle(x, y, r, col, life = 420) { fn({ life, draw(c, k) { const s = Math.sin(k * Math.PI) * r; c.translate(x, y); c.rotate(k); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? s * 0.22 : s; const a = i * Math.PI / 4; i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(rr, 0); } c.closePath(); c.fill(); } }); }
  function engulf(getPt, cols, life, n = 4) { emitter(life, k => { if (k > 0.85) return; const c = getPt(); for (let i = 0; i < n; i++) add({ x: c.x + rnd(-c.w * 0.45, c.w * 0.45), y: c.y + c.h * 0.35 - rnd(0, c.h * 0.5), vx: rnd(-0.4, 0.4), vy: rnd(-3.5, -1.2), drag: 0.97, size: rnd(3, 7), life: rnd(300, 560), color: pick(cols) }); }); }
  function shockwave(x, y, col, r = 120, life = 500, flat = 0.32) { ring(x, y, col, r, life, 10, 8, { flat }); ring(x, y, '#ffffff', r * 0.7, life * 0.8, 5, 6, { flat }); }
  /* ---------- DOM 연출 ---------- */
  let host = null, flashEl = null;
  function setHost(el) { host = el; flashEl = el ? el.querySelector('.flash') : null; }
  function flash(color = '#fff', a = 0.35, d = 180) { if (!flashEl) return; flashEl.style.background = color; flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: d }); }
  function darkFlash(a = 0.55, d = 500) { if (!flashEl) return; flashEl.style.background = '#05030d'; flashEl.animate([{ opacity: 0 }, { opacity: a, offset: 0.2 }, { opacity: 0 }], { duration: d }); }
  let shakeOn = true;
  function shake(p = 8, d = 260) {
    if (!shakeOn) p = Math.min(p, 2);
    if (typeof Stage !== 'undefined') Stage.shake(p, d);
    const el = host && host.closest('.battle'); if (!el || p < 4) return;
    const k = []; for (let i = 0; i < 6; i++) k.push({ transform: `translate(${rnd(-p, p) * 0.5}px,${rnd(-p, p) * 0.5}px)` }); k.push({ transform: 'none' });
    el.animate(k, { duration: d });
  }
  function banner(name, col, foe, sub) {
    if (!host) return;
    const d = document.createElement('div'); d.className = 'cast' + (foe ? ' foe' : ''); d.style.setProperty('--c', col);
    d.innerHTML = `<b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; host.appendChild(d);
    d.animate([{ transform: `translateX(${foe ? 60 : -60}%) skewX(-12deg)`, opacity: 0 }, { transform: 'translateX(0) skewX(-12deg)', opacity: 1, offset: 0.22 }, { transform: 'translateX(3%) skewX(-12deg)', opacity: 1, offset: 0.72 }, { transform: `translateX(${foe ? -60 : 60}%) skewX(-12deg)`, opacity: 0 }], { duration: 900 / (FX.speed || 1), easing: 'ease-out' }).onfinish = () => d.remove();
  }
  /* 각성기 컷인: 인물을 크게 다시 그린 띠 */
  function cutIn(look, name, col, foe) {
    return new Promise(res => {
      if (!host) return res();
      const d = document.createElement('div'); d.className = 'cutin' + (foe ? ' foe' : ''); d.style.setProperty('--c', col);
      const cvs = document.createElement('canvas'); const W = Math.min(host.clientWidth, 640), H = 150, dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = W * dpr; cvs.height = H * dpr; cvs.style.width = W + 'px'; cvs.style.height = H + 'px';
      d.appendChild(cvs); const t = document.createElement('div'); t.className = 'cutname'; t.textContent = name; d.appendChild(t); host.appendChild(d);
      const c = cvs.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const a = RIG.make({ kind: look.boss || !look.human && look.draw ? 'foe' : 'hero', look, x: foe ? W * 0.7 : W * 0.3, y: H + (look.boss ? 120 : 150), face: foe ? -1 : 1, sc: look.boss ? (look.sc || 1) * 1.5 : 3.6 });
      const t0 = performance.now(); let alive = true;
      const step = () => {
        if (!alive) return; const now = performance.now(), k = (now - t0) / (1100 / (FX.speed || 1));
        c.clearRect(0, 0, W, H);
        for (let i = 0; i < 14; i++) { const y = ((i * 37 + now * 0.9) % (H + 40)) - 20; c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, y, W, 2); }
        const q = RIG.pose(a, 1000); q.glow = 1; q.dx = (foe ? 1 : -1) * Math.max(0, 1 - k * 4) * -80; RIG.draw(c, a, q, now, dpr);
        if (k < 1) requestAnimationFrame(step); else { alive = false; d.remove(); res(); }
      };
      d.animate([{ clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(0 0 0 0)', offset: 0.15 }, { clipPath: 'inset(0 0 0 0)', offset: 0.85 }, { clipPath: 'inset(50% 0 50% 0)' }], { duration: 1100 / (FX.speed || 1) });
      requestAnimationFrame(step);
    });
  }
  function bigText(txt, col = '#ffd43b', d = 1300) {
    if (!host) return; const el = document.createElement('div'); el.className = 'ko'; el.style.color = col; el.textContent = txt; host.appendChild(el);
    el.animate([{ transform: 'scale(3)', opacity: 0 }, { transform: 'scale(.9)', opacity: 1, offset: 0.35 }, { transform: 'scale(1)', opacity: 1, offset: 0.8 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: d }).onfinish = () => el.remove();
  }
  function clear() { P.length = 0; }
  return { init, add, burst, ring, text, fn, fade, glow, hexPath, starPath, sigil, fly, trail, pillar, beam, emitter, cracks, spikes, crescent, flame, sparkle, engulf, shockwave, flash, darkFlash, shake, banner, cutIn, bigText, setHost, clear, rnd, chance, TAU, set shakeOn(v) { shakeOn = v; }, speed: 1, get count() { return P.length; } };
})();
