'use strict';
/* ===== 잔향선 · 로우폴리 벡터 리그 =====
 * 모든 인물은 다각형으로 그린다. 큰 면은 빛 방향(화면 왼쪽 위)을 기준으로 잘게 나눠 명암을 주고,
 * 빛을 받는 모서리에는 밝은 테두리(림 라이트)를 긋는다. 관절은 한 마디 뼈대(팔·다리·무기 각도)로 움직인다.
 * 각도 규칙: 0 = 아래, 90 = 앞, 180 = 위. 원점 = 발 사이 바닥. 앞 = +x. */

const VR = (() => {
  const DG = Math.PI / 180, LIGHT = [-0.6, -0.8];
  const HC = {};
  const hex = h => HC[h] || (HC[h] = (() => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; })());
  const rgb = (c, k = 1, add = 0, a = 1) => `rgba(${(c[0] * k + add) | 0},${(c[1] * k + add) | 0},${(c[2] * k + add) | 0},${a})`;
  const shd = (h, k = 0.76) => '#' + hex(h).map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');
  const lit = (h, k = 40) => '#' + hex(h).map(v => Math.min(255, Math.round(v + k)).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v * (1 - t) + hex(b)[i] * t).toString(16).padStart(2, '0')).join('');
  const Rr = (a, b, w, h) => [[a, b], [a + w, b], [a + w, b + h], [a, b + h]];
  const ngon = (cx, cy, r, n, rot = 0, ry) => { const o = []; for (let i = 0; i < n; i++) { const a = rot + i / n * 2 * Math.PI; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (ry == null ? r : ry)]); } return o; };
  let X = null, SC = 1, RW = 2, RIMC = null, FL = 0, TINT = null;

  function clampC(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function F(pts, col, o = {}) {
    const m = X.getTransform(), P = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) { const x = pts[i][0], y = pts[i][1]; P[i] = [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
    let c = hex(col);
    if (TINT) c = [clampC(c[0] * (1 - TINT[3]) + TINT[0] * TINT[3]), clampC(c[1] * (1 - TINT[3]) + TINT[1] * TINT[3]), clampC(c[2] * (1 - TINT[3]) + TINT[2] * TINT[3])];
    const a = o.a == null ? 1 : o.a;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    const path = () => { X.beginPath(); for (let i = 0; i < P.length; i++) i ? X.lineTo(P[i][0], P[i][1]) : X.moveTo(P[i][0], P[i][1]); X.closePath(); };
    path();
    if (o.flat) {
      X.fillStyle = rgb(c, 1, 0, a); X.fill();
      if (FL && o.a == null) { X.fillStyle = `rgba(255,255,255,${FL})`; X.fill(); }
      X.restore(); return;
    }
    let A = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; }
    A /= 2; const sg = Math.sign(A) || 1;
    const E = [];
    for (let i = 0; i < P.length; i++) {
      const p = P[i], q = P[(i + 1) % P.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      E.push({ p, q, d: (dy / l * sg) * LIGHT[0] + (-dx / l * sg) * LIGHT[1] });
    }
    X.globalAlpha = a;
    X.fillStyle = rgb(c, 0.92); X.fill(); X.clip();
    if (o.facet !== false && Math.abs(A) > 160 * SC * SC) {
      let cx = 0, cy = 0;
      for (const p of P) { cx += p[0]; cy += p[1]; }
      cx /= P.length; cy /= P.length;
      const r = Math.sqrt(Math.abs(A)) * 0.16; cx += LIGHT[0] * r; cy += LIGHT[1] * r;
      for (const e of E) {
        X.beginPath(); X.moveTo(cx, cy); X.lineTo(e.p[0], e.p[1]); X.lineTo(e.q[0], e.q[1]); X.closePath();
        X.fillStyle = X.strokeStyle = rgb(c, 0.82 + e.d * 0.18); X.lineWidth = 0.8; X.fill(); X.stroke();
      }
    }
    if (o.rim !== false) {
      X.lineWidth = RW * (o.rw || 1); X.lineCap = 'round';
      const rc = RIMC && hex(RIMC);
      for (const e of E) if (e.d > 0.3) {
        X.strokeStyle = rc ? rgb(rc) : rgb(c, 1, 70);
        X.beginPath(); X.moveTo(e.p[0], e.p[1]); X.lineTo(e.q[0], e.q[1]); X.stroke();
      }
      X.lineWidth = RW * 0.55;
      for (const e of E) if (e.d < -0.55) {
        X.strokeStyle = rgb(c, 0.55, 0, 0.8);
        X.beginPath(); X.moveTo(e.p[0], e.p[1]); X.lineTo(e.q[0], e.q[1]); X.stroke();
      }
    }
    if (FL) { path(); X.fillStyle = `rgba(255,255,255,${FL})`; X.fill(); }
    X.restore();
  }
  const W = f => { X.save(); f(); X.restore(); };
  const mv = (x, y) => X.translate(x, y);
  const rl = a => X.rotate(-a * DG);
  const sw = (t, p, a = 2) => Math.sin(t / p) * a;
  function ring(cx, cy, rx, ry, th, col, n = 12, o = { facet: false }) {
    for (let i = 0; i < n; i++) {
      const a1 = i / n * 2 * Math.PI, a2 = (i + 1) / n * 2 * Math.PI;
      F([[cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry], [cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry], [cx + Math.cos(a2) * (rx - th), cy + Math.sin(a2) * (ry - th)], [cx + Math.cos(a1) * (rx - th), cy + Math.sin(a1) * (ry - th)]], col, o);
    }
  }
  function star(x, y, s, col, n = 4) {
    const p = [];
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.32 : s; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    F(p, col, { flat: 1 });
  }
  /* 흔들리는 띠(스카프·리본·꼬리): 시작점에서 각도 a로 뻗어 나가며 물결친다 */
  function ribbon(x, y, len, w0, w1, a, t, col, seg = 5, amp = 5, sp = 220, o) {
    const L = [], R = [];
    let px = x, py = y, ang = a;
    for (let i = 0; i <= seg; i++) {
      const k = i / seg, w = w0 + (w1 - w0) * k;
      const wav = Math.sin(t / sp - k * 3) * amp * k * DG * 6;
      const an = ang + wav;
      const nx = -Math.sin(an), ny = Math.cos(an);
      L.push([px + nx * w / 2, py + ny * w / 2]); R.push([px - nx * w / 2, py - ny * w / 2]);
      px += Math.cos(an) * len / seg; py += Math.sin(an) * len / seg;
    }
    F([...L, ...R.reverse()], col, o || {});
  }

  /* ---------- 체형 ---------- */
  const BUILD = {
    normal: { leg: 20, lw: 8, tw: 24, th: 24, hw: 31, hh: 28, arm: 19, aw: 7.5 },
    heavy:  { leg: 19, lw: 10, tw: 32, th: 27, hw: 31, hh: 28, arm: 21, aw: 10 },
    slim:   { leg: 22, lw: 7, tw: 20, th: 23, hw: 29, hh: 27, arm: 19, aw: 6.5 },
  };

  /* ---------- 얼굴 ---------- */
  function face(D, S, p, t) {
    const ec = D.eye || '#343a40';
    const hurt = p.hurt, blink = !hurt && ((t + (D.seed || 0)) % 3400) < 110;
    if (D.mask) { D.mask(D, S, p, t); return; }
    if (hurt) {
      F([[-3, 1], [1, 3], [-3, 5]], '#212529', { flat: 1 }); F([[11, 1], [6, 3], [11, 5]], '#212529', { flat: 1 });
      F([[3, 9], [7, 9], [6, 12], [4, 12]], '#862e3a', { flat: 1 });
      return;
    }
    if (blink || D.eyesClosed) {
      F(Rr(-3, 3, 4, 1.4), '#212529', { flat: 1 }); F(Rr(5.5, 3, 5.5, 1.4), '#212529', { flat: 1 });
    } else {
      // 먼 눈 · 가까운 눈 (3/4 시점)
      F([[-3, 0], [1, -0.5], [1, 6], [-3, 6]], '#212529', { flat: 1 });
      F([[-2.4, 1.6], [0.6, 1.4], [0.6, 6], [-2.4, 6]], ec, { flat: 1 });
      F(Rr(-2, 1.6, 1.3, 1.3), '#ffffff', { flat: 1 });
      F([[5, -0.6], [11, -1.2], [11, 6.5], [5, 6.5]], '#212529', { flat: 1 });
      F([[5.7, 1.2], [10.4, 0.8], [10.4, 6.5], [5.7, 6.5]], ec, { flat: 1 });
      F(Rr(8.4, 4.4, 2, 2), mix(ec, '#ffffff', 0.45), { flat: 1 });
      F(Rr(6.2, 1.6, 1.8, 1.8), '#ffffff', { flat: 1 });
      if (D.brow) { F([[-3, -3], [1, -2.5], [1, -1.6], [-3, -2]], D.hair, { flat: 1 }); F([[5, -2.6], [11, -3.8], [11, -2.6], [5, -1.6]], D.hair, { flat: 1 }); }
    }
    if (D.blush !== false) { F(Rr(9, 8, 4, 1.6), '#ff8787', { flat: 1, a: 0.45 }); F(Rr(-3, 8, 3, 1.4), '#ff8787', { flat: 1, a: 0.35 }); }
    F(Rr(4.5, 10.5, 2.6, 1.1), D.mouth || '#a6474f', { flat: 1 });
  }

  /* ---------- 머리카락 ---------- */
  const BANGS = {
    std: D => F([[-16, -2], [-16, -12], [-10, -17.5], [2, -18.5], [12, -16], [17, -9], [16.5, -1], [13, -6], [10, -1], [6, -7], [2, -2], [-2, -8], [-6, -3], [-10, -8], [-13, -1]], D.hair),
    swept: D => F([[-16, -2], [-16, -13], [-8, -18.5], [4, -18.5], [14, -15], [17.5, -7], [16, 0], [12, -9], [4, -7], [10, -12], [-2, -8], [-8, -5], [-12, -8]], D.hair),
    spiky: D => F([[-16, -1], [-17, -13], [-14, -16], [-12, -24], [-7, -18], [-3, -26], [1, -18.5], [6, -25], [8, -17], [14, -20], [13, -13], [18, -9], [16, -1], [12, -7], [8, -2], [4, -8], [0, -3], [-4, -8], [-9, -3], [-12, -8]], D.hair),
    cover: D => F([[-16, -2], [-16, -12], [-10, -17.5], [2, -18.5], [12, -16], [17.5, -8], [17, 4], [14, 10], [11, 4], [6, 1], [8, -6], [2, -3], [-3, -8], [-8, -3], [-11, -8]], D.hair),
    neat: D => F([[-16, -1], [-16, -12], [-10, -17.5], [2, -18.5], [12, -16], [16.5, -10], [16.5, -3], [12, -9], [-2, -9], [-8, -7], [-12, -9], [-13, -1]], D.hair),
  };
  const HAIRBACK = {
    long: (D, S, p, t) => { const s = sw(t, 520, 2); F([[-14, -12], [-17, 6], [-16 + s, 24], [-9 + s, 31], [-2 + s, 26], [6 + s, 29], [9, 4], [10, -10]], D.hair2 || D.hair); },
    short: D => F([[-15, -12], [-16.5, 5], [-10, 10], [-4, 4], [-4, -10]], D.hair2 || D.hair),
    bob: D => { F([[-15, -12], [-17, 8], [-10, 12], [-3, 10], [-3, -10]], D.hair2 || D.hair); },
    pony: (D, S, p, t) => { const s = sw(t, 300, 4); F([[-15, -12], [-16, 2], [-8, 6], [-6, -8]], D.hair2 || D.hair); ribbon(-15, -9, 30, 9, 2, 150 * DG, t, D.hair2 || D.hair, 5, 4, 260); F(ngon(-15, -9, 3, 5), D.tie || '#e03131', { flat: 1 }); void s; },
    twin: (D, S, p, t) => {
      ribbon(-13, -12, 32, 9, 3, 128 * DG, t, D.hair2 || D.hair, 5, 5, 280); ribbon(10, -13, 30, 8, 3, 70 * DG, t + 400, shd(D.hair2 || D.hair, 0.86), 5, 5, 280);
      F([[-15, -12], [-16, 4], [-8, 6], [-6, -8]], D.hair2 || D.hair);
    },
    braid: (D, S, p, t) => { F([[-15, -12], [-16, 4], [-8, 6], [-6, -8]], D.hair2 || D.hair); for (let i = 0; i < 5; i++) { const s = sw(t + i * 90, 400, 1.2 * i); F(ngon(-13 + s - i * 0.6, 4 + i * 5, 3.6 - i * 0.3, 6), i % 2 ? shd(D.hair, 0.88) : D.hair); } F(ngon(-15.5, 28, 2.2, 5), D.tie || '#d4a24c', { flat: 1 }); },
    wavy: (D, S, p, t) => { const s = sw(t, 600, 2); F([[-14, -12], [-18, 2], [-15 + s, 12], [-19 + s, 22], [-10 + s, 26], [-4, 14], [4, 18], [9, 2], [10, -10]], D.hair2 || D.hair); },
  };

  /* ---------- 무기: 손잡이 = 원점, 날 = +y. [그리기, 끝점 길이] ---------- */
  const WPN = {
    rapier: [(D, p, t) => {
      F(Rr(-1.6, -9, 3.2, 9), '#2b0a12'); F(ngon(0, -10, 2.4, 6), '#c92a2a', { flat: 1 });
      F([[-7, -1], [7, -1], [5, 3], [-5, 3]], '#c92a2a'); ring(0, 0, 6, 4, 1.6, '#5c0f1f', 8);
      F([[-2.2, 3], [2.2, 3], [1.2, 50], [0, 56], [-1.2, 50]], p.glow > 0.3 ? '#ffc9c9' : '#ff8787');
      F([[0, 4], [1, 4], [0.4, 50], [0, 52]], '#fff5f5', { flat: 1, a: 0.7 });
    }, 55],
    censer: [(D, p, t) => {
      const s = sw(t, 380, 10) + (p.glow > 0.3 ? sw(t, 90, 6) : 0);
      W(() => {
        X.rotate(s * DG);
        for (let i = 0; i < 6; i++) F(Rr(-1.2, i * 4, 2.4, 3.2), '#868e96', { flat: 1 });
        mv(0, 26);
        F([[-6, 0], [6, 0], [9, 6], [7, 14], [-7, 14], [-9, 6]], '#495057');
        F([[-5, 3], [5, 3], [6, 9], [-6, 9]], '#ff922b', { flat: 1 });
        F(Rr(-9, 5, 18, 2), '#d4a24c', { facet: false });
        F([[-3, 14], [3, 14], [0, 18]], '#495057');
        const fl = 1 + Math.sin(t / 70) * 0.15 + (p.glow || 0) * 0.5;
        F([[-4, 2], [0, -8 * fl], [4, 2]], '#ffd43b', { flat: 1, a: 0.85 });
        F([[-2, 2], [0, -4 * fl], [2, 2]], '#fff3bf', { flat: 1 });
        if (VR.tip) { const m = X.getTransform(); VR.tip(m.c * 6 + m.e, m.d * 6 + m.f); }
      });
    }, -1],
    bellstaff: [(D, p, t) => {
      F(Rr(-1.8, -14, 3.6, 58), '#6b4226');
      F(Rr(-2.6, -2, 5.2, 4), '#d4a24c', { facet: false });
      W(() => {
        mv(0, 44); X.rotate(sw(t, 300, 6) * DG);
        F([[-3, -2], [3, -2], [3, 2], [-3, 2]], '#8a6420');
        F([[-6, 2], [6, 2], [10, 10], [12, 20], [16, 26], [-16, 26], [-12, 20], [-10, 10]], '#d4a24c');
        F([[-15, 24], [15, 24], [16, 27], [-16, 27]], '#a87d2c', { facet: false });
        F(Rr(-9, 9, 18, 2.4), '#a87d2c', { facet: false });
        F(ngon(0, 27, 13, 10, 0, 2.6), '#3b2a14', { flat: 1 });
        F(ngon(sw(t, 300, 2), 29, 3.2, 6), '#5c3d2e');
      });
    }, 72],
    saber: [(D, p, t) => {
      F(Rr(-1.6, -9, 3.2, 9), '#212529'); F(ngon(0, -10, 2.2, 6), '#fab005', { flat: 1 });
      F([[-6, -2], [6, -2], [6, 1], [3, 3], [-3, 3], [-6, 1]], '#fab005');
      F([[-2, 3], [2, 3], [5.5, 18], [6, 34], [2, 46], [2.6, 32], [0, 18]], '#e9ecef');
      F([[2, 6], [3.2, 6], [5, 30], [3, 40]], '#ffffff', { flat: 1, a: 0.6 });
    }, 46],
    mace: [(D, p, t) => {
      F(Rr(-2, -10, 4, 36), '#5c3d2e'); F(Rr(-2.6, 0, 5.2, 3), '#868e96', { facet: false });
      F(ngon(0, 32, 9, 8, Math.PI / 8), '#adb5bd');
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; F([[Math.cos(a - 0.25) * 8, 32 + Math.sin(a - 0.25) * 8], [Math.cos(a) * 14, 32 + Math.sin(a) * 14], [Math.cos(a + 0.25) * 8, 32 + Math.sin(a + 0.25) * 8]], '#dee2e6', { facet: false }); }
      F(ngon(0, 32, 3.5, 6), '#fab005', { flat: 1 });
    }, 44],
    cards: [(D, p, t) => {
      for (let i = 0; i < 4; i++) W(() => {
        X.rotate((-30 + i * 20) * DG);
        F(Rr(-4, 2, 8, 12), '#f8f9fa'); F(Rr(-3, 3, 6, 10), i % 2 ? '#e03131' : '#212529', { flat: 1, a: 0.15 });
        F(ngon(0, 8, 2, 4), i % 2 ? '#e03131' : '#212529', { flat: 1 });
      });
    }, 14],
    quill: [(D, p, t) => {
      F([[-1.2, -16], [1.2, -16], [1.6, 48], [-1.6, 48]], '#e3fafc');
      F([[-1.8, 40], [1.8, 40], [0, 58]], '#adb5bd');
      F([[-0.4, 44], [0.4, 44], [0, 54]], '#1c2a4a', { flat: 1 });
      const s = sw(t, 400, 2);
      F([[0, -16], [-9 + s, -6], [-12 + s, 8], [-8 + s, 24], [-2, 36], [0, 30]], '#e3fafc');
      F([[0, -16], [8, -4], [9, 10], [5, 22], [1, 30]], '#c5f6fa');
      F([[0, -12], [0.6, -12], [0.6, 36], [0, 36]], '#99e9f2', { flat: 1 });
    }, 58],
    cannon: [(D, p, t) => {
      F(Rr(-3, -6, 6, 10), '#6b4226');
      F([[-7, 2], [7, 2], [8, 40], [-8, 40]], '#495057');
      F(Rr(-9, 8, 18, 4), '#d4a24c', { facet: false }); F(Rr(-9, 26, 18, 4), '#d4a24c', { facet: false });
      F([[-9.5, 38], [9.5, 38], [10, 46], [-10, 46]], '#343a40');
      F(ngon(0, 46, 6, 8, 0, 2.4), '#141517', { flat: 1 });
      if (p.glow > 0.3) F(ngon(0, 46, 4.5, 8, 0, 1.8), '#ffa94d', { flat: 1 });
      F(Rr(-11, 14, 4, 8), '#343a40', { facet: false });
    }, 47],
    puppetbar: [(D, p, t) => {
      F(Rr(-1.5, -4, 3, 14), '#8b5a2b'); F(Rr(-9, 4, 18, 3), '#a0522d');
    }, 8],
    wrench: [(D, p, t) => {
      F(Rr(-2.2, -10, 4.4, 42), '#868e96'); F(Rr(-2.8, -10, 5.6, 12), '#6b4226');
      F([[-9, 30], [9, 30], [10, 40], [5, 46], [4, 38], [-4, 38], [-5, 46], [-10, 40]], '#adb5bd');
      F(ngon(0, 34, 2.6, 6), '#495057', { flat: 1 });
    }, 46],
    claw: [(D, p, t) => { for (let i = 0; i < 3; i++) F([[-4 + i * 4, 4], [-2 + i * 4, 4], [-1 + i * 4, 18], [-3 + i * 4, 15]], '#e9ecef'); }, 16],
    sword: [(D, p, t) => {
      F(Rr(-1.8, -9, 3.6, 9), D.grip || '#5c3d2e'); F(Rr(-7, -1, 14, 4), D.guard || '#868e96');
      F([[-2.8, 3], [2.8, 3], [2.8, 38], [0, 44], [-2.8, 38]], D.blade || '#dee2e6');
    }, 44],
    axe: [(D, p, t) => {
      F(Rr(-2, -10, 4, 46), '#6b4226');
      F([[-2, 22], [-18, 16], [-22, 30], [-18, 44], [-2, 38]], D.blade || '#ced4da');
    }, 40],
    spear: [(D, p, t) => {
      F(Rr(-1.6, -16, 3.2, 62), D.grip || '#6b4226');
      F([[-4, 44], [4, 44], [0, 60]], D.blade || '#dee2e6');
    }, 60],
    staff: [(D, p, t) => {
      F(Rr(-1.8, -16, 3.6, 62), D.grip || '#5c3d2e');
      F(ngon(0, 50, 6, 4, 0, 9), D.orb || '#74c0fc');
    }, 56],
    hook: [(D, p, t) => {
      F(Rr(-1.5, -6, 3, 22), '#495057');
      F([[-2, 16], [2, 16], [8, 24], [6, 32], [0, 34], [2, 29], [3, 24], [-1, 20]], '#adb5bd');
    }, 32],
    cleaver: [(D, p, t) => {
      F(Rr(-2, -8, 4, 10), '#5c3d2e'); F([[-3, 2], [12, 2], [14, 30], [-3, 26]], '#ced4da'); F(ngon(8, 8, 1.6, 6), '#495057', { flat: 1 });
    }, 30],
    lantern: [(D, p, t) => {
      F(Rr(-1, 0, 2, 8), '#495057', { flat: 1 }); F([[-5, 8], [5, 8], [6, 20], [-6, 20]], '#343a40'); F(Rr(-4, 10, 8, 8), '#ffd43b', { flat: 1 });
    }, 20],
    book: [(D, p, t) => { F([[-7, 0], [7, 0], [7, 12], [-7, 12]], D.bookC || '#5c3d2e'); F(Rr(-6, 1, 12, 2), '#f1f3f5', { facet: false }); }, 12],
    mic: [(D, p, t) => { F(Rr(-1.6, -2, 3.2, 18), '#495057'); F(ngon(0, 20, 4, 8), '#adb5bd'); }, 22],
    needle: [(D, p, t) => { F([[-1.5, -6], [1.5, -6], [1, 44], [0, 52], [-1, 44]], '#dee2e6'); F(ngon(0, -8, 2.5, 6), '#d4a24c', { flat: 1 }); }, 52],
    flag: [(D, p, t) => { F(Rr(-1.4, -20, 2.8, 60), '#495057'); ribbon(0, 34, 24, 14, 10, 0, t, D.flagC || '#e03131', 4, 3, 160); }, 40],
    shard: [(D, p, t) => F([[-3, 0], [3, 0], [5, 18], [0, 30], [-4, 16]], '#d0ebff'), 30],
  };
  /* 왼손 소품 */
  const OFF = {
    tower: () => { F([[-12, -12], [12, -12], [13, 22], [0, 30], [-13, 22]], '#495057'); F([[-10, -10], [10, -10], [11, 20], [0, 27], [-11, 20]], '#1864ab'); F(Rr(-1.6, -8, 3.2, 30), '#fab005', { facet: false }); F(Rr(-8, 0, 16, 3.2), '#fab005', { facet: false }); },
    coin: (D, p, t) => { const s = Math.abs(Math.cos(t / 180)); F(ngon(0, 6, 4.5 * Math.max(0.15, s), 8, 0, 4.5), '#fcc419'); F(ngon(0, 6, 2.4 * Math.max(0.15, s), 6, 0, 2.4), '#e67700', { flat: 1 }); },
    watch: (D, p, t) => { F(Rr(-0.6, -2, 1.2, 5), '#d4a24c', { flat: 1 }); F(ngon(0, 8, 5.5, 10), '#d4a24c'); F(ngon(0, 8, 4.2, 10), '#fff9db', { flat: 1 }); const a = t / 300; F([[0, 8], [Math.cos(a) * 3.5, 8 + Math.sin(a) * 3.5], [0.4, 8.4]], '#212529', { flat: 1 }); },
    tome: (D, p, t) => { F([[-8, 2], [8, 2], [8, 16], [-8, 16]], '#0b3d4a'); F(Rr(-7, 3, 14, 2.4), '#e3fafc', { facet: false }); F(ngon(0, 10, 2.5, 4), '#3bc9db', { flat: 1 }); },
  };

  /* ---------- 등 장식 ---------- */
  const BACK = {
    cape: (col, torn) => (D, S, p, t) => {
      const s = sw(t, 320, 2.5) - (p.lean || 0) * 0.3, b = S.leg - 4;
      const pts = [[-S.tw / 2 + 2, -S.th + 3], [S.tw / 2 - 5, -S.th + 3], [-1 + s, b]];
      if (torn) for (let i = 1; i < 5; i++) pts.push([-1 + s - i * (S.tw / 2 + 11) / 5, b - (i % 2) * 7]);
      pts.push([-S.tw / 2 - 11 + s * 1.4, b]);
      F(pts, col);
    },
    scarf: (col, len = 34) => (D, S, p, t) => { ribbon(-2, -S.th + 4, len, 7, 3, (168 - (p.lean || 0)) * DG, t, col, 6, 6, 170); },
    tails: col => (D, S, p, t) => { const s = sw(t, 300, 2) - (p.lean || 0) * 0.25; F([[-S.tw / 2 + 1, -6], [-2, -6], [-4 + s, S.leg - 3], [-10 + s, S.leg - 8], [-S.tw / 2 - 6 + s, S.leg]], col); },
    gears: (D, S, p, t) => W(() => {
      mv(-6, -S.th - 6); const r = t / 1200;
      const gear = (cx, cy, R, n, rot, col) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot + i / (n * 2) * Math.PI * 2, rr = i % 2 ? R : R * 0.78; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } F(pts, col); F(ngon(cx, cy, R * 0.32, 6), '#5c3d2e', { flat: 1 }); };
      gear(-10, -8, 13, 10, r, '#d4a24c'); gear(6, -20, 8, 8, -r * 1.6, '#b8862e'); gear(-22, 6, 7, 7, -r * 1.8, '#a87d2c');
    }),
    jelly: (D, S, p, t) => {
      for (let i = 0; i < 3; i++) ribbon(-4 - i * 2, -S.th + 6 + i * 5, 28 + i * 6, 5, 1.5, (150 + i * 12) * DG, t + i * 300, '#66d9e8', 6, 7, 260, { a: 0.55, rim: false });
      W(() => { mv(-14, -S.th - 10 + sw(t, 700, 3)); F([[-8, 4], [-7, -3], [0, -7], [7, -3], [8, 4], [4, 2], [0, 4], [-4, 2]], '#99e9f2', { a: 0.7 }); });
    },
    bells: (D, S, p, t) => W(() => {
      mv(-S.tw / 2 + 4, -S.th + 10); X.rotate(-0.4);
      F(Rr(-3, -4, 6, 18), '#5c3d2e');
      for (let i = 0; i < 2; i++) W(() => { mv(-4 + i * 6, 14); X.rotate(sw(t + i * 200, 260, 10) * DG); F([[-2, 0], [2, 0], [4, 6], [-4, 6]], '#d4a24c'); });
    }),
    pack: (D, S, p, t) => { F(Rr(-S.tw / 2 - 7, -S.th + 2, 10, 18), '#5c6b3a'); F(Rr(-S.tw / 2 - 8, -S.th + 8, 12, 3), '#3d3d2e', { facet: false }); for (let i = 0; i < 3; i++) F(Rr(-S.tw / 2 - 6 + i * 3, -S.th - 3, 2.4, 5), '#d4a24c', { facet: false }); },
    wings: (col, n = 1) => (D, S, p, t) => { const f = sw(t, 260, 3) + (p.wing || 0) * 10; for (let i = 0; i < n; i++) F([[-4, -S.th + 6 + i * 6], [-30 - i * 4, -S.th - 16 - f + i * 10], [-40 - i * 4, -S.th + 2 - f + i * 10], [-27, -S.th + 9 + i * 6], [-33, -S.th + 19 + i * 6], [-8, -S.th + 16 + i * 6]], i ? shd(col, 0.85) : col); },
  };

  /* ---------- 가슴 장식 ---------- */
  const CHEST = {
    collarV: (D, S) => { F([[-S.tw / 2 + 3, -S.th], [-1, -S.th], [1, -S.th + 9]], D.collar || '#f8f9fa', { facet: false }); F([[S.tw / 2 - 3, -S.th], [1, -S.th], [1, -S.th + 9]], shd(D.collar || '#f8f9fa', 0.9), { facet: false }); },
    priest: (D, S) => {
      F(Rr(-5, -S.th - 0.5, 10, 3.5), '#f8f9fa', { facet: false }); F(Rr(-1.2, -S.th + 3, 2.4, 2.4), '#f8f9fa', { flat: 1 });
      F([[1, -S.th + 2], [5, -S.th + 2], [6, S.leg * 0.9], [2, S.leg * 0.9]], D.trim);
      F(Rr(2.6, 6, 2, 8), '#ffd43b', { flat: 1 }); F(Rr(0.6, 8.4, 6, 2), '#ffd43b', { flat: 1 });
    },
    buttons: (D, S) => { for (let i = 0; i < 3; i++) F(ngon(3, -S.th + 6 + i * 6, 1.4, 6), D.btn || '#fab005', { flat: 1 }); },
    tie: (D, S) => { F([[-3, -S.th], [3, -S.th], [1.6, -S.th + 3], [-1.6, -S.th + 3]], D.tieC || '#e03131', { flat: 1 }); F([[-1.6, -S.th + 3], [1.6, -S.th + 3], [2.6, -S.th + 15], [0, -S.th + 18], [-2.6, -S.th + 15]], D.tieC || '#e03131', { facet: false }); },
    tabard: (D, S) => { F([[-S.tw / 2 + 5, -S.th + 4], [S.tw / 2 - 5, -S.th + 4], [S.tw / 2 - 6, 9], [0, 13], [-S.tw / 2 + 6, 9]], D.tabard); F(Rr(-1.6, -S.th + 7, 3.2, 14), '#fab005', { facet: false }); F(Rr(-5, -S.th + 11, 10, 3), '#fab005', { facet: false }); },
    apron: (D, S) => { F([[-S.tw / 2 + 4, -S.th + 7], [S.tw / 2 - 4, -S.th + 7], [S.tw / 2 - 2, 14], [-S.tw / 2 + 2, 14]], D.apron); F(Rr(-4, -S.th + 12, 8, 6), shd(D.apron, 0.85), { facet: false }); },
    strap: (D, S) => { F([[-S.tw / 2 + 1, -S.th + 1], [-S.tw / 2 + 6, -S.th + 1], [S.tw / 2 - 1, -3], [S.tw / 2 - 6, -3]], D.strapC || '#5c3d2e', { facet: false }); for (let i = 0; i < 4; i++) F(Rr(-S.tw / 2 + 4 + i * 4.6, -S.th + 3 + i * 4.7, 2.2, 3.4), '#d4a24c', { flat: 1 }); },
    lace: (D, S) => { F([[-5, -S.th], [5, -S.th], [3, -S.th + 7], [0, -S.th + 9], [-3, -S.th + 7]], '#f8f0fc', { facet: false }); F(ngon(0, -S.th + 2, 2.6, 4), D.bow || '#e64980', { flat: 1 }); F([[-6, -S.th], [-1, -S.th + 2], [-6, -S.th + 4]], D.bow || '#e64980', { flat: 1 }); F([[6, -S.th], [1, -S.th + 2], [6, -S.th + 4]], D.bow || '#e64980', { flat: 1 }); },
    highcollar: (D, S) => { F([[-S.tw / 2 + 1, -S.th - 1], [S.tw / 2 - 1, -S.th - 1], [S.tw / 2 - 2, -S.th + 4], [3, -S.th + 9], [-3, -S.th + 9], [-S.tw / 2 + 2, -S.th + 4]], D.collar || D.top2); },
    sash: (D, S) => F([[-S.tw / 2, -S.th + 2], [-S.tw / 2 + 5, -S.th + 2], [S.tw / 2, -2], [S.tw / 2 - 5, -2]], D.sashC || '#c92a2a', { facet: false }),
  };

  /* ---------- 인간형 ---------- */
  function human(D, p, t) {
    const S = BUILD[D.build || 'normal'], hipY = -S.leg + (p.crouch || 0) * 1.1;
    X.translate(p.x || 0, p.y || 0);
    const torso = f => W(() => { mv(0, hipY); X.rotate((p.lean || 0) * DG); f(); });
    const arm = (side, a, w, wpn, col, off) => torso(() => {
      mv(side * (S.tw / 2 - 1.5), -S.th + 4); rl(a);
      F([[-S.aw / 2, -3], [S.aw / 2, -3], [S.aw / 2 * 0.86, S.arm], [-S.aw / 2 * 0.86, S.arm]], col);
      if (D.cuff) F(Rr(-S.aw / 2 * 0.95, S.arm - 5, S.aw * 0.95, 3), side < 0 ? shd(D.cuff) : D.cuff, { facet: false });
      if (D.pauldron) F([[-S.aw / 2 - 3.5, -6], [S.aw / 2 + 3.5, -6], [S.aw / 2 + 4.5, 6], [-S.aw / 2 - 4.5, 6]], side < 0 ? shd(D.pauldron) : D.pauldron);
      mv(0, S.arm);
      F([[-S.aw / 2 - 0.4, -2], [S.aw / 2 + 0.4, -2], [S.aw / 2, S.aw * 0.8], [-S.aw / 2, S.aw * 0.8]], side < 0 ? shd(D.glove || D.skin, 0.88) : (D.glove || D.skin), { facet: false });
      if (off) W(() => { mv(0, S.aw / 2); rl(w || 0); off(D, p, t); });
      if (wpn) W(() => {
        mv(0, S.aw / 2); rl(w); const Wd = WPN[wpn]; Wd[0](D, p, t);
        if (side > 0 && VR.tip && Wd[1] >= 0) { const m = X.getTransform(), L = Wd[1]; VR.tip(m.c * L + m.e, m.d * L + m.f); }
      });
    });
    if (D.aura) D.aura(D, S, p, t);
    torso(() => { if (D.back) for (const b of [].concat(D.back)) b(D, S, p, t); });
    torso(() => W(() => { mv(0, -S.th - S.hh / 2 + 5); X.rotate((p.hd || 0) * DG); const hb = HAIRBACK[D.hairBack]; if (hb) hb(D, S, p, t); if (D.hatBack) D.hatBack(D, S, p, t); }));
    arm(-1, p.aL, p.wL, D.wL, shd(D.sleeve || D.top), OFF[D.off]);
    for (const [side, a] of [[-1, p.lL], [1, p.lR]]) W(() => {
      mv(side * S.tw * 0.2, hipY); rl(a);
      const L = S.leg - (p.crouch || 0) * 0.5;
      F([[-S.lw / 2, -2], [S.lw / 2, -2], [S.lw / 2 * 0.9, L - 5], [-S.lw / 2 * 0.9, L - 5]], side < 0 ? shd(D.pants) : D.pants);
      F([[-S.lw / 2 - 0.8, L - 8], [S.lw / 2 + 0.4, L - 8], [S.lw / 2 + 4.5, L - 3], [S.lw / 2 + 4.5, L], [-S.lw / 2 - 0.8, L]], side < 0 ? shd(D.boot) : D.boot, { facet: false });
      if (D.bootTrim) F(Rr(-S.lw / 2 - 0.8, L - 8, S.lw + 1.2, 2), D.bootTrim, { flat: 1 });
    });
    torso(() => {
      if (D.robe) F([[-S.tw * 0.46, -6], [S.tw * 0.46, -6], [S.tw * 0.66, S.leg * D.robe - (p.crouch || 0) * 0.6], [-S.tw * 0.62, S.leg * D.robe - (p.crouch || 0) * 0.6]], D.robeC || D.top);
      if (D.coat) { const s = sw(t, 320, 1.5); F([[-S.tw / 2 * 0.9, -4], [S.tw / 2 * 0.9, -4], [S.tw * 0.58 + s, S.leg * D.coat], [3, S.leg * D.coat - 4], [-S.tw * 0.6 + s, S.leg * D.coat + 1]], D.coatC || D.top); }
      if (D.skirt) F([[-S.tw / 2 * 0.86, -3], [S.tw / 2 * 0.86, -3], [S.tw * 0.62, 8], [-S.tw * 0.62, 8]], D.skirt);
      F([[-S.tw / 2 * 0.86, 2], [S.tw / 2 * 0.86, 2], [S.tw / 2, -S.th], [-S.tw / 2, -S.th]], D.top);
      if (D.belt) F(Rr(-S.tw / 2 * 0.9, -6, S.tw * 0.9, 4), D.belt, { facet: false });
      if (D.chest) for (const c of [].concat(D.chest)) CHEST[c](D, S);
      F(Rr(-3.5, -S.th - 3, 7, 4), shd(D.skin, 0.85), { flat: 1 });
      W(() => {
        mv(0, -S.th - S.hh / 2 + 5); X.rotate((p.hd || 0) * DG);
        const hw = S.hw, hh = S.hh;
        F([[-hw / 2, -hh / 2 + 4], [-hw / 2 + 4, -hh / 2], [hw / 2 - 4, -hh / 2], [hw / 2, -hh / 2 + 4], [hw / 2, hh / 2 - 7], [hw / 2 - 5, hh / 2], [-hw / 2 + 6, hh / 2], [-hw / 2, hh / 2 - 6]], D.skin);
        face(D, S, p, t);
        if (D.ear !== false) F([[-hw / 2 + 2, -1], [-hw / 2 - 2, 1], [-hw / 2 - 1, 7], [-hw / 2 + 3, 6]], shd(D.skin, 0.9), { facet: false });
        const bg = BANGS[D.bangs || 'std']; if (bg && !D.noHair) bg(D);
        if (D.streak) F([[11, -15.5], [14, -13], [16, -4], [15, 6], [13, 1], [12, -6]], D.streak);
        if (D.hat) D.hat(D, S, p, t);
      });
    });
    arm(1, p.aR, p.wR, D.wR, D.sleeve || D.top);
    if (D.front) D.front(D, S, p, t);
  }

  /* ---------- 모자·머리 장식 ---------- */
  const HAT = {
    hood: col => (D, S, p, t) => { F([[-17, 2], [-18, -12], [-11, -20], [8, -20], [16, -13], [17, -4], [11, -12], [-6, -13], [-12, -4]], col); },
    fedora: (D, S, p, t) => { F([[-21, -11], [20, -13], [17, -9], [-18, -7]], '#2b2d31'); F([[-13, -11], [12, -12], [10, -24], [-11, -24]], '#343a40'); F(Rr(-13, -15, 25, 3), '#e03131', { facet: false }); F([[7, -20], [12, -21], [12, -14], [7, -14]], '#f8f9fa', { facet: false }); F(ngon(9.6, -17.6, 1.4, 4), '#e03131', { flat: 1 }); },
    tophat: (D, S, p, t) => { F([[-18, -12], [18, -13], [16, -9], [-16, -8]], '#343a40'); F([[-11, -12], [11, -13], [12, -34], [-12, -34]], '#2b2d31'); F(Rr(-11.5, -17, 23, 3.4), '#8b5a2b', { facet: false }); const a = t / 900; F(ngon(8, -22, 5, 8, a), '#d4a24c'); F(ngon(8, -22, 2, 6), '#5c3d2e', { flat: 1 }); ring(-4, -14, 4.2, 4.2, 1.6, '#495057', 8); F(ngon(-4, -14, 2.6, 8), '#ffd43b', { flat: 1, a: 0.8 }); },
    goggles: (D, S, p, t) => { F(Rr(-16, -15, 33, 4), '#343a40', { facet: false }); for (const x of [-2, 9]) { ring(x, -13, 4.6, 4.6, 2, '#495057', 8); F(ngon(x, -13, 3, 8), '#ffd43b', { flat: 1 }); } },
    greathelm: (D, S, p, t) => {
      const sx = sw(t, 300, 2);
      ribbon(-2, -19, 22, 6, 2, (195) * DG, t, D.plume || '#1864ab', 5, 6, 220);
      F([[-17, -15], [-11, -21], [11, -21], [17, -15], [17, 13], [-17, 13]], '#adb5bd');
      F(Rr(-1, -21, 3, 34), '#dee2e6', { facet: false });
      F(Rr(2, -3, 15, 3), '#141517', { flat: 1 }); F(Rr(5, -2.6, 10, 2), D.visor || '#74c0fc', { flat: 1, a: 0.6 + Math.sin(t / 300) * 0.3 });
      for (let i = 0; i < 3; i++) F(Rr(6 + i * 3.4, 4, 1.6, 5), '#495057', { flat: 1 });
      F(Rr(-17, -9, 34, 2.4), '#fab005', { facet: false }); void sx;
    },
    tiara: (D, S, p, t) => { F([[-10, -16], [-6, -22], [-2, -17], [2, -24], [6, -17], [10, -22], [12, -15]], D.metal || '#fcc419', { facet: false }); },
    bow: (D, S, p, t) => { W(() => { mv(-8, -18); X.rotate(-0.3); F([[0, 0], [-9, -6], [-9, 5]], D.bowC || '#e64980'); F([[0, 0], [9, -6], [9, 5]], shd(D.bowC || '#e64980', 0.86)); F(ngon(0, 0, 2.4, 5), lit(D.bowC || '#e64980', 30), { flat: 1 }); }); },
    horns: col => () => { F([[-10, -15], [-14, -27], [-20, -32], [-13, -22], [-11, -14]], col); F([[7, -16], [10, -29], [18, -34], [12, -22], [10, -14]], col); },
  };

  return {
    DG, F, W, mv, rl, sw, Rr, ngon, ring, star, ribbon, shd, lit, mix, hex, human, BUILD, BANGS, HAIRBACK, WPN, OFF, BACK, CHEST, HAT,
    use(c, s) { X = c; SC = s; RW = Math.max(1.2, 2.4 * s); },
    rim(c) { RIMC = c; }, flash(v) { FL = v; }, tint(c, a) { TINT = c ? [...hex(c), a] : null; },
    get X() { return X; }, tip: null,
  };
})();

