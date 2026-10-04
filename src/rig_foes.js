'use strict';
/* ===== 잔향선 · 적 외형 (로우폴리) =====
 * human:1 → 인간형 리그(VR.human)로 그린다. draw(p, t, a) → 직접 그린다. 원점 = 바닥, 앞 = +x.
 * sc = 기본 배율, box = [폭, 높이] (이펙트 중심 계산용, 단위는 리그 좌표) */
const FOE_LOOK = (() => {
  const { F, W, mv, rl, sw, Rr, ngon, ring, ribbon, shd, lit, star, BACK, HAT, DG } = VR;
  const X = () => VR.X;
  const HF = o => Object.assign({
    human: 1, build: 'normal', skin: '#d9c7b5', hair: '#3b3a40', eye: '#ff6b6b', blush: false, hairBack: 'short', bangs: 'std',
    top: '#495057', pants: '#343a40', boot: '#212529', hold: { aR: 20, wR: 120, aL: -10, lL: -8, lR: 8 }, idle: 'breath', el: '#ff6b6b', sc: 1.35, box: [34, 78],
  }, o);
  const MASK = {
    smile: (c = '#f8f9fa', l = '#212529') => () => {
      F([[-5, -9], [14, -10], [16, 2], [12, 12], [0, 13], [-5, 6]], c);
      F([[-2, 1], [2, -1], [3, 1], [-1, 3]], l, { flat: 1 }); F([[6, -0.5], [11, -1.5], [12, 0.5], [7, 2]], l, { flat: 1 });
      F([[-1, 7], [3, 9.6], [9, 9.6], [12, 6], [11, 8.6], [8, 11], [3, 11], [0, 9]], l, { flat: 1 });
    },
    blank: () => () => { F(Rr(-4, 2, 15, 1), '#000000', { flat: 1, a: 0.08 }); },
    sack: (c = '#a68a64') => () => { F([[-15, -14], [15, -14], [16, 13], [-15, 13]], c); F(ngon(-1, 2, 2.6, 6), '#141517', { flat: 1 }); F(ngon(8, 1, 3, 6), '#141517', { flat: 1 }); F(ngon(8, 1, 1.2, 4), '#ff6b6b', { flat: 1 }); for (let i = 0; i < 4; i++) F(Rr(0 + i * 3, 8, 1, 4), '#3b2a14', { flat: 1 }); F(Rr(-1, 9.4, 12, 1), '#3b2a14', { flat: 1 }); },
    gas: () => () => { F([[0, -6], [15, -7], [16, 8], [8, 12], [0, 8]], '#495057'); for (const x of [3, 10]) { ring(x, 0, 3.4, 3.4, 1.2, '#868e96', 8); F(ngon(x, 0, 2.2, 8), '#e03131', { flat: 1 }); } F(ngon(9, 11, 3.4, 6), '#343a40'); },
    porcelain: (c = '#f8f0fc') => () => { F([[-4, -10], [15, -10], [16, 4], [11, 12], [-2, 12], [-4, 4]], c); F(Rr(-1, 0, 4, 1.4), '#212529', { flat: 1 }); F(Rr(7, 0, 5, 1.4), '#212529', { flat: 1 }); F(Rr(-1, 3, 1.2, 5), '#4dabf7', { flat: 1, a: 0.7 }); F(Rr(4, 8, 4, 1.2), '#c2255c', { flat: 1 }); },
    stitch: () => () => { F(ngon(-1, 2, 2.2, 8), '#212529', { flat: 1 }); F(ngon(8, 2, 2.6, 8), '#212529', { flat: 1 }); F(ngon(8, 2, 1, 4), '#f8f0fc', { flat: 1 }); F(Rr(0, 9, 11, 0.9), '#862e3a', { flat: 1 }); for (let i = 0; i < 4; i++) F(Rr(1 + i * 3, 7.6, 0.8, 3.6), '#862e3a', { flat: 1 }); },
    shard: () => (D, S, p, t) => { F([[-4, -10], [6, -12], [16, -6], [14, 8], [4, 13], [-3, 6]], '#d0ebff', { a: 0.85 }); F([[3, -10], [5, 0], [1, 11]], '#ffffff', { flat: 1, a: 0.6 }); F(Rr(8, 0, 4, 2), '#ffffff', { flat: 1 }); F(Rr(-1, 0, 3, 2), '#ffffff', { flat: 1 }); },
    void: () => () => { F([[-4, -6], [15, -7], [15, 9], [-4, 9]], '#0b0b12', { flat: 1, a: 0.85 }); F(Rr(-1, 1, 3, 2), '#e9ecef', { flat: 1 }); F(Rr(8, 0, 4, 2.4), '#e9ecef', { flat: 1 }); },
  };
  const legs4 = (y, xs, len, col, t, spd = 140, amp = 14) => xs.forEach((x, i) => W(() => { mv(x, y); rl(Math.sin(t / spd + i * 1.7) * amp * 0.4); F([[-2.2, 0], [2.2, 0], [1.8, len], [-1.8, len]], i % 2 ? shd(col, 0.82) : col, { facet: false }); }));
  const eyeGlow = (x, y, r, c = '#ff6b6b') => { F(ngon(x, y, r * 1.8, 6), c, { flat: 1, a: 0.25 }); F(ngon(x, y, r, 6), c, { flat: 1 }); };

  const L = {
    /* ===== 1장: 잿빛 승강장 ===== */
    vagrant: HF({ top: '#6b6150', sleeve: '#5c5344', pants: '#4a4238', boot: '#2b2620', hair: '#5c4d3c', bangs: 'spiky', coat: 0.8, coatC: '#5c5344', wR: 'lantern', back: [BACK.scarf('#7a6a52', 26)], chest: ['strap'], strapC: '#3b3326', eye: '#ffd43b', el: '#ffd43b' }),
    clockrat: { sc: 1.5, box: [40, 26], el: '#ffd43b', draw: (p, t) => {
      W(() => { mv(-14, -12); X().rotate(t / 300); F([[-1.5, -8], [1.5, -8], [1.5, 0], [-1.5, 0]], '#c8b04f'); F([[-7, -10], [0, -6], [7, -10], [7, -14], [0, -10], [-7, -14]], '#c8b04f'); });
      ribbon(-16, -6, 18, 3, 1, 160 * DG, t, '#a07a5a', 4, 6, 200);
      legs4(-6, [-8, -3, 6, 10], 6, '#7a5a3c', t);
      F([[-17, -6], [-12, -16], [4, -18], [14, -12], [16, -6], [8, -3], [-12, -3]], '#8a6a4c');
      F([[10, -16], [24, -9 - (p.open || 0) * 2], [12, -5]], '#9a7a5a');
      F([[6, -18], [8, -26], [12, -17]], '#c08a6a'); F(ngon(16, -12, 1.6, 6), '#ff6b6b', { flat: 1 });
      F([[23, -9], [26, -8], [23, -7]], '#ff8787', { flat: 1 });
    } },
    luggage: { sc: 1.4, box: [44, 40], el: '#e03131', draw: (p, t) => {
      const o = (p.open || 0) * 0.8 + Math.max(0, Math.sin(t / 500)) * 0.15;
      F(Rr(-20, -24, 40, 24), '#8b5a2b'); F(Rr(-20, -8, 40, 3), '#5c3d2e', { facet: false });
      F(ngon(-10, 0, 3, 6), '#212529'); F(ngon(10, 0, 3, 6), '#212529');
      W(() => { mv(20, -24); X().rotate(-o); F(Rr(-40, -12, 40, 12), '#9c6633'); F(Rr(-24, -16, 8, 4), '#495057', { facet: false }); F(Rr(-40, 0, 40, 2), '#f1f3f5', { flat: 1, a: 0.0 }); for (let i = 0; i < 6; i++) F([[-38 + i * 6.4, 0], [-35 + i * 6.4, 5], [-32 + i * 6.4, 0]], '#f8f9fa', { flat: 1 }); });
      for (let i = 0; i < 6; i++) F([[-19 + i * 6.4, -24], [-16 + i * 6.4, -29 * (0.6 + o * 0.4)], [-13 + i * 6.4, -24]], '#f8f9fa', { flat: 1 });
      if (o > 0.2) F([[-6, -24], [6, -24], [10, -34 * o], [0, -30 * o]], '#e64980');
      F(Rr(-2, -21, 4, 5), '#d4a24c', { facet: false }); F(ngon(6, -16, 2.2, 6), '#ffd43b', { flat: 1 });
    } },
    inspector: HF({ build: 'heavy', sc: 1.6, top: '#3d4a5c', sleeve: '#344052', pants: '#2b3442', boot: '#1a1b1e', belt: '#a67c3a', glove: '#212529', coat: 0.85, coatC: '#344052', chest: ['buttons'], btn: '#c8b04f', wR: 'hook', mask: MASK.gas(), noHair: 1, el: '#c8b04f',
      hat: () => { F([[-17, -12], [18, -12], [20, -8], [-15, -8]], '#2b3442'); F([[-14, -12], [14, -12], [12, -22], [-12, -22]], '#3d4a5c'); F(Rr(-14, -15, 28, 3), '#a67c3a', { facet: false }); F(ngon(0, -18, 2.6, 6), '#c8b04f', { flat: 1 }); } }),
    clockwarden: { boss: 1, sc: 1.25, box: [70, 170], el: '#ffe066', shadow: 1.6, draw: (p, t, a) => {
      const fl = -10 + sw(t, 600, 4) + (p.crouch || 0);
      mv(0, fl);
      // 진자
      W(() => { mv(0, -70); X().rotate(Math.sin(t / 500) * 0.4); F(Rr(-1.2, 0, 2.4, 40), '#c8b04f', { flat: 1 }); F(ngon(0, 44, 7, 8), '#c8b04f'); F(ngon(0, 44, 3, 6), '#fff3bf', { flat: 1 }); });
      W(() => { X().rotate((p.lean || 0) * 0.5 * DG);
        F([[-26, 0], [-18, -96], [18, -96], [26, 0], [10, -6], [6, -60], [-6, -60], [-10, -6]], '#2f2e3c');
        F([[-20, -96], [20, -96], [24, -86], [-24, -86]], '#c8b04f', { facet: false });
        F([[-6, -60], [6, -60], [10, -6], [-10, -6]], '#1a1924', { flat: 1, a: 0.7 });
        // 왼팔
        W(() => { mv(-20, -90); rl(-10 - (p.arm || 0) * 30); F([[-4, 0], [4, 0], [3, 50], [-3, 50]], '#2f2e3c'); F(ngon(0, 52, 4, 6), '#e9ecef'); });
        // 시계 머리
        W(() => {
          mv(0, -118); X().rotate((p.hd || 0) * DG);
          for (let i = 0; i < 8; i++) { const an = t / 2000 + i / 8 * Math.PI * 2; F([[Math.cos(an - 0.15) * 26, Math.sin(an - 0.15) * 26], [Math.cos(an) * 32, Math.sin(an) * 32], [Math.cos(an + 0.15) * 26, Math.sin(an + 0.15) * 26]], '#a68a3a'); }
          F(ngon(0, 0, 26, 14), '#c8b04f'); F(ngon(0, 0, 22, 14), '#fff3d6');
          for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; F([[Math.cos(an) * 18, Math.sin(an) * 18], [Math.cos(an) * 21, Math.sin(an) * 21], [Math.cos(an + 0.05) * 21, Math.sin(an + 0.05) * 21]], '#3b3a4a', { flat: 1 }); }
          const mid = a && a.gim && a.gim.clock != null ? a.gim.clock : 10;
          const ha = (mid / 12) * Math.PI * 2 - Math.PI / 2, ma = (t / 600) % (Math.PI * 2);
          F([[0, -1.5], [Math.cos(ha) * 12, Math.sin(ha) * 12], [0, 1.5]], '#212529', { flat: 1 });
          F([[0, -1], [Math.cos(ma) * 18, Math.sin(ma) * 18], [0, 1]], '#c92a2a', { flat: 1 });
          F(ngon(0, 0, 2.4, 6), '#212529', { flat: 1 });
          eyeGlow(-9, -6, 2.4, p.glow > 0.3 ? '#ff6b6b' : '#ffe066'); eyeGlow(9, -6, 2.4, p.glow > 0.3 ? '#ff6b6b' : '#ffe066');
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); }
        });
        // 오른팔 + 분침 창
        W(() => { mv(18, -90); const ar = clamp(p.arm || 0, -1, 1); rl(24 + Math.max(0, ar) * 70); F([[-4, 0], [4, 0], [3, 46], [-3, 46]], '#3b3a4a'); mv(0, 46); rl(136 - Math.max(0, ar) * 130 + Math.min(0, ar) * 30);
          F(Rr(-1.6, -24, 3.2, 74), '#3b3a4a'); F([[-6, 46], [6, 46], [0, 72]], '#c92a2a'); F([[-4, -24], [4, -24], [0, -32]], '#c8b04f'); });
      });
    } },

    /* ===== 2장: 녹슨 정육시장 ===== */
    cleaver: HF({ build: 'heavy', top: '#e9ecef', sleeve: '#8a5a44', skin: '#d9a88a', pants: '#3b2f2a', boot: '#2b2620', chest: ['apron'], apron: '#dee2e6', wR: 'cleaver', mask: MASK.sack('#b08d62'), noHair: 1,
      front: (D, S, p, t) => { F(ngon(4, -30, 3, 5), '#c92a2a', { flat: 1, a: 0.7 }); F(ngon(-4, -22, 2, 5), '#c92a2a', { flat: 1, a: 0.6 }); } }),
    hookhound: { sc: 1.45, box: [52, 34], el: '#e03131', draw: (p, t) => {
      W(() => { mv(-20, -22); X().rotate(-0.6 + Math.sin(t / 200) * 0.2); F(Rr(-1.5, -16, 3, 16), '#868e96', { flat: 1 }); W(() => { mv(0, -16); F([[-1, 0], [1, 0], [7, -6], [5, -12], [0, -13], [3, -9], [3, -6], [-1, -3]], '#ced4da'); }); });
      legs4(-14, [-14, -8, 8, 13], 14, '#4a2a26', t, 120, 18);
      F([[-22, -14], [-16, -26], [6, -28], [16, -22], [14, -12], [-18, -10]], '#5c3330');
      for (let i = 0; i < 3; i++) F([[-14 + i * 7, -27], [-11 + i * 7, -33], [-8 + i * 7, -27]], '#868e96', { facet: false });
      W(() => { mv(14, -24); X().rotate((p.open || 0) * 0.2);
        F([[-4, -6], [10, -8], [22, -2], [20, 4], [0, 6]], '#6b3c38'); F([[2, -8], [4, -15], [8, -8]], '#4a2a26');
        W(() => { mv(4, 3); X().rotate((p.open || 0) * 0.5 + 0.1); F([[0, 0], [17, 1], [15, 5], [2, 5]], '#5c3330'); for (let i = 0; i < 3; i++) F([[4 + i * 4, 0], [6 + i * 4, -3], [8 + i * 4, 0]], '#f8f9fa', { flat: 1 }); });
        eyeGlow(12, -3, 1.6);
      });
    } },
    bloodmerchant: HF({ build: 'slim', top: '#5c1a24', sleeve: '#4a1520', robe: 1, robeC: '#4a1520', pants: '#2b0a12', boot: '#1a0a0e', belt: '#d4a24c', chest: ['sash'], sashC: '#d4a24c', wR: 'staff', orb: '#e03131', grip: '#2b0a12', off: 'coin', hat: HAT.hood('#3b0d16'), mask: MASK.porcelain('#f1e3e6'), noHair: 1, el: '#e03131' }),
    freezer: HF({ build: 'heavy', sc: 1.7, skin: '#bcd4e6', top: '#dbe4ff', sleeve: '#a5b4cc', pants: '#495057', boot: '#343a40', chest: ['apron'], apron: '#e7f5ff', glove: '#4dabf7', wR: 'hook', off: null, hair: '#e7f5ff', bangs: 'spiky', hairBack: 'short', eye: '#74c0fc', el: '#74c0fc',
      aura: (D, S, p, t) => { for (let i = 0; i < 6; i++) { const an = t / 900 + i; F(ngon(Math.cos(an) * 26, -40 + Math.sin(an * 1.3) * 26, 2.5, 6, an), '#d0ebff', { flat: 1, a: 0.7 }); } },
      back: [BACK.cape('#a5d8ff', true)] }),
    butcher: { boss: 1, sc: 1.2, box: [100, 130], el: '#ff6b6b', shadow: 2, draw: (p, t, a) => {
      const hooks = a && a.gim && a.gim.hooks != null ? a.gim.hooks : 3;
      // 매달린 고기 걸이 (뒤)
      for (let i = 0; i < hooks; i++) W(() => { mv(-60 + i * 26, -175); X().rotate(Math.sin(t / 700 + i) * 0.08); F(Rr(-0.8, 0, 1.6, 36), '#868e96', { flat: 1 }); mv(0, 36); F([[-1, 0], [1, 0], [6, 6], [4, 12], [0, 9]], '#ced4da'); F([[-8, 10], [8, 10], [10, 30], [0, 38], [-10, 30]], '#c2554a'); F([[-6, 14], [6, 14], [4, 28], [-4, 28]], '#e8a08a', { facet: false }); });
      mv(0, sw(t, 500, 1.5));
      legs4(-30, [-20, 18], 30, '#3b2f2a', 0, 1, 0);
      W(() => { mv(0, -30); X().rotate((p.lean || 0) * 0.6 * DG);
        W(() => { mv(-30, -60); rl(-20 - (p.arm || 0) * 20); F([[-7, 0], [7, 0], [6, 40], [-6, 40]], '#c98d70'); mv(0, 42); F(Rr(-1, 0, 2, 22), '#868e96', { flat: 1 }); mv(0, 22); F([[-2, 0], [2, 0], [10, 8], [8, 18], [0, 14]], '#ced4da'); });
        F([[-44, 0], [-50, -40], [-36, -78], [0, -88], [36, -78], [50, -40], [44, 0]], '#c98d70');
        F([[-34, -4], [-38, -50], [-24, -74], [24, -74], [38, -50], [34, -4]], '#e9ecef');
        for (const [x, y, r] of [[-10, -40, 6], [8, -24, 8], [16, -56, 4], [-22, -18, 5]]) F(ngon(x, y, r, 7), '#c92a2a', { flat: 1, a: 0.75 });
        F(Rr(-30, -14, 60, 4), '#5c3d2e', { facet: false });
        W(() => { mv(14, -88); X().rotate((p.hd || 0) * DG);
          F([[-16, 4], [-15, -18], [-8, -26], [10, -26], [17, -16], [17, 4]], '#b08d62');
          F(ngon(-2, -12, 3, 6), '#141517', { flat: 1 }); F(ngon(9, -13, 3.6, 6), '#141517', { flat: 1 });
          eyeGlow(9, -13, 1.6); F(Rr(-4, -4, 18, 1.4), '#3b2a14', { flat: 1 }); for (let i = 0; i < 5; i++) F(Rr(-3 + i * 4, -6, 1, 5), '#3b2a14', { flat: 1 });
          if ((p.open || 0) > 0.3) F([[-2, -3], [14, -3], [12, 4], [0, 4]], '#5c0f1a', { flat: 1 });
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e + m.a * 10, m.f); }
        });
        W(() => { mv(34, -66); rl(40 + (p.arm || 0) * 90); F([[-7, 0], [7, 0], [6, 40], [-6, 40]], '#d9a088'); mv(0, 42); rl(90 - (p.arm || 0) * 40);
          F(Rr(-2.5, -8, 5, 16), '#5c3d2e'); F([[-4, 8], [26, 8], [30, 50], [-4, 44]], '#ced4da'); F([[-4, 8], [26, 8], [26, 12], [-4, 12]], '#868e96', { facet: false }); F(ngon(18, 16, 2.6, 6), '#495057', { flat: 1 }); F(ngon(6, 30, 4, 6), '#c92a2a', { flat: 1, a: 0.6 }); });
      });
    } },

    /* ===== 3장: 침수 도서관 ===== */
    soakedpage: HF({ top: '#3d5a7a', sleeve: '#34506e', robe: 0.95, robeC: '#2f4a68', pants: '#1e3048', boot: '#14213d', hair: '#4a5a6a', hairBack: 'long', bangs: 'cover', wR: 'book', bookC: '#5c3d2e', skin: '#c5d3e0', eye: '#74c0fc', el: '#74c0fc', chest: ['highcollar'], collar: '#2a4060',
      aura: (D, S, p, t) => { for (let i = 0; i < 4; i++) F(ngon(-10 + i * 7, -((t / 8 + i * 30) % 60), 1.5, 6), '#74c0fc', { flat: 1, a: 0.6 }); } }),
    inkjelly: { sc: 1.4, box: [36, 50], el: '#9775fa', draw: (p, t) => {
      mv(0, -26 + sw(t, 500, 5));
      for (let i = 0; i < 5; i++) ribbon(-12 + i * 6, 2, 24 + (i % 2) * 6, 3, 1, 90 * DG, t + i * 200, '#2b1f4a', 5, 9, 260, { a: 0.85 });
      const s = 1 + Math.sin(t / 250) * 0.06;
      F([[-18 * s, 4], [-17 * s, -8], [-10, -18], [10, -18], [17 * s, -8], [18 * s, 4], [8, 1], [0, 4], [-8, 1]], '#3b2a6b', { a: 0.9 });
      F([[-12, -4], [-8, -14], [6, -14], [10, -6]], '#7048e8', { a: 0.5, rim: false });
      for (const [x, y] of [[-8, -6], [2, -10], [10, -2]]) F(ngon(x, y, 1.8, 6), '#63e6be', { flat: 1 });
      eyeGlow(4, -4, 2, '#e599f7'); eyeGlow(12, -5, 1.6, '#e599f7');
    } },
    shelf: { sc: 1.4, box: [40, 60], el: '#ffd43b', draw: (p, t) => {
      const lean = Math.sin(t / 700) * 0.04 + (p.lean || 0) * DG * 0.4;
      W(() => { X().rotate(lean);
        F(Rr(-20, -64, 40, 64), '#5c3d2e'); F(Rr(-17, -60, 34, 56), '#2b1d12', { flat: 1 });
        const bc = ['#c92a2a', '#1864ab', '#2b8a3e', '#e67700', '#5f3dc4', '#868e96'];
        for (let r = 0; r < 3; r++) { F(Rr(-20, -42 + r * 19, 40, 3), '#6b4226', { facet: false }); for (let i = 0; i < 6; i++) { const h = 12 + ((i * 7 + r * 3) % 5); F(Rr(-16 + i * 5.4, -42 + r * 19 - h, 4.4, h), bc[(i + r) % 6], { facet: false }); } }
        const o = (p.open || 0);
        eyeGlow(-6, -52 - o * 2, 2.2, '#ffd43b'); eyeGlow(6, -52 - o * 2, 2.2, '#ffd43b');
        if (o > 0.3) W(() => { mv(14, -30); X().rotate(-o); F([[0, 0], [16, -4], [16, 8], [0, 8]], '#f1f3f5'); F([[0, 0], [16, 4], [16, 16], [0, 8]], '#dee2e6'); });
      });
    } },
    reader: HF({ sc: 1.65, build: 'slim', top: '#1e3a5f', sleeve: '#1a3354', robe: 1.05, robeC: '#183050', skin: '#b8c9da', hair: '#d0ebff', hairBack: 'long', bangs: 'cover', eye: '#4dabf7', el: '#4dabf7', chest: ['highcollar'], collar: '#4dabf7', wR: 'quill', off: 'tome', idle: 'float',
      aura: (D, S, p, t) => { for (let i = 0; i < 3; i++) W(() => { const an = t / 800 + i * 2.1; mv(Math.cos(an) * 34, -50 + Math.sin(an) * 12); X().rotate(Math.sin(t / 200 + i) * 0.3); F([[0, 0], [-8, -3], [-8, 6], [0, 8]], '#f1f3f5'); F([[0, 0], [8, -3], [8, 6], [0, 8]], '#dee2e6'); }); } }),
    librarian: { boss: 1, sc: 1.25, box: [80, 150], el: '#4dabf7', shadow: 1.5, draw: (p, t, a) => {
      mv(0, -16 + sw(t, 700, 5));
      // 물 소용돌이 하체
      for (let i = 0; i < 5; i++) ribbon(-8 + i * 4, -30, 34 + i * 3, 10 - i, 2, (80 + i * 8 + Math.sin(t / 400 + i) * 8) * DG, t + i * 150, i % 2 ? '#1c7ed6' : '#4dabf7', 5, 6, 300, { a: 0.7 });
      // 공전하는 책
      const books = a && a.gim && a.gim.books != null ? a.gim.books : 4;
      for (let i = 0; i < books; i++) W(() => { const an = t / 1100 + i / Math.max(1, books) * Math.PI * 2; mv(Math.cos(an) * 64, -90 + Math.sin(an) * 22); X().rotate(Math.sin(t / 160 + i) * 0.35);
        F([[0, 0], [-12, -5], [-12, 9], [0, 12]], '#f1f3f5'); F([[0, 0], [12, -5], [12, 9], [0, 12]], '#dee2e6'); F([[-12, -5], [-13, -6], [-13, 10], [-12, 9]], ['#c92a2a', '#5f3dc4', '#2b8a3e', '#e67700', '#1864ab'][i % 5], { facet: false }); });
      F([[-28, -24], [-22, -104], [22, -104], [28, -24], [14, -30], [0, -26], [-14, -30]], '#1e3a5f');
      F([[-22, -104], [22, -104], [18, -90], [-18, -90]], '#4dabf7', { facet: false, a: 0.6 });
      for (let i = 0; i < 3; i++) F(Rr(-20 + i * 14, -80 + i * 6, 2, 30), '#1a1b2e', { flat: 1, a: 0.5 });
      W(() => { mv(-22, -98); rl(-5 - (p.arm || 0) * 40); F([[-4, 0], [4, 0], [3, 40], [-3, 40]], '#183050'); });
      W(() => { mv(0, -122); X().rotate((p.hd || 0) * DG);
        ribbon(-10, -14, 50, 18, 6, 115 * DG, t, '#1a1b2e', 6, 5, 320);
        F([[-14, -16], [14, -16], [16, 12], [-14, 14]], '#b8c9da');
        // 책 가면
        W(() => { mv(6, 0); X().rotate(-0.1 + (p.open || 0) * 0.2);
          F([[0, -18], [-14, -14], [-14, 14], [0, 16]], '#f1f3f5'); F([[0, -18], [14, -14], [14, 14], [0, 16]], '#e9ecef');
          F([[-14, -14], [-16, -15], [-16, 15], [-14, 14]], '#5c3d2e'); F([[14, -14], [16, -15], [16, 15], [14, 14]], '#5c3d2e');
          for (let i = 0; i < 4; i++) { F(Rr(-11, -8 + i * 5, 8, 1), '#495057', { flat: 1, a: 0.4 }); F(Rr(3, -8 + i * 5, 8, 1), '#495057', { flat: 1, a: 0.4 }); }
          eyeGlow(-6, -2, 2.4, '#4dabf7'); eyeGlow(7, -2, 2.4, '#4dabf7');
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); }
        });
      });
      W(() => { mv(20, -98); rl(70 + (p.arm || 0) * 60); F([[-4, 0], [4, 0], [3, 36], [-3, 36]], '#183050'); mv(0, 38); X().rotate(-0.3);
        F([[-14, 0], [14, 0], [14, 22], [-14, 22]], '#5c3d2e'); F([[-12, 2], [12, 2], [12, 20], [-12, 20]], '#f1f3f5'); F(Rr(-1, 0, 2, 22), '#3b2a14', { flat: 1 }); F(ngon(0, 11, 4, 4), '#4dabf7', { flat: 1, a: 0.8 }); });
    } },

    /* ===== 4장: 불타는 극장 ===== */
    extra: HF({ top: '#4a3b34', sleeve: '#3d302a', pants: '#2b2420', boot: '#1a1512', chest: ['collarV'], collar: '#868e96', wR: 'sword', blade: '#adb5bd', mask: MASK.smile('#e9ecef', '#212529'), hair: '#2b2420', bangs: 'neat', el: '#ff922b',
      aura: (D, S, p, t) => { for (let i = 0; i < 3; i++) F([[-14 + i * 12, 0], [-11 + i * 12, -10 - Math.sin(t / 90 + i) * 4], [-8 + i * 12, 0]], '#ff922b', { flat: 1, a: 0.6 }); } }),
    dancer: HF({ build: 'slim', skin: '#f3d0b5', top: '#c92a2a', sleeve: '#f3d0b5', skirt: '#e8590c', pants: '#f3d0b5', boot: '#c92a2a', hair: '#ffd43b', hair2: '#ff922b', hairBack: 'pony', bangs: 'swept', eye: '#ff922b', el: '#ff922b', wR: 'saber', idle: 'bounce',
      back: [BACK.scarf('#ff922b', 40), BACK.scarf('#ffd43b', 30)], hold: { aR: 150, wR: 30, aL: 120, lL: -14, lR: 20, lean: 4 } }),
    stagerig: { sc: 1.4, box: [44, 70], el: '#ffe066', draw: (p, t) => {
      F(Rr(-22, -6, 44, 6), '#343a40'); F(Rr(-2, -70, 4, 64), '#495057'); F(Rr(-20, -72, 40, 4), '#495057');
      W(() => { mv(14, -68); X().rotate(0.5 + Math.sin(t / 900) * 0.2 + (p.open || 0) * 0.3); F([[-6, 0], [6, 0], [8, 14], [-8, 14]], '#212529'); F(ngon(0, 14, 7, 8, 0, 2.6), p.glow > 0.3 ? '#fff9db' : '#ffe066', { flat: 1 }); });
      W(() => { mv(-14, -68); X().rotate(Math.sin(t / 400) * 0.15); F(Rr(-0.6, 0, 1.2, 30), '#adb5bd', { flat: 1 }); mv(0, 30); F([[-8, 0], [8, 0], [10, 18], [-10, 18]], '#a68a64'); F(Rr(-6, 6, 12, 2), '#6b4226', { facet: false }); });
      eyeGlow(-3, -40, 1.8, '#ffe066'); eyeGlow(4, -40, 1.8, '#ffe066');
    } },
    prompter: HF({ sc: 1.65, build: 'normal', top: '#2b2d31', sleeve: '#25262b', coat: 1, coatC: '#25262b', pants: '#1a1b1e', boot: '#141517', hair: '#adb5bd', hairBack: 'long', bangs: 'cover', eye: '#ffe066', el: '#ffe066', wR: 'lantern', off: 'tome', chest: ['highcollar'], collar: '#495057', hold: { aR: 80, wR: 0, aL: 50, lL: -6, lR: 8, lean: 14 } }),
    diva: { boss: 1, sc: 1.25, box: [60, 150], el: '#f783ac', shadow: 1.4, draw: (p, t, a) => {
      if (a && a.gim && a.gim.spot) W(() => { X().globalAlpha *= 0.35; F([[-14, -200], [14, -200], [44, 0], [-44, 0]], '#fff9db', { flat: 1 }); });
      mv(0, 0);
      F([[-18, 0], [-14, -40], [-8, -60], [8, -60], [12, -40], [26, 0], [10, -6], [0, 0], [-10, -6]], '#a61e4d');
      F([[-14, -40], [12, -40], [16, -20], [-16, -20]], '#c2255c', { a: 0.6, rim: false });
      W(() => { mv(0, -60); X().rotate((p.lean || 0) * 0.4 * DG);
        F([[-10, 0], [10, 0], [12, -36], [-12, -36]], '#c2255c');
        F([[-10, -30], [10, -30], [6, -24], [0, -20], [-6, -24]], '#ffe3e3');
        F(ngon(0, -32, 3, 6), '#fcc419', { flat: 1 });
        W(() => { mv(-12, -32); rl(10 - (p.arm || 0) * 40); F([[-3, 0], [3, 0], [2.4, 28], [-2.4, 28]], '#ffe3e3'); });
        W(() => { mv(0, -50); X().rotate((p.hd || 0) * DG);
          F([[-18, -6], [-20, 14], [-14, 30], [-6, 22], [-4, -10]], '#f59f00');
          F([[-11, -12], [11, -12], [12, 8], [6, 13], [-8, 13], [-11, 8]], '#ffe3e3');
          F(Rr(1, -1, 4, 2), '#212529', { flat: 1 }); F(Rr(7, -1.4, 4, 2), '#212529', { flat: 1 }); F(Rr(-1, -4, 6, 1), '#212529', { flat: 1 }); F(Rr(6, -4.4, 6, 1), '#212529', { flat: 1 });
          F(Rr(4, 7, 4, (p.open || 0) * 4 + 1.2), '#c2255c', { flat: 1 });
          F([[-13, -10], [-10, -18], [0, -20], [12, -16], [14, -6], [6, -12], [-4, -10], [-8, -4]], '#fab005');
          for (let i = 0; i < 3; i++) F(ngon(-14 + i * 5, -16 - i * 3, 5, 7), '#f59f00');
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e + m.a * 6, m.f + m.d * 6); }
        });
        W(() => { mv(12, -32); rl(60 + (p.arm || 0) * 90); F([[-3, 0], [3, 0], [2.4, 28], [-2.4, 28]], '#ffe3e3'); mv(0, 28); rl(70); F(Rr(-1.4, -4, 2.8, 16), '#495057'); F(ngon(0, 14, 4, 8), '#adb5bd'); });
      });
      for (let i = 0; i < 3; i++) { const k = ((t / 1400 + i / 3) % 1); W(() => { mv(20 + k * 30, -120 - k * 40); X().globalAlpha *= 1 - k; F(ngon(0, 0, 3, 6), '#f783ac', { flat: 1 }); F(Rr(2, -12, 1.4, 12), '#f783ac', { flat: 1 }); }); }
    } },

    /* ===== 5장: 가면 공방 ===== */
    apprentice: HF({ top: '#6b4f3a', sleeve: '#5c4330', chest: ['apron'], apron: '#a68a64', pants: '#3b2f2a', boot: '#2b2620', wR: 'needle', mask: MASK.porcelain('#f8f9fa'), hair: '#2b2620', bangs: 'neat', el: '#e599f7' }),
    blankface: HF({ skin: '#e9ecef', top: '#dee2e6', sleeve: '#ced4da', pants: '#adb5bd', boot: '#868e96', noHair: 1, ear: false, mask: MASK.blank(), wR: null, hold: { aR: 60, wR: 0, aL: 50, lL: -8, lR: 8, lean: 6 }, el: '#adb5bd',
      hat: () => { F(Rr(-15, -14, 30, 4), '#ced4da', { facet: false }); } }),
    pressarm: { sc: 1.4, box: [40, 66], el: '#ffa94d', draw: (p, t) => {
      F(Rr(-18, -10, 36, 10), '#495057'); F(Rr(-14, -14, 28, 4), '#fab005', { facet: false });
      W(() => { mv(0, -14); X().rotate((-20 + (p.arm || 0) * 40 + Math.sin(t / 600) * 5) * DG);
        F(Rr(-5, -36, 10, 36), '#868e96'); F(ngon(0, -36, 7, 8), '#495057');
        W(() => { mv(0, -36); X().rotate((70 - (p.arm || 0) * 60) * DG); F(Rr(-4, -30, 8, 30), '#adb5bd'); mv(0, -30);
          const o = 6 + (p.open || 0) * 6; F([[-3, 0], [3, 0], [o, -12], [o - 3, -12]], '#495057'); F([[-3, 0], [3, 0], [-o + 3, -12], [-o, -12]], '#495057'); });
      });
      eyeGlow(-6, -6, 1.6, '#ffa94d'); eyeGlow(6, -6, 1.6, '#ffa94d');
    } },
    foreman: HF({ build: 'heavy', sc: 1.7, top: '#e67700', sleeve: '#d9480f', pants: '#343a40', boot: '#212529', belt: '#212529', chest: ['strap'], strapC: '#212529', glove: '#495057', wR: 'mace', hair: '#495057', bangs: 'spiky', eye: '#ffa94d', el: '#ffa94d', mask: MASK.gas(),
      hat: () => { F([[-17, -10], [17, -10], [15, -22], [-15, -22]], '#fab005'); F(Rr(-19, -11, 38, 3), '#e67700', { facet: false }); F(ngon(0, -22, 3, 5), '#e03131', { flat: 1 }); } }),
    masque: { boss: 1, sc: 1.25, box: [56, 150], el: '#e599f7', shadow: 1.3, draw: (p, t, a) => {
      const mk = a && a.gim && a.gim.mask || 0;
      const MC = ['#f8f9fa', '#74c0fc', '#ff6b6b'];
      mv(0, sw(t, 380, 2));
      W(() => { X().rotate((p.lean || 0) * 0.5 * DG);
        // 다리
        for (const [s, c] of [[-1, '#5f3dc4'], [1, '#1a1b1e']]) W(() => { mv(s * 6, -44); rl(s * 10 + (s > 0 ? 6 : -6)); F([[-4, 0], [4, 0], [3, 44], [-3, 44]], c); F([[-3, 40], [8, 40], [10, 44], [-3, 44]], '#fab005'); });
        F([[-14, -40], [14, -40], [16, -90], [-16, -90]], '#1a1b1e');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = -12 + j * 14 + (i % 2) * 7, y = -86 + i * 12; F([[x, y], [x + 6, y + 6], [x, y + 12], [x - 6, y + 6]], (i + j) % 2 ? '#7048e8' : '#e64980', { facet: false }); }
        F([[-18, -90], [18, -90], [12, -82], [0, -78], [-12, -82]], '#f8f9fa');
        for (const s of [-1, 1]) W(() => { mv(s * 15, -86); rl(s < 0 ? -20 - (p.arm || 0) * 50 : 50 + (p.arm || 0) * 100); F([[-3, 0], [3, 0], [2, 34], [-2, 34]], s < 0 ? '#5f3dc4' : '#e64980'); F(ngon(0, 36, 3.6, 6), '#f8f9fa'); if (s > 0) { mv(0, 36); F([[-1, 0], [1, 0], [0.6, 26], [-0.6, 26]], '#fab005', { flat: 1 }); F(ngon(0, 28, 3, 4), '#fab005'); } });
        W(() => { mv(0, -106); X().rotate((p.hd || 0) * DG);
          // 광대 모자
          for (const [s, c] of [[-1, '#7048e8'], [1, '#e64980']]) { ribbon(0, -14, 26, 12, 2, (s < 0 ? 200 : -20 - 30) * DG, t + s * 300, c, 5, 5, 300); }
          F(ngon(0, 0, 15, 10), '#141517');
          F([[-12, -10], [12, -10], [14, 4], [8, 14], [-8, 14], [-14, 4]], MC[mk]);
          if (mk === 0) { F([[-8, -2], [-3, -4], [-3, -1], [-8, 0]], '#212529', { flat: 1 }); F([[3, -4], [9, -2], [9, 0], [3, -1]], '#212529', { flat: 1 }); F([[-6, 5], [0, 9], [6, 5], [6, 7], [0, 11], [-6, 7]], '#212529', { flat: 1 }); }
          if (mk === 1) { F(Rr(-8, -3, 5, 2), '#1c3d5a', { flat: 1 }); F(Rr(3, -3, 5, 2), '#1c3d5a', { flat: 1 }); F(Rr(-6, 1, 1.4, 8), '#1c7ed6', { flat: 1 }); F([[-5, 9], [0, 6], [5, 9]], '#1c3d5a', { flat: 1 }); }
          if (mk === 2) { F([[-9, -6], [-3, -3], [-3, -1], [-9, -3]], '#5c0f1a', { flat: 1 }); F([[3, -3], [9, -6], [9, -3], [3, -1]], '#5c0f1a', { flat: 1 }); F([[-6, 6], [6, 6], [4, 10], [-4, 10]], '#5c0f1a', { flat: 1 }); }
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); }
        });
      });
      // 공전하는 여분 가면
      for (let i = 0; i < 3; i++) if (i !== mk) W(() => { const an = t / 900 + i * 2.1; mv(Math.cos(an) * 40, -110 + Math.sin(an) * 14); X().scale(0.6, 0.6); F([[-12, -10], [12, -10], [14, 4], [8, 14], [-8, 14], [-14, 4]], MC[i], { a: 0.85 }); F(Rr(-7, -3, 4, 2), '#212529', { flat: 1 }); F(Rr(3, -3, 4, 2), '#212529', { flat: 1 }); });
    } },

    /* ===== 6장: 유령 선로 ===== */
    trackwraith: { sc: 1.45, box: [32, 60], el: '#63e6be', draw: (p, t) => {
      mv(0, -20 + sw(t, 450, 4));
      ribbon(0, -10, 40, 18, 2, 100 * DG, t, '#20c997', 6, 8, 240, { a: 0.55 });
      F([[-12, 0], [-14, -24], [-8, -38], [8, -38], [14, -24], [12, 0], [4, 8], [-4, 8]], '#38d9a9', { a: 0.75 });
      F([[-10, -26], [-6, -36], [6, -36], [10, -26], [6, -20], [-6, -20]], '#0b3d2e', { a: 0.9 });
      eyeGlow(-1, -28, 2, '#c3fae8'); eyeGlow(6, -28, 2, '#c3fae8');
      for (const s of [-1, 1]) ribbon(s * 10, -20, 18, 4, 1, (s < 0 ? 140 : 40 - (p.arm || 0) * 30) * DG, t + s * 200, '#38d9a9', 4, 6, 200, { a: 0.6 });
    } },
    signalman: HF({ top: '#4a5a3a', sleeve: '#3f4d31', pants: '#343a40', boot: '#212529', belt: '#a67c3a', chest: ['buttons'], btn: '#c8b04f', wR: 'flag', flagC: '#e03131', off: 'watch', hair: '#495057', bangs: 'neat', mask: MASK.gas(), noHair: 1, el: '#ffe066',
      hat: () => { F([[-16, -11], [17, -11], [19, -8], [-14, -8]], '#2b3020'); F([[-13, -11], [13, -11], [12, -20], [-12, -20]], '#4a5a3a'); F(ngon(0, -15, 2.4, 6), '#c8b04f', { flat: 1 }); } }),
    freight: { sc: 1.35, box: [60, 50], el: '#ffa94d', draw: (p, t) => {
      const r = (t / 300) % (Math.PI * 2);
      F(Rr(-28, -48, 56, 38), '#7c2d12'); F(Rr(-28, -48, 56, 4), '#5c2410', { facet: false });
      for (let i = 0; i < 4; i++) F(Rr(-24 + i * 13, -42, 10, 26), '#9a3b1a', { facet: false });
      F(Rr(-30, -12, 60, 4), '#343a40', { facet: false });
      for (const x of [-18, 18]) W(() => { mv(x, -6); X().rotate(r); F(ngon(0, 0, 7, 8), '#212529'); F([[-6, -1], [6, -1], [6, 1], [-6, 1]], '#868e96', { flat: 1 }); });
      F(Rr(8, -40, 16, 12), '#212529', { flat: 1 }); eyeGlow(12, -34, 2.2, '#ffa94d'); eyeGlow(20, -34, 2.2, '#ffa94d');
      F(Rr(6, -24, 20, 3), '#212529', { flat: 1 });
    } },
    stationmaster: HF({ sc: 1.7, build: 'slim', top: '#1c2a3a', sleeve: '#172433', coat: 1, coatC: '#172433', pants: '#141c26', boot: '#0b0f14', belt: '#c8b04f', chest: ['buttons'], btn: '#c8b04f', wR: 'sword', blade: '#c3fae8', off: 'watch', skin: '#cfd8dc', hair: '#e9ecef', bangs: 'neat', hairBack: 'short', eye: '#63e6be', el: '#63e6be', brow: 1,
      hat: () => { F([[-17, -12], [18, -12], [20, -8], [-15, -8]], '#0b0f14'); F([[-14, -12], [14, -12], [13, -24], [-13, -24]], '#1c2a3a'); F(Rr(-14, -16, 28, 3), '#c8b04f', { facet: false }); F(ngon(0, -20, 3, 6), '#c8b04f', { flat: 1 }); } }),
    express: { boss: 1, sc: 1.2, box: [150, 110], el: '#63e6be', shadow: 2.6, draw: (p, t, a) => {
      const spd = a && a.gim && a.gim.speed || 1, r = (t / (260 / spd)) % (Math.PI * 2);
      mv(10, sw(t, 120 / spd, 1));
      // 연기
      for (let i = 0; i < 5; i++) { const k = ((t / 900 * spd + i / 5) % 1); W(() => { mv(14 - k * 60, -122 - k * 50); X().globalAlpha *= (1 - k) * 0.7; F(ngon(0, 0, 8 + k * 14, 7, k * 3), '#96f2d7', { flat: 1 }); }); }
      F(Rr(-90, -96, 54, 76), '#1f2a37'); F(Rr(-90, -100, 58, 6), '#141c26', { facet: false });
      F(Rr(-84, -86, 18, 20), '#63e6be', { flat: 1, a: 0.5 }); F(Rr(-60, -86, 18, 20), '#63e6be', { flat: 1, a: 0.5 });
      F(Rr(-38, -70, 78, 50), '#2b3a4a');
      for (let i = 0; i < 3; i++) F(Rr(-30 + i * 22, -70, 4, 50), '#c92a2a', { facet: false });
      F(Rr(6, -110, 14, 40), '#1f2a37'); F(Rr(2, -114, 22, 6), '#141c26');
      F(ngon(40, -45, 26, 12), '#1f2a37');
      F(ngon(40, -45, 20, 12), '#141c26', { flat: 1 });
      const o = p.open || 0;
      eyeGlow(34, -54, 5, '#fff3bf'); eyeGlow(48, -54, 5, '#fff3bf');
      for (let i = 0; i < 5; i++) F(Rr(30 + i * 4, -40 + o * 2, 2.4, 8 + o * 6), '#868e96', { flat: 1 });
      F([[40, -20], [70, -2], [40, -2]], '#c92a2a');
      if (VR.tip) { const m = X().getTransform(); VR.tip(m.a * 60 + m.c * -45 + m.e, m.b * 60 + m.d * -45 + m.f); }
      F(Rr(-92, -24, 134, 6), '#343a40', { facet: false });
      for (const x of [-72, -46, -16, 14]) W(() => { mv(x, -12); X().rotate(r); F(ngon(0, 0, 12, 10), '#212529'); F(ngon(0, 0, 9, 10), '#495057'); F([[-10, -1.5], [10, -1.5], [10, 1.5], [-10, 1.5]], '#adb5bd', { flat: 1 }); });
      F([[-74, -14], [14, -14], [14, -10], [-74, -10]], '#c92a2a', { facet: false });
    } },

    /* ===== 7장: 웃는 축제 ===== */
    citizen: HF({ top: '#c8b04f', sleeve: '#b59f45', pants: '#5c4d3c', boot: '#3b2f2a', chest: ['tie'], tieC: '#e03131', wR: 'flag', flagC: '#fcc419', mask: MASK.smile('#ffe8cc', '#5c0f1a'), hair: '#5c4d3c', bangs: 'neat', el: '#fcc419' }),
    clown: HF({ build: 'slim', top: '#e03131', sleeve: '#f8f9fa', pants: '#1864ab', boot: '#fab005', skin: '#f8f9fa', hair: '#40c057', bangs: 'spiky', hairBack: 'bob', chest: ['buttons'], btn: '#f8f9fa', wR: 'axe', blade: '#fab005', eye: '#212529', el: '#ff6b6b', idle: 'bounce',
      front: () => {}, mouth: '#e03131', hat: () => { F(ngon(14, 4, 3.4, 8), '#e03131', { flat: 1 }); F([[-8, -18], [8, -18], [0, -34]], '#fab005'); F(ngon(0, -35, 3, 6), '#e03131', { flat: 1 }); } }),
    megaphone: { sc: 1.4, box: [40, 50], el: '#fcc419', draw: (p, t) => {
      legs4(-16, [-6, 6], 16, '#495057', t, 200, 10);
      W(() => { mv(0, -28); X().rotate(Math.sin(t / 300) * 0.08 - (p.open || 0) * 0.2);
        F([[-16, -8], [-6, -8], [-6, 8], [-16, 8]], '#495057');
        F([[-6, -6], [22, -18 - (p.open || 0) * 4], [22, 18 + (p.open || 0) * 4], [-6, 6]], '#fcc419');
        F(ngon(22, 0, 4, 8, 0, 18 + (p.open || 0) * 4), '#212529', { flat: 1 });
        F([[0, -4], [16, -12], [16, -8], [0, -1]], '#fff3bf', { flat: 1, a: 0.6 });
        eyeGlow(-10, -2, 1.6, '#e03131');
      });
    } },
    mc: HF({ sc: 1.7, build: 'slim', top: '#862e9c', sleeve: '#702682', coat: 0.95, coatC: '#702682', pants: '#1a1b1e', boot: '#141517', belt: '#fab005', chest: ['collarV', 'tie'], tieC: '#fab005', collar: '#f8f9fa', wR: 'staff', orb: '#fab005', grip: '#1a1b1e', mask: MASK.smile('#f8f9fa', '#862e9c'), hair: '#1a1b1e', bangs: 'neat', el: '#fcc419', hat: HAT.tophat }),
    grin: { boss: 1, sc: 1.2, box: [110, 130], el: '#ffd43b', shadow: 1.6, draw: (p, t, a) => {
      mv(0, -70 + sw(t, 600, 6));
      for (let i = 0; i < 6; i++) ribbon(-20 + i * 8, 40, 46, 7, 2, (80 + i * 4) * DG, t + i * 200, i % 2 ? '#e64980' : '#7048e8', 6, 10, 260);
      // 풍선
      for (let i = 0; i < 3; i++) W(() => { mv(-60 + i * 18, -60 - i * 10 + sw(t + i * 300, 700, 4)); F(Rr(-0.4, 0, 0.8, 40), '#dee2e6', { flat: 1, a: 0.6 }); F(ngon(0, 0, 9, 8, 0, 11), ['#e03131', '#fcc419', '#4dabf7'][i]); });
      F(ngon(0, 0, 54, 14), '#ffe8cc');
      F([[-50, 10], [50, 10], [40, 34], [0, 48], [-40, 34]], '#f8d9b8', { rim: false });
      const o = 0.3 + (p.open || 0) * 0.7;
      F([[-38, 6], [38, 6], [32, 6 + 22 * o], [0, 10 + 30 * o], [-32, 6 + 22 * o]], '#5c0f1a');
      for (let i = 0; i < 8; i++) F([[-34 + i * 9, 6], [-26 + i * 9, 6], [-30 + i * 9, 14]], '#f8f9fa', { facet: false });
      for (let i = 0; i < 6; i++) F([[-24 + i * 9, 6 + 22 * o + 4], [-16 + i * 9, 6 + 22 * o + 4], [-20 + i * 9, 6 + 16 * o]], '#f8f9fa', { facet: false });
      F([[-30, -16], [-16, -22], [-12, -16], [-28, -12]], '#212529', { flat: 1 }); F([[12, -16], [16, -22], [30, -16], [28, -12]], '#212529', { flat: 1 });
      eyeGlow(-20, -16, 2.4, '#ffd43b'); eyeGlow(22, -16, 2.4, '#ffd43b');
      F(ngon(-36, 0, 8, 8, 0, 5), '#ff8787', { flat: 1, a: 0.5 }); F(ngon(36, 0, 8, 8, 0, 5), '#ff8787', { flat: 1, a: 0.5 });
      W(() => { mv(10, -50); X().rotate(0.3); F([[-16, 0], [16, 0], [0, -40]], '#7048e8'); for (let i = 0; i < 3; i++) F([[-14 + i * 5, -i * 12], [14 - i * 5, -i * 12], [12 - i * 5, -4 - i * 12], [-12 + i * 5, -4 - i * 12]], '#fcc419', { facet: false }); F(ngon(0, -42, 4, 6), '#e64980', { flat: 1 }); });
      if (VR.tip) { const m = X().getTransform(); VR.tip(m.e + m.a * 0, m.f + m.d * 20); }
    } },

    /* ===== 8장: 무너진 채석장 ===== */
    mason: HF({ build: 'heavy', top: '#868e96', sleeve: '#d9a88a', skin: '#d9a88a', pants: '#5c4d3c', boot: '#3b2f2a', chest: ['apron'], apron: '#a68a64', wR: 'mace', hair: '#5c4d3c', bangs: 'spiky', eye: '#ffa94d', el: '#ffa94d', mask: MASK.sack('#a68a64') }),
    tortoise: { sc: 1.35, box: [60, 40], el: '#ffa94d', draw: (p, t) => {
      legs4(-8, [-18, -10, 12, 18], 8, '#6b6150', t, 400, 8);
      W(() => { mv(24, -14 + Math.sin(t / 600) * 1); X().rotate((p.open || 0) * -0.2); F([[-6, -6], [14, -8], [18, 0], [8, 6], [-6, 4]], '#7a6e5c'); eyeGlow(10, -3, 1.8, '#ffa94d'); });
      F([[-30, -8], [-26, -28], [-12, -40], [10, -40], [24, -28], [28, -8]], '#8a7b64');
      for (const [x, y, r] of [[-14, -26, 9], [4, -30, 10], [16, -18, 7], [-4, -14, 8]]) F(ngon(x, y, r, 6, 0.3), '#a39274');
      F([[-6, -38], [0, -48], [6, -38]], '#ffa94d', { flat: 1, a: 0.8 }); F([[10, -36], [16, -44], [18, -34]], '#ff922b', { flat: 1, a: 0.7 });
    } },
    tremorworm: { sc: 1.4, box: [40, 56], el: '#fcc419', draw: (p, t) => {
      F(ngon(0, 0, 26, 10, 0, 6), '#5c4d3c', { flat: 1 });
      for (let i = 0; i < 6; i++) { const k = i / 5, x = Math.sin(t / 300 + k * 3) * 6 * k + k * 10 + (p.lean || 0) * k * 0.4, y = -k * 54; F(ngon(x, y, 12 - k * 3, 8), i % 2 ? '#a68a64' : '#c4a47c'); }
      const hx = Math.sin(t / 300 + 3) * 6 + 10, hy = -58, o = 4 + (p.open || 0) * 6;
      W(() => { mv(hx, hy); F(ngon(0, 0, 10, 8), '#c4a47c'); F(ngon(4, 0, o, 8), '#3b0d0d', { flat: 1 }); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; F([[4 + Math.cos(an) * o, Math.sin(an) * o], [4 + Math.cos(an + 0.3) * o * 0.4, Math.sin(an + 0.3) * o * 0.4], [4 + Math.cos(an + 0.5) * o, Math.sin(an + 0.5) * o]], '#f8f9fa', { flat: 1 }); } });
    } },
    demolition: HF({ build: 'heavy', sc: 1.7, top: '#c92a2a', sleeve: '#a61e1e', pants: '#3d3d2e', boot: '#2b2b20', chest: ['strap'], strapC: '#3d3d2e', wR: 'mace', glove: '#495057', mask: MASK.gas(), noHair: 1, el: '#ff922b', back: [BACK.pack],
      hat: () => { F([[-17, -10], [17, -10], [15, -22], [-15, -22]], '#fcc419'); F(Rr(-19, -11, 38, 3), '#e67700', { facet: false }); } }),
    colossus: { boss: 1, sc: 1.15, box: [150, 170], el: '#ffa94d', shadow: 2.8, draw: (p, t, a) => {
      const g = (a && a.gim) || {}, armL = g.armL !== false, armR = g.armR !== false;
      mv(0, sw(t, 900, 2));
      F([[-60, 0], [-50, -40], [50, -40], [62, 0]], '#5c4d3c', { flat: 1 });
      W(() => { X().rotate((p.lean || 0) * 0.4 * DG);
        if (armL) W(() => { mv(-50, -120); rl(-10 - (p.arm || 0) * 30); F(ngon(0, 0, 18, 6), '#7a6e5c'); F([[-14, 6], [14, 6], [16, 60], [-16, 60]], '#8a7b64'); F(ngon(0, 70, 20, 7), '#7a6e5c'); F([[-6, 20], [2, 36], [-4, 48]], '#ffa94d', { flat: 1, a: 0.6 }); });
        else F(ngon(-50, -120, 10, 6), '#3b2f2a', { flat: 1 });
        F([[-52, -40], [-62, -110], [-36, -150], [36, -150], [62, -110], [52, -40]], '#8a7b64');
        for (const [x, y, r] of [[-30, -120, 14], [18, -128, 12], [30, -80, 10], [-36, -70, 12], [0, -60, 8]]) F(ngon(x, y, r, 6, 0.4), '#9c8c72');
        F(ngon(0, -100, 14, 8), '#3b2f2a'); F(ngon(0, -100, 9 + (p.glow || 0) * 3, 8), '#ff922b', { flat: 1 }); F(ngon(0, -100, 4, 6), '#fff3bf', { flat: 1 });
        F([[-8, -100], [-24, -80], [-30, -60]], '#ffa94d', { flat: 1, a: 0.5 }); F([[8, -100], [26, -120], [34, -138]], '#ffa94d', { flat: 1, a: 0.5 });
        F([[-6, -130], [0, -146], [6, -130]], '#2b8a3e', { flat: 1, a: 0.7 });
        W(() => { mv(6, -166); X().rotate((p.hd || 0) * DG); F([[-18, 14], [-20, -6], [-10, -18], [12, -18], [22, -4], [18, 14]], '#7a6e5c'); eyeGlow(0, -2, 3, '#ffa94d'); eyeGlow(12, -2, 3, '#ffa94d'); F(Rr(-4, 6, 18, 2), '#3b2f2a', { flat: 1 }); if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); } });
        if (armR) W(() => { mv(54, -122); rl(40 + (p.arm || 0) * 100); F(ngon(0, 0, 20, 6), '#8a7b64'); F([[-16, 6], [16, 6], [18, 64], [-18, 64]], '#9c8c72'); F(ngon(0, 76, 24, 7), '#8a7b64'); F([[4, 20], [-4, 40], [6, 54]], '#ffa94d', { flat: 1, a: 0.6 }); });
        else F(ngon(54, -122, 10, 6), '#3b2f2a', { flat: 1 });
      });
    } },

    /* ===== 9장: 재봉실 ===== */
    sewdoll: HF({ build: 'slim', skin: '#f3e3d3', top: '#d6336c', sleeve: '#f3e3d3', skirt: '#a61e4d', pants: '#f3e3d3', boot: '#5c3d2e', hair: '#ffa94d', hairBack: 'twin', bangs: 'std', mask: MASK.stitch(), wR: 'needle', el: '#f783ac', idle: 'bounce' }),
    spoolspider: { sc: 1.35, box: [50, 40], el: '#f783ac', draw: (p, t) => {
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) W(() => { mv(s * 6, -20); X().rotate((s * (30 + i * 22) + Math.sin(t / 160 + i + s) * 6) * DG); F([[-1.2, 0], [1.2, 0], [1, -22], [-1, -22]], '#495057'); mv(0, -22); X().rotate(s * 1.4); F([[-1, 0], [1, 0], [0.6, -16], [-0.6, -16]], '#343a40'); });
      F(Rr(-14, -34, 28, 6), '#8b5a2b'); F(Rr(-14, -12, 28, 6), '#8b5a2b');
      F(Rr(-10, -28, 20, 16), '#f783ac'); for (let i = 0; i < 4; i++) F(Rr(-10, -27 + i * 4, 20, 1), '#c2255c', { flat: 1 });
      eyeGlow(12, -20, 1.8, '#ff6b6b'); eyeGlow(16, -24, 1.4, '#ff6b6b'); eyeGlow(16, -16, 1.4, '#ff6b6b');
    } },
    cutter: HF({ top: '#343a40', sleeve: '#2b2d31', pants: '#212529', boot: '#141517', chest: ['strap', 'collarV'], strapC: '#f783ac', collar: '#f8f9fa', wR: 'claw', hair: '#212529', bangs: 'cover', hairBack: 'short', eye: '#f783ac', el: '#f783ac',
      front: (D, S, p, t) => {} }),
    mender: HF({ sc: 1.7, build: 'normal', top: '#5f3dc4', sleeve: '#5133a8', robe: 1, robeC: '#5133a8', pants: '#2b1f4a', boot: '#1a1230', belt: '#f783ac', chest: ['strap'], strapC: '#f783ac', wR: 'needle', off: null, hair: '#e9ecef', hairBack: 'long', bangs: 'neat', mask: MASK.stitch(), el: '#f783ac',
      back: [(D, S, p, t) => { for (let i = 0; i < 4; i++) ribbon(-4, -S.th + 4 + i * 4, 30, 1.6, 1, (150 + i * 14) * DG, t + i * 100, '#f783ac', 5, 8, 300); }] }),
    seamstress: { boss: 1, sc: 1.2, box: [100, 150], el: '#f783ac', shadow: 2, draw: (p, t, a) => {
      mv(0, sw(t, 500, 2));
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) W(() => { mv(s * 10, -50); X().rotate((s * (40 + i * 30) + Math.sin(t / 220 + i * 2 + s) * 8) * DG); F([[-2, 0], [2, 0], [1.6, -34], [-1.6, -34]], '#5f3dc4'); mv(0, -34); X().rotate(s * 1.1); F([[-1.6, 0], [1.6, 0], [0, -30]], '#dee2e6'); });
      F(ngon(0, -50, 22, 10, 0, 16), '#5f3dc4'); for (let i = 0; i < 3; i++) F(ngon(0, -50, 20 - i * 6, 10, 0, 14 - i * 4), i % 2 ? '#7048e8' : '#f783ac', { facet: false, a: 0.8 });
      W(() => { mv(0, -64); X().rotate((p.lean || 0) * 0.5 * DG);
        F([[-10, 0], [10, 0], [12, -40], [-12, -40]], '#3b1f8c');
        ribbon(-10, -36, 34, 3, 3, 70 * DG, t, '#fcc419', 5, 3, 400);
        for (let i = 0; i < 2; i++) for (const s of [-1, 1]) W(() => { mv(s * 11, -34 + i * 10); rl(s < 0 ? -30 - i * 30 - (p.arm || 0) * 30 : 50 + i * 40 + (p.arm || 0) * 70); F([[-2.4, 0], [2.4, 0], [2, 26], [-2, 26]], '#f3e3d3'); if (s > 0 && i === 0) { mv(0, 26); rl(60); F([[-2, 0], [2, 0], [8, 22], [6, 24]], '#dee2e6'); F([[-2, 0], [2, 0], [-6, 22], [-8, 22]], '#ced4da'); } });
        W(() => { mv(0, -52); X().rotate((p.hd || 0) * DG);
          F([[-11, -12], [11, -12], [12, 8], [6, 13], [-8, 13], [-11, 8]], '#f3e3d3');
          F([[-14, -8], [-12, -18], [0, -22], [12, -18], [14, -6], [8, -12], [-6, -12]], '#212529');
          F([[-14, -8], [-18, 14], [-10, 16], [-8, -4]], '#212529');
          for (const x of [1, 8]) { F(ngon(x, 0, 2.4, 8), '#212529', { flat: 1 }); F(Rr(x - 2, -0.5, 4, 1), '#f783ac', { flat: 1 }); }
          F(Rr(3, 7, 5, 1), '#862e3a', { flat: 1 }); for (let i = 0; i < 3; i++) F(Rr(3.4 + i * 1.8, 6, 0.6, 3), '#862e3a', { flat: 1 });
          F(ngon(0, -22, 5, 6), '#fcc419'); F(ngon(0, -22, 1.6, 6), '#5c3d2e', { flat: 1 });
          if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); }
        });
      });
    } },

    /* ===== 10장: 달의 정원 ===== */
    gardener: HF({ top: '#2b3a5c', sleeve: '#24314f', pants: '#1e2a40', boot: '#14213d', chest: ['apron'], apron: '#5c6b8a', wR: 'claw', hair: '#dbe4ff', bangs: 'cover', hairBack: 'short', eye: '#bac8ff', el: '#bac8ff', skin: '#c5cae0',
      hat: () => { F([[-22, -10], [22, -10], [18, -6], [-18, -6]], '#a68a64'); F([[-12, -10], [12, -10], [8, -20], [-8, -20]], '#b59f75'); F(Rr(-12, -13, 24, 3), '#5c6b8a', { facet: false }); } }),
    moth: { sc: 1.4, box: [44, 40], el: '#e5dbff', draw: (p, t) => {
      mv(0, -46 + sw(t, 300, 5)); const f = Math.sin(t / 70) * 0.5 + 0.5;
      for (const [s, c] of [[-1, '#9775fa'], [1, '#b197fc']]) W(() => { X().scale(1, 0.6 + f * 0.4 * s * s); F([[0, 0], [-20, -22 * (s > 0 ? 1 : 0.85)], [-30, -4], [-14, 6]], c); F([[0, 2], [-14, 16], [-8, 20], [2, 8]], shd(c, 0.85)); F(ngon(-16, -8, 4, 6), '#f8f0fc', { flat: 1, a: 0.8 }); });
      F([[-4, -6], [8, -6], [10, 6], [-6, 8]], '#5f3dc4');
      F(ngon(10, -4, 5, 6), '#7048e8'); eyeGlow(12, -5, 1.8, '#e5dbff');
      F([[10, -8], [14, -18], [12, -8]], '#e5dbff', { flat: 1 }); F([[12, -8], [20, -15], [14, -7]], '#e5dbff', { flat: 1 });
    } },
    golem: { sc: 1.35, box: [50, 70], el: '#bac8ff', draw: (p, t) => {
      for (const s of [-1, 1]) W(() => { mv(s * 10, -24); rl(s * 6); F(Rr(-6, 0, 12, 24), '#748ffc'); });
      W(() => { mv(0, -24); X().rotate((p.lean || 0) * 0.5 * DG);
        F([[-22, 0], [-26, -34], [-14, -48], [14, -48], [26, -34], [22, 0]], '#91a7ff');
        F(ngon(0, -26, 7, 6), '#e5dbff', { flat: 1 }); F(ngon(0, -26, 3.5, 6), '#ffffff', { flat: 1 });
        for (const s of [-1, 1]) W(() => { mv(s * 24, -38); rl(s < 0 ? -10 : 30 + (p.arm || 0) * 80); F([[-7, 0], [7, 0], [8, 30], [-8, 30]], '#748ffc'); F(ngon(0, 34, 9, 6), '#91a7ff'); });
        W(() => { mv(2, -54); F([[-12, 8], [-12, -6], [-6, -12], [8, -12], [12, -4], [12, 8]], '#748ffc'); eyeGlow(4, -2, 2.2, '#e5dbff'); eyeGlow(-3, -2, 1.6, '#e5dbff'); });
      });
    } },
    sundial: HF({ sc: 1.7, build: 'normal', top: '#f1f3f5', sleeve: '#e9ecef', robe: 1.05, robeC: '#dee2e6', pants: '#adb5bd', boot: '#868e96', belt: '#fab005', chest: ['sash'], sashC: '#fab005', wR: 'staff', orb: '#ffe066', grip: '#fab005', hat: HAT.hood('#e9ecef'), hair: '#495057', bangs: 'neat', eye: '#fab005', eyesClosed: 1, el: '#ffe066',
      back: [(D, S, p, t) => W(() => { mv(-2, -S.th - 22); X().rotate(t / 3000); ring(0, 0, 26, 26, 3, '#fab005', 16); for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; F([[Math.cos(an) * 20, Math.sin(an) * 20], [Math.cos(an) * 25, Math.sin(an) * 25], [Math.cos(an + 0.08) * 25, Math.sin(an + 0.08) * 25]], '#ffe066', { flat: 1 }); } })] }),
    moons: { boss: 1, sc: 1.2, box: [130, 140], el: '#e5dbff', shadow: 1.4, draw: (p, t, a) => {
      const act = (a && a.gim && a.gim.active) || 'silver';
      mv(0, -90);
      const moon = (cx, cy, col, dark, on, s) => W(() => {
        mv(cx, cy); X().scale(on ? 1 : 0.82, on ? 1 : 0.82);
        if (!on) X().globalAlpha *= 0.65;
        for (let i = 0; i < 3; i++) ribbon(-4 * s, 20, 50, 8, 1, (90 + i * 10 * s) * DG, t + i * 300, col, 6, 8, 300, { a: 0.6 });
        const cr = [];
        for (let i = 0; i <= 12; i++) { const an = (-119 + i * 238 / 12) * DG; cr.push([Math.cos(an) * 34 * s, Math.sin(an) * 34]); }
        for (let i = 0; i <= 12; i++) { const an = (99 - i * 198 / 12) * DG; cr.push([(-12 + Math.cos(an) * 30) * s, Math.sin(an) * 30]); }
        F(ngon(0, 0, 34, 16), dark ? '#2b2440' : '#c5cae0', { flat: 1, a: 0.18 });
        F(cr, col);
        const ex = 24 * s;
        F([[ex - 4, -6], [ex + 4, -8], [ex + 4, -5.6], [ex - 4, -4]], dark ? '#e64980' : '#5f3dc4', { flat: 1 });
        F([[ex - 3, 8], [ex + 3, 10], [ex - 3, 12]], dark ? '#e64980' : '#5f3dc4', { flat: 1 });
        if (on && VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); }
      });
      const r = t / 3000;
      moon(-40 + Math.cos(r) * 6, Math.sin(r) * 8, '#e9ecef', false, act === 'silver', 1);
      moon(40 - Math.cos(r) * 6, -Math.sin(r) * 8, '#5a5470', true, act === 'black', -1);
      for (let i = 0; i < 10; i++) { const an = t / 1500 + i / 10 * Math.PI * 2; F(ngon(Math.cos(an) * 80, Math.sin(an) * 30 + 10, 1.6, 4), i % 2 ? '#e5dbff' : '#e64980', { flat: 1 }); }
    } },

    /* ===== 11장: 거울의 방 ===== */
    reflection: HF({ build: 'slim', skin: '#d0ebff', top: '#a5d8ff', sleeve: '#74c0fc', pants: '#4dabf7', boot: '#1c7ed6', noHair: 1, mask: MASK.shard(), wR: 'shard', el: '#d0ebff', idle: 'float',
      aura: (D, S, p, t) => { for (let i = 0; i < 5; i++) { const an = t / 700 + i * 1.3; F([[Math.cos(an) * 22, -40 + Math.sin(an) * 30], [Math.cos(an) * 22 + 3, -40 + Math.sin(an) * 30 + 6], [Math.cos(an) * 22 - 2, -40 + Math.sin(an) * 30 + 4]], '#ffffff', { flat: 1, a: 0.7 }); } } }),
    warped: HF({ build: 'heavy', top: '#4a3b5c', sleeve: '#3d304f', pants: '#2b2238', boot: '#1a1424', skin: '#b8a8c8', hair: '#2b2238', bangs: 'cover', hairBack: 'wavy', eye: '#e599f7', el: '#e599f7', wR: 'claw', hold: { aR: 50, wR: 20, aL: -30, lL: -14, lR: 6, lean: 18 }, idle: 'heavy' }),
    mirrorarmor: HF({ build: 'heavy', top: '#ced4da', sleeve: '#adb5bd', pants: '#adb5bd', boot: '#868e96', pauldron: '#e9ecef', glove: '#adb5bd', chest: ['tabard'], tabard: '#d0ebff', wR: 'sword', blade: '#e7f5ff', off: 'tower', hat: HAT.greathelm, visor: '#e599f7', plume: '#e599f7', noHair: 1, ear: false, mask: () => {}, el: '#d0ebff' }),
    otherpax: HF({ sc: 1.6, el: '#e599f7' }),
    mirror: { boss: 1, sc: 1.65, box: [40, 90], el: '#e599f7', human: 1, mirror: 1 },

    /* ===== 12장: 망각의 강 ===== */
    shade: { sc: 1.45, box: [34, 64], el: '#868e96', draw: (p, t) => {
      mv(0, -18 + sw(t, 520, 4));
      ribbon(0, -4, 34, 22, 3, 95 * DG, t, '#212529', 6, 7, 280, { a: 0.75 });
      F([[-13, 0], [-15, -28], [-8, -44], [8, -44], [15, -28], [13, 0], [0, 6]], '#25262b', { a: 0.9 });
      F([[-9, -30], [-6, -40], [6, -40], [9, -30], [5, -24], [-5, -24]], '#0b0b12', { flat: 1 });
      eyeGlow(0, -32, 1.8, '#e9ecef'); eyeGlow(6, -32, 1.8, '#e9ecef');
      for (const s of [-1, 1]) ribbon(s * 12, -24, 20, 5, 1, (s < 0 ? 140 : 30 - (p.arm || 0) * 30) * DG, t + s * 200, '#343a40', 4, 7, 220, { a: 0.7 });
    } },
    memeater: { sc: 1.35, box: [50, 44], el: '#be4bdb', draw: (p, t) => {
      const s = 1 + Math.sin(t / 300) * 0.05, o = (p.open || 0);
      W(() => { X().scale(1 / s, s);
        F([[-26, 0], [-28, -20], [-18, -38], [0, -44], [18, -38], [28, -20], [26, 0]], '#3b1f4a');
        F([[-20, -4], [-22, -18], [-12, -30], [10, -32], [20, -20], [18, -4]], '#5c2b6e', { rim: false, a: 0.6 });
        F([[-2, -16 - o * 4], [24, -18 - o * 6], [24, -6 + o * 6], [-2, -8]], '#141017', { flat: 1 });
        for (let i = 0; i < 4; i++) { F([[2 + i * 6, -16 - o * 4], [5 + i * 6, -12], [8 + i * 6, -16 - o * 4]], '#f1f3f5', { flat: 1 }); F([[2 + i * 6, -8 + o * 4], [5 + i * 6, -12 + o * 2], [8 + i * 6, -8 + o * 4]], '#f1f3f5', { flat: 1 }); }
        for (const [x, y, r] of [[-12, -30, 3], [0, -36, 2.2], [12, -30, 2.6], [-18, -18, 2]]) eyeGlow(x, y, r, '#e599f7');
      });
      for (let i = 0; i < 4; i++) { const k = (t / 1200 + i / 4) % 1; F(ngon(-30 + i * 20, -48 - k * 30, 1.6, 4), '#e599f7', { flat: 1, a: 1 - k }); }
    } },
    attendant: HF({ top: '#868e96', sleeve: '#7a828a', coat: 0.9, coatC: '#7a828a', pants: '#495057', boot: '#343a40', belt: '#adb5bd', chest: ['buttons'], btn: '#e9ecef', wR: 'lantern', off: 'watch', skin: '#ced4da', hair: '#e9ecef', bangs: 'neat', eye: '#e9ecef', mask: MASK.void(), el: '#e9ecef',
      hat: () => { F([[-16, -11], [17, -11], [19, -8], [-14, -8]], '#495057'); F([[-13, -11], [13, -11], [12, -20], [-12, -20]], '#868e96'); } }),
    gatekeeper: HF({ build: 'heavy', sc: 1.8, top: '#343a40', sleeve: '#2b2d31', pants: '#212529', boot: '#141517', pauldron: '#495057', glove: '#343a40', chest: ['tabard'], tabard: '#5c5f66', wR: 'spear', grip: '#212529', blade: '#e9ecef', off: 'tower', hat: HAT.greathelm, visor: '#e9ecef', plume: '#868e96', noHair: 1, ear: false, mask: () => {}, el: '#e9ecef', back: [BACK.cape('#25262b', true)] }),
    lethe: { boss: 1, sc: 1.2, box: [120, 160], el: '#e9ecef', shadow: 2.2, draw: (p, t, a) => {
      const ph = (a && a.gim && a.gim.phase) || 1;
      if (ph === 1) {
        mv(0, sw(t, 900, 3));
        for (let i = 0; i < 6; i++) ribbon(-50 + i * 20, -6, 40, 10, 2, (10 + i * 30) * DG, t + i * 300, '#4dabf7', 5, 6, 320, { a: 0.5 });
        F([[-40, 0], [-34, -90], [-20, -130], [20, -130], [34, -90], [40, 0]], '#c5cae0', { a: 0.85 });
        F([[-34, -90], [34, -90], [40, 0], [-40, 0]], '#adb5bd', { a: 0.4, rim: false });
        W(() => { mv(0, -146); F(ngon(0, 0, 20, 10), '#dbe4ff'); F([[-26, -8], [-20, -24], [20, -24], [26, -8], [30, 40], [-30, 40]], '#e9ecef', { a: 0.75 }); eyeGlow(-6, 2, 2, '#4dabf7'); eyeGlow(8, 2, 2, '#4dabf7'); if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); } });
        for (const s of [-1, 1]) W(() => { mv(s * 30, -116); rl(s < 0 ? -20 - (p.arm || 0) * 30 : 40 + (p.arm || 0) * 80); F([[-5, 0], [5, 0], [4, 60], [-4, 60]], '#c5cae0', { a: 0.85 }); F(ngon(0, 64, 6, 6), '#dbe4ff'); });
      } else if (ph === 2) {
        mv(0, -10);
        for (let i = 0; i < 9; i++) { const k = i / 8, x = -70 + k * 110 + Math.sin(t / 400 + k * 5) * 10, y = -k * 110 - Math.sin(k * Math.PI) * 30 + Math.cos(t / 500 + k * 4) * 6; F(ngon(x, y, 22 - k * 8, 8, k), i % 2 ? '#1c7ed6' : '#339af0'); }
        W(() => { const x = 40 + Math.sin(t / 400 + 5) * 10, y = -120 + Math.cos(t / 500 + 4) * 6; mv(x + 10, y); X().rotate((p.lean || 0) * DG * 0.5);
          F([[-14, -12], [18, -14], [36, -4], [34, 6], [-12, 10]], '#1864ab');
          W(() => { mv(0, 6); X().rotate((p.open || 0) * 0.5); F([[0, 0], [32, 2], [30, 8], [2, 10]], '#1c7ed6'); });
          F([[-16, -14], [20, -16], [26, -2], [-18, 20]], '#e9ecef', { a: 0.7 });
          eyeGlow(14, -6, 2.6, '#e7f5ff'); if (VR.tip) { const m = X().getTransform(); VR.tip(m.a * 34 + m.e, m.b * 34 + m.f); }
        });
      } else {
        mv(0, -40 + sw(t, 700, 4));
        for (let i = 0; i < 12; i++) { const an = t / 2000 + i / 12 * Math.PI * 2; F([[Math.cos(an) * 60, -60 + Math.sin(an) * 60], [Math.cos(an) * 90, -60 + Math.sin(an) * 90], [Math.cos(an + 0.08) * 90, -60 + Math.sin(an + 0.08) * 90]], '#ffffff', { flat: 1, a: 0.5 }); }
        F([[-26, 30], [-20, -60], [-10, -96], [10, -96], [20, -60], [26, 30]], '#f8f9fa');
        W(() => { mv(0, -112); F(ngon(0, 0, 18, 10), '#ffffff'); F([[-4, -16], [2, -2], [-2, 6], [4, 16]], '#adb5bd', { flat: 1 }); eyeGlow(-6, 0, 2, '#212529'); eyeGlow(7, 0, 2, '#212529'); if (VR.tip) { const m = X().getTransform(); VR.tip(m.e, m.f); } });
        for (const s of [-1, 1]) W(() => { mv(s * 20, -86); rl(s < 0 ? -30 - (p.arm || 0) * 40 : 60 + (p.arm || 0) * 70); F([[-3, 0], [3, 0], [2, 50], [-2, 50]], '#f1f3f5'); });
      }
    } },
  };
  for (const k in L) { L[k].id = k; if (L[k].human && !L[k].hold) L[k].hold = { aR: 20, wR: 120, aL: -10, lL: -8, lR: 8 }; }
  return L;
})();

