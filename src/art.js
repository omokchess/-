'use strict';
/* ===== 잔향선 · SVG 캐릭터 아트 =====
 * 모든 인물은 viewBox 0 0 100 120 (보스는 0 0 140 120), 발밑 y=114.
 * 움직이는 부분은 클래스로 표시한다: f-all(호흡) f-sway(흔들림) f-glow(맥동) f-float(부유) f-spin(회전) f-flick(불꽃) f-flap(날갯짓) f-press(피스톤)
 */
const ART = (() => {
  const INK = '#12171b';
  const OL = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, f, x = '') => `<path d="${d}" fill="${f}" ${OL} ${x}/>`;
  const PN = (d, f, x = '') => `<path d="${d}" fill="${f}" ${x}/>`;
  const C = (cx, cy, r, f, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${OL} ${x}/>`;
  const CN = (cx, cy, r, f, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${x}/>`;
  const E = (cx, cy, rx, ry, f, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${OL} ${x}/>`;
  const EN = (cx, cy, rx, ry, f, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${x}/>`;
  const R = (x, y, w, h, rx, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${OL} ${e}/>`;
  const RN = (x, y, w, h, rx, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
  const L = (d, c, w, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const limb = (d, c, w = 7) => L(d, INK, w + 3) + L(d, c, w);
  const G = (cls, inner, o) => `<g class="${cls}"${o ? ` style="transform-origin:${o}"` : ''}>${inner}</g>`;
  const shadow = (cx = 50, rx = 22) => `<ellipse class="f-shadow" cx="${cx}" cy="114" rx="${rx}" ry="3.5" fill="#000" opacity=".42"/>`;
  const shade = d => PN(d, '#000', 'opacity=".2"');
  const scaleAt = (s, inner, cx = 50) => s === 1 ? inner : `<g transform="translate(${cx} 114) scale(${s}) translate(${-cx} -114)">${inner}</g>`;
  const svg = (inner, vb = '0 0 100 120', cls = '') => `<svg class="art ${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;

  /* ---------- 공통 부품 ---------- */
  const neck = skin => R(46.5, 50, 7, 8, 2, skin);
  const head = (skin, cy = 40, r = 15) => C(50, cy, r, skin);
  const hand = (x, y, skin) => C(x, y, 3.2, skin);
  const legs = (c, boot = INK, top = 92) => R(41.5, top, 6.5, 113 - top, 3, c) + R(52, top, 6.5, 113 - top, 3, c) + P('M40,109 h9 v4.5 h-10 z', boot) + P('M51,109 h9.5 v4.5 h-9.5 z', boot);
  function eyes(st, c = '#2a2320', o = {}) {
    const a = o.x1 || 44, b = o.x2 || 56, y = o.y || 42.5;
    const hl = (x) => CN(x + 0.7, y - 0.9, 0.7, '#fff', 'opacity=".9"');
    switch (st) {
      case 'calm': return EN(a, y, 1.9, 2.5, c) + EN(b, y, 1.9, 2.5, c) + hl(a) + hl(b);
      case 'big': return EN(a, y, 2.4, 3, c) + EN(b, y, 2.4, 3, c) + hl(a) + hl(b) + CN(a - 0.6, y + 1, 0.5, '#fff', 'opacity=".6"') + CN(b - 0.6, y + 1, 0.5, '#fff', 'opacity=".6"');
      case 'sharp': return PN(`M${a - 3},${y - 1.6} L${a + 2.6},${y - 0.4} L${a + 2},${y + 1.6} L${a - 2.4},${y + 0.8} Z`, c) + PN(`M${b + 3},${y - 1.6} L${b - 2.6},${y - 0.4} L${b - 2},${y + 1.6} L${b + 2.4},${y + 0.8} Z`, c);
      case 'closed': return L(`M${a - 2.5},${y} Q${a},${y - 2.2} ${a + 2.5},${y}`, c, 1.3) + L(`M${b - 2.5},${y} Q${b},${y - 2.2} ${b + 2.5},${y}`, c, 1.3);
      case 'happy': return L(`M${a - 2.5},${y + 0.6} Q${a},${y - 2.6} ${a + 2.5},${y + 0.6}`, c, 1.4) + L(`M${b - 2.5},${y + 0.6} Q${b},${y - 2.6} ${b + 2.5},${y + 0.6}`, c, 1.4);
      case 'tired': return L(`M${a - 2.4},${y - 0.8} L${a + 2.4},${y - 0.8}`, c, 1.2) + PN(`M${a - 2},${y - 0.6} Q${a},${y + 2.6} ${a + 2},${y - 0.6} Z`, c) + L(`M${b - 2.4},${y - 0.8} L${b + 2.4},${y - 0.8}`, c, 1.2) + PN(`M${b - 2},${y - 0.6} Q${b},${y + 2.6} ${b + 2},${y - 0.6} Z`, c);
      case 'one': return EN(b, y, 1.9, 2.4, c) + hl(b);
      case 'glow': return EN(a, y, 2.1, 1.4, c) + EN(b, y, 2.1, 1.4, c) + `<g class="f-glow">${EN(a, y, 3.4, 2.4, c, 'opacity=".35"')}${EN(b, y, 3.4, 2.4, c, 'opacity=".35"')}</g>`;
      default: return '';
    }
  }
  const mouth = (st, c = '#5a2a22') => ({
    small: L('M48.4,49.5 Q50,50.6 51.6,49.5', c, 1.1),
    flat: L('M48,49.8 L52,49.8', c, 1.1),
    smirk: L('M48,49.8 Q51,50.8 53,48.6', c, 1.1),
    smile: L('M47,48.8 Q50,51.8 53,48.8', c, 1.2),
    frown: L('M47.6,50.6 Q50,48.8 52.4,50.6', c, 1.1),
    open: E(50, 50, 1.8, 2.2, '#3a1414'),
  })[st] || '';

  /* ---------- 승객 10명 ---------- */
  function serin() {
    const skin = '#f3d6bf', hair = '#5a1f24', coat = '#ebe5d8';
    return svg(shadow() + G('f-all',
      G('f-sway', P('M57,27 C75,25 82,44 77,66 C74,80 67,90 62,97 C64,82 66,66 61,49 Z', hair), '60px 28px') +
      legs('#2a2228', '#3a1e20') +
      P('M37,57 C40,53 60,53 63,57 L68,97 C58,101 42,101 32,97 Z', coat) +
      shade('M50,55 L63,57 L68,97 C62,99 56,100 50,100 Z') +
      L('M50,56 L50,99', '#c4473a', 2.4) +
      P('M36.5,75 L63.5,73 L64,79 L36,81 Z', '#b23a30') + P('M41,80 L37,93 L43,90 Z', '#b23a30') +
      limb('M38,60 C34,68 33,76 34,84', coat) + hand(34, 85, skin) +
      limb('M62,60 C67,64 70,69 72,74', coat) +
      neck(skin) + head(skin) + eyes('sharp', '#8a2626') + mouth('flat') +
      P('M35,40 C34,26 44,22 52,23 C61,23 66,30 66,40 C63,34 58,31 54,32 C53,36 47,37 44,34 C41,37 38,38 35,40 Z', hair) +
      P('M35,38 C33,46 34,52 36,56 C37,50 38,45 39.5,40 Z', hair) +
      P('M57,26 l4,-3 l1,4 l3,1 l-4,2 z', '#c4473a') +
      G('f-sway', L('M76,72 L96,46', '#d9dde2', 2) + L('M76,72 L96,46', INK, 0.6, 'opacity=".4"') + C(75, 74, 3.4, '#c9ccd2') + PN('M95,45 l2,-1.5 l-0.6,2.6 z', '#c4473a'), '74px 75px') +
      hand(73, 75, skin) +
      G('f-float', PN('M86,60 q1.4,2.2 0,3.2 q-1.4,-1 0,-3.2z', '#c4473a', 'opacity=".9"') + PN('M90,66 q1.1,1.8 0,2.6 q-1.1,-0.8 0,-2.6z', '#c4473a', 'opacity=".7"'))
    ));
  }
  function doyun() {
    const skin = '#e6c2a2', robe = '#1f2127';
    return svg(shadow() + G('f-all',
      P('M37,57 C40,53 60,53 63,57 L69,109 C58,113 42,113 31,109 Z', robe) +
      shade('M50,55 L63,57 L69,109 C62,111 56,112 50,112 Z') +
      P('M43,56 L41,101 L46.5,101 L47,57 Z', '#e07b2c') + P('M57,56 L59,101 L53.5,101 L53,57 Z', '#e07b2c') +
      L('M43.7,95 L43.7,99 M42.2,97 L45.2,97 M56.3,95 L56.3,99 M54.8,97 L57.8,97', '#fff3df', 1) +
      P('M40,110 h8 v4 h-9 z', INK) + P('M52,110 h8.5 v4 h-8.5 z', INK) +
      limb('M38,60 C33,64 30,68 29,72', robe) + hand(29, 72, skin) +
      G('f-sway', L('M29,74 L27,88', '#8a8a86', 1.2) + P('M22,88 L32,88 L31,98 C29,100 25,100 23,98 Z', '#6a5a4a') + `<g class="f-glow">${CN(27, 93, 3, '#ffb347')}${CN(27, 93, 6, '#e07b2c', 'opacity=".35"')}</g>`, '29px 74px') +
      G('f-float', PN('M27,84 C24,78 30,74 27,68 C33,72 30,78 31,84 Z', '#b9b4aa', 'opacity=".35"')) +
      limb('M62,60 C66,68 67,76 66,82', robe) + R(60, 78, 9, 11, 1.5, '#5a3a2a') + hand(66, 83, skin) +
      neck(skin) + R(45, 53, 10, 3.5, 1, '#f2efe6') +
      head(skin) + eyes('tired', '#2a2320') + mouth('flat') + PN('M58,46 q2,1 3,3', '#5a4a40', 'opacity=".5"') +
      P('M35,39 C34,25 66,25 65,39 C62,31 56,28 50,28 C44,28 38,31 35,39 Z', '#9b9a96') +
      P('M35,38 C34,42 35,46 36,48 L37,39 Z', '#9b9a96') + P('M65,38 C66,42 65,46 64,48 L63,39 Z', '#9b9a96')
    ));
  }
  function haram() {
    const skin = '#f1d0b4', hair = '#4a3426';
    return svg(shadow() + G('f-all',
      legs('#4a4844', '#2a2420', 98) +
      P('M38,57 C40,53 60,53 62,57 L67,101 C58,105 42,105 33,101 Z', '#6b6a66') +
      shade('M50,55 L62,57 L67,101 C61,103 56,104 50,104 Z') +
      P('M35.5,58 C42,53.5 58,53.5 64.5,58 L60,73 L50,69 L40,73 Z', '#c8a043') +
      L('M40,73 L38,79 M60,73 L62,79 M50,69 L50,76', '#c8a043', 1.2) +
      limb('M38,60 C40,64 43,67 46,69', '#c8a043') + limb('M62,60 C60,64 57,67 54,69', '#c8a043') +
      G('f-sway', P('M40,91 C40,77 44,70 50,70 C56,70 60,77 60,91 L63,94 L37,94 Z', '#c8b04f') + PN('M43,90 C43,80 45,74 48,72', '#fff6c8', 'opacity=".45"') + C(50, 96, 2.4, '#8a7a3a') + R(48, 66, 4, 5, 1, '#6a5a3a'), '50px 66px') +
      hand(47, 69, skin) + hand(53, 69, skin) +
      G('f-glow', L('M33,80 Q29,84 33,88 M30,77 Q24,84 30,91', '#c8b04f', 1.2, 'opacity=".7"') + L('M67,80 Q71,84 67,88 M70,77 Q76,84 70,91', '#c8b04f', 1.2, 'opacity=".7"')) +
      neck(skin) + head(skin) + eyes('closed', '#3a2a20') + mouth('small') +
      P('M35,41 C34,25 66,25 65,41 C63,33 57,29 50,29 C43,29 37,33 35,41 Z', hair) + L('M50,27 L50,32', '#2a1c14', 1) +
      G('f-sway', E(62.5, 50, 3.4, 3, hair) + E(63, 56, 3.2, 3, hair) + E(63.4, 62, 3, 2.8, hair) + E(63.6, 67.5, 2.6, 2.6, hair) + P('M61,71 l5,0 l-1,4 l-3,0 z', '#c8a043'), '62px 46px')
    ));
  }
  function eve() {
    const skin = '#f2d9c6', hair = '#9fd3e6', coat = '#23324a';
    return svg(shadow() + G('f-all',
      G('f-sway', P('M36,56 C30,62 28,80 30,93 C36,89 40,74 42,58 Z', coat) + PN('M35,60 C31,66 30,80 31,90 C33,82 36,70 38,60 Z', '#86cde3', 'opacity=".75"'), '38px 57px') +
      R(41.5, 90, 6.5, 22, 3, '#dfe6ea') + R(52, 90, 6.5, 22, 3, '#dfe6ea') + P('M40,101 h9 v12.5 h-10 z', coat) + P('M51,101 h9.5 v12.5 h-9.5 z', coat) +
      P('M38,57 C40,53 60,53 62,57 L64,91 C57,95 43,95 36,91 Z', coat) +
      shade('M50,55 L62,57 L64,91 C58,93 54,94 50,94 Z') +
      L('M45,57 L47,92 M55,57 L53,92', '#86cde3', 1.2) + R(37, 76, 26, 3.5, 1, '#c9a45c') +
      limb('M38,60 C35,66 36,72 40,76', coat) + hand(40, 77, skin) +
      limb('M62,60 C66,64 69,67 71,71', coat) +
      G('f-sway', L('M71,72 L97,94', '#e2e6ea', 1.8) + L('M68,69 L74,75', '#c9a45c', 2.2), '71px 72px') + hand(71, 72, skin) +
      neck(skin) + head(skin) + eyes('sharp', '#2f8fb0') + mouth('smirk') +
      P('M34,44 C31,24 69,24 66,44 L65,52 C62,47 61,38 58,34 C52,30 46,31 41,35 C38,40 38,47 35,52 Z', hair) +
      PN('M42,33 C47,30 53,30 57,32', 'none', `stroke="#d6f1fa" stroke-width="1.2" opacity=".7"`)
    ));
  }
  function mujin() {
    const steel = '#7d8798', steel2 = '#9aa4b4';
    return svg(shadow(50, 26) + G('f-all',
      legs('#5d6676', '#3a404a') +
      P('M34,58 C38,52 62,52 66,58 L68,97 C58,101 42,101 32,97 Z', steel) +
      shade('M50,54 L66,58 L68,97 C62,99 56,100 50,100 Z') +
      L('M38,70 L62,70 M37,82 L63,82', '#5d6676', 1.4) +
      E(35, 59, 7, 5.5, steel2) + E(65, 59, 7, 5.5, steel2) +
      limb('M65,62 C69,70 70,78 69,85', steel) + C(69, 86, 3.6, '#5d6676') +
      L('M69,86 L72,108', '#5a4632', 2.6) + R(66, 104, 12, 7, 1.5, '#6a7282') +
      head('#6d7686', 40, 15.5) +
      P('M34,42 C34,22 66,22 66,42 L66,52 L34,52 Z', '#8f9bb0') +
      shade('M50,23 C60,23 66,30 66,42 L66,52 L50,52 Z') +
      R(37, 39, 26, 4.5, 1.5, '#1a1e24') + G('f-glow', CN(44, 41.2, 1.1, '#dff3ff') + CN(56, 41.2, 1.1, '#dff3ff')) +
      L('M50,24 C50,16 57,13 62,17', '#b23a30', 3) +
      P('M21,58 L48,58 L48,96 C48,104 36,110 34.5,110 C33,110 21,104 21,96 Z', '#5d6878') +
      PN('M24,61 L45,61 L45,95 C45,101 36,106 34.5,106 C33,106 24,101 24,95 Z', 'none', `stroke="#c9a45c" stroke-width="1.4"`) +
      L('M34.5,66 L34.5,98 M27,79 L42,79', '#c9a45c', 2) +
      C(34, 64, 3.4, '#5d6676')
    ), '0 0 100 120');
  }
  function roa() {
    const skin = '#f0d2bb', suit = '#1f1b1e';
    return svg(shadow() + G('f-all',
      legs('#1a171a', '#0e0c0e') +
      P('M38,57 C40,53 60,53 62,57 L65,96 C57,100 43,100 35,96 Z', suit) +
      P('M44,56 L50,76 L56,56 Z', '#dca23a') + L('M50,62 L50,74', '#7a5a1a', 1) + CN(50, 66, 0.9, '#7a5a1a') + CN(50, 71, 0.9, '#7a5a1a') +
      shade('M56,56 L62,57 L65,96 C60,98 56,99 52,99 Z') +
      limb('M38,60 C34,66 33,74 35,80', suit) + hand(35, 81, skin) +
      `<g transform="rotate(-18 34 84)">${R(30, 78, 6, 9, 1, '#f2ede0')}${R(33, 77, 6, 9, 1, '#f2ede0')}${R(36, 77, 6, 9, 1, '#f2ede0')}${PN('M38.3,80 l1.2,1.6 l-1.2,1.6 l-1.2,-1.6z', '#c4473a')}</g>` +
      limb('M62,60 C67,57 70,54 71,51', suit) + hand(71, 50, skin) +
      G('f-float', `<g class="f-coin">${C(74, 38, 4, '#e8c060')}${CN(74, 38, 2.2, '#c99a2a')}</g>`) +
      neck(skin) + head(skin) +
      P('M35,34 C33,40 34,48 37,53 L39.5,38 Z', '#3a2a24') + P('M65,34 C67,40 66,48 63,53 L60.5,38 Z', '#3a2a24') +
      P('M36,36 C36,30 64,30 64,36 L64,46 C60,54 40,54 36,46 Z', '#efe9dd') +
      EN(44, 41, 2.6, 1.8, INK) + EN(56, 41, 2.6, 1.8, INK) + L('M42,47 Q50,53 58,47', '#c4473a', 1.4) + PN('M57,43 q1,3 0,5', 'none', `stroke="#4f87cc" stroke-width="0.9"`) +
      R(39, 13, 22, 16, 1.5, suit) + E(50, 29.5, 18, 3.2, suit) + RN(39.8, 24, 20.4, 3, 0, '#dca23a')
    ));
  }
  function yeon() {
    const skin = '#e9d6cc', coat = '#22305a', hair = '#1b2030';
    return svg(shadow() + G('f-all',
      legs('#1a1e2a', '#10121a', 100) +
      P('M37,57 C40,53 60,53 63,57 L70,105 C58,109 42,109 30,105 Z', coat) +
      shade('M50,55 L63,57 L70,105 C62,107 56,108 50,108 Z') +
      L('M50,58 L50,104', '#16203e', 1.2) +
      limb('M38,60 C34,68 33,76 34,82', coat) +
      `<g transform="rotate(-10 32 84)">${R(26, 78, 11, 14, 1, '#ece6d6')}${L('M28,82 L35,82 M28,85 L35,85 M28,88 L33,88', '#8a8478', 0.7)}</g>` + hand(34, 83, skin) +
      limb('M62,60 C66,68 67,76 66,82', coat) + hand(66, 83, skin) +
      G('f-sway', P('M42,56 C50,61 58,59 62,55 L75,62 C81,70 85,80 83,93 C79,85 73,75 66,67 Z', '#4e6fd0') + PN('M68,64 C74,70 78,78 80,86', 'none', `stroke="#7fa0f0" stroke-width="1" opacity=".6"`), '60px 57px') +
      neck(skin) + head(skin) + eyes('one', '#7fb0d8') + L('M53.5,40.5 L58.5,40.5', '#2a2a3a', 1) + mouth('frown', '#6a4a52') +
      P('M34,47 C32,24 68,24 66,45 L66,59 C63,53 62,45 60,39 C56,35 52,35 48,37 C46,43 42,47 40,53 L36,57 Z', hair) +
      P('M40,32 C46,36 47,46 43,53 C42,45 40,39 37.5,35 Z', hair) +
      G('f-float', `<g transform="rotate(14 84 50)">${R(80, 44, 8, 10, 0.8, '#ece6d6')}</g>${CN(76, 34, 1.2, '#9cc4ee', 'opacity=".8"')}${CN(24, 64, 1, '#9cc4ee', 'opacity=".7"')}`)
    ));
  }
  function kai() {
    const skin = '#e3bf9f', coat = '#5f6b3a';
    return svg(shadow() + G('f-all',
      legs('#3a3f2a', '#1e2016') +
      P('M37,57 C40,53 60,53 63,57 L67,98 C57,102 43,102 33,98 Z', coat) +
      shade('M50,55 L63,57 L67,98 C61,100 56,101 50,101 Z') +
      L('M38.5,58 L62,83', '#5a3e22', 4) + L('M42,62 l2,2 M46,66 l2,2 M50,70 l2,2 M54,74 l2,2 M58,78 l2,2', '#dca23a', 1.6) +
      R(36, 84, 28, 3.5, 1, '#3a2c1a') +
      limb('M38,60 C40,66 46,66 52,62', coat) +
      G('f-sway', `<g transform="rotate(-24 60 58)">${R(48, 52, 46, 9, 3, '#3a3f42')}${RN(56, 52.5, 3, 8, 0, '#c9a45c')}${RN(78, 52.5, 3, 8, 0, '#c9a45c')}${R(88, 50, 8, 13, 2, '#2a2e30')}</g>` + `<g class="f-glow">${CN(91, 37, 2.4, '#ffb347')}${CN(91, 37, 5, '#e07b2c', 'opacity=".3"')}</g>`, '60px 60px') +
      limb('M62,60 C66,64 67,68 66,71', coat) + hand(66, 72, skin) + hand(52, 62, skin) +
      neck(skin) + head(skin) + eyes('tired', '#2a2a22') + mouth('flat') + L('M45,45 L51,43', '#a07860', 0.9) +
      P('M35,36 C33,40 34,46 36,49 L38,37 Z', '#2a2018') + P('M65,36 C67,40 66,46 64,49 L62,37 Z', '#2a2018') +
      P('M35,33 C36,22 64,22 65,33 Z', '#4a5430') + P('M33,33 L60,33 L56,37.5 L35,36.5 Z', '#3a4224') + C(50, 27, 2.2, '#c9a45c')
    ));
  }
  function viola() {
    const skin = '#f5dccd', hair = '#cfb2e0', dress = '#b98bcf';
    return svg(shadow(50, 24) + G('f-all',
      G('f-sway', P('M36,32 C24,36 21,58 27,76 C29,64 31,50 38,41 Z', hair) + P('M34,33 l-4,-3 l1,5 z', '#6a3a7a'), '36px 34px') +
      G('f-sway', P('M64,32 C76,36 79,58 73,76 C71,64 69,50 62,41 Z', hair) + P('M66,33 l4,-3 l-1,5 z', '#6a3a7a'), '64px 34px') +
      legs('#f0e8f2', '#4a2a5a', 98) +
      P('M40,57 C42,53 58,53 60,57 L62,72 L73,99 C58,105 42,105 27,99 L38,72 Z', dress) +
      shade('M50,55 L60,57 L62,72 L73,99 C64,102 57,103 50,103 Z') +
      P('M43,64 L57,64 L60,95 L40,95 Z', '#efe6f2') + L('M41,93 q2,2 4,0 q2,2 4,0 q2,2 4,0 q2,2 4,0 q2,2 4,0', '#d6c6dc', 1) +
      limb('M40,60 C37,66 37,74 39,80', dress) + hand(39, 81, skin) +
      limb('M60,60 C65,56 68,52 69,49', dress) + hand(69, 48, skin) +
      `<g class="f-sway" style="transform-origin:70px 46px">${R(62, 44, 16, 3, 1, '#8a6a4a')}${R(68.5, 38, 3, 15, 1, '#8a6a4a')}${L('M63,46 L76,84 M77,46 L80,84 M70,52 L78,82', '#efe6f2', 0.5, 'opacity=".8"')}${C(78, 86, 3, '#f0e0d0')}${P('M75,89 L81,89 L82,98 L74,98 Z', '#6a3a7a')}${L('M75,98 L74,103 M81,98 L82,103', INK, 1.4)}</g>` +
      neck(skin) + head(skin) + eyes('big', '#7a3a9a') + mouth('small', '#9a4a6a') + CN(41, 47, 1.6, '#f0a0b0', 'opacity=".45"') + CN(59, 47, 1.6, '#f0a0b0', 'opacity=".45"') +
      P('M35,42 C34,25 66,25 65,42 L63,36 L59,40 L55,35 L50,39 L45,35 L41,40 L37,36 Z', hair)
    ));
  }
  function sion() {
    const skin = '#f2d4b8', hair = '#7a4e2d';
    return svg(shadow() + G('f-all',
      G('f-spin', C(66, 56, 13, '#8a7a5a') + C(66, 56, 6, '#5a4a32') + L('M66,40 L66,44 M66,68 L66,72 M50,56 L54,56 M78,56 L82,56 M55,45 L58,48 M74,64 L77,67 M55,67 L58,64 M74,48 L77,45', '#8a7a5a', 4), '66px 56px') +
      legs('#4a3a2a', '#2a1e14', 94) +
      P('M38,58 C40,54 60,54 62,58 L64,96 C57,100 43,100 36,96 Z', '#e6dcc5') +
      P('M41,62 L59,62 L61,96 L39,96 Z', '#7a5a3a') + R(45, 76, 10, 7, 1, '#6a4a2e') + C(50, 70, 2.2, '#c9a45c') +
      shade('M50,56 L62,58 L64,96 C58,98 54,99 50,99 Z') +
      limb('M38,61 C35,68 35,76 37,82', '#e6dcc5') + hand(37, 83, skin) +
      limb('M62,61 C66,68 67,74 66,80', '#e6dcc5') +
      G('f-sway', P('M64,82 L76,58 L80,60 L68,84 Z', '#9aa0a8') + P('M74,54 C76,48 84,49 85,55 L81,57 L80,54 L77,55 L78,58 Z', '#9aa0a8'), '66px 81px') + hand(66, 81, skin) +
      neck(skin) + head(skin) + eyes('big', '#3a6a5a') + mouth('smile') +
      P('M35,41 C33,24 67,24 65,41 L62,34 L58,38 L54,31 L50,37 L46,30 L42,37 L38,33 Z', hair) +
      L('M35,31 L65,31', '#4a3a2a', 2.2) + C(44, 30.5, 4, '#9ad0e6') + C(56, 30.5, 4, '#9ad0e6') + CN(43, 29.5, 1.2, '#fff', 'opacity=".8"') + CN(55, 29.5, 1.2, '#fff', 'opacity=".8"')
    ));
  }
  const CHAR_ART = { serin, doyun, haram, eve, mujin, roa, yeon, kai, viola, sion };

  /* ---------- 일반 인간형 생성기 ---------- */
  const ITEMS = {
    pipe: (x, y) => L(`M${x - 2},${y + 3} L${x + 9},${y - 22}`, '#6a6e72', 3.4),
    cleaver: (x, y) => L(`M${x},${y} L${x + 4},${y - 9}`, '#4a3020', 3) + P(`M${x + 2},${y - 10} L${x + 14},${y - 16} L${x + 18},${y - 6} L${x + 6},${y - 1} Z`, '#c9ced4'),
    torch: (x, y) => L(`M${x},${y + 3} L${x + 5},${y - 16}`, '#5a3a22', 3) + `<g class="f-flick" style="transform-origin:${x + 6}px ${y - 18}px">${PN(`M${x + 1},${y - 17} C${x + 1},${y - 26} ${x + 7},${y - 28} ${x + 7},${y - 34} C${x + 13},${y - 26} ${x + 12},${y - 20} ${x + 10},${y - 17} Z`, '#e07b2c')}${PN(`M${x + 4},${y - 18} C${x + 4},${y - 23} ${x + 7},${y - 25} ${x + 7},${y - 28} C${x + 10},${y - 23} ${x + 9},${y - 20} ${x + 8},${y - 18} Z`, '#ffd27a')}</g>`,
    book: (x, y) => R(x - 3, y - 8, 11, 13, 1, '#5a2a2a') + RN(x - 1, y - 6, 1.4, 9, 0, '#c9a45c'),
    scissors: (x, y) => L(`M${x},${y} L${x + 14},${y - 18}`, '#c9ced4', 2.4) + L(`M${x + 2},${y - 14} L${x + 12},${y + 2}`, '#c9ced4', 2.4) + C(x, y + 2, 2.4, 'none') + C(x + 13, y + 3, 2.4, 'none'),
    hammer: (x, y) => L(`M${x},${y + 4} L${x + 6},${y - 16}`, '#5a3a22', 3) + R(x, y - 22, 14, 7, 1.5, '#6a6e72'),
    shears: (x, y) => L(`M${x},${y} L${x + 16},${y - 22}`, '#9aa0a8', 2.4) + L(`M${x + 4},${y - 2} L${x + 18},${y - 18}`, '#9aa0a8', 2.4) + L(`M${x},${y} L${x - 3},${y + 6} M${x + 4},${y - 2} L${x + 2},${y + 5}`, '#5a3a22', 3),
    lantern: (x, y) => L(`M${x},${y} L${x},${y + 6}`, INK, 1) + R(x - 4, y + 6, 8, 10, 1.5, '#3a3a3a') + `<g class="f-glow">${RN(x - 2.5, y + 8, 5, 6, 1, '#ffd27a')}${CN(x, y + 11, 8, '#ffd27a', 'opacity=".22"')}</g>`,
    mic: (x, y) => L(`M${x},${y} L${x + 3},${y - 12}`, '#2a2a2a', 2.6) + C(x + 3.5, y - 15, 3.2, '#9aa0a8'),
    chisel: (x, y) => L(`M${x},${y} L${x + 7},${y - 12}`, '#5a3a22', 3) + L(`M${x + 7},${y - 12} L${x + 10},${y - 18}`, '#c9ced4', 2.6),
    needle: (x, y) => L(`M${x - 2},${y + 6} L${x + 12},${y - 22}`, '#d9dde2', 1.6) + `<g class="f-sway" style="transform-origin:${x + 11}px ${y - 20}px">${L(`M${x + 11},${y - 20} C${x + 20},${y - 10} ${x + 8},${y} ${x + 18},${y + 10}`, '#c4473a', 0.8)}</g>`,
    scale: (x, y) => L(`M${x},${y} L${x},${y - 16} M${x - 9},${y - 14} L${x + 9},${y - 14}`, '#c9a45c', 1.6) + P(`M${x - 13},${y - 8} Q${x - 9},${y - 4} ${x - 5},${y - 8} Z`, '#c9a45c') + P(`M${x + 5},${y - 8} Q${x + 9},${y - 4} ${x + 13},${y - 8} Z`, '#c9a45c') + L(`M${x - 9},${y - 14} L${x - 12},${y - 8} M${x - 9},${y - 14} L${x - 6},${y - 8} M${x + 9},${y - 14} L${x + 6},${y - 8} M${x + 9},${y - 14} L${x + 12},${y - 8}`, '#c9a45c', 0.6) + PN(`M${x - 9},${y - 7} q1,2 0,3 q-1,-1 0,-3z`, '#c4473a'),
    punch: (x, y) => P(`M${x - 2},${y} L${x + 8},${y - 12} L${x + 12},${y - 9} L${x + 3},${y + 3} Z`, '#8a8e94') + C(x + 10, y - 11, 2, '#c9a45c'),
    dynamite: (x, y) => R(x - 2, y - 10, 4, 12, 1, '#c4473a') + R(x + 2, y - 10, 4, 12, 1, '#c4473a') + R(x + 6, y - 10, 4, 12, 1, '#c4473a') + L(`M${x + 4},${y - 10} Q${x + 8},${y - 18} ${x + 12},${y - 16}`, '#3a3a3a', 1) + `<g class="f-glow">${CN(x + 12, y - 16, 2.4, '#ffd27a')}${CN(x + 12, y - 16, 4.4, '#e07b2c', 'opacity=".4"')}</g>`,
    watch: (x, y) => L(`M${x},${y} Q${x + 3},${y + 6} ${x + 6},${y + 8}`, '#c9a45c', 0.9) + C(x + 7, y + 11, 4, '#e8dcb8') + L(`M${x + 7},${y + 11} L${x + 7},${y + 8.5} M${x + 7},${y + 11} L${x + 9},${y + 11}`, INK, 0.8),
    wrench: (x, y) => P(`M${x - 2},${y} L${x + 10},${y - 22} L${x + 13},${y - 20} L${x + 1},${y + 2} Z`, '#9aa0a8') + C(x + 12, y - 23, 3.4, 'none'),
    fan: (x, y) => P(`M${x},${y} L${x - 4},${y - 16} Q${x + 6},${y - 22} ${x + 16},${y - 12} Z`, '#e8c060') + L(`M${x},${y} L${x + 2},${y - 18} M${x},${y} L${x + 8},${y - 17} M${x},${y} L${x + 13},${y - 14}`, '#c4473a', 0.6),
    script: (x, y) => `<g transform="rotate(-30 ${x} ${y})">${R(x - 2, y - 14, 6, 16, 2, '#efe6d0')}${E(x + 1, y - 14, 3, 1.4, '#d8ccb0')}</g>`,
    staff: (x, y) => L(`M${x},${y + 30} L${x + 4},${y - 26}`, '#8a6a3a', 2.6) + `<g class="f-spin" style="transform-origin:${x + 4}px ${y - 30}px">${C(x + 4, y - 30, 6, '#e8c060')}${L(`M${x + 4},${y - 39} L${x + 4},${y - 37} M${x + 4},${y - 23} L${x + 4},${y - 21} M${x - 5},${y - 30} L${x - 3},${y - 30} M${x + 11},${y - 30} L${x + 13},${y - 30}`, '#e8c060', 1.4)}</g>`,
    balls: (x, y) => `<g class="f-float">${C(x + 4, y - 18, 3, '#c4473a')}${C(x + 12, y - 12, 3, '#4f87cc')}${C(x - 4, y - 24, 3, '#dca23a')}</g>`,
    hook: (x, y) => L(`M${x},${y} L${x + 4},${y - 10}`, '#4a3a2a', 3) + L(`M${x + 4},${y - 10} L${x + 4},${y - 16} C${x + 4},${y - 22} ${x + 12},${y - 22} ${x + 12},${y - 15}`, '#c9ced4', 2.2),
    shard: (x, y) => P(`M${x},${y} L${x + 4},${y - 18} L${x + 9},${y - 4} Z`, '#dce6f0') + L(`M${x + 3},${y - 4} L${x + 5},${y - 12}`, '#fff', 0.8),
    halberd: (x, y) => L(`M${x},${y + 26} L${x + 4},${y - 34}`, '#5a4a3a', 2.8) + P(`M${x + 4},${y - 34} L${x + 14},${y - 26} L${x + 12},${y - 16} L${x + 4},${y - 20} Z`, '#9aa0a8') + P(`M${x + 4},${y - 40} L${x + 6},${y - 33} L${x + 2},${y - 33} Z`, '#9aa0a8'),
    none: () => '',
  };
  const HATS = {
    hood: c => ({ back: P('M33,46 C30,20 70,20 67,46 L68,58 C60,52 40,52 32,58 Z', c), front: P('M34,40 C34,26 66,26 66,40 C62,30 38,30 34,40 Z', c) }),
    cap: c => ({ front: P('M36,32 C37,23 63,23 64,32 Z', c) + P('M34,32 L66,32 L64,36 L36,36 Z', c) + C(50, 27.5, 1.8, '#c9a45c') }),
    top: c => ({ front: R(40, 12, 20, 17, 1.5, c) + E(50, 29.5, 17, 3, c) + RN(40.8, 24, 18.4, 2.6, 0, '#7a2a2a') }),
    helmet: c => ({ front: P('M34,38 C34,22 66,22 66,38 Z', c) + L('M34,38 L66,38', INK, 1.4) }),
    hardhat: c => ({ front: P('M35,34 C35,22 65,22 65,34 Z', c) + E(50, 34, 19, 3, c) + L('M50,22 L50,33', '#000', 1, 'opacity=".25"') }),
    straw: c => ({ front: E(50, 31, 25, 4.5, c) + P('M38,31 C38,20 62,20 62,31 Z', c) + RN(38.5, 27, 23, 3, 0, '#3a5a4a') }),
    clown: c => ({ front: P('M38,30 L50,6 L62,30 Z', c) + C(50, 6, 3, '#f2ede0') + CN(46, 22, 1.6, '#f2ede0') + CN(54, 16, 1.6, '#f2ede0') }),
    none: () => ({}),
  };
  function humanFace(s) {
    const eye = s.eye || '#241c18';
    switch (s.face) {
      case 'eyes': return eyes('calm', eye) + mouth('flat');
      case 'closed': return eyes('closed', eye) + mouth('small');
      case 'smile': return eyes('happy', eye) + mouth('smile');
      case 'grin': return eyes('happy', eye) + P('M41,46 Q50,56 59,46 Q50,50 41,46 Z', '#f8f2e8') + L('M44,47.5 L44,49.5 M47,48.4 L47,51 M50,48.8 L50,51.4 M53,48.4 L53,51 M56,47.5 L56,49.5', INK, 0.6);
      case 'blank': return '';
      case 'mask': return P('M36,35 C36,30 64,30 64,35 L63,47 C59,53 41,53 37,47 Z', s.maskc || '#e8e0d0') + EN(44, 41, 2.4, 1.6, INK) + EN(56, 41, 2.4, 1.6, INK) + L('M46,48 L54,48', '#8a7a6a', 0.9);
      case 'glasses': return eyes('calm', eye) + C(44, 42.5, 4, 'none') + C(56, 42.5, 4, 'none') + L('M48,42.5 L52,42.5', INK, 1) + mouth('flat');
      case 'goggles': return R(37, 38, 26, 8, 3, '#3a3a3a') + CN(44, 42, 3, '#e8c060', 'opacity=".8"') + CN(56, 42, 3, '#e8c060', 'opacity=".8"') + mouth('smirk');
      case 'button': return C(44, 42, 2.4, '#3a2a2a') + C(56, 42, 2.4, '#3a2a2a') + L('M43,41 l2,2 M45,41 l-2,2 M55,41 l2,2 M57,41 l-2,2', '#efe6d0', 0.6) + L('M45,49 L55,49 M46,48 l0,2 M48.5,48 l0,2 M51,48 l0,2 M53.5,48 l0,2', '#3a2a2a', 0.7);
      case 'scream': return EN(44, 41, 2.6, 3.4, INK) + EN(56, 41, 2.6, 3.4, INK) + EN(50, 50, 3, 4, '#2a0e0e');
      case 'visor': return R(36, 38, 28, 6, 2, '#141820') + `<g class="f-glow">${RN(40, 40, 20, 2, 1, '#e07b2c')}</g>`;
      default: return eyes('calm', eye) + mouth('flat');
    }
  }
  function human(s) {
    const skin = s.paper ? '#e8e2d0' : s.doll ? '#f0e0d0' : s.skin || '#e2c2a4';
    const coat = s.coat || '#5a5a5a';
    const hat = (HATS[s.hat || 'none'] || HATS.none)(s.hatc || '#3a3a3a');
    const tall = s.stretch ? 1 : 0;
    let inner = '';
    inner += hat.back || '';
    if (s.halo) inner += `<g class="f-spin" style="transform-origin:50px 38px">${CN(50, 38, 23, 'none', `stroke="#e8c060" stroke-width="1.4" stroke-dasharray="3 3" opacity=".8"`)}</g>`;
    inner += legs(s.legc || '#2e2a28', '#16120f', s.dress ? 99 : 92);
    if (s.dress) inner += P('M39,57 C41,53 59,53 61,57 L63,72 L72,100 C58,105 42,105 28,100 L37,72 Z', coat);
    else inner += P(`M37,57 C40,53 60,53 63,57 L${67 + tall},98 C57,102 43,102 ${33 - tall},98 Z`, coat);
    inner += shade('M50,55 L63,57 L67,98 C61,100 56,101 50,101 Z');
    if (s.apron) inner += P('M42,61 L58,61 L61,96 L39,96 Z', s.apron) + (s.blood ? PN('M46,72 q3,-2 5,1 q-1,4 -4,3 z M53,84 q2,-1 3,1 q-1,2 -3,1z', '#a3322a', 'opacity=".8"') : '');
    if (s.armor) inner += L('M38,70 L62,70 M37,82 L63,82', INK, 1.2, 'opacity=".5"') + E(35, 59, 6.5, 5, s.hatc || '#6a6a72') + E(65, 59, 6.5, 5, s.hatc || '#6a6a72');
    if (s.accent) inner += L('M44,57 L44,95 M56,57 L56,95', s.accent, 1.1, 'opacity=".9"');
    inner += limb('M38,60 C34,68 33,76 34,84', coat) + hand(34, 85, skin);
    inner += limb('M62,60 C66,67 68,74 68,81', coat);
    inner += (ITEMS[s.item || 'none'] || ITEMS.none)(68, 82);
    inner += hand(68, 82, skin);
    inner += neck(skin) + head(skin);
    if (s.soot) inner += PN('M40,46 q3,-1 5,1 q-2,2 -5,-1z M57,38 q2,0 3,2 q-2,1 -3,-2z', '#3a2a22', 'opacity=".5"');
    if (s.paper) inner += L('M38,36 L46,34 M54,46 L62,44', '#9a9484', 0.6) + PN('M60,30 l5,4 l-3,3 z', '#d8d2c0');
    inner += humanFace(s);
    if (s.hair && (!s.hat || s.hat === 'none' || s.hat === 'cap' || s.hat === 'straw')) inner += P('M35,39 C34,25 66,25 65,39 C62,31 56,28 50,28 C44,28 38,31 35,39 Z', s.hair);
    inner += hat.front || '';
    if (s.frost) inner += `<g class="f-glow">${PN('M30,70 l3,-3 l3,3 l-3,3z M70,50 l2,-2 l2,2 l-2,2z M64,96 l2.4,-2.4 l2.4,2.4 l-2.4,2.4z', '#dff3ff')}</g>`;
    if (s.drip) inner += `<g class="f-float">${PN('M40,58 q1.2,2 0,3 q-1.2,-1 0,-3z M60,62 q1.2,2 0,3 q-1.2,-1 0,-3z M48,100 q1.2,2 0,3 q-1.2,-1 0,-3z', '#7fb0e8')}</g>`;
    if (s.shard) inner += `<g class="f-float">${P('M26,50 l4,-6 l2,7 z', '#e6eef6')}${P('M74,40 l3,-5 l2,6 z', '#e6eef6')}</g>` + L('M40,40 L48,46 L46,52 M56,36 L60,44', '#8a9ab0', 0.7);
    if (s.ghostly) inner = `<g opacity=".85">${inner}</g>`;
    return svg(shadow() + G('f-all', scaleAt(s.size || 1, inner)));
  }

  /* ---------- 짐승 · 사물 · 덩어리 ---------- */
  function rat(c = '#7a6a58') {
    return svg(shadow(50, 26) + G('f-all',
      L('M72,98 C86,96 90,84 82,78', c, 2.2) +
      E(54, 96, 23, 13, c) + shade('M54,83 C70,83 77,92 77,96 C77,104 68,109 54,109 Z') +
      R(36, 104, 6, 8, 3, c) + R(62, 104, 6, 8, 3, c) +
      C(30, 90, 10, c) + C(26, 80, 4.6, '#c89a8a') + C(36, 79, 4.6, '#c89a8a') + CN(22, 92, 1.8, '#3a1414') +
      `<g class="f-glow">${CN(27, 88, 1.6, '#ff6a4a')}</g>` + L('M20,93 L12,91 M20,94 L12,96', '#e8e0d0', 0.6) +
      G('f-spin', R(52, 74, 4, 10, 1, '#c9a45c') + E(54, 72, 7, 3, '#c9a45c'), '54px 80px')
    ));
  }
  function hound(c = '#5a3a32') {
    return svg(shadow(52, 28) + G('f-all',
      L('M74,82 C84,74 88,66 86,58', c, 3) +
      L('M38,90 L36,112 M46,92 L46,112 M64,92 L66,112 M72,90 L76,112', c, 5) +
      E(56, 84, 25, 11, c) + shade('M56,73 C72,73 81,80 81,84 C81,92 72,95 56,95 Z') +
      L('M44,74 l3,-6 l3,6 M54,73 l3,-6 l3,6 M64,74 l3,-6 l3,6', c, 2) +
      P('M24,70 C30,64 40,66 42,74 L40,82 C34,84 26,82 18,78 C16,76 18,72 24,70 Z', c) + P('M30,66 l2,-8 l4,7 z', c) +
      `<g class="f-glow">${CN(30, 72, 1.6, '#ff6a4a')}</g>` + L('M20,79 L32,80', '#f2ede0', 1) +
      L('M14,80 C10,86 14,92 20,90', '#c9ced4', 1.8)
    ));
  }
  function spider(c = '#5a4a6a') {
    const legsP = [[-1, 64], [-1, 74], [-1, 84], [-1, 94]].map(([s, y], i) => `M${50 - 10},${y - 10 + i * 2} C${30},${y - 24} ${18},${y - 10} ${12},${y + 18}`).join(' ');
    const legsQ = [64, 74, 84, 94].map((y, i) => `M60,${y - 10 + i * 2} C70,${y - 24} 82,${y - 10} 88,${y + 18}`).join(' ');
    return svg(shadow(50, 30) + G('f-all',
      G('f-sway', L(legsP, c, 2.4) + L(legsQ, c, 2.4), '50px 74px') +
      R(36, 62, 28, 26, 4, '#8a6a4a') + RN(37, 66, 26, 18, 0, '#c4a0d8') + L('M37,69 L63,69 M37,73 L63,73 M37,77 L63,77 M37,81 L63,81', '#a080b8', 0.8) +
      R(34, 58, 32, 6, 2, '#6a4a32') + R(34, 86, 32, 6, 2, '#6a4a32') +
      C(50, 52, 9, c) + `<g class="f-glow">${CN(46, 50, 1.4, '#ff5a7a')}${CN(50, 48, 1.6, '#ff5a7a')}${CN(54, 50, 1.4, '#ff5a7a')}${CN(48, 54, 1, '#ff5a7a')}${CN(52, 54, 1, '#ff5a7a')}</g>` +
      L('M50,44 L50,20', '#efe6f2', 0.6, 'opacity=".7"')
    ));
  }
  function tortoise(c = '#7a6a54') {
    return svg(shadow(50, 34) + G('f-all',
      R(26, 98, 9, 14, 4, '#6a6a5a') + R(66, 98, 9, 14, 4, '#6a6a5a') +
      P('M20,96 C20,70 38,60 54,60 C72,60 84,72 84,96 Z', c) + shade('M54,60 C72,60 84,72 84,96 L54,96 Z') +
      P('M32,82 l8,-8 l10,3 l-2,9 z', '#8a7a64') + P('M54,72 l10,-2 l6,8 l-8,6 z', '#8a7a64') + P('M48,90 l8,-4 l8,4 l-2,6 l-12,0 z', '#6a5a46') +
      L('M20,96 L84,96', INK, 1.6) +
      P('M8,88 C8,80 18,78 22,84 L22,94 L10,94 Z', '#6a6a5a') + `<g class="f-glow">${CN(13, 86, 1.4, '#e8c060')}</g>`
    ));
  }
  function moth(c = '#8a8aa0') {
    return svg(shadow(50, 22) + G('f-all f-float',
      G('f-flap', P('M48,62 C30,40 10,44 12,62 C14,76 34,80 48,72 Z', '#b8b4cc') + C(28, 60, 6, '#4a4a6a') + CN(28, 60, 2.6, '#e8c060') + P('M48,74 C34,80 24,92 32,100 C40,104 46,92 48,82 Z', '#9a96b0'), '48px 66px') +
      G('f-flap f-flap-r', P('M52,62 C70,40 90,44 88,62 C86,76 66,80 52,72 Z', '#b8b4cc') + C(72, 60, 6, '#4a4a6a') + CN(72, 60, 2.6, '#e8c060') + P('M52,74 C66,80 76,92 68,100 C60,104 54,92 52,82 Z', '#9a96b0'), '52px 66px') +
      E(50, 74, 5, 16, c) + C(50, 56, 5, c) + L('M48,52 C44,42 40,40 36,40 M52,52 C56,42 60,40 64,40', c, 1.2) +
      `<g class="f-glow">${CN(48, 55, 1.2, '#ff8a6a')}${CN(52, 55, 1.2, '#ff8a6a')}</g>`
    ));
  }
  function worm(c = '#a08060') {
    return svg(shadow(50, 26) + G('f-all',
      P('M26,112 C24,92 30,80 40,72 L58,72 C66,82 72,96 74,112 Z', '#4a3a2a') +
      G('f-sway', E(50, 92, 15, 9, c) + E(50, 78, 14, 8.5, c) + E(50, 64, 13, 8, c) + E(50, 50, 12, 7.5, c) + P('M37,44 C37,30 63,30 63,44 Z', c) + E(50, 40, 10, 5, '#3a1a14') + L('M42,38 l2,3 M46,36 l1,4 M50,35.5 l0,4 M54,36 l-1,4 M58,38 l-2,3', '#f2ede0', 1.2), '50px 100px')
    ));
  }
  function jelly(c = '#2a3a6a') {
    return svg(shadow(50, 20) + G('f-all f-float',
      G('f-sway', L('M38,76 C34,90 42,98 36,110 M46,78 C44,92 50,100 46,112 M54,78 C56,92 50,100 54,112 M62,76 C66,90 58,98 64,110', '#5a6aa8', 2.2, 'opacity=".85"'), '50px 76px') +
      P('M26,76 C26,48 74,48 74,76 C66,80 34,80 26,76 Z', c, 'fill-opacity=".85"') + PN('M32,66 C34,56 44,52 52,52', 'none', `stroke="#9ab0f0" stroke-width="1.4" opacity=".6"`) +
      `<g class="f-glow">${CN(42, 66, 2.2, '#c8e0ff')}${CN(58, 66, 2.2, '#c8e0ff')}</g>`
    ));
  }
  function eater(c = '#5a4a5a') {
    return svg(shadow(50, 30) + G('f-all',
      P('M18,108 C10,80 24,48 50,48 C76,48 90,80 82,108 Z', c) + shade('M50,48 C76,48 90,80 82,108 L50,108 Z') +
      P('M28,80 C30,70 70,70 72,80 C70,100 30,100 28,80 Z', '#2a0e14') +
      L('M32,78 l3,6 l3,-6 l3,6 l3,-6 l3,6 l3,-6 l3,6 l3,-6 l3,6 l3,-6 l3,6', '#f2ede0', 1.4) +
      PN('M44,92 C46,86 54,86 56,92 Z', '#c4475a') +
      `<g class="f-glow">${CN(38, 62, 3, '#e8c060')}${CN(62, 62, 3, '#e8c060')}${CN(50, 58, 2, '#e8c060')}</g>`
    ));
  }
  function ghost(c = '#9ab8c8', dark) {
    return svg(shadow(50, 18) + G('f-all f-float',
      P('M30,66 C30,34 70,34 70,66 L72,104 L64,98 L58,108 L50,98 L42,108 L36,98 L28,104 Z', c, `fill-opacity="${dark ? '.95' : '.75'}"`) +
      EN(42, 60, 4, 6, dark ? '#e6e1d3' : '#16202a') + EN(58, 60, 4, 6, dark ? '#e6e1d3' : '#16202a') +
      EN(50, 76, 3, 4, dark ? '#e6e1d3' : '#16202a', 'opacity=".7"') +
      G('f-sway', L('M70,74 C82,70 86,80 92,76 M30,74 C18,70 14,80 8,76', c, 2, 'opacity=".6"'), '50px 74px')
    ));
  }
  const OBJ = {
    suitcase: c => svg(shadow(50, 28) + G('f-all', R(22, 70, 56, 40, 4, c) + shade('M50,70 L78,70 L78,110 L50,110 Z') + L('M22,84 L78,84', INK, 1.2) + R(42, 62, 16, 8, 3, 'none') + P('M24,70 L76,70 L72,52 L28,52 Z', c) + L('M30,70 l3,-5 l3,5 l3,-5 l3,5 l3,-5 l3,5 l3,-5 l3,5 l3,-5 l3,5 l3,-5 l3,5', '#f2ede0', 1.2) + R(30, 90, 14, 9, 1, '#e8dcc0') + `<g class="f-glow">${CN(56, 96, 2.4, '#ff6a4a')}${CN(66, 96, 2.4, '#ff6a4a')}</g>`)),
    shelf: c => svg(shadow(50, 26) + G('f-all', R(24, 28, 52, 84, 2, c) + shade('M50,28 L76,28 L76,112 L50,112 Z') + L('M24,50 L76,50 M24,72 L76,72 M24,94 L76,94', INK, 1.4) + [30, 35, 40, 46, 58, 63, 68].map((x, i) => RN(x, 34 + (i % 2) * 2, 4, 14 - (i % 2) * 2, 0.5, ['#7a2a2a', '#2a4a6a', '#4a6a3a', '#8a6a2a'][i % 4])).join('') + [28, 33, 40, 52, 60, 66].map((x, i) => RN(x, 78 + (i % 2), 5, 14, 0.5, ['#2a4a6a', '#7a2a2a', '#5a3a6a'][i % 3])).join('') + RN(28, 56, 44, 12, 1, '#120e0c') + `<g class="f-glow">${EN(42, 62, 3, 2, '#ffd27a')}${EN(58, 62, 3, 2, '#ffd27a')}</g>`)),
    rig: c => svg(shadow(50, 26) + G('f-all', L('M28,112 L36,30 M72,112 L64,30 M36,30 L64,30 M30,90 L70,70 M32,70 L68,50 M70,90 L30,70', '#5a5a60', 2.4) + `<g class="f-glow">${PN('M50,44 L22,112 L78,112 Z', '#ffe6a0', 'opacity=".18"')}</g>` + R(42, 30, 16, 14, 3, c) + C(50, 44, 6, '#ffe6a0'))),
    press: c => svg(shadow(50, 28) + G('f-all', R(24, 96, 52, 16, 2, '#4a4a50') + R(26, 20, 48, 14, 2, c) + L('M30,34 L30,96 M70,34 L70,96', '#5a5a60', 3) + `<g class="f-press">${R(44, 34, 12, 30, 1, '#8a8e94')}${R(34, 64, 32, 10, 2, c)}</g>` + `<g class="f-glow">${CN(40, 27, 2, '#ff6a4a')}${CN(60, 27, 2, '#ff6a4a')}</g>`)),
    freight: c => svg(shadow(50, 34) + G('f-all', R(14, 40, 72, 60, 4, c) + shade('M50,40 L86,40 L86,100 L50,100 Z') + L('M14,56 L86,56 M50,40 L50,100', INK, 1.2) + C(28, 104, 8, '#2a2a2a') + C(72, 104, 8, '#2a2a2a') + CN(28, 104, 3, '#6a6a6a') + CN(72, 104, 3, '#6a6a6a') + `<g class="f-glow">${CN(32, 72, 5, '#ffd27a')}${CN(68, 72, 5, '#ffd27a')}</g>` + P('M38,86 L62,86 L58,92 L42,92 Z', '#1a1212'))),
    megaphone: c => svg(shadow(50, 16) + G('f-all', L('M50,112 L50,56', '#5a5a5a', 3) + P('M44,58 L44,42 L80,22 L80,78 Z', c) + E(80, 50, 6, 28, '#6a5a3a') + `<g class="f-glow">${L('M88,36 Q94,50 88,64 M93,30 Q101,50 93,70', '#e8c060', 1.4, 'opacity=".7"')}</g>` + R(38, 44, 8, 12, 2, '#3a3a3a'))),
    golem: c => svg(shadow(50, 30) + G('f-all', R(40, 96, 8, 16, 2, c) + R(52, 96, 8, 16, 2, c) + R(30, 56, 40, 42, 4, c) + shade('M50,56 L70,56 L70,98 L50,98 Z') + R(20, 58, 12, 30, 3, c) + R(68, 58, 12, 30, 3, c) + R(38, 30, 24, 24, 3, c) + `<g class="f-glow">${RN(42, 40, 6, 3, 1, '#c8e0ff')}${RN(52, 40, 6, 3, 1, '#c8e0ff')}${L('M42,66 L50,74 L58,66 M50,74 L50,86', '#c8e0ff', 1.4)}</g>`)),
    armor: c => svg(shadow(50, 24) + G('f-all', R(40, 92, 8, 20, 3, c) + R(52, 92, 8, 20, 3, c) + P('M34,58 C38,52 62,52 66,58 L66,96 L34,96 Z', c) + shade('M50,54 L66,58 L66,96 L50,96 Z') + E(35, 59, 7, 5, c) + E(65, 59, 7, 5, c) + R(28, 62, 8, 26, 3, c) + R(64, 62, 8, 26, 3, c) + P('M36,46 C36,24 64,24 64,46 L62,54 L38,54 Z', c) + RN(39, 38, 22, 4, 1.5, '#0e1216') + `<g class="f-glow">${CN(45, 40, 1.2, '#e6f0ff')}${CN(55, 40, 1.2, '#e6f0ff')}</g>` + PN('M40,64 L46,62 L44,80 L40,82 Z', '#fff', 'opacity=".35"'))),
  };

  /* ---------- 적 아트 지정 ---------- */
  const EART = {
    vagrant: { t: 'hum', coat: '#5b4a3a', hat: 'hood', hatc: '#3e3328', face: 'eyes', item: 'pipe', skin: '#d9b99a' },
    clockrat: { t: 'rat', c: '#7a6a58' },
    luggage: { t: 'obj', k: 'suitcase', c: '#6a4a2e' },
    inspector: { t: 'hum', coat: '#2e3b4a', hat: 'cap', hatc: '#222c38', face: 'mask', maskc: '#c9b8a0', item: 'punch', size: 1.12, accent: '#c8b04f' },
    cleaver: { t: 'hum', coat: '#7a6a62', apron: '#d8cfc0', blood: true, hair: '#3a2a22', face: 'eyes', item: 'cleaver' },
    hookhound: { t: 'hound', c: '#5a3a32' },
    bloodmerchant: { t: 'hum', coat: '#5a2028', hat: 'top', hatc: '#2a1418', face: 'smile', item: 'scale' },
    freezer: { t: 'hum', coat: '#8fa8b8', apron: '#dfe8ee', blood: true, hat: 'hood', hatc: '#6a8698', face: 'blank', skin: '#c8d4dc', item: 'hook', size: 1.2, frost: true },
    soakedpage: { t: 'hum', coat: '#d8d2c0', paper: true, face: 'blank', item: 'none', drip: true },
    inkjelly: { t: 'jelly', c: '#2a3a6a' },
    shelf: { t: 'obj', k: 'shelf', c: '#5a3e28' },
    reader: { t: 'hum', coat: '#2c3e5c', hat: 'hood', hatc: '#1e2c44', face: 'closed', item: 'book', size: 1.15, drip: true },
    extra: { t: 'hum', coat: '#6a4030', hair: '#2a1a12', face: 'eyes', item: 'torch', soot: true },
    dancer: { t: 'hum', coat: '#c84a2a', dress: true, hair: '#e08a3a', face: 'closed', item: 'fan' },
    stagerig: { t: 'obj', k: 'rig', c: '#3a3a3e' },
    prompter: { t: 'hum', coat: '#3a2a3a', hair: '#8a8a8a', face: 'glasses', item: 'script', size: 1.15 },
    apprentice: { t: 'hum', coat: '#6a5a7a', apron: '#a89878', hair: '#3a2a3a', face: 'mask', maskc: '#e8e0d0', item: 'chisel' },
    blankface: { t: 'hum', coat: '#4a4a52', face: 'blank', skin: '#d8d8d8', item: 'none' },
    pressarm: { t: 'obj', k: 'press', c: '#6a6a70' },
    foreman: { t: 'hum', coat: '#5a4a3a', hat: 'hardhat', hatc: '#e0b030', face: 'eyes', item: 'wrench', size: 1.2 },
    trackwraith: { t: 'ghost', c: '#9ab8c8' },
    signalman: { t: 'hum', coat: '#3a4a52', hat: 'cap', hatc: '#2a343a', face: 'eyes', item: 'lantern' },
    freight: { t: 'obj', k: 'freight', c: '#6a3a2a' },
    stationmaster: { t: 'hum', coat: '#1e2a38', hat: 'cap', hatc: '#141c26', face: 'eyes', item: 'watch', size: 1.2, accent: '#c8b04f' },
    citizen: { t: 'hum', coat: '#7a6a4a', hair: '#5a4a3a', face: 'grin', item: 'none' },
    clown: { t: 'hum', coat: '#c8a03a', hat: 'clown', hatc: '#c84a3a', face: 'grin', skin: '#f2ede0', item: 'balls' },
    megaphone: { t: 'obj', k: 'megaphone', c: '#8a7a5a' },
    mc: { t: 'hum', coat: '#2a2a3a', hat: 'top', hatc: '#c8a03a', face: 'grin', item: 'mic', size: 1.2, accent: '#c8a03a' },
    mason: { t: 'hum', coat: '#6a5e4e', apron: '#8a7a64', hat: 'helmet', hatc: '#8a7a64', face: 'eyes', item: 'hammer' },
    tortoise: { t: 'tortoise', c: '#7a6a54' },
    tremorworm: { t: 'worm', c: '#a08060' },
    demolition: { t: 'hum', coat: '#7a5a30', hat: 'hardhat', hatc: '#c84a2a', face: 'goggles', item: 'dynamite', size: 1.2 },
    sewdoll: { t: 'hum', coat: '#c8a0a8', doll: true, hair: '#5a3a3a', face: 'button', item: 'needle' },
    spoolspider: { t: 'spider', c: '#5a4a6a' },
    cutter: { t: 'hum', coat: '#3a3a4a', hair: '#2a2a2a', face: 'eyes', item: 'scissors' },
    mender: { t: 'hum', coat: '#6a4a6a', hat: 'hood', hatc: '#4a3048', face: 'closed', item: 'needle', size: 1.2 },
    gardener: { t: 'hum', coat: '#3a5a4a', hat: 'straw', hatc: '#c8b06a', face: 'closed', item: 'shears' },
    moth: { t: 'moth', c: '#8a8aa0' },
    golem: { t: 'obj', k: 'golem', c: '#9aa8c0' },
    sundial: { t: 'hum', coat: '#c8b07a', hat: 'hood', hatc: '#a89060', face: 'closed', item: 'staff', halo: true, size: 1.2 },
    reflection: { t: 'hum', coat: '#b9c4cf', shard: true, face: 'blank', skin: '#d0dae4', item: 'shard' },
    warped: { t: 'hum', coat: '#4a4a5a', hat: 'cap', hatc: '#3a3a4a', face: 'scream', item: 'none', stretch: true },
    mirrorarmor: { t: 'obj', k: 'armor', c: '#9aa4b0' },
    shade: { t: 'ghost', c: '#2e2e3a', dark: true },
    memeater: { t: 'eater', c: '#5a4a5a' },
    attendant: { t: 'hum', coat: '#2a2a2e', hat: 'cap', hatc: '#1e1e22', face: 'blank', item: 'lantern', ghostly: true },
    gatekeeper: { t: 'hum', coat: '#5a5a62', hat: 'helmet', hatc: '#6a6a72', face: 'visor', item: 'halberd', size: 1.3, armor: true },
  };

  /* ---------- 잔향체 ---------- */
  const B = (inner, cx = 70, rx = 34) => svg(shadow(cx, rx) + G('f-all', inner), '0 0 140 120', 'boss');
  const BOSS = {
    clockwarden: () => B(
      G('f-spin', C(28, 40, 10, '#8a7a4a') + C(28, 40, 4, '#5a4a2a') + L('M28,27 L28,31 M28,49 L28,53 M15,40 L19,40 M37,40 L41,40', '#8a7a4a', 3.4), '28px 40px') +
      G('f-spin f-rev', C(114, 74, 8, '#8a7a4a') + C(114, 74, 3, '#5a4a2a') + L('M114,63 L114,66 M114,82 L114,85 M103,74 L106,74 M122,74 L125,74', '#8a7a4a', 3), '114px 74px') +
      R(60, 92, 8, 20, 3, '#2a241a') + R(72, 92, 8, 20, 3, '#2a241a') +
      P('M54,52 C58,46 82,46 86,52 L96,108 C80,114 60,114 44,108 Z', '#3a3428') + shade('M70,48 L86,52 L96,108 C86,111 78,112 70,112 Z') +
      L('M70,52 L70,108', '#c8b04f', 1.6) + [62, 72, 82].map(y => CN(66, y, 1.2, '#c8b04f')).join('') +
      limb('M56,56 C50,66 48,76 50,84', '#3a3428') +
      limb('M84,56 C92,62 98,70 100,76', '#3a3428') +
      G('f-sway', P('M99,78 L126,18 L130,20 L104,80 Z', '#c8b04f') + P('M126,18 L132,10 L130,20 Z', '#e8d070'), '100px 78px') +
      C(100, 78, 3.4, '#9a8a6a') + C(50, 85, 3.4, '#9a8a6a') +
      C(70, 32, 18, '#e8dcb8', 'stroke-width="2.2"') + CN(70, 32, 18, 'none', 'stroke="#c8b04f" stroke-width="2"') +
      Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return L(`M${70 + Math.sin(a) * 14.5},${32 - Math.cos(a) * 14.5} L${70 + Math.sin(a) * 16.5},${32 - Math.cos(a) * 16.5}`, '#3a3428', i % 3 ? 0.8 : 1.6); }).join('') +
      `<g class="cw-hour" style="transform-origin:70px 32px">${L('M70,32 L70,23', '#3a3428', 2.2)}</g>` +
      `<g class="f-spin" style="transform-origin:70px 32px;animation-duration:6s">${L('M70,32 L70,17.5', '#a3322a', 1.2)}</g>` + CN(70, 32, 1.6, '#3a3428')
    ),
    butcher: () => B(
      R(52, 96, 12, 16, 4, '#3a2a24') + R(76, 96, 12, 16, 4, '#3a2a24') +
      P('M38,60 C38,40 102,40 102,60 L110,104 C94,114 46,114 30,104 Z', '#6d4a42') + shade('M70,42 C94,42 102,50 102,60 L110,104 C96,110 84,112 70,112 Z') +
      P('M50,58 L90,58 L96,106 L44,106 Z', '#d8cfc0') + PN('M58,70 q6,-4 10,2 q-2,8 -8,6 z M76,88 q4,-2 6,2 q-2,4 -6,2z M62,96 q3,-1 4,1 q-1,3 -4,1z', '#a3322a', 'opacity=".85"') +
      limb('M40,62 C30,72 28,84 32,94', '#6d4a42', 10) + limb('M100,62 C110,68 116,74 118,80', '#6d4a42', 10) +
      L('M32,96 L30,112', '#9aa0a8', 1.4) + L('M28,112 C28,118 36,118 36,112', '#c9ced4', 2.4) +
      G('f-sway', L('M118,80 L122,70', '#4a3020', 4) + P('M118,70 L134,60 L138,78 L122,86 Z', '#c9ced4') + PN('M126,76 q3,-2 5,1 q-2,3 -5,-1z', '#a3322a'), '118px 80px') +
      C(32, 95, 5, '#d8b8a0') + C(118, 80, 5, '#d8b8a0') +
      P('M56,36 C54,16 86,16 84,36 L82,48 C74,52 66,52 58,48 Z', '#b8a37f') + L('M60,26 L80,26', '#8a7a5a', 0.8) +
      `<g class="f-glow">${L('M61,33 l5,5 M66,33 l-5,5 M74,33 l5,5 M79,33 l-5,5', '#ff4a3a', 1.8)}</g>` + L('M62,44 l2,-1 l2,1 l2,-1 l2,1 l2,-1 l2,1 l2,-1 l2,1', INK, 0.9)
    ),
    librarian: () => B(
      G('f-float', `<g transform="rotate(-16 24 40)">${R(16, 34, 16, 12, 1, '#5a2a2a')}${RN(18, 35, 12, 10, 0, '#e8dcc0')}</g><g transform="rotate(12 116 30)">${R(108, 24, 16, 12, 1, '#2a4a6a')}${RN(110, 25, 12, 10, 0, '#e8dcc0')}</g>`) +
      P('M46,52 C52,40 88,40 94,52 L102,110 C82,116 58,116 38,110 Z', '#2c3e5c') + shade('M70,44 C84,44 92,46 94,52 L102,110 C90,113 80,114 70,114 Z') +
      L('M50,70 C60,74 80,74 90,70 M46,90 C60,95 80,95 94,90', '#1e2c44', 1.4) +
      R(52, 66, 36, 8, 1, '#5a2a2a') + R(54, 58, 32, 8, 1, '#2a4a6a') + R(50, 74, 40, 8, 1, '#4a5a3a') +
      limb('M50,56 C46,62 48,68 52,70', '#2c3e5c', 8) + limb('M90,56 C94,62 92,68 88,70', '#2c3e5c', 8) +
      C(70, 36, 14, '#c8d4dc') + P('M56,40 C54,20 86,20 84,40 L86,62 C80,54 78,46 76,42 C72,40 68,40 64,42 C62,46 60,54 54,62 Z', '#1e2430') +
      C(64, 38, 3.4, 'none', 'stroke-width="1.4"') + C(76, 38, 3.4, 'none', 'stroke-width="1.4"') + L('M67.4,38 L72.6,38', INK, 1) + `<g class="f-glow">${CN(64, 38, 2.4, '#cfe8ff', 'opacity=".6"')}${CN(76, 38, 2.4, '#cfe8ff', 'opacity=".6"')}</g>` +
      `<g class="f-float">${PN('M58,64 q1.4,2.2 0,3.2 q-1.4,-1 0,-3.2z M84,84 q1.4,2.2 0,3.2 q-1.4,-1 0,-3.2z M66,104 q1.4,2.2 0,3.2 q-1.4,-1 0,-3.2z M44,96 q1.4,2.2 0,3.2 q-1.4,-1 0,-3.2z', '#7fb0e8')}</g>`
    ),
    diva: () => B(
      `<g class="f-glow">${PN('M70,0 L30,114 L110,114 Z', '#ffe6a0', 'opacity=".1"')}</g>` +
      P('M58,56 C60,48 80,48 82,56 L86,80 C100,96 104,106 106,112 L34,112 C36,106 40,96 54,80 Z', '#8a2a1e') + shade('M70,50 C78,50 82,52 82,56 L86,80 C100,96 104,106 106,112 L70,112 Z') +
      `<g class="f-flick" style="transform-origin:70px 112px">${PN('M36,112 C38,100 44,104 46,96 C50,104 54,98 56,92 C60,102 64,98 66,94 C70,104 74,98 78,94 C80,102 86,100 88,94 C92,104 98,100 104,112 Z', '#e07b2c')}${PN('M44,112 C46,106 50,108 52,102 C56,108 60,104 62,100 C66,108 72,106 74,100 C78,108 84,106 86,102 C90,108 94,108 96,112 Z', '#ffd27a')}</g>` +
      limb('M60,58 C52,62 46,66 40,66', '#8a2a1e', 6) + limb('M80,58 C88,52 92,44 94,36', '#8a2a1e', 6) + C(40, 66, 3, '#f2d6c0') +
      L('M94,34 L98,20', '#2a2a2a', 2.2) + C(99, 18, 3.6, '#c9ced4') + C(94, 35, 3, '#f2d6c0') +
      R(66, 44, 8, 8, 2, '#f2d6c0') + C(70, 36, 11, '#f2d6c0') + eyes('closed', '#3a1a14', { x1: 66, x2: 74, y: 37 }) + L('M67,42 Q70,44 73,42', '#a3322a', 1.4) +
      `<g class="f-flick" style="transform-origin:70px 28px">${PN('M58,32 C56,20 62,14 64,6 C66,14 70,10 72,2 C74,12 80,12 80,20 C84,24 84,30 82,34 C78,26 62,26 58,32 Z', '#e07b2c')}${PN('M62,30 C62,24 66,20 68,14 C70,20 74,18 76,24 C78,26 78,30 78,32 C74,28 66,28 62,30 Z', '#ffd27a')}</g>`
    ),
    masque: () => B(
      P('M70,18 C102,28 112,70 98,112 L42,112 C28,70 38,28 70,18 Z', '#2a2236') + shade('M70,18 C102,28 112,70 98,112 L70,112 Z') +
      G('f-float', `<g transform="rotate(-20 28 44)">${E(28, 44, 9, 11, '#e8e0d0')}${EN(25, 42, 1.8, 1.2, INK)}${EN(31, 42, 1.8, 1.2, INK)}${L('M24,48 Q28,51 32,48', INK, 0.9)}</g><g transform="rotate(18 114 52)">${E(114, 52, 8, 10, '#c4473a')}${EN(111, 50, 1.6, 1.1, INK)}${EN(117, 50, 1.6, 1.1, INK)}</g><g transform="rotate(10 30 92)">${E(30, 92, 7, 9, '#4f87cc')}${EN(28, 90, 1.4, 1, INK)}${EN(32, 90, 1.4, 1, INK)}</g>`) +
      `<g class="mk mk0">${E(70, 52, 20, 24, '#efe9dd')}${L('M60,46 Q63,42 66,46 M74,46 Q77,42 80,46', INK, 1.8)}${P('M58,60 Q70,74 82,60 Q70,66 58,60 Z', '#a3322a')}${CN(58, 56, 3, '#f0a0b0', 'opacity=".5"')}${CN(82, 56, 3, '#f0a0b0', 'opacity=".5"')}</g>` +
      `<g class="mk mk1">${E(70, 52, 20, 24, '#cfe0f2')}${L('M60,44 Q63,48 66,44 M74,44 Q77,48 80,44', INK, 1.8)}${L('M62,66 Q70,60 78,66', INK, 1.8)}${PN('M62,50 q2,6 0,10 q-2,-4 0,-10z M78,50 q2,6 0,10 q-2,-4 0,-10z', '#4f87cc')}</g>` +
      `<g class="mk mk2">${E(70, 52, 20, 24, '#e2a090')}${L('M58,40 L66,45 M82,40 L74,45', INK, 2.2)}${EN(63, 48, 2.4, 1.6, INK)}${EN(77, 48, 2.4, 1.6, INK)}${P('M60,66 L64,60 L68,66 L72,60 L76,66 L80,60 L80,68 L60,68 Z', '#3a1414')}</g>`
    ),
    express: () => B(
      G('f-float', PN('M40,10 C30,4 34,-6 46,-2 C52,-10 66,-6 64,4 C72,4 74,14 64,16 Z', '#9ab8c8', 'opacity=".35"')) +
      R(38, 14, 12, 18, 2, '#2a343a') + R(36, 10, 16, 6, 2, '#3a464e') +
      C(44, 104, 9, '#2a2a2a') + C(96, 104, 9, '#2a2a2a') + CN(44, 104, 3, '#6a7a84') + CN(96, 104, 3, '#6a7a84') +
      C(70, 64, 34, '#2c3a44') + shade('M70,30 C90,30 104,46 104,64 C104,84 90,98 70,98 Z') +
      CN(70, 64, 28, 'none', 'stroke="#4a5a64" stroke-width="2"') + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return CN(70 + Math.cos(a) * 31, 64 + Math.sin(a) * 31, 1.4, '#8a9aa4'); }).join('') +
      EN(58, 62, 7, 9, '#0c1216') + EN(82, 62, 7, 9, '#0c1216') + `<g class="f-glow">${CN(58, 64, 2.6, '#9ae0ff')}${CN(82, 64, 2.6, '#9ae0ff')}</g>` + P('M58,82 L82,82 L78,88 L62,88 Z', '#0c1216') +
      `<g class="f-glow">${C(70, 34, 8, '#ffe6a0')}${CN(70, 34, 16, '#ffe6a0', 'opacity=".2"')}</g>` +
      P('M40,96 L100,96 L110,112 L30,112 Z', '#5a6a74') + L('M44,98 L36,112 M56,98 L52,112 M70,98 L70,112 M84,98 L88,112 M96,98 L104,112', '#3a464e', 1.6)
    ),
    grin: () => B(
      G('f-float', `${C(18, 30, 8, '#eadfb0')}${L('M14,32 Q18,36 22,32', INK, 1)}${CN(15, 28, 1, INK)}${CN(21, 28, 1, INK)}${C(122, 40, 7, '#eadfb0')}${L('M118,42 Q122,45 126,42', INK, 1)}${C(124, 96, 6, '#eadfb0')}${L('M121,98 Q124,100 127,98', INK, 0.9)}`) +
      C(70, 58, 44, '#eadfb0', 'stroke-width="2"') + shade('M70,14 C96,14 114,34 114,58 C114,82 96,102 70,102 Z') +
      L('M44,46 Q52,36 60,46 M80,46 Q88,36 96,46', INK, 2.6) + CN(52, 44, 1.4, INK) + CN(88, 44, 1.4, INK) +
      P('M34,62 Q70,104 106,62 Q70,78 34,62 Z', '#f8f2e8', 'stroke-width="2"') +
      L('M42,66 L44,74 M50,68 L51,78 M58,70 L58,81 M66,71 L66,83 M74,71 L74,83 M82,70 L82,81 M90,68 L89,78 M98,66 L96,74', INK, 1) +
      CN(42, 56, 5, '#f0a0b0', 'opacity=".45"') + CN(98, 56, 5, '#f0a0b0', 'opacity=".45"')
    ),
    colossus: () => B(
      R(48, 92, 18, 20, 3, '#6a5e4c') + R(74, 92, 18, 20, 3, '#6a5e4c') +
      P('M38,50 L54,36 L86,36 L102,50 L106,96 L34,96 Z', '#8a7b64') + shade('M70,36 L86,36 L102,50 L106,96 L70,96 Z') +
      P('M42,56 L56,50 L60,66 L44,70 Z', '#9a8b74') + P('M82,54 L98,58 L96,74 L80,70 Z', '#7a6b54') + P('M48,78 L62,74 L66,90 L46,92 Z', '#7a6b54') +
      L('M54,40 L60,52 L56,64 M88,42 L84,56 L90,66 M64,80 L70,88 L78,84', INK, 1, 'opacity=".6"') +
      E(34, 54, 8, 9, '#7a6b54') + E(106, 54, 8, 9, '#7a6b54') +
      `<g class="f-glow">${P('M60,74 C60,62 64,56 70,56 C76,56 80,62 80,74 L83,77 L57,77 Z', '#c8b04f')}${CN(70, 66, 18, '#ffd27a', 'opacity=".18"')}</g>` + L('M66,60 L70,68 L68,74', INK, 0.9) +
      P('M54,36 C54,18 86,18 86,36 Z', '#8a7b64') + `<g class="f-glow">${EN(62, 30, 3, 1.8, '#ffb347')}${EN(78, 30, 3, 1.8, '#ffb347')}</g>`, 70, 40
    ),
    seamstress: () => B(
      G('f-sway', L('M58,58 C40,44 24,46 12,30 M58,64 C38,62 20,70 8,64 M60,70 C44,80 30,92 18,102 M82,58 C100,44 116,46 128,30 M82,64 C102,62 120,70 132,64 M80,70 C96,80 110,92 122,102', '#e8dcd0', 1.8) + L('M12,30 L6,22 M8,64 L0,62 M18,102 L12,110 M128,30 L134,22 M132,64 L140,62 M122,102 L128,110', '#d9dde2', 1), '70px 64px') +
      L('M12,30 L70,0 M128,30 L70,0 M8,64 L70,0', '#d39be6', 0.4, 'opacity=".6"') +
      P('M50,76 L90,76 L100,112 L40,112 Z', '#8a6a4a') + RN(46, 84, 48, 22, 0, '#c4a0d8') + L('M45,88 L95,88 M44,94 L96,94 M43,100 L97,100', '#a080b8', 1) +
      P('M58,54 C60,46 80,46 82,54 L84,78 L56,78 Z', '#6a4a6a') + shade('M70,48 C78,48 82,50 82,54 L84,78 L70,78 Z') +
      R(66, 42, 8, 8, 2, '#f2e2dc') + C(70, 34, 11, '#f2e2dc') + eyes('closed', '#3a1a2a', { x1: 66, x2: 74, y: 35 }) +
      L('M66,40 L74,40 M67,39 l0,2 M69.5,39 l0,2 M72,39 l0,2', '#a3322a', 0.8) +
      C(70, 22, 7, '#3a2a3a') + L('M62,18 L78,26 M78,16 L64,28', '#d9dde2', 1.2)
    ),
    moon_silver: () => B(
      `<g class="f-float">${PN('M20,20 l2,-5 l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2z', '#e6eef6')}${PN('M118,90 l1.5,-4 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5z', '#e6eef6')}</g>` +
      P('M88,14 C56,14 36,38 36,62 C36,88 58,110 88,110 C68,100 58,82 58,62 C58,42 68,24 88,14 Z', '#c9d2e0', 'stroke-width="2"') + shade('M58,62 C58,82 68,100 88,110 C74,108 64,100 58,88 Z') +
      L('M44,56 Q48,53 52,56', INK, 1.4) + L('M45,74 Q48,76 51,74', INK, 1.2) + CN(44, 64, 2.4, '#f0b0c0', 'opacity=".4"') +
      `<g class="f-glow">${CN(62, 62, 46, '#e6eef6', 'opacity=".06"')}</g>`, 62, 28
    ),
    moon_black: () => B(
      P('M52,14 C84,14 104,38 104,62 C104,88 82,110 52,110 C72,100 82,82 82,62 C82,42 72,24 52,14 Z', '#5a5470', 'stroke-width="2"') + shade('M82,62 C82,82 72,100 52,110 C66,108 76,100 82,88 Z') +
      `<g class="f-glow">${EN(92, 54, 3, 2, '#c89aff')}${EN(92, 72, 3, 2, '#c89aff', 'opacity=".6"')}</g>` + L('M88,64 L96,64', INK, 1.2), 78, 28
    ),
    mirror: () => B(
      G('f-float', P('M22,40 l6,-10 l4,12 z', '#dce6f0') + P('M114,30 l5,-8 l3,10 z', '#dce6f0') + P('M118,84 l4,-7 l3,9 z', '#dce6f0')) +
      R(58, 92, 9, 20, 3, '#1e2430') + R(73, 92, 9, 20, 3, '#1e2430') +
      P('M54,54 C58,48 82,48 86,54 L90,98 C80,102 60,102 50,98 Z', '#1e2430') + shade('M70,50 L86,54 L90,98 C82,100 76,101 70,101 Z') +
      [60, 70, 80].map(y => CN(64, y, 1.4, '#c9a45c') + CN(76, y, 1.4, '#c9a45c')).join('') + R(52, 82, 36, 3.5, 1, '#c9a45c') +
      limb('M56,58 C50,68 50,78 52,86', '#1e2430', 8) + limb('M84,58 C92,64 96,70 98,76', '#1e2430', 8) + C(52, 87, 3.4, '#c8d4dc') + C(98, 77, 3.4, '#c8d4dc') +
      R(66, 44, 8, 8, 2, '#c8d4dc') + C(70, 34, 14, '#dfe8f0', 'stroke-width="1.8"') +
      L('M60,26 L68,34 L64,42 M68,34 L78,30 M70,36 L76,44 L80,40', '#7a8a9a', 0.9) + PN('M62,28 L68,34 L64,40 Z', '#fff', 'opacity=".6"') +
      P('M55,25 C56,15 84,15 85,25 Z', '#1e2430') + P('M52,25 L88,25 L85,30 L55,30 Z', '#141820') + C(70, 21, 2.2, '#c9a45c')
    ),
    lethe: () => B(
      `<g class="f-float">${R(16, 30, 18, 7, 1, '#f2efe6', 'opacity=".7"')}${R(108, 44, 18, 7, 1, '#f2efe6', 'opacity=".7"')}${R(112, 92, 14, 6, 1, '#f2efe6', 'opacity=".6"')}</g>` +
      `<g class="f-sway" style="transform-origin:70px 60px">${PN('M70,30 C100,40 112,80 120,112 L20,112 C28,80 40,40 70,30 Z', '#e6e1d3', 'opacity=".35"')}</g>` +
      P('M56,52 C60,44 80,44 84,52 L96,112 L44,112 Z', '#e6e1d3', 'fill-opacity=".92"') + shade('M70,46 C78,46 84,48 84,52 L96,112 L70,112 Z') +
      limb('M58,56 C48,60 40,62 34,58', '#e6e1d3', 6) + limb('M82,56 C92,60 100,62 106,58', '#e6e1d3', 6) +
      E(70, 34, 12, 15, '#f2efe6', 'stroke-width="1.8"') +
      `<g class="f-glow">${CN(70, 60, 40, '#ffffff', 'opacity=".06"')}</g>`
    ),
  };
  const PARTS = {
    meathook: () => svg(shadow(50, 14) + G('f-all', L('M50,0 L50,30', '#6a6e72', 1.6) + G('f-sway', L('M50,30 L50,40 C50,50 60,50 60,42', '#c9ced4', 3) + P('M38,48 C36,36 64,36 62,52 C64,72 54,86 48,84 C38,82 36,64 38,48 Z', '#c86a6a') + PN('M44,52 C46,58 50,60 54,56', 'none', `stroke="#f2e2dc" stroke-width="2.4" opacity=".7"`) + PN('M44,70 q4,-2 6,1 q-2,4 -6,-1z', '#8a2a2a'), '50px 30px'))),
    drain: () => svg(shadow(50, 24) + G('f-all', C(50, 84, 24, '#3a4a5a') + C(50, 84, 18, '#1a242e') + L('M32,84 L68,84 M50,66 L50,102 M37,71 L63,97 M63,71 L37,97', '#5a6a7a', 2.4) + `<g class="f-spin" style="transform-origin:50px 84px">${PN('M50,72 C60,72 64,80 60,86 C64,78 56,74 50,76 Z', '#7fb0e8', 'opacity=".6"')}</g>`)),
    crowd: () => svg(shadow(50, 28) + G('f-all', [[30, 70], [70, 70], [50, 60]].map(([x, y]) => P(`M${x - 12},112 C${x - 12},${y + 22} ${x + 12},${y + 22} ${x + 12},112 Z`, '#7a6a4a') + C(x, y, 11, '#eadfb0') + L(`M${x - 6},${y - 2} Q${x - 4},${y - 5} ${x - 2},${y - 2} M${x + 2},${y - 2} Q${x + 4},${y - 5} ${x + 6},${y - 2}`, INK, 1.2) + P(`M${x - 6},${y + 3} Q${x},${y + 10} ${x + 6},${y + 3} Z`, '#f8f2e8')).join(''))),
    colossus_arm: () => svg(shadow(50, 26) + G('f-all', P('M30,20 L56,14 L64,40 L58,70 L38,72 L28,44 Z', '#8a7b64') + shade('M48,16 L56,14 L64,40 L58,70 L48,71 Z') + P('M24,70 C22,58 70,56 72,70 L74,98 C72,110 26,110 24,98 Z', '#7a6b54') + L('M34,74 L34,96 M46,72 L46,98 M58,72 L58,98', INK, 1.2) + L('M38,30 L44,40 L40,52', INK, 0.9, 'opacity=".6"'))),
  };
  const DUMMY = () => svg(shadow(50, 18) + G('f-all', L('M50,112 L50,60', '#6a4a2a', 4) + L('M32,68 L68,68', '#6a4a2a', 3.4) + P('M38,40 C36,24 64,24 62,40 L64,94 C56,100 44,100 36,94 Z', '#c8a86a') + C(50, 64, 10, '#e8dcc0') + C(50, 64, 6, '#c4473a') + C(50, 64, 2.4, '#e8dcc0') + L('M40,46 L60,48 M40,84 L60,82', '#8a6a3a', 1)));
  const VOICE = () => svg(`${C(50, 60, 34, '#2a2620', 'stroke-width="2"')}${CN(50, 60, 30, 'none', 'stroke="#c9b98f" stroke-width="2"')}${[-18, -9, 0, 9, 18].map(dy => L(`M${50 - Math.sqrt(26 * 26 - dy * dy)},${60 + dy} L${50 + Math.sqrt(26 * 26 - dy * dy)},${60 + dy}`, '#c9b98f', 1.6, 'opacity=".7"')).join('')}<g class="f-glow">${CN(50, 60, 8, '#ffd27a', 'opacity=".25"')}</g>`);

  function enemy(id, opt = {}) {
    if (BOSS[id]) return BOSS[id]();
    if (PARTS[id]) return PARTS[id]();
    if (id === 'otherpax' && opt.copy && CHAR_ART[opt.copy]) return CHAR_ART[opt.copy]().replace('class="art ', 'class="art f-copy ');
    const s = EART[id];
    if (!s) return human({ coat: '#5a5a5a', face: 'blank' });
    switch (s.t) {
      case 'hum': return human(s);
      case 'rat': return rat(s.c);
      case 'hound': return hound(s.c);
      case 'spider': return spider(s.c);
      case 'tortoise': return tortoise(s.c);
      case 'moth': return moth(s.c);
      case 'worm': return worm(s.c);
      case 'jelly': return jelly(s.c);
      case 'eater': return eater(s.c);
      case 'ghost': return ghost(s.c, s.dark);
      case 'obj': return OBJ[s.k](s.c);
      default: return human(s);
    }
  }
  const cache = {};
  return {
    char(cid) { return cache['c:' + cid] || (cache['c:' + cid] = CHAR_ART[cid] ? CHAR_ART[cid]() : ''); },
    enemy(id, opt) { const k = 'e:' + id + ':' + ((opt && opt.copy) || ''); return cache[k] || (cache[k] = enemy(id, opt)); },
    unit(u) { return u.side === 'A' ? this.char(u.cid) : this.enemy(u.eid, { copy: u.copyOf }); },
    bust(svgStr, isBoss) { return svgStr.replace(/viewBox="[^"]*"/, isBoss ? 'viewBox="30 4 80 80"' : 'viewBox="25 12 50 50"'); },
    isBoss(id) { return !!BOSS[id]; },
    dummy: DUMMY, voice: VOICE,
    conductor() { return cache.cond || (cache.cond = human({ coat: '#1e2430', hat: 'cap', hatc: '#141820', face: 'eyes', item: 'lantern', accent: '#c9a45c', skin: '#ecd0b8' })); },
  };
})();