/* ===== 직업별 외형 ===== */
const HERO_LOOK = (() => {
  const { BACK, HAT, F, ngon, Rr, ribbon, sw, W, mv } = VR;
  return {
    hemoblade: {
      build: 'slim', skin: '#f8e1d6', hair: '#eef0f3', hair2: '#d9dde3', streak: '#e03131', eye: '#e03131', hairBack: 'long', bangs: 'swept',
      top: '#5c0f1f', sleeve: '#4a0c19', coat: 0.95, coatC: '#4a0c19', pants: '#1a1b1e', boot: '#2b0a12', bootTrim: '#c92a2a', glove: '#1a1b1e', belt: '#c92a2a', cuff: '#a61e3a',
      chest: ['highcollar', 'buttons'], collar: '#2b0a12', btn: '#ff8787', wR: 'rapier', back: [BACK.scarf('#a61e3a', 38)],
      hold: { aR: 40, wR: 115, aL: -12, lL: -8, lR: 10, lean: 4 }, idle: 'sway', el: '#ff6b6b', brow: 1,
    },
    ember: {
      build: 'normal', skin: '#ebbd9c', hair: '#5c5f66', hair2: '#45484e', eye: '#ff922b', hairBack: 'short', bangs: 'spiky',
      top: '#212529', sleeve: '#1a1b1e', robe: 1.02, robeC: '#25282c', trim: '#e8590c', pants: '#1a1b1e', boot: '#3b2f2a', belt: '#e8590c', cuff: '#e8590c',
      chest: ['priest'], wR: 'censer', back: [BACK.cape('#2b2d31', true)],
      hold: { aR: 62, wR: 5, aL: 20, lL: -6, lR: 8 }, idle: 'breath', el: '#ff922b',
      hat: (D, S, p, t) => { if (p.glow > 0.3) for (let i = 0; i < 3; i++) F([[-12 + i * 9, -18], [-9 + i * 9, -26 - Math.sin(t / 90 + i) * 3], [-6 + i * 9, -18]], '#ff922b', { flat: 1, a: 0.8 }); },
    },
    bell: {
      build: 'normal', skin: '#ffdcc4', hair: '#7a4b2a', eye: '#4dabf7', hairBack: 'braid', bangs: 'std', tie: '#d4a24c',
      top: '#2b4a6b', sleeve: '#23405e', pants: '#3b2f2a', boot: '#5c3d2e', belt: '#d4a24c', glove: '#e9d8b4', skirt: '#1c3d5a',
      chest: ['strap'], strapC: '#5c3d2e', wR: 'bellstaff', back: [BACK.cape('#1c3d5a'), BACK.bells],
      hatBack: (D, S, p, t) => { F([[-16, 4], [-19, 14], [-8, 16]], '#1c3d5a'); },
      hold: { aR: 28, wR: 150, aL: -8, lL: -8, lR: 9 }, idle: 'breath', el: '#ffd43b',
    },
    duelist: {
      build: 'slim', skin: '#ffdcc4', hair: '#1f2024', eye: '#fcc419', hairBack: 'pony', bangs: 'neat', tie: '#fab005',
      top: '#f1f3f5', sleeve: '#e9ecef', coat: 0.7, coatC: '#e9ecef', pants: '#343a40', boot: '#1a1b1e', bootTrim: '#fab005', glove: '#f8f9fa', belt: '#fab005', cuff: '#fab005',
      chest: ['buttons', 'sash'], btn: '#fab005', sashC: '#c92a2a', wR: 'saber', back: [BACK.cape('#c92a2a')],
      hold: { aR: 70, wR: 70, aL: -40, lL: -14, lR: 16, lean: 6 }, idle: 'bounce', el: '#e9ecef', brow: 1,
    },
    bulwark: {
      build: 'heavy', skin: '#e2ac84', hair: '#6b4226', eye: '#212529', noHair: 1, ear: false,
      top: '#adb5bd', sleeve: '#868e96', pants: '#868e96', boot: '#495057', belt: '#5c3d2e', pauldron: '#dee2e6', glove: '#868e96',
      chest: ['tabard'], tabard: '#1864ab', wR: 'mace', off: 'tower', back: [BACK.cape('#1864ab')], hat: HAT.greathelm, mask: () => {}, blush: false,
      hold: { aR: 22, wR: 110, aL: 55, wL: 0, lL: -10, lR: 10 }, idle: 'heavy', el: '#74c0fc',
    },
    gambler: {
      build: 'slim', skin: '#f3cfae', hair: '#f7c948', eye: '#40c057', hairBack: 'short', bangs: 'swept',
      top: '#212529', sleeve: '#f8f9fa', pants: '#343a40', boot: '#1a1b1e', belt: '#495057', cuff: '#e03131',
      chest: ['collarV', 'tie'], tieC: '#e03131', wR: 'cards', off: 'coin', hat: HAT.fedora, back: [BACK.tails('#2b2d31')],
      hold: { aR: 75, wR: 60, aL: 45, wL: 0, lL: -6, lR: 12, lean: -2 }, idle: 'sway', el: '#ffd43b', brow: 1,
    },
    poet: {
      build: 'normal', skin: '#dfe7ff', hair: '#1f3558', hair2: '#182a47', eye: '#63e6be', hairBack: 'wavy', bangs: 'cover',
      top: '#0b3d4a', sleeve: '#0a3440', coat: 1.0, coatC: '#0a3440', pants: '#14213d', boot: '#0b1a2e', belt: '#22b8cf', cuff: '#22b8cf',
      chest: ['highcollar'], collar: '#0b5563', wR: 'quill', off: 'tome', back: [BACK.jelly],
      hold: { aR: 30, wR: 160, aL: 40, wL: 10, lL: -6, lR: 8 }, idle: 'float', el: '#3bc9db',
    },
    gunner: {
      build: 'heavy', skin: '#cf9a72', hair: '#e8590c', eye: '#fd7e14', hairBack: 'short', bangs: 'spiky',
      top: '#5c6b3a', sleeve: '#4f5c31', coat: 0.55, coatC: '#4f5c31', pants: '#3d3d2e', boot: '#2b2b20', belt: '#3d3d2e', glove: '#3d3d2e', cuff: '#d4a24c',
      chest: ['strap', 'buttons'], strapC: '#3d3d2e', btn: '#d4a24c', wR: 'cannon', hat: HAT.goggles, back: [BACK.pack],
      hold: { aR: 70, wR: 20, aL: 60, lL: -14, lR: 14, lean: -4 }, idle: 'heavy', el: '#ffa94d', brow: 1,
    },
    puppeteer: {
      build: 'slim', skin: '#fff0f6', hair: '#e5a0f2', hair2: '#d185e6', eye: '#cc5de8', hairBack: 'twin', bangs: 'std',
      top: '#2b1a3a', sleeve: '#24152f', skirt: '#2b1a3a', pants: '#1a1b1e', boot: '#2b1a3a', bootTrim: '#e64980', glove: '#f8f0fc', belt: '#e64980', cuff: '#f8f0fc',
      chest: ['lace'], bow: '#e64980', wR: 'puppetbar', hat: HAT.bow, bowC: '#e64980',
      hold: { aR: 95, wR: 0, aL: 70, lL: -6, lR: 6 }, idle: 'float', el: '#e599f7',
      front: (D, S, p, t) => {
        // 꼭두각시 인형 (손끝 실에 매달려 앞에 떠 있다)
        const px = 30 + (p.pupX || 0), py = -30 + sw(t, 420, 4) + (p.pupY || 0);
        VR.X.save(); VR.X.globalAlpha *= 0.5;
        F([[16, -45], [16.6, -45], [px + 0.4, py - 18], [px, py - 18]], '#f8f0fc', { flat: 1 });
        F([[22, -40], [22.6, -40], [px + 4.4, py - 10], [px + 4, py - 10]], '#f8f0fc', { flat: 1 });
        VR.X.restore();
        W(() => {
          mv(px, py); X2().rotate(sw(t, 500, 6) * VR.DG + (p.pupR || 0) * VR.DG);
          F([[-5, -2], [5, -2], [6, 10], [-6, 10]], '#e64980');
          F([[-6, 10], [6, 10], [9, 16], [-9, 16]], '#2b1a3a');
          F(Rr(-4, 16, 2.6, 6), '#f8f0fc'); F(Rr(1.4, 16, 2.6, 6), '#f8f0fc');
          F([[-7, -13], [7, -13], [7, -3], [-7, -3]], '#fff0f6');
          F([[-8, -13], [-6, -17], [6, -17], [8, -13], [8, -8], [5, -12], [-5, -12], [-8, -8]], '#2b2d31');
          F(ngon(-2, -8, 1.4, 6), '#212529', { flat: 1 }); F(ngon(3, -8, 1.4, 6), '#212529', { flat: 1 });
          F(Rr(-1, -5, 3, 0.9), '#e64980', { flat: 1 });
          F([[-5, 0], [-9, 6], [-7, 7]], '#fff0f6'); F([[5, 0], [9, 6], [7, 7]], '#fff0f6');
        });
      },
    },
    clock: {
      build: 'normal', skin: '#ffdcc4', hair: '#9aa0a8', eye: '#ffd43b', hairBack: 'short', bangs: 'spiky',
      top: '#6b4226', sleeve: '#f1f3f5', pants: '#495057', boot: '#3b2d20', belt: '#3b2d20', glove: '#8b5a2b', cuff: '#d4a24c',
      chest: ['apron', 'buttons'], apron: '#8b5a2b', btn: '#d4a24c', wR: 'wrench', off: 'watch', hat: HAT.tophat, back: [BACK.gears],
      hold: { aR: 35, wR: 140, aL: 40, wL: 0, lL: -8, lR: 9 }, idle: 'breath', el: '#ffd43b',
    },
  };
  function X2() { return VR.X; }
})();