/* 거울 보스·또 다른 승객: 영웅 외형을 어둡게 뒤집어 쓴다 */
function darkLook(base, o = {}) {
  const D = Object.assign({}, base);
  const inv = c => typeof c === 'string' && c[0] === '#' ? VR.mix(VR.shd(c, 0.55), '#5f3dc4', 0.35) : c;
  for (const k of ['top', 'sleeve', 'pants', 'boot', 'coatC', 'robeC', 'skirt', 'belt', 'glove', 'apron', 'tabard', 'collar']) if (D[k]) D[k] = inv(D[k]);
  D.skin = o.skin || '#b8b0d0'; D.hair = o.hair || '#1a1b1e'; D.hair2 = o.hair2 || '#141517'; D.eye = o.eye || '#f8f9fa'; D.blush = false; D.el = o.el || '#e599f7';
  D.aura = (DD, S, p, t) => { for (let i = 0; i < 6; i++) { const an = t / 800 + i; VR.F([[Math.cos(an) * 24, -44 + Math.sin(an) * 34], [Math.cos(an) * 24 + 4, -44 + Math.sin(an) * 34 + 7], [Math.cos(an) * 24 - 3, -44 + Math.sin(an) * 34 + 5]], i % 2 ? '#e599f7' : '#d0ebff', { flat: 1, a: 0.7 }); } };
  return D;
}
FOE_LOOK.mirror = Object.assign(darkLook(HERO_LOOK.duelist), { id: 'mirror', boss: 1, sc: 1.65, box: [40, 90], mirror: 1, human: 1 });
FOE_LOOK.otherpax = Object.assign(darkLook(HERO_LOOK.gambler, { el: '#d0ebff' }), { id: 'otherpax', sc: 1.6, box: [34, 78], human: 1 });
