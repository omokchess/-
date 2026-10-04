'use strict';
/* ===== 잔향선 · 잔향(적) =====
 * hp·atk·def: 기준 배율. res: 받는 피해 배율. stg: 흐트러짐 게이지(최대 체력 비율).
 * sk: 기술 [{id, n, type, hits, st(내게 거는 상태), bfT(내게 거는 턴 효과), bfS(자기 강화), ub(방어 불가), charge(준비 턴), w(가중치), cd, cond, ph(페이즈)}]
 * gim: 고유 기믹 훅 · gimText(f) → 기믹 안내 · phases: [{hp, txt, on}] */

const K = (id, n, o) => Object.assign({ id, n, hits: [], type: 'blunt', w: 1 }, o);
const FOES = {
  /* ===================== 1장 · 잿빛 승강장 ===================== */
  vagrant: { n: '승강장 부랑자', ch: 1, hp: 1.0, atk: 0.95, res: { slash: 1.25, blunt: 0.8 }, d: '역이 멈춘 날부터 승강장을 떠나지 못한 사람의 잔향. 등불만은 꺼뜨리지 않는다.',
    sk: [K('swing', '등불 휘두르기', { hits: [20], melee: 1 }), K('beg', '구걸', { hits: [7, 7], type: 'slash', melee: 1, w: 0.8 }), K('lamp', '희미한 불빛', { hits: [], bfS: { str: [1, 2] }, w: 0.5, d: '공격 강화 1' })] },
  clockrat: { n: '태엽쥐', ch: 1, hp: 0.8, atk: 1.0, res: { slash: 0.8, blunt: 1.4 }, d: '등에 박힌 태엽이 다 풀리면 멈춘다. 멈춘 쥐는 한 번도 본 적 없다.',
    sk: [K('gnaw', '갉기', { hits: [6, 6, 6], type: 'slash', melee: 1 }), K('wind', '태엽 감기', { hits: [], bfS: { haste: [1, 2], str: [1, 2] }, w: 0.6 }), K('dash', '튀어 오르기', { hits: [18], type: 'pierce', melee: 1 })] },
  luggage: { n: '잃어버린 수하물', ch: 1, hp: 1.3, atk: 1.0, def: 1.2, res: { slash: 0.8, pierce: 0.6, blunt: 1.4 }, d: '주인을 기다리다 이빨이 자랐다. 안에 무엇이 들었는지는 묻지 않는 게 좋다.',
    sk: [K('chomp', '덥석', { hits: [24], type: 'slash', melee: 1 }), K('spill', '내용물 쏟기', { hits: [5, 5, 5, 5], type: 'blunt' }), K('shut', '잠그기', { hits: [], shield: 0.12, w: 0.6 })] },
  inspector: { n: '녹슨 검표원', ch: 1, elite: 1, hp: 2.4, atk: 1.05, def: 1.1, res: { pierce: 0.8, blunt: 1.2 }, stg: 0.3, d: '표를 보여 주세요. 같은 표를 두 번 내밀면 벌금입니다.',
    gimText: f => f.gim.warn ? '⚠ 같은 기술을 또 쓰면 벌금(강타)!' : '🎫 검표 — 같은 기술을 연달아 쓰면 벌금을 물린다',
    gim: { afterPSkill(B, f, c) { const id = c.sk.id; if (f.gim.last === id && !c.sk.basic) { f.plan[0] = [{ id: 'fine', ch: 0, pw: 1 }]; B.log('🎫 「같은 표입니다. 벌금.」', 'warn'); B.emit('intent', { plan: B.intentInfo() }); } f.gim.last = id; } },
    sk: [K('punch', '천공기', { hits: [11, 11], type: 'pierce', melee: 1 }), K('stamp', '검인', { hits: [22], melee: 1, bfT: { bind: [1, 1] } }), K('whistle', '호루라기', { hits: [], bfT: { weak: [1, 2] }, sp: -6, w: 0.6 })],
    extra: { fine: K('fine', '벌금', { hits: [32], ub: 1, melee: 1, d: '방어 불가' }) } },
  clockwarden: { n: '시계탑 수위', ch: 1, boss: 1, hp: 5.0, atk: 0.92, def: 1.1, res: { slash: 1.0, pierce: 1.0, blunt: 1.25 }, stg: 0.22, d: '자정이 오면 모두 끝난다고 믿는 수위. 백 년째 열한 시 오십구 분에 서 있다.',
    gimText: f => `🕛 ${f.gim.clock}시 — 12시가 되면 「자정의 종」 · 흐트러뜨리면 −2시간 · 완벽 방어 −1시간`,
    gim: {
      init(B, f) { f.gim.clock = 9; },
      nightmare(B, f) { f.gim.clock = 10; },
      turnEnd(B, f) {
        if (f.plan[0] && f.plan[0][0] && f.plan[0][0].id === 'midnight') { f.gim.clock = 9; return; }
        f.gim.clock += 1 + (f.gim.fast && B.turn % 2 === 0 ? 1 : 0);
        if (f.gim.clock >= 12) { f.gim.clock = 12; f.plan[1] = [{ id: 'midnight', ch: 0, pw: 1 }]; B.log('🕛 시계가 자정을 가리킨다 — 다음 행동은 「자정의 종」', 'warn'); }
      },
      staggered(B, f) { f.gim.clock = Math.max(6, f.gim.clock - 2); B.log('⏪ 바늘이 두 시간 뒤로', 'good'); },
      perfect(B, f) { if (f.gim.clock > 6) { f.gim.clock--; B.log('⏪ 바늘이 한 시간 뒤로', 'good'); } },
    },
    phases: [{ hp: 0.5, txt: '⚙ 태엽이 미쳐 돈다 — 시간이 두 배로 흐른다', on: (B, f) => { f.gim.fast = 1; } }],
    sk: [K('tick', '초침 찌르기', { hits: [12, 12], type: 'pierce', melee: 1, w: 1.4 }), K('pend', '진자 강타', { hits: [26], melee: 1, st: { tremor: [3, 2] } }), K('chime', '시보', { hits: [9, 9, 9], type: 'blunt', sp: -5 }),
      K('wind', '녹슨 태엽', { hits: [], heal: 0.06, ph: [2], post: (B, f) => { f.gim.clock = Math.min(11, f.gim.clock + 1); }, d: '회복, 시계 +1시간' })],
    extra: { midnight: K('midnight', '자정의 종', { hits: [52], ub: 1, sp: -15, ult: 1, d: '방어 불가의 거대한 종소리' }) } },

  /* ===================== 2장 · 녹슨 정육시장 ===================== */
  cleaver: { n: '시장 도살꾼', ch: 2, hp: 1.1, atk: 1.05, res: { pierce: 1.25, blunt: 0.8 }, d: '팔 수 있는 것은 다 팔았다. 이제 자를 것만 남았다.',
    sk: [K('chop', '내려찍기', { hits: [22], type: 'slash', melee: 1, st: { bleed: [2, 1] } }), K('hack', '난도질', { hits: [7, 7, 7], type: 'slash', melee: 1 }), K('sharpen', '칼 갈기', { hits: [], bfS: { str: [2, 1] }, w: 0.6 })] },
  hookhound: { n: '갈고리 사냥개', ch: 2, hp: 0.9, atk: 1.1, res: { slash: 1.25, pierce: 0.8 }, d: '꼬리 끝의 갈고리로 고기를 끌고 다닌다. 지금은 당신을 끌려고 한다.',
    sk: [K('bite', '물어뜯기', { hits: [16], type: 'pierce', melee: 1, st: { bleed: [2, 2] } }), K('drag', '갈고리 끌기', { hits: [10, 10], type: 'pierce', melee: 1, bfT: { bind: [1, 1] } }), K('howl', '울부짖음', { hits: [], sp: -8, w: 0.5 })] },
  bloodmerchant: { n: '핏빛 상인', ch: 2, hp: 1.0, atk: 1.0, res: { slash: 1.25 }, d: '좋은 피는 비싸게 사 드립니다. 당신 것도요.',
    sk: [K('vial', '피 병 던지기', { hits: [9, 9], type: 'pierce', st: { bleed: [3, 1] } }), K('haggle', '흥정', { hits: [], heal: 0.1, bfT: { weak: [1, 2] }, w: 0.7 }), K('stab', '계산된 찌르기', { hits: [20], type: 'pierce', melee: 1 })] },
  freezer: { n: '냉동고의 주인', ch: 2, elite: 1, hp: 2.6, atk: 1.05, def: 1.2, res: { slash: 0.75, blunt: 1.2 }, stg: 0.3, d: '얼어붙은 것들은 썩지 않는다. 그래서 그는 모든 것을 얼린다.',
    gimText: f => f.gim.armor ? '🧊 냉기 갑옷 — 받는 피해 −40% · 화상을 걸면 녹는다' : '🧊 갑옷이 녹았다 (3턴마다 다시 언다)',
    gim: {
      init(B, f) { f.gim.armor = 1; f.gim.t = 0; },
      inMul(B, f) { return f.gim.armor ? 0.6 : 1; },
      turnEnd(B, f) { if (f.st.burn && f.gim.armor) { f.gim.armor = 0; B.log('🔥 냉기 갑옷이 녹았다', 'good'); B.fx('melt'); } else if (!f.gim.armor && ++f.gim.t >= 3) { f.gim.armor = 1; f.gim.t = 0; B.log('🧊 다시 얼어붙는다', 'warn'); } },
      afterPSkill(B, f, c) { if (f.st.burn && f.gim.armor) { f.gim.armor = 0; f.gim.t = 0; B.log('🔥 냉기 갑옷이 녹았다', 'good'); B.fx('melt'); } },
    },
    sk: [K('icehook', '얼음 갈고리', { hits: [12, 12], type: 'pierce', melee: 1, bfT: { bind: [1, 2] } }), K('cleave', '언 고기칼', { hits: [28], type: 'slash', melee: 1 }), K('frost', '냉기', { hits: [8], type: 'blunt', bfT: { vuln: [1, 2] }, sp: -6 })] },
  butcher: { n: '굶주린 정육업자', ch: 2, boss: 1, hp: 6.5, atk: 1.05, res: { slash: 0.9, pierce: 1.2, blunt: 0.9 }, stg: 0.24, d: '다 먹었는데도 배고프다. 고기 걸이가 남아 있는 한 그는 계속 먹는다.',
    parts: [{ id: 'h1', n: '고기 걸이', hp: 0.07, res: { slash: 1.5 } }, { id: 'h2', n: '고기 걸이', hp: 0.07, res: { slash: 1.5 } }, { id: 'h3', n: '고기 걸이', hp: 0.07, res: { slash: 1.5 } }],
    gimText: f => f.gim.hooks > 0 ? `🍖 고기 걸이 ${f.gim.hooks}개 — 체력이 줄면 걸이를 먹고 회복한다. 걸이를 먼저 부숴라` : '😡 걸이가 모두 부서졌다 — 회복 불가, 대신 피해 +25%',
    gim: {
      init(B, f) { f.gim.hooks = 3; },
      partBreak(B, f) { f.gim.hooks = f.parts.filter(q => q.alive).length; if (!f.gim.hooks) { f.gim.enraged = 1; B.log('😡 정육업자가 분노한다', 'warn'); } },
      outMul(B, f) { return f.gim.enraged ? 1.25 : 1; },
    },
    phases: [{ hp: 0.4, txt: '🔪 굶주림이 폭주한다', on: (B, f) => { f.gim.frenzy = 1; } }],
    sk: [K('cleave', '식칼', { hits: [24], type: 'slash', melee: 1, st: { bleed: [2, 2] }, w: 1.3 }), K('hook', '갈고리 던지기', { hits: [10, 10], type: 'pierce', bfT: { bind: [1, 1] } }), K('tender', '고기 다지기', { hits: [9, 9, 9], melee: 1 }),
      K('feast', '만찬', { hits: [], cond: (B, f) => f.gim.hooks > 0 && f.hp < f.mhp * 0.75, w: 4, d: '고기 걸이를 먹고 크게 회복',
        post: (B, f) => { const i = f.parts.findIndex(q => q.alive); if (i >= 0) { f.parts[i].alive = false; f.parts[i].hp = 0; B.emit('partBreak', { i, n: '고기 걸이', eaten: 1 }); f.gim.hooks--; } B.heal(f, f.mhp * 0.16); B.log('🍖 걸이를 뜯어 먹었다', 'warn'); } }),
      K('frenzy', '광란', { hits: [11, 11, 11, 11], type: 'slash', melee: 1, stEach: { bleed: [1, 1] }, charge: 2, cond: (B, f) => f.gim.frenzy, w: 1.5, ult: 1, d: '준비 후 네 번 난도질' })] },

  /* ===================== 3장 · 침수 도서관 ===================== */
  soakedpage: { n: '젖은 사서보', ch: 3, hp: 1.1, atk: 1.0, res: { slash: 1.25 }, d: '반납 기한이 백 년 지난 책을 아직도 찾고 있다.',
    sk: [K('slap', '젖은 책 후려치기', { hits: [20], melee: 1, st: { sinking: [2, 1] } }), K('shush', '쉿', { hits: [], sp: -10, bfT: { seal: [1, 1] }, w: 0.5, cd: 3 }), K('papercut', '종이 베기', { hits: [6, 6, 6], type: 'slash' })] },
  inkjelly: { n: '잉크 해파리', ch: 3, hp: 1.0, atk: 1.0, res: { pierce: 1.5, blunt: 0.6 }, d: '번진 문장이 모여 떠다닌다. 찔리면 읽지도 않은 슬픔이 스민다.',
    sk: [K('sting', '쏘기', { hits: [8, 8], type: 'pierce', st: { sinking: [2, 2] } }), K('ink', '먹물', { hits: [16], bfT: { weak: [1, 2] } }), K('drift', '부유', { hits: [], heal: 0.08, w: 0.5 })] },
  shelf: { n: '금서 서가', ch: 3, hp: 1.5, atk: 1.0, def: 1.2, res: { slash: 0.8, blunt: 1.4 }, d: '읽어서는 안 되는 책들이 서로를 붙들고 서 있다.',
    sk: [K('topple', '쏟아지는 책', { hits: [8, 8, 8], type: 'blunt' }), K('forbid', '금서의 속삭임', { hits: [12], sp: -12 }), K('lock', '봉인', { hits: [], bfT: { seal: [1, 1] }, w: 0.5, cd: 3 })] },
  reader: { n: '수몰된 낭독자', ch: 3, elite: 1, hp: 2.8, atk: 1.05, res: { pierce: 1.2, blunt: 0.8 }, stg: 0.28, d: '물속에서도 낭독을 멈추지 않는다. 마지막 장을 읽으면 모두 가라앉는다.',
    gimText: () => '📖 「낭독」을 준비하면 흐트러뜨려 끊어라',
    sk: [K('page', '젖은 장', { hits: [10, 10], type: 'slash', st: { sinking: [2, 1] } }), K('read', '낭독', { hits: [12, 12, 12], type: 'pierce', stEach: { sinking: [2, 1] }, ub: 1, charge: 2, w: 0.9, cd: 3, ult: 1, d: '준비 후 방어 불가 낭독' }), K('mark', '책갈피', { hits: [24], type: 'pierce', melee: 1 })] },
  librarian: { n: '침수 도서관 사서', ch: 3, boss: 1, hp: 7.0, atk: 1.05, res: { slash: 1.1, pierce: 0.9, blunt: 1.0 }, stg: 0.24, d: '도서관이 물에 잠기던 날 마지막까지 책을 지킨 사서. 지금은 책이 사서를 지킨다.',
    parts: [{ id: 'd1', n: '배수구', hp: 0.09, res: { blunt: 1.5, pierce: 0.7 } }, { id: 'd2', n: '배수구', hp: 0.09, res: { blunt: 1.5, pierce: 0.7 } }],
    gimText: f => `🌊 수위 ${f.gim.water}/5${f.gim.water >= 5 ? ' — 범람! 턴마다 속박, 사서 회복' : f.gim.water >= 3 ? ' — 턴마다 침잠' : ''} · 배수구를 부수면 −2 · 📕 3턴마다 금서 봉인`,
    gim: {
      init(B, f) { f.gim.water = 0; f.gim.books = 4; f.gim.sealed = {}; f.gim.slow = 0; },
      nightmare(B, f) { f.gim.water = 1; },
      turnEnd(B, f) {
        const alive = f.parts.filter(q => q.alive).length;
        if (alive === 2 || (alive === 1 && B.turn % 2 === 0)) f.gim.water = Math.min(5, f.gim.water + 1);
        if (f.gim.water >= 5) B.heal(f, f.mhp * 0.04, 1);
      },
      pTurnStart(B, f) {
        for (const k in f.gim.sealed) { if (--f.gim.sealed[k] <= 0) delete f.gim.sealed[k]; }
        if (f.gim.water >= 3) B.st(B.p, 'sinking', 2, 1);
        if (f.gim.water >= 5) B.bf(B.p, 'bind', 1, 1);
        if (B.turn % 3 === 0) { const opts = B.skillIds.filter(id => !SKILL[id].basic && !f.gim.sealed[id]); if (opts.length) { const id = pick(opts, B.rng); f.gim.sealed[id] = 2; B.fx('seal', { id }); B.log(`📕 금서 봉인 — 「${SKILL[id].n}」 2턴 봉인`, 'warn'); } }
      },
      partBreak(B, f) { f.gim.water = Math.max(0, f.gim.water - 2); B.log('🌊 물이 빠진다 (수위 −2)', 'good'); },
    },
    phases: [{ hp: 0.5, txt: '🌊 책장이 무너지며 물이 쏟아진다', on: (B, f) => { f.gim.water = Math.min(5, f.gim.water + 1); f.gim.books = 6; } }],
    sk: [K('page', '젖은 페이지', { hits: [9, 9], type: 'slash', st: { sinking: [2, 1] }, w: 1.3 }), K('tide', '밀물', { hits: [22], sp: -8 }), K('index', '색인', { hits: [16], type: 'pierce', bfT: { weak: [1, 2] } }),
      K('deluge', '대홍수', { hits: [13, 13, 13], ub: 1, stEach: { sinking: [2, 1] }, charge: 2, ph: [2], w: 1.2, cd: 4, ult: 1, d: '준비 후 방어 불가 세 번의 파도' })] },

  /* ===================== 4장 · 불타는 극장 ===================== */
  extra: { n: '그을린 단역', ch: 4, hp: 1.1, atk: 1.05, res: { slash: 1.25, blunt: 0.8 }, d: '대사 한 줄 없이 불길 속에서 계속 칼을 휘두른다. 그게 그의 배역이었다.',
    sk: [K('prop', '소품 칼', { hits: [20], type: 'slash', melee: 1, st: { burn: [2, 1] } }), K('bow', '인사', { hits: [], bfS: { guard: [2, 1] }, w: 0.5 }), K('fall', '쓰러지는 연기', { hits: [8, 8], melee: 1 })] },
  dancer: { n: '불꽃 무희', ch: 4, hp: 0.95, atk: 1.1, res: { pierce: 1.25 }, d: '불꽃이 박자를 맞춘다. 춤이 끝나는 곳에 재가 남는다.',
    sk: [K('twirl', '회전', { hits: [6, 6, 6, 6], type: 'slash', melee: 1, stEach: { burn: [1, 0] } }), K('flame', '불꽃 흩뿌리기', { hits: [12], type: 'pierce', st: { burn: [3, 2] } }), K('step', '스텝', { hits: [], bfS: { haste: [1, 2] }, w: 0.4 })] },
  stagerig: { n: '무대 장치', ch: 4, hp: 1.6, atk: 1.0, def: 1.2, res: { slash: 1.25, blunt: 0.5 }, d: '조명과 모래주머니가 아직도 공연을 기다린다.',
    sk: [K('sandbag', '모래주머니', { hits: [26], melee: 0 }), K('spot', '눈부신 조명', { hits: [10], type: 'pierce', bfT: { weak: [1, 2] } }), K('creak', '삐걱임', { hits: [], shield: 0.1, w: 0.5 })] },
  prompter: { n: '프롬프터', ch: 4, elite: 1, hp: 2.8, atk: 1.05, res: { pierce: 0.8, blunt: 1.2 }, stg: 0.3, d: '무대 아래에서 대사를 일러준다. 따라 하지 않는 배우는 무대에서 내려야 한다.',
    gimText: f => f.gim.prompt ? `📜 지시: 「${SKILL[f.gim.prompt] ? SKILL[f.gim.prompt].n : '…'}」을 써라 — 따르면 그가 약해지고, 어기면 내가 취약해진다` : '📜 대사 지시',
    gim: {
      pTurnStart(B, f) { const opts = B.usable().filter(u => u.ok).map(u => u.id); f.gim.prompt = opts.length ? pick(opts, B.rng) : null; },
      afterPSkill(B, f, c) { if (!f.gim.prompt) return; if (c.sk.id === f.gim.prompt) { B.bf(f, 'weak', 2, 2); f.stg += f.stgMax * 0.25; B.log('📜 대사를 따랐다 — 프롬프터 약화', 'good'); B.checkStagger(); } else { B.bf(B.p, 'vuln', 2, 2); B.log('📜 대사를 어겼다 — 취약 2', 'warn'); } f.gim.prompt = null; },
    },
    sk: [K('cue', '큐 사인', { hits: [11, 11], type: 'pierce' }), K('script', '대본 후려치기', { hits: [24], melee: 1, st: { burn: [2, 2] } }), K('lantern', '등불', { hits: [8, 8, 8], type: 'pierce', st: { burn: [1, 2] } })] },
  diva: { n: '디바', ch: 4, boss: 1, hp: 7.5, atk: 1.1, res: { slash: 1.0, pierce: 1.2, blunt: 0.9 }, stg: 0.24, d: '불타는 극장의 마지막 공연. 관객이 한 명이라도 남아 있는 한 노래는 끝나지 않는다.',
    gimText: f => f.gim.spot ? `🎤 독무대 ${f.gim.spotT}턴 남음 — 그동안 ${Math.max(0, Math.round(f.gim.need - f.gim.got))} 피해를 주면 조명이 떨어진다. 못 하면 앙코르` : `🎭 다음 독무대까지 ${f.gim.cd}턴`,
    gim: {
      init(B, f) { f.gim.spot = 0; f.gim.cd = 2; f.gim.need = 0; f.gim.got = 0; },
      turnEnd(B, f) {
        if (f.gim.spot) {
          if (--f.gim.spotT <= 0) { f.gim.spot = 0; f.gim.cd = 3; f.plan[1] = [{ id: 'encore', ch: 0, pw: 1 }]; B.log('👏 앙코르! 디바가 다시 노래한다', 'warn'); }
        } else if (--f.gim.cd <= 0) { f.gim.spot = 1; f.gim.spotT = 2; f.gim.need = f.mhp * 0.14; f.gim.got = 0; B.fx('spotlight'); B.log('🎤 조명이 디바를 비춘다 — 독무대', 'warn'); }
      },
      hurt(B, f, d) { if (f.gim.spot) { f.gim.got += d; if (f.gim.got >= f.gim.need) { f.gim.spot = 0; f.gim.cd = 3; B.bf(f, 'stun', 1, 1); B.fx('spotFall'); B.log('💡 조명이 떨어졌다! 디바 기절', 'good'); } } },
      outMul(B, f) { return f.gim.spot ? 1.3 : 1; },
    },
    phases: [{ hp: 0.5, txt: '🔥 무대가 불길에 휩싸인다', on: (B, f) => { f.gim.cd = 1; } }],
    sk: [K('aria', '아리아', { hits: [8, 8, 8], type: 'pierce', st: { burn: [2, 2] }, w: 1.2 }), K('mic', '마이크 스윙', { hits: [24], melee: 1 }), K('high', '하이 C', { hits: [30], type: 'pierce', ub: 1, sp: -10, cond: (B, f) => f.gim.spot, w: 3 }),
      K('bouquet', '불꽃 꽃다발', { hits: [], heal: 0.08, bfS: { str: [1, 2] }, w: 0.6 })],
    extra: { encore: K('encore', '앙코르', { hits: [8, 8, 8, 8], type: 'pierce', stEach: { burn: [1, 1] }, sp: -8, ult: 1, d: '관객의 박수에 답하는 네 소절' }) } },

  /* ===================== 5장 · 가면 공방 ===================== */
  apprentice: { n: '견습 가면공', ch: 5, hp: 1.1, atk: 1.05, res: { pierce: 1.25 }, d: '스승의 얼굴을 깎다가 자기 얼굴을 잃었다.',
    sk: [K('chisel', '끌질', { hits: [10, 10], type: 'pierce', melee: 1, st: { rupture: [2, 2] } }), K('carve', '깎아내기', { hits: [22], type: 'slash', melee: 1 }), K('polish', '광내기', { hits: [], bfS: { guard: [2, 1] }, w: 0.5 })] },
  blankface: { n: '빈 얼굴', ch: 5, hp: 1.15, atk: 1.0, res: {}, d: '아직 가면을 받지 못한 얼굴. 당신의 얼굴을 원한다.',
    sk: [K('grab', '움켜쥐기', { hits: [18], melee: 1, bfT: { bind: [1, 1] } }), K('stare', '응시', { hits: [], sp: -12, w: 0.7 }), K('flail', '허우적', { hits: [7, 7, 7], melee: 1 })] },
  pressarm: { n: '조립 팔', ch: 5, hp: 1.5, atk: 1.05, def: 1.2, res: { pierce: 0.8, blunt: 1.25 }, d: '가면을 찍어 내던 팔. 이제는 무엇이든 찍는다.',
    sk: [K('press', '압착', { hits: [28], st: { rupture: [3, 1] } }), K('clamp', '집게', { hits: [10, 10], type: 'pierce' }), K('oil', '기름칠', { hits: [], heal: 0.08, w: 0.5 })] },
  foreman: { n: '공장장', ch: 5, elite: 1, hp: 3.0, atk: 1.05, def: 1.15, res: { slash: 0.8, blunt: 1.2 }, stg: 0.3, d: '조립 팔이 하나라도 움직이면 공장은 돌아간다.',
    parts: [{ id: 'arm', n: '보조 조립 팔', hp: 0.18, res: { blunt: 1.4 } }],
    gimText: f => f.parts && f.parts[0].alive ? '🦾 보조 조립 팔이 움직이는 동안 공장장의 공격 +30%' : `🦾 ${f.gim.re}턴 뒤 팔을 다시 조립한다`,
    gim: {
      init(B, f) { f.gim.re = 0; },
      outMul(B, f) { return f.parts[0].alive ? 1.3 : 1; },
      partBreak(B, f) { f.gim.re = 4; },
      turnEnd(B, f) { if (!f.parts[0].alive && --f.gim.re <= 0) { const q = f.parts[0]; q.alive = true; q.hp = q.mhp; B.log('🦾 조립 팔이 다시 움직인다', 'warn'); B.emit('partRevive', { i: 0 }); } },
    },
    sk: [K('mega', '확성기 호통', { hits: [12], sp: -10, bfT: { weak: [1, 2] } }), K('hammer', '작업 망치', { hits: [26], melee: 1, st: { rupture: [2, 2] } }), K('quota', '할당량', { hits: [8, 8, 8], type: 'pierce' })] },
  masque: { n: '가면', ch: 5, boss: 1, hp: 7.5, atk: 1.1, res: { slash: 1, pierce: 1, blunt: 1 }, stg: 0.25, d: '세 개의 가면을 번갈아 쓰는 광대. 맨얼굴은 아무도 본 적 없다.',
    gimText: f => { const N = ['😀 웃음', '😢 눈물', '😠 분노'], W = ['타격', '참격', '관통'], I = ['참격', '관통', '타격']; if (f.gim.bare) return '🎭 모든 가면이 깨졌다 — 맨얼굴: 모든 피해 +30%, 두 번 행동'; return `${N[f.gim.mask]} 가면 — ${W[f.gim.mask]}에 약하고 ${I[f.gim.mask]}을 거의 받지 않는다 · 약점으로 ${3 - f.gim.wh}번 더 치면 가면이 깨진다`; },
    gim: {
      init(B, f) { f.gim.mask = 0; f.gim.broken = [0, 0, 0]; f.gim.wh = 0; f.gim.bare = 0; },
      res(B, f, type) { if (f.gim.bare) return 1.3; const weak = ['blunt', 'slash', 'pierce'][f.gim.mask], imm = ['slash', 'pierce', 'blunt'][f.gim.mask]; const br = 1 + f.gim.broken.reduce((a, b) => a + b, 0) * 0.15; return (type === weak ? 1.8 : type === imm ? 0.25 : 1) * br; },
      hurt(B, f, d, type, part, c) {
        if (f.gim.bare || !c) return; const weak = ['blunt', 'slash', 'pierce'][f.gim.mask];
        if (type === weak) { f.gim.wh++; if (f.gim.wh >= 3) { f.gim.broken[f.gim.mask] = 1; f.gim.wh = 0; f.stg += f.stgMax * 0.35; B.fx('maskBreak', { m: f.gim.mask }); B.log('🎭 가면이 깨졌다!', 'good');
          if (f.gim.broken.every(x => x)) { f.gim.bare = 1; f.acts = 2; B.log('🎭 맨얼굴이 드러났다', 'warn'); } else { do { f.gim.mask = (f.gim.mask + 1) % 3; } while (f.gim.broken[f.gim.mask]); } B.checkStagger(); } }
      },
      turnStart(B, f) { if (f.gim.bare) return; let m = f.gim.mask; do { m = (m + 1) % 3; } while (f.gim.broken[m]); if (m !== f.gim.mask) { f.gim.mask = m; f.gim.wh = 0; B.fx('maskSwap', { m }); } },
    },
    ai: (B, f) => { if (f.gim.bare) return pick(['jest', 'weep', 'rage', 'bow'], B.rng); return pick([['jest', 'jest', 'bow'], ['weep', 'weep', 'bow'], ['rage', 'rage', 'bow']][(f.gim.mask + 1) % 3], B.rng); },
    sk: [K('jest', '장난', { hits: [10, 10], type: 'slash', melee: 1, sp: -6 }), K('weep', '눈물비', { hits: [7, 7, 7], type: 'pierce', stEach: { sinking: [1, 1] } }), K('rage', '분노의 지팡이', { hits: [28], melee: 1, st: { rupture: [3, 2] } }),
      K('bow', '광대의 인사', { hits: [6, 6, 6, 6], type: 'slash', melee: 1, w: 0.8 })] },

  /* ===================== 6장 · 유령 선로 ===================== */
  trackwraith: { n: '선로 잔향', ch: 6, hp: 1.0, atk: 1.1, res: { slash: 1.25, pierce: 0.8 }, d: '마지막 열차를 놓친 사람들. 선로 위를 영원히 달린다.',
    sk: [K('rush', '스쳐 가기', { hits: [9, 9], type: 'slash', melee: 1 }), K('chill', '한기', { hits: [14], sp: -8, bfT: { bind: [1, 1] } }), K('fade', '흐려짐', { hits: [], bfS: { guard: [3, 1] }, w: 0.4 })] },
  signalman: { n: '녹슨 신호수', ch: 6, hp: 1.2, atk: 1.05, res: { slash: 1.25, blunt: 0.8 }, d: '멈춤 깃발만 흔든다. 아무도 멈추지 않았는데도.',
    sk: [K('flag', '깃대 찌르기', { hits: [22], type: 'pierce', melee: 1 }), K('stop', '정지 신호', { hits: [], bfT: { bind: [2, 1], weak: [1, 1] }, w: 0.6, cd: 3 }), K('lantern', '신호등 강타', { hits: [8, 8, 8], melee: 1 })] },
  freight: { n: '탈선 화차', ch: 6, hp: 1.8, atk: 1.05, def: 1.3, res: { pierce: 0.6, blunt: 1.25 }, d: '짐을 내리지 못한 화차. 무게만큼 원한이 실려 있다.',
    sk: [K('ram', '들이받기', { hits: [30], melee: 1, charge: 2, w: 0.8, ult: 1, d: '준비 후 강하게 들이받는다' }), K('rattle', '덜컹', { hits: [9, 9], st: { tremor: [2, 2] } }), K('load', '적재', { hits: [], shield: 0.15, w: 0.6 })] },
  stationmaster: { n: '역무원장', ch: 6, elite: 1, hp: 3.0, atk: 1.1, res: { pierce: 1.2, blunt: 0.8 }, stg: 0.3, d: '모든 열차는 정시에 출발합니다. 세 번째 종이 울리면 두 번 움직입니다.',
    gimText: f => `🕰 정시 운행 — 세 턴마다 두 번 행동 (다음: ${3 - (f.gim.t % 3)}턴 뒤)`,
    gim: { init(B, f) { f.gim.t = 0; }, turnEnd(B, f) { f.gim.t++; f.gim.extraAct = (f.gim.t % 3 === 2) ? 1 : 0; } },
    sk: [K('saber', '역무 검', { hits: [24], type: 'slash', melee: 1 }), K('punch', '천공', { hits: [11, 11], type: 'pierce', melee: 1, st: { rupture: [2, 1] } }), K('whistle', '출발 신호', { hits: [], bfS: { str: [1, 2], haste: [1, 2] }, sp: -8, w: 0.6 })] },
  express: { n: '유령열차', ch: 6, boss: 1, hp: 8.0, atk: 1.1, def: 1.2, res: { slash: 0.9, pierce: 0.8, blunt: 1.3 }, stg: 0.25, d: '종착역 없이 달리는 열차. 속도가 붙을수록 아무도 멈출 수 없다.',
    gimText: f => `🚂 속도 ${f.gim.speed}/5 — 턴마다 가속, 5가 되면 「탈선」 · 타격 기술로 제동(−1) · 흐트러뜨리면 속도 1`,
    gim: {
      init(B, f) { f.gim.speed = 1; },
      nightmare(B, f) { f.gim.speed = 2; },
      outMul(B, f) { return 0.75 + f.gim.speed * 0.13; },
      turnEnd(B, f) {
        if (f.plan[0] && f.plan[0][0] && f.plan[0][0].id === 'derail') { f.gim.speed = 1; B.bf(f, 'stun', 1, 1); B.log('💥 열차가 탈선해 멈췄다', 'good'); return; }
        f.gim.speed = Math.min(5, f.gim.speed + 1);
        if (f.gim.speed >= 5) { f.plan[1] = [{ id: 'derail', ch: 0, pw: 1 }]; B.log('🚂 속도 5 — 다음 행동은 「탈선」', 'warn'); }
      },
      afterPSkill(B, f, c) { if (c.type === 'blunt' && c.total > 0 && f.gim.speed > 1) { f.gim.speed--; B.log('🛑 제동 — 속도 −1', 'good'); if (f.plan[0] && f.plan[0][0] && f.plan[0][0].id === 'derail' && f.gim.speed < 5) { f.plan[0] = B.makeIntent(); B.emit('intent', { plan: B.intentInfo() }); } } },
      staggered(B, f) { f.gim.speed = 1; },
    },
    sk: [K('ram', '돌진', { hits: [20], melee: 1, w: 1.2 }), K('wheels', '바퀴 갈기', { hits: [6, 6, 6, 6], type: 'slash', melee: 1 }), K('steam', '증기 분사', { hits: [14], type: 'pierce', st: { burn: [2, 2] } }),
      K('horn', '기적 소리', { hits: [], sp: -12, bfT: { bind: [1, 1] }, w: 0.6, cd: 3 })],
    extra: { derail: K('derail', '탈선', { hits: [52], ub: 1, melee: 1, ult: 1, d: '방어 불가의 탈선 충돌' }) } },

  /* ===================== 7장 · 웃는 축제 ===================== */
  citizen: { n: '웃는 시민', ch: 7, hp: 1.15, atk: 1.05, res: { slash: 1.25 }, d: '웃지 않으면 안 되는 축제. 얼굴에 웃음을 꿰매 붙였다.',
    sk: [K('wave', '깃발 흔들기', { hits: [20], melee: 1 }), K('laugh', '억지 웃음', { hits: [], sp: -12, w: 0.7 }), K('poke', '찌르기', { hits: [8, 8], type: 'pierce', melee: 1 })] },
  clown: { n: '광대', ch: 7, hp: 1.0, atk: 1.15, res: { pierce: 1.25, blunt: 0.8 }, d: '넘어지는 연기가 특기였다. 지금은 넘어뜨리는 쪽이다.',
    sk: [K('axe', '장난감 도끼', { hits: [24], type: 'slash', melee: 1, st: { bleed: [2, 1] } }), K('pie', '파이 던지기', { hits: [10], bfT: { weak: [1, 2] }, sp: -6 }), K('juggle', '저글링', { hits: [6, 6, 6, 6], type: 'blunt' })] },
  megaphone: { n: '확성기', ch: 7, hp: 1.4, atk: 1.0, def: 1.1, res: { pierce: 1.5, slash: 0.8 }, d: '「웃어라」 한 마디만 반복한다. 귀를 막아도 들린다.',
    sk: [K('blare', '고함', { hits: [12, 12], type: 'blunt', sp: -6 }), K('feedback', '하울링', { hits: [18], ub: 1, sp: -8 }), K('cheer', '환호 유도', { hits: [], bfS: { str: [1, 2] }, w: 0.5 })] },
  mc: { n: '축제 사회자', ch: 7, elite: 1, hp: 3.1, atk: 1.1, res: { pierce: 0.8, blunt: 1.2 }, stg: 0.3, d: '박수! 더 큰 박수! 박수가 세 번 모이면 그는 무엇이든 할 수 있다.',
    gimText: f => `👏 박수 ${f.gim.cheer}/3 — 셋이 모이면 사회자가 크게 강해진다 · 흐트러뜨리면 초기화`,
    gim: { init(B, f) { f.gim.cheer = 0; }, turnEnd(B, f) { if (++f.gim.cheer >= 3) { f.gim.cheer = 0; B.bf(f, 'str', 3, 3); B.heal(f, f.mhp * 0.1); B.log('👏👏👏 박수갈채 — 사회자 공격 강화 3', 'warn'); } }, staggered(B, f) { f.gim.cheer = 0; } },
    sk: [K('cane', '지팡이', { hits: [22], melee: 1 }), K('joke', '썰렁한 농담', { hits: [8, 8, 8], type: 'pierce', sp: -6 }), K('trick', '모자 마술', { hits: [14], type: 'pierce', bfT: { vuln: [1, 2] } })] },
  grin: { n: '웃는 얼굴', ch: 7, boss: 1, hp: 8.5, atk: 1.1, res: { slash: 1.1, pierce: 1.0, blunt: 0.9 }, stg: 0.25, d: '축제가 끝나도 웃음은 남았다. 웃음은 얼굴을 찾아 떠다닌다.',
    parts: [{ id: 'b1', n: '풍선', hp: 0.035 }, { id: 'b2', n: '풍선', hp: 0.035 }, { id: 'b3', n: '풍선', hp: 0.035 }],
    gimText: f => `😄 웃음 ${f.gim.laugh}/5 — 막지 못한 공격마다 쌓이고, 5면 「폭소」 · 턴마다 정신력 −5 (정신력 −30 이하면 웃는 얼굴 피해 +50%) · 🎈 풍선을 터뜨리면 정신력 +20`,
    gim: {
      init(B, f) { f.gim.laugh = 0; },
      turnStart(B, f) { B.sp(-5); },
      outMul(B, f) { return B.p.sp <= -30 ? 1.5 : 1; },
      partBreak(B, f) { B.sp(20); B.bf(f, 'vuln', 1, 2); B.log('🎈 풍선이 터졌다 — 정신이 맑아진다', 'good'); },
      beforeAct(B, f, s, c) { },
      turnEnd(B, f) { if (f.gim.laugh >= 5) { f.gim.laugh = 0; f.plan[1] = [{ id: 'roar', ch: 0, pw: 1 }]; B.log('😆 웃음이 넘친다 — 다음 행동 「폭소」', 'warn'); } },
    },
    phases: [{ hp: 0.5, txt: '🎈 새 풍선이 떠오른다', on: (B, f) => { for (const q of f.parts) if (!q.alive) { q.alive = true; q.hp = q.mhp; } B.emit('partRevive', {}); } }],
    sk: [K('tickle', '간지럼', { hits: [6, 6, 6], type: 'pierce', sp: -4, post: (B, f, c) => { if (c.def === 'none' && c.total > 0) f.gim.laugh++; } }), K('bite', '웃는 이빨', { hits: [24], type: 'slash', melee: 1, st: { bleed: [2, 2] }, post: (B, f, c) => { if (c.def === 'none' && c.total > 0) f.gim.laugh++; } }),
      K('confetti', '색종이 폭죽', { hits: [], bfT: { weak: [1, 2], vuln: [1, 2] }, sp: -8, w: 0.7 }), K('tendril', '리본 채찍', { hits: [9, 9, 9], type: 'slash', post: (B, f, c) => { if (c.def === 'none' && c.total > 0) f.gim.laugh++; } })],
    extra: { roar: K('roar', '폭소', { hits: [30], ub: 1, sp: -20, ult: 1, d: '방어 불가, 정신력 −20' }) } },

  /* ===================== 8장 · 무너진 채석장 ===================== */
  mason: { n: '석공', ch: 8, hp: 1.3, atk: 1.05, def: 1.1, res: { slash: 0.8, blunt: 1.25 }, d: '거인을 깎아 낸 손. 이제는 거인의 일부가 되었다.',
    sk: [K('hammer', '석공 망치', { hits: [26], melee: 1, st: { tremor: [3, 2] } }), K('chip', '돌 쪼기', { hits: [9, 9], type: 'pierce' }), K('wall', '돌담', { hits: [], shield: 0.14, w: 0.5 })] },
  tortoise: { n: '바위 거북', ch: 8, hp: 2.0, atk: 1.0, def: 1.5, res: { slash: 0.5, pierce: 0.6, blunt: 1.5 }, d: '등의 바위가 천천히 자란다. 백 년 뒤엔 산이 될 것이다.',
    sk: [K('stomp', '짓밟기', { hits: [24], st: { tremor: [3, 2] } }), K('hide', '껍질 숨기', { hits: [], bfS: { guard: [4, 1] }, heal: 0.06, w: 0.6 }), K('snap', '물기', { hits: [16], type: 'pierce', melee: 1 })] },
  tremorworm: { n: '진동충', ch: 8, hp: 1.3, atk: 1.05, res: { slash: 1.25 }, d: '땅속에서 울리는 소리로 먹이를 찾는다. 당신의 심장 소리는 크다.',
    sk: [K('burrow', '파고들기', { hits: [8, 8, 8], st: { tremor: [2, 2] } }), K('lunge', '튀어나오기', { hits: [22], type: 'pierce', melee: 1 }), K('rumble', '지진파', { hits: [14], ub: 1, st: { tremor: [3, 3] }, w: 0.6 })] },
  demolition: { n: '폭파 기술자', ch: 8, elite: 1, hp: 3.2, atk: 1.1, res: { pierce: 1.2, blunt: 0.8 }, stg: 0.3, d: '무너뜨리는 것이 그의 일이었다. 마지막 발파는 아직 끝나지 않았다.',
    parts: [{ id: 'tnt', n: '다이너마이트', hp: 0.1, res: { pierce: 1.4 } }],
    gimText: f => f.parts[0].alive ? `🧨 다이너마이트 ${f.gim.fuse}턴 뒤 폭발 — 부숴서 막아라` : `🧨 ${f.gim.re}턴 뒤 다시 설치`,
    gim: {
      init(B, f) { f.gim.fuse = 3; f.gim.re = 0; },
      turnEnd(B, f) {
        if (f.parts[0].alive) { if (--f.gim.fuse <= 0) { B.fx('explode'); B.log('💥 다이너마이트 폭발!', 'bad'); B.trueDmg(B.p, B.p.mhp * 0.3, 'blast'); f.parts[0].alive = false; f.parts[0].hp = 0; B.emit('partBreak', { i: 0, n: '다이너마이트', exploded: 1 }); f.gim.re = 2; } }
        else if (--f.gim.re <= 0) { const q = f.parts[0]; q.alive = true; q.hp = q.mhp; f.gim.fuse = 3; B.log('🧨 다이너마이트를 다시 설치했다', 'warn'); B.emit('partRevive', { i: 0 }); }
      },
      partBreak(B, f, i, q) { f.gim.re = 3; f.stg += f.stgMax * 0.25; B.checkStagger(); },
    },
    sk: [K('pick', '곡괭이', { hits: [24], type: 'pierce', melee: 1 }), K('flash', '섬광탄', { hits: [10], bfT: { weak: [1, 2] }, sp: -8 }), K('blast', '소형 발파', { hits: [9, 9, 9], st: { burn: [2, 2] } })] },
  colossus: { n: '거인', ch: 8, boss: 1, hp: 9.5, atk: 1.15, def: 1.3, res: { slash: 0.9, pierce: 0.9, blunt: 1.1 }, stg: 0.25, d: '채석장이 깎아 낸 빈자리가 모여 일어섰다. 양팔이 남아 있는 한 그의 몸은 바위다.',
    parts: [{ id: 'armL', n: '왼팔', hp: 0.15, res: { blunt: 1.3 } }, { id: 'armR', n: '오른팔', hp: 0.15, res: { blunt: 1.3 } }],
    gimText: f => { const n = f.parts.filter(q => q.alive).length; return n === 2 ? '🪨 석화 피부 — 양팔이 있는 동안 본체 피해 −55%. 팔을 부숴라' : n === 1 ? '🪨 팔 하나 남음 — 본체 피해 −25%' : '🔥 핵이 드러났다 — 본체 피해 +50%'; },
    gim: {
      init(B, f) { f.gim.armL = true; f.gim.armR = true; },
      inMul(B, f, c, type, part) { if (part) return 1; const n = f.parts.filter(q => q.alive).length; return n === 2 ? 0.45 : n === 1 ? 0.75 : 1.5; },
      partBreak(B, f, i, q) { f.gim[q.id] = false; B.bf(f, 'stun', 1, 1); f.stg += f.stgMax * 0.3; B.log(`🪨 ${q.n}이 부서졌다 — 거인이 휘청인다`, 'good'); B.checkStagger(); },
    },
    sk: [K('slam', '왼팔 내려치기', { hits: [30], melee: 1, st: { tremor: [3, 2] }, cond: (B, f) => f.gim.armL, w: 1.3 }), K('sweep', '오른팔 휩쓸기', { hits: [14, 14], type: 'slash', melee: 1, cond: (B, f) => f.gim.armR, w: 1.3 }),
      K('quake', '지진', { hits: [20], ub: 1, st: { tremor: [4, 3] }, w: 0.8, cd: 2 }), K('rocks', '낙석', { hits: [8, 8, 8, 8], type: 'pierce' }),
      K('core', '핵 광선', { hits: [42], type: 'pierce', charge: 2, cond: (B, f) => !f.gim.armL && !f.gim.armR, w: 2, cd: 3, ult: 1, d: '준비 후 핵에서 뿜는 광선' })] },

  /* ===================== 9장 · 재봉실 ===================== */
  sewdoll: { n: '재봉 인형', ch: 9, hp: 1.1, atk: 1.1, res: { slash: 1.25, pierce: 0.8 }, d: '바늘땀마다 누군가의 이름이 꿰매져 있다.',
    sk: [K('needle', '바늘 찌르기', { hits: [10, 10], type: 'pierce', melee: 1, st: { rupture: [2, 2] } }), K('hug', '안아 주기', { hits: [20], melee: 1, bfT: { bind: [1, 1] } }), K('mend', '스스로 꿰매기', { hits: [], heal: 0.1, w: 0.5 })] },
  spoolspider: { n: '실타래 거미', ch: 9, hp: 1.2, atk: 1.05, res: { slash: 1.5, blunt: 0.8 }, d: '실타래를 배에 품고 다닌다. 거미줄은 언제나 당신 발목을 노린다.',
    sk: [K('web', '거미줄', { hits: [8], type: 'pierce', bfT: { bind: [2, 1] } }), K('bite', '독니', { hits: [20], type: 'pierce', melee: 1, st: { rupture: [3, 2] } }), K('spin', '실 잣기', { hits: [], shield: 0.12, w: 0.5 })] },
  cutter: { n: '재단사', ch: 9, hp: 1.25, atk: 1.1, res: { pierce: 1.25 }, d: '재단선 밖으로 나온 것은 잘라 낸다. 당신은 선 밖에 서 있다.',
    sk: [K('snip', '가위질', { hits: [12, 12], type: 'slash', melee: 1, st: { bleed: [2, 1] } }), K('measure', '치수 재기', { hits: [], bfT: { vuln: [2, 2] }, w: 0.6 }), K('rip', '찢기', { hits: [26], type: 'slash', melee: 1 })] },
  mender: { n: '수선공', ch: 9, elite: 1, hp: 3.2, atk: 1.1, res: { slash: 0.8, pierce: 1.2 }, stg: 0.3, d: '찢어진 것은 무엇이든 꿰맨다. 자기 몸도. 파열은 그의 바늘을 멈춘다.',
    gimText: () => '🪡 턴마다 자신을 꿰매 체력 6% 회복 — 파열이 걸려 있으면 꿰매지 못한다',
    gim: { turnEnd(B, f) { if (f.st.rupture) B.log('🪡 파열 때문에 꿰매지 못했다', 'good'); else B.heal(f, f.mhp * 0.06); } },
    sk: [K('stitch', '꿰매기', { hits: [9, 9, 9], type: 'pierce', bfT: { bind: [1, 1] } }), K('patch', '덧대기', { hits: [], shield: 0.15, w: 0.6 }), K('needle', '대바늘', { hits: [26], type: 'pierce', melee: 1, st: { rupture: [2, 2] } })] },
  seamstress: { n: '재봉사', ch: 9, boss: 1, hp: 9.5, atk: 1.15, res: { slash: 1.2, pierce: 0.9, blunt: 0.9 }, stg: 0.25, d: '운명을 꿰매는 재봉사. 바늘땀이 셋 모이면, 당신의 다음 수는 그녀가 정한다.',
    gimText: f => `🧶 바늘땀 ${f.gim.stitch}/3 — 땀마다 내가 준 피해의 8%가 나에게 돌아온다. 셋이면 「운명 고정」(다음 기술 강제) · 참격 기술은 땀을 하나 끊는다`,
    gim: {
      init(B, f) { f.gim.stitch = 0; f.gim.sealed = {}; },
      hurt(B, f, d, type, part, c) { if (f.gim.stitch && c && !c.counter && d > 0) { const v = d * 0.08 * f.gim.stitch; if (v >= 1) B.trueDmg(B.p, v, 'stitch'); } },
      afterPSkill(B, f, c) { if (c.type === 'slash' && c.total > 0 && f.gim.stitch > 0) { f.gim.stitch--; B.log('✂ 바늘땀 하나를 끊었다', 'good'); } },
      pTurnStart(B, f) {
        f.gim.sealed = {};
        if (f.gim.stitch >= 3) { const ok = B.usable().filter(u => u.ok); if (ok.length) { const keep = pick(ok, B.rng).id; for (const id of B.skillIds) if (id !== keep) f.gim.sealed[id] = 1; f.gim.forced = keep; B.fx('fate', { id: keep }); B.log(`🧶 운명 고정 — 이번 턴은 「${SKILL[keep].n}」만 쓸 수 있다`, 'warn'); } f.gim.stitch = 0; }
        else f.gim.forced = null;
      },
    },
    sk: [K('needle', '바늘 비', { hits: [10, 10], type: 'pierce', st: { rupture: [2, 2] }, w: 1.2 }), K('stitchK', '운명 꿰매기', { hits: [8], type: 'pierce', w: 1.4, post: (B, f, c) => { f.gim.stitch = Math.min(3, f.gim.stitch + 1); B.log('🧶 바늘땀이 하나 늘었다', 'warn'); } }),
      K('cut', '재단', { hits: [26], type: 'slash', melee: 1, st: { bleed: [2, 2] } }), K('spool', '실타래 감기', { hits: [], shield: 0.12, bfT: { bind: [1, 2] }, w: 0.6 }),
      K('tapestry', '운명의 직물', { hits: [9, 9, 9, 9, 9], type: 'pierce', charge: 2, ph: [2], cd: 4, w: 1.2, ult: 1, d: '준비 후 다섯 갈래의 바늘' })],
    phases: [{ hp: 0.5, txt: '🧵 재봉틀이 미친 듯이 돈다', on: (B, f) => { f.gim.stitch = Math.min(3, f.gim.stitch + 1); } }] },

  /* ===================== 10장 · 달의 정원 ===================== */
  gardener: { n: '달빛 정원사', ch: 10, hp: 1.25, atk: 1.1, res: { blunt: 1.25 }, d: '달빛만 먹고 자라는 꽃을 가꾼다. 비료가 모자라다.',
    sk: [K('shears', '전지가위', { hits: [12, 12], type: 'slash', melee: 1 }), K('thorn', '가시덩굴', { hits: [18], type: 'pierce', st: { bleed: [2, 2] } }), K('water', '물 주기', { hits: [], heal: 0.1, w: 0.5 })] },
  moth: { n: '밤나방', ch: 10, hp: 1.05, atk: 1.15, res: { slash: 1.5, pierce: 0.8 }, d: '달을 향해 날다 지친 나방들. 당신의 등불을 달로 착각한다.',
    sk: [K('dust', '인분', { hits: [8, 8], type: 'pierce', st: { sinking: [2, 2] }, sp: -4 }), K('flutter', '날갯짓', { hits: [5, 5, 5, 5], type: 'slash' }), K('lure', '홀림', { hits: [], sp: -12, bfT: { weak: [1, 2] }, w: 0.6 })] },
  golem: { n: '월광석 골렘', ch: 10, hp: 2.0, atk: 1.05, def: 1.4, res: { slash: 0.5, pierce: 0.8, blunt: 1.3 }, d: '정원의 담장이 일어섰다. 달이 뜨면 단단해진다.',
    sk: [K('punch', '월광석 주먹', { hits: [28], melee: 1, st: { tremor: [2, 2] } }), K('glow', '달빛 흡수', { hits: [], shield: 0.15, w: 0.6 }), K('shard', '파편', { hits: [9, 9], type: 'pierce' })] },
  sundial: { n: '해시계 수도사', ch: 10, elite: 1, hp: 3.3, atk: 1.1, res: { pierce: 1.2, blunt: 0.8 }, stg: 0.3, d: '그림자의 길이로 기도 시간을 잰다. 밤이 되면 기도는 저주가 된다.',
    gimText: f => f.gim.day ? '☀ 낮 — 수도사는 보호 2를 두르고 회복한다' : '🌙 밤 — 수도사의 공격 강화 2',
    gim: { init(B, f) { f.gim.day = 1; }, turnStart(B, f) { f.gim.day = (B.turn % 4) < 2 ? 1 : 0; if (f.gim.day) { B.bf(f, 'guard', 2, 1); B.heal(f, f.mhp * 0.03, 1); } else B.bf(f, 'str', 2, 1); } },
    sk: [K('staff', '해시계 지팡이', { hits: [24], melee: 1 }), K('shadow', '그림자 바늘', { hits: [10, 10], type: 'pierce', st: { sinking: [2, 1] } }), K('noon', '정오의 빛', { hits: [16], type: 'pierce', st: { burn: [2, 2] } })] },
  moons: { n: '쌍둥이 달', ch: 10, boss: 1, hp: 8.5, atk: 1.15, res: { slash: 1, pierce: 1, blunt: 1 }, stg: 0.25, d: '은월과 흑월. 둘 중 하나만 지면, 남은 하나가 다시 띄워 올린다.',
    parts: [{ id: 'silver', n: '은월', hp: 0.5, core: 1, res: { slash: 0.9, pierce: 1.2, blunt: 1.0 } }, { id: 'black', n: '흑월', hp: 0.5, core: 1, res: { slash: 1.2, pierce: 0.9, blunt: 1.0 } }],
    gimText: f => { const a = f.gim.active === 'silver' ? '🌕 은월' : '🌑 흑월'; return `${a}이 떠 있다 (2턴마다 교대) · 떠 있지 않은 달은 받는 피해 −30%${f.gim.revive ? ` · ⚠ ${f.gim.revive}턴 뒤 쓰러진 달이 되살아난다` : ' · 하나만 쓰러뜨리면 3턴 뒤 되살아난다'}`; },
    gim: {
      init(B, f) { f.gim.active = 'silver'; f.gim.revive = 0; },
      nightmare(B, f) { },
      inMul(B, f, c, type, part) { if (!part) return 1; return part.id === f.gim.active ? 1 : 0.7; },
      turnStart(B, f) { if (B.turn % 2 === 1) { const alive = f.parts.filter(q => q.alive); if (alive.length === 2) f.gim.active = f.gim.active === 'silver' ? 'black' : 'silver'; else if (alive.length === 1) f.gim.active = alive[0].id; B.fx('moonSwap', { a: f.gim.active }); } },
      partBreak(B, f, i, q) { const other = f.parts.find(x => x.alive); if (other) { f.gim.revive = 3; f.gim.active = other.id; B.log(`🌗 ${q.n}이 졌다 — 3턴 안에 ${other.n}도 쓰러뜨려라`, 'warn'); } },
      turnEnd(B, f) { if (f.gim.revive > 0 && --f.gim.revive <= 0) { const q = f.parts.find(x => !x.alive); if (q) { q.alive = true; q.hp = Math.round(q.mhp * 0.5); f.hp = f.parts.reduce((a, x) => a + Math.max(0, x.hp), 0); B.emit('partRevive', {}); B.log(`🌗 ${q.n}이 다시 떠올랐다`, 'bad'); } } },
    },
    ai: (B, f) => { const set = f.gim.active === 'silver' ? ['silverArrow', 'silverArrow', 'moonlight', 'veil'] : ['blackFang', 'blackFang', 'nightfall', 'eclipse']; let id = pick(set, B.rng); if (id === 'eclipse' && f.cd.eclipse > 0) id = 'blackFang'; if (id === 'moonlight' && f.cd.moonlight > 0) id = 'silverArrow'; return id; },
    sk: [K('silverArrow', '은빛 화살', { hits: [12, 12], type: 'pierce' }), K('moonlight', '달빛 치유', { hits: [], cd: 3, post: (B, f) => { for (const q of f.parts) if (q.alive) q.hp = Math.min(q.mhp, q.hp + q.mhp * 0.08); f.hp = f.parts.reduce((a, x) => a + Math.max(0, x.hp), 0); B.emit('heal', { who: 'f', v: Math.round(f.mhp * 0.08) }); } }),
      K('veil', '은빛 장막', { hits: [], shield: 0.08, bfS: { guard: [2, 1] } }), K('blackFang', '흑월의 송곳니', { hits: [28], type: 'slash', melee: 1, st: { bleed: [2, 2] } }),
      K('nightfall', '밤의 장막', { hits: [10, 10], type: 'blunt', sp: -12, st: { sinking: [3, 2] } }), K('eclipse', '월식 광선', { hits: [42], type: 'pierce', charge: 2, cd: 4, ult: 1, d: '준비 후 일직선의 월식' })] },

  /* ===================== 11장 · 거울의 방 ===================== */
  reflection: { n: '깨진 반영', ch: 11, hp: 1.15, atk: 1.15, res: { blunt: 1.5 }, d: '거울이 깨질 때 떨어져 나온 얼굴. 원래 주인을 찾는다.',
    sk: [K('shard', '거울 조각', { hits: [9, 9], type: 'slash', st: { bleed: [2, 1] } }), K('mimic', '흉내', { hits: [22], type: 'pierce', melee: 1 }), K('glare', '반사광', { hits: [], bfT: { weak: [1, 2] }, sp: -8, w: 0.6 })] },
  warped: { n: '일그러진 승객', ch: 11, hp: 1.35, atk: 1.1, res: { slash: 1.25 }, d: '거울 속에 너무 오래 머문 승객. 몸이 반사각대로 접혔다.',
    sk: [K('claw', '비틀린 손톱', { hits: [11, 11], type: 'slash', melee: 1 }), K('twist', '뒤틀기', { hits: [24], melee: 1, bfT: { bind: [1, 1] } }), K('moan', '신음', { hits: [], sp: -12, w: 0.5 })] },
  mirrorarmor: { n: '반사 갑주', ch: 11, hp: 1.7, atk: 1.05, def: 1.4, res: { slash: 0.75, pierce: 0.75, blunt: 1.25 }, d: '안이 빈 갑옷. 때리면 때린 만큼 되돌려준다.',
    gimText: () => '🪞 받는 피해의 15%를 되돌린다',
    gim: { hurt(B, f, d, type, part, c) { if (c && !c.counter && d > 0) B.trueDmg(B.p, d * 0.15, 'reflect'); } },
    sk: [K('slash', '반사 검', { hits: [24], type: 'slash', melee: 1 }), K('bash', '방패 밀치기', { hits: [16], bfT: { vuln: [1, 1] } }), K('polish', '광택', { hits: [], bfS: { guard: [3, 1] }, w: 0.5 })] },
  otherpax: { n: '또 다른 승객', ch: 11, elite: 1, hp: 3.4, atk: 1.1, res: {}, stg: 0.3, d: '선택하지 않은 직업을 가진 당신. 그쪽 길도 나쁘지 않았다고 말한다.',
    gimText: f => f.gim.copy ? `👤 다른 길의 ${CLASSES[f.gim.copy].n} — 그 직업의 기술을 쓴다` : '',
    gim: {
      init(B, f) {
        const opts = CLASS_ORDER.filter(k => k !== B.clsId); const k = pick(opts, B.rng); f.gim.copy = k;
        f.dynSk = CLASSES[k].skills.filter(s => s.hits && s.hits.length).slice(0, 3).map((s, i) => K('cp' + i, s.n, { hits: s.hits.map(v => v * 1.1), type: s.type || 'blunt', melee: !!s.melee, st: s.st ? Object.fromEntries(Object.entries(s.st).filter(([kk]) => ST[kk].bad)) : undefined, fx: s.fx, w: i === 0 ? 1.4 : 1 }));
        f.dynSk.push(K('cpb', '다른 길의 확신', { hits: [], bfS: { str: [2, 2] }, heal: 0.06, w: 0.5 }));
      },
    },
    sk: [K('cp0', '…', { hits: [10] })] },
  mirror: { n: '거울 속의 차장', ch: 11, boss: 1, hp: 9.5, atk: 1.1, res: { slash: 1, pierce: 1, blunt: 1 }, stg: 0.25, d: '거울 속의 당신. 당신이 한 일을 한 박자 늦게, 그대로 되돌려 준다.',
    gimText: f => `🪞 반영 — 내가 직전에 쓴 기술을 그대로 되돌린다 · 거울 조각 ${f.gim.shards}개: 받는 피해 −${f.gim.shards * 8}% (완벽 방어로 조각을 깬다)`,
    gim: {
      init(B, f) { f.gim.shards = 5; },
      nightmare(B, f) { f.gim.shards = 6; },
      inMul(B, f) { return 1 - f.gim.shards * 0.08; },
      perfect(B, f) { if (f.gim.shards > 0) { f.gim.shards--; f.stg += f.stgMax * 0.15; B.fx('shard'); B.log('🪞 거울 조각이 깨졌다', 'good'); B.checkStagger(); } },
    },
    ai: (B, f) => B.turn <= 1 ? 'gaze' : (B.rng() < 0.75 ? 'reflect' : pick(['gaze', 'crack'], B.rng)),
    sk: [K('reflect', '반영', { dyn: (B) => { const sk = SKILL[B.lastSkill] || CLASSES[B.clsId].skills[0]; const hs = (sk.hits || []).length ? sk.hits : CLASSES[B.clsId].skills[0].hits; return hs.map(v => v * 0.9); }, dynN: (B) => `반영: ${(SKILL[B.lastSkill] || CLASSES[B.clsId].skills[0]).n}`, fxDyn: (B) => (SKILL[B.lastSkill] || CLASSES[B.clsId].skills[0]).fx, type: 'slash', melee: 1, d: '내가 직전에 쓴 기술을 되돌린다' }),
      K('gaze', '거울 응시', { hits: [], sp: -12, bfS: { str: [1, 2] } }), K('crack', '균열', { hits: [9, 9, 9], type: 'pierce', st: { bleed: [2, 2] } })],
    phases: [{ hp: 0.5, txt: '🪞 거울이 둘로 갈라진다 — 반영이 두 번', on: (B, f) => { f.acts = 2; } }] },

  /* ===================== 12장 · 망각의 강 ===================== */
  shade: { n: '망각의 그림자', ch: 12, hp: 1.25, atk: 1.15, res: { slash: 0.8, pierce: 1.25 }, d: '이름을 잃은 사람의 그림자. 당신의 이름을 빌리러 왔다.',
    sk: [K('touch', '차가운 손', { hits: [12, 12], type: 'slash', melee: 1, sp: -4 }), K('forget', '잊게 하기', { hits: [], bfT: { seal: [1, 1] }, sp: -10, w: 0.5, cd: 3 }), K('drift', '스며들기', { hits: [24], type: 'pierce', melee: 1, st: { sinking: [2, 2] } })] },
  memeater: { n: '기억 포식자', ch: 12, hp: 1.5, atk: 1.1, res: { pierce: 0.8, blunt: 1.25 }, d: '좋았던 기억부터 먹는다. 맛있으니까.',
    sk: [K('chew', '씹기', { hits: [26], type: 'slash', melee: 1, st: { bleed: [2, 2] } }), K('swallow', '삼키기', { hits: [14], heal: 0.08, sp: -8 }), K('burp', '트림', { hits: [8, 8, 8], type: 'blunt' })] },
  attendant: { n: '마지막 역무원', ch: 12, hp: 1.4, atk: 1.1, res: { slash: 1.25, blunt: 0.8 }, d: '종착역의 역무원. 내리실 분은 모든 것을 두고 내리십시오.',
    sk: [K('lamp', '등불', { hits: [10, 10], type: 'pierce', st: { burn: [2, 2] } }), K('ticket', '마지막 표', { hits: [24], melee: 1 }), K('announce', '안내 방송', { hits: [], sp: -12, bfT: { weak: [1, 2] }, w: 0.6 })] },
  gatekeeper: { n: '문지기', ch: 12, elite: 1, hp: 3.6, atk: 1.15, def: 1.3, res: { slash: 1, pierce: 1, blunt: 1 }, stg: 0.3, d: '종착역의 문. 자물쇠 셋이 모두 풀리기 전엔 누구도 지나가지 못한다.',
    parts: [{ id: 'l1', n: '자물쇠', hp: 0.08, res: { blunt: 1.4 } }, { id: 'l2', n: '자물쇠', hp: 0.08, res: { pierce: 1.4 } }, { id: 'l3', n: '자물쇠', hp: 0.08, res: { slash: 1.4 } }],
    gimText: f => { const n = f.parts.filter(q => q.alive).length; return n ? `🔒 자물쇠 ${n}개 — 남아 있는 동안 본체 피해 −${n * 25}%` : '🔓 문이 열렸다'; },
    gim: { inMul(B, f, c, type, part) { if (part) return 1; return 1 - f.parts.filter(q => q.alive).length * 0.25; }, partBreak(B, f) { f.stg += f.stgMax * 0.2; B.checkStagger(); } },
    sk: [K('halberd', '미늘창', { hits: [28], type: 'pierce', melee: 1 }), K('shut', '문 닫기', { hits: [12], bfT: { bind: [1, 2] }, shield: 0.06 }), K('sweep', '휩쓸기', { hits: [11, 11, 11], type: 'slash', melee: 1 })] },
  lethe: { n: '망각', ch: 12, boss: 1, hp: 5.5, atk: 1.2, res: { slash: 1, pierce: 1, blunt: 1 }, stg: 0.25, d: '종착역에 흐르는 강. 건너는 사람은 모두 무언가를 두고 간다.',
    gimText: f => f.gim.phase === 1 ? `🌫 제1막 · 잊음 — 두 턴마다 기술 하나를 잊는다(이 막 동안 봉인) · 봉인 ${Object.keys(f.gim.sealed).length}개` : f.gim.phase === 2 ? '🐍 제2막 · 강 — 강의 뱀이 두 번 움직인다' : `⏳ 제3막 · 끝 — ${f.gim.timer}턴 안에 쓰러뜨리지 못하면 모든 것을 잊는다`,
    gim: {
      init(B, f) { f.gim.phase = 1; f.gim.sealed = {}; f.gim.timer = 8; f.phaseN = 1; },
      pTurnStart(B, f) {
        if (f.gim.phase === 1 && B.turn % 2 === 0) { const opts = B.skillIds.filter(id => !SKILL[id].basic && !f.gim.sealed[id]); if (opts.length) { const id = pick(opts, B.rng); f.gim.sealed[id] = 99; B.fx('seal', { id }); B.log(`🌫 「${SKILL[id].n}」을 잊었다`, 'warn'); } }
        if (f.gim.phase === 3) { f.gim.timer--; if (f.gim.timer <= 0) { B.log('⏳ 모든 것을 잊었다…', 'bad'); B.finish(false, 'lethe'); } }
      },
      beforeDeath(B, f) {
        if (f.gim.phase >= 3) return false;
        f.gim.phase++; f.phaseN = f.gim.phase; f.hp = f.mhp; f.st = {}; f.bf = {}; f.stg = 0; f.staggered = 0; f.gim.sealed = {};
        f.acts = f.gim.phase === 2 ? 2 : 1;
        if (f.gim.phase === 3) { f.gim.timer = 9 + (B.rel('hourglass') ? 2 : 0); }
        B.heal(B.p, B.p.mhp * 0.3);
        B.emit('phase', { n: f.gim.phase, txt: f.gim.phase === 2 ? '🐍 제2막 — 강이 뱀이 되어 일어선다' : '⏳ 제3막 — 끝이 다가온다' });
        B.log(f.gim.phase === 2 ? '🐍 제2막 — 강이 뱀이 되어 일어선다' : '⏳ 제3막 — 8턴 안에 끝내라', 'warn');
        B.plan(true);
        return true;
      },
    },
    sk: [K('veil', '베일', { hits: [10, 10], type: 'slash', sp: -6, ph: [1] }), K('mist', '안개', { hits: [], bfT: { weak: [1, 2] }, sp: -10, ph: [1], w: 0.6 }), K('hand', '거대한 손', { hits: [28], melee: 1, ph: [1] }),
      K('coil', '휘감기', { hits: [12, 12], melee: 1, bfT: { bind: [1, 1] }, ph: [2] }), K('flood', '범람', { hits: [16], ub: 1, st: { sinking: [3, 2] }, ph: [2] }), K('fang', '강의 송곳니', { hits: [22], type: 'pierce', melee: 1, st: { bleed: [2, 2] }, ph: [2] }),
      K('white', '백지', { hits: [9, 9, 9], type: 'pierce', sp: -8, ph: [3] }), K('erase', '지우기', { hits: [34], type: 'slash', ph: [3], melee: 1 }), K('oblivion', '망각', { hits: [48], ub: 1, charge: 2, ph: [3], cd: 4, w: 1.2, ult: 1, d: '준비 후 방어 불가의 망각' })] },
};
for (const k in FOES) FOES[k].id = k;
const FOE_IDS = Object.keys(FOES);