/* ===== 동작 (키프레임 · 대기 호흡) ===== */
const IDLE = {
  breath: t => ({ y: Math.sin(t / 420) * 1, aR: Math.sin(t / 420 + 1) * 2, aL: Math.sin(t / 420 + 2) * 2 }),
  heavy: t => ({ y: Math.sin(t / 560) * 1.4, lean: Math.sin(t / 560) * 1.2, aR: Math.sin(t / 560 + 1) * 2 }),
  bounce: t => ({ y: -Math.abs(Math.sin(t / 260)) * 2.4, aR: Math.sin(t / 260) * 3 }),
  float: t => ({ y: -5 + Math.sin(t / 500) * 3, lL: -6, lR: 4, aL: Math.sin(t / 500) * 4 }),
  sway: t => ({ y: Math.sin(t / 380) * 1, lean: Math.sin(t / 760) * 2, aR: Math.sin(t / 380) * 3 }),
  none: () => ({}),
};
const POSE_KEYS = ['dx', 'dy', 'rot', 'lean', 'crouch', 'hd', 'aR', 'wR', 'aL', 'wL', 'lL', 'lR', 'glow', 'alpha', 'sx', 'sy', 'open', 'wing', 'arm', 'arm2', 'pupX', 'pupY', 'pupR', 'jaw', 'tail'];
function zeroPose() { const p = {}; for (const k of POSE_KEYS) p[k] = 0; p.alpha = 1; p.sx = 1; p.sy = 1; return p; }

const RIG = {
  actors: [],
  make(o) {
    const a = Object.assign({ x: 0, y: 0, face: 1, sc: 1, hold: null, anim: null, flashT: 0, hurtT: 0, t0: 0, box: { w: 50, h: 90 } }, o);
    a.cur = this.base(a); return a;
  },
  base(a) {
    const p = zeroPose();
    const h = (a.look && a.look.hold) || {};
    for (const k in h) if (k in p) p[k] = h[k];
    if (a.hold) for (const k in a.hold) p[k] = a.hold[k];
    return p;
  },
  /* 동작 재생: frames = [[ms, {값}], ...]. 시작점은 현재 자세. hitAt(ms)에 약속이 풀린다 */
  play(a, name, o = {}) {
    if (!a) return Promise.resolve();
    const set = (a.look && a.look.anims) || {};
    const fn = set[name] || (a.kind === 'hero' ? HERO_ANIM[name] : null) || FOE_ANIM[name] || HERO_ANIM[name];
    if (!fn) return Promise.resolve();
    const spec = fn(a, o) || { frames: [] };
    if (spec.hold !== undefined) a.hold = spec.hold;
    return new Promise(res => {
      if (a.anim && a.anim.res) a.anim.res();
      a.anim = { from: Object.assign({}, a.cur), frames: spec.frames, t0: RIG.now(), res, hitAt: spec.hitAt, done: false };
      if (spec.hitAt != null) setTimeout(() => res(), spec.hitAt / RIG.speed);
      if (!spec.frames.length) res();
    });
  },
  speed: 1,
  _vt: 0, _lp: null,
  now() { const t = typeof performance !== 'undefined' ? performance.now() : Date.now(); if (this._lp == null) { this._lp = t; this._vt = t; } this._vt += (t - this._lp) * this.speed; this._lp = t; return this._vt; },
  pose(a, now) {
    const base = this.base(a);
    let p = base;
    if (a.anim) {
      const an = a.anim, t = now - an.t0, fr = an.frames;
      const pts = [[0, an.from]];
      for (const [ms, q] of fr) pts.push([ms, Object.assign({}, base, q)]);
      const end = pts[pts.length - 1][0];
      if (t >= end) { p = Object.assign({}, base); a.anim = null; an.res(); }
      else {
        let i = 0; while (i < pts.length - 1 && pts[i + 1][0] < t) i++;
        const [t0, A] = pts[i], [t1, B] = pts[i + 1];
        const k = easeIO(clamp((t - t0) / Math.max(1, t1 - t0), 0, 1));
        p = {}; for (const key of POSE_KEYS) { const va = A[key] == null ? base[key] : A[key], vb = B[key] == null ? base[key] : B[key]; p[key] = va + (vb - va) * k; }
      }
    }
    a.cur = p;
    const q = Object.assign({}, p);
    const T = now - a.t0;
    if (q.alpha > 0.4 && !(a.hold && a.hold.rot) && !a.dead) {
      const id = (IDLE[(a.look && a.look.idle) || 'breath'] || IDLE.breath)(T);
      for (const k in id) { if (k === 'y') q.dy += id.y; else q[k] = (q[k] || 0) + id[k]; }
    }
    return q;
  },
  /* 한 인물을 그린다 (c: 캔버스, dpr) */
  draw(c, a, q, now, dpr) {
    const op = clamp(q.alpha, 0, 1);
    if (op <= 0.02) return;
    c.save(); c.globalAlpha = op;
    c.translate(a.x + q.dx * a.face, a.y + q.dy);
    if (q.rot) c.rotate(q.rot * VR.DG * a.face);
    c.scale(a.face * a.sc * q.sx, a.sc * q.sy);
    VR.use(c, a.sc * dpr);
    VR.flash(a.flashT > now ? 0.75 : 0);
    VR.rim(q.glow > 0.5 ? (a.rimC || (a.look && a.look.el) || '#ffffff') : null);
    VR.tint(a.tintC || null, a.tintA || 0);
    VR.tip = (x, y) => { a.tip = [x / dpr, y / dpr]; };
    const hp = Object.assign({}, q, { x: 0, y: 0, hurt: a.hurtT > now });
    if (a.kind === 'hero' || a.look.human) VR.human(a.look, hp, now - a.t0);
    else if (a.look.draw) a.look.draw(hp, now - a.t0, a);
    VR.rim(null); VR.flash(0); VR.tint(null); VR.tip = null;
    c.restore();
  },
};

/* 영웅 공통 동작. 값은 기본 자세 위에 덮어쓴다 */
const HERO_ANIM = {
  dashIn: (a, o) => {
    const D = o.dist || 120, Dy = o.dy || 0;
    return { hold: { dx: D, dy: Dy, lean: 14, crouch: 4 }, frames: [[90, { dx: -8, crouch: 9, lean: -8 }], [260, { dx: D, dy: Dy, crouch: 3, lean: 22, lL: -45, lR: 45 }], [320, {}]], hitAt: 250 };
  },
  dashOut: () => ({ hold: null, frames: [[90, { lean: -6 }], [330, { lean: -6, crouch: 5, lL: 30, lR: -30 }], [420, {}]], hitAt: 330 }),
  jumpIn: (a, o) => { const D = o.dist || 120; return { hold: { dx: D, lean: 10, crouch: 3 }, frames: [[120, { crouch: 10 }], [300, { dx: D * 0.6, dy: -60, lean: -10, crouch: -4, lL: -30, lR: 20 }], [420, { dx: D, dy: 0, crouch: 10 }], [500, {}]], hitAt: 420 }; },
  slashA: () => ({ frames: [[80, { aR: 200, wR: 30, lean: -10, crouch: 2 }], [160, { aR: 50, wR: 40, lean: 24, crouch: 9, lL: -30, lR: 34 }], [320, {}]], hitAt: 150 }),
  slashB: () => ({ frames: [[70, { aR: 20, wR: 20, lean: 16, crouch: 10 }], [150, { aR: 190, wR: 10, lean: -10, crouch: 0 }], [300, {}]], hitAt: 140 }),
  thrust: () => ({ frames: [[90, { aR: 40, wR: 60, lean: -8, crouch: 6, dx: -6 }], [150, { aR: 90, wR: 0, lean: 26, crouch: 8, lL: -36, lR: 44, dx: 14 }], [320, {}]], hitAt: 140 }),
  smash: () => ({ frames: [[140, { aR: 205, wR: 10, aL: 190, lean: -14, crouch: -3, dy: -6 }], [230, { aR: 60, wR: 30, aL: 60, lean: 30, crouch: 14, lL: -40, lR: 40 }], [420, { aR: 60, wR: 30, lean: 26, crouch: 12 }], [560, {}]], hitAt: 220 }),
  spin: () => ({ frames: [[100, { aR: 90, wR: 0, crouch: 6, rot: -180 }], [200, { aR: 90, wR: 0, crouch: 4, rot: -360 }], [320, { rot: -360 }]], hitAt: 180 }),
  cast: () => ({ frames: [[140, { aR: 165, wR: 10, lean: -10, glow: 1 }], [300, { aR: 165, wR: 10, lean: -10, glow: 1 }], [380, { aR: 100, wR: 0, lean: 16, glow: 0.8, crouch: 7 }], [620, {}]], hitAt: 330 }),
  shoot: () => ({ frames: [[120, { aR: 90, wR: 0, aL: 80, lean: -2, glow: 1 }], [160, { aR: 100, wR: 0, aL: 90, lean: -14, dx: -10, glow: 1 }], [420, {}]], hitAt: 130 }),
  throw: () => ({ frames: [[100, { aR: 200, wR: 20, lean: -10 }], [170, { aR: 70, wR: 0, lean: 18, crouch: 5 }], [320, {}]], hitAt: 160 }),
  buff: () => ({ frames: [[150, { aR: 172, wR: 0, aL: 172, glow: 1, crouch: -2, lean: -4, hd: -10 }], [520, { aR: 172, wR: 0, aL: 172, glow: 1, crouch: -2, lean: -4, hd: -10 }], [720, {}]], hitAt: 300 }),
  guard: () => ({ frames: [[70, { aR: 130, wR: 90, aL: 120, crouch: 9, lean: -10, dx: -6 }], [340, { aR: 130, wR: 90, aL: 120, crouch: 9, lean: -10, dx: -4 }], [520, {}]], hitAt: 70 }),
  parry: () => ({ frames: [[60, { aR: 150, wR: 60, lean: -14, dx: -4, glow: 1 }], [140, { aR: 40, wR: 80, lean: 18, crouch: 6, glow: 1 }], [320, {}]], hitAt: 60 }),
  hit: a => ({ frames: [[60, { lean: (a.cur.lean || 0) - 18, dx: (a.cur.dx || 0) - 12, hd: -16, sx: 1.05, sy: 0.95 }], [300, {}]] }),
  bigHit: a => ({ frames: [[70, { lean: -30, dx: (a.cur.dx || 0) - 26, dy: -10, hd: -22, crouch: 4 }], [240, { lean: -10, dx: (a.cur.dx || 0) - 30, crouch: 10 }], [520, {}]] }),
  stagger: () => ({ hold: { crouch: 16, lean: 26, hd: 22, aR: 10, aL: 5, lL: -50, lR: 40, wR: 30 }, frames: [[300, {}]] }),
  recover: () => ({ hold: null, frames: [[300, { dy: -6, glow: 1 }], [500, {}]] }),
  die: () => ({ hold: { rot: -88, lean: 0, crouch: 0, alpha: 0.9, aR: 160, aL: 170, hd: 10, dy: 4 }, frames: [[220, { lean: -30, dx: -10, crouch: 14, hd: -20 }], [700, {}]] }),
  victory: () => ({ frames: [[200, { aR: 175, wR: 0, crouch: -4, dy: -10, glow: 1 }], [900, { aR: 175, wR: 0, crouch: -4, dy: -10, glow: 1 }], [1100, {}]] }),
  focus: () => ({ frames: [[260, { crouch: 12, aR: 30, wR: 160, aL: 30, glow: 1, hd: 10, lL: -40, lR: 40 }], [800, { crouch: 12, aR: 30, wR: 160, aL: 30, glow: 1, hd: 10, lL: -40, lR: 40 }], [1000, {}]], hitAt: 600 }),
  charge: () => ({ frames: [[200, { crouch: 10, aR: 60, aL: 60, lean: 10, glow: 1 }], [700, { crouch: 12, aR: 60, aL: 60, lean: 12, glow: 1 }]], hitAt: 600 }),
  release: () => ({ frames: [[120, { aR: 190, wR: 0, aL: 180, lean: -18, dy: -12, glow: 1 }], [420, { aR: 190, wR: 0, aL: 180, lean: -18, dy: -12, glow: 1 }], [640, {}]], hitAt: 200 }),
  enter: a => { a.cur = Object.assign({}, a.cur, { dx: -140, alpha: 0 }); return { frames: [[300, { dx: 0, alpha: 1, lean: 16, crouch: 6 }], [520, {}]] }; },
  item: () => ({ frames: [[150, { aL: 150, wL: 0, hd: -14 }], [500, { aL: 150, hd: -14, glow: 1 }], [700, {}]], hitAt: 400 }),
};
const FOE_ANIM = {
  enter: a => { a.cur = Object.assign({}, a.cur, { dy: -200, alpha: 0, sy: 1.2, sx: 0.85 }); return { frames: [[360, { dy: 10, alpha: 1, sy: 0.8, sx: 1.2 }], [560, {}]] }; },
  bcast: () => ({ frames: [[240, { lean: -12, open: 1, glow: 1, dy: -6, wing: 1, arm: 1, sy: 1.06, sx: 0.96 }], [520, { lean: -12, open: 1, glow: 1, dy: -6, wing: 1, arm: 1 }], [720, {}]], hitAt: 420 }),
  battack: (a, o) => {
    const d = o.dist || 120, hold = Math.min(700, (o.hits || 1) * 110);
    return { frames: [[200, { lean: -14, open: 0.4, crouch: 8, arm: -0.6, sy: 1.05, sx: 0.95, wing: 1 }], [360, { dx: d, lean: 24, open: 1, arm: 1, sx: 1.08, sy: 0.94 }], [360 + hold, { dx: d, lean: 18, open: 0.8, arm: 0.8 }], [640 + hold, {}]], hitAt: 330 };
  },
  bslam: (a, o) => { const d = o.dist || 80; return { frames: [[260, { dy: -40, lean: -10, arm: -1, sy: 1.1, sx: 0.92, open: 0.5 }], [380, { dx: d, dy: 0, lean: 20, arm: 1, sy: 0.82, sx: 1.18, open: 1 }], [700, { dx: d }], [950, {}]], hitAt: 370 }; },
  bhit: a => ({ frames: [[70, { dx: (a.cur.dx || 0) - 14, lean: (a.cur.lean || 0) - 12, sx: 1.06, sy: 0.94 }], [300, {}]] }),
  bstagger: () => ({ hold: { lean: 18, crouch: 14, dy: 6, arm: -0.8, open: 0.3 }, frames: [[320, {}]] }),
  brecover: () => ({ hold: null, frames: [[400, { dy: -8, glow: 1 }], [600, {}]] }),
  bdie: () => ({ hold: { sy: 0.05, sx: 1.6, alpha: 0, dy: 10 }, frames: [[280, { lean: -24, sy: 1.12, sx: 0.92, open: 1 }], [900, {}]] }),
  bcharge: () => ({ frames: [[300, { crouch: 10, glow: 1, open: 0.6, arm: -0.5, sy: 0.94, sx: 1.06 }], [700, { crouch: 12, glow: 1, open: 0.7, arm: -0.6 }]], hitAt: 500 }),
  broar: () => ({ frames: [[160, { lean: -16, open: 1, dy: -8, arm: 1, wing: 1, glow: 1, sy: 1.08 }], [700, { lean: -16, open: 1, dy: -8, arm: 1, wing: 1, glow: 1 }], [900, {}]], hitAt: 300 }),
  bphase: () => ({ frames: [[200, { sy: 0.85, sx: 1.12, glow: 1 }], [500, { sy: 1.15, sx: 0.9, dy: -14, glow: 1, open: 1, wing: 1 }], [900, {}]], hitAt: 600 }),
};
