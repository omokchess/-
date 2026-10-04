'use strict';
/* ===== 잔향선 · 직업 10종 =====
 * 기술: cost(에너지) · hpCost(최대 체력 비율) · cd(재사용 턴) · type(참격/관통/타격) · hits(타마다 위력)
 *   st/stEach(대상 상태: [위력, 횟수]) · self(자기 상태) · bfT/bfS(턴 효과: [수치, 턴]) · energy(획득)
 *   req(B) → 사용 조건 · pre/hit/post(B, c) → 고유 처리 · anim(동작) · fx(이펙트 키) · melee(돌진)
 * 기믹 자원은 B.r[키]에 둔다. 직업 훅(hk)은 전투 엔진이 정해진 순간에 부른다. */

const UNLOCK = [1, 1, 1, 5, 12, 20];
const TAL_LV = [10, 25, 40];

const CLASSES = {
  /* ---------------- 혈검사 ---------------- */
  hemoblade: {
    n: '혈검사', en: 'Hemoblade', c: '#e03131', i: '🩸', tag: '체력을 칼날로 바꾸는 흡혈 검사',
    stat: { hp: 1.0, atk: 1.08, def: 0.9, spd: 1.05 },
    gim: '기술 일부는 에너지 대신 체력을 바친다. 바친 피는 「혈조」로 쌓이고, 혈조 10이 되면 2턴 동안 「불괴」: 체력이 1 아래로 떨어지지 않고 모든 공격이 피해의 30%를 흡혈하며 피해 +30%.',
    res: [{ k: 'tide', n: '혈조', max: 10, c: '#e03131', i: '🩸' }],
    passive: '피의 대가 — 체력 50% 이하에서 피해 +20%. 내가 거는 출혈 위력 +1. 출혈 중인 적을 때리면 그 타격 피해의 8% 회복.',
    skills: [
      { id: 'hb_line', n: '혈선', type: 'slash', hits: [6, 6], energy: 1, stEach: { bleed: [1, 1] }, anim: 'slashA', fx: 'hb_line', melee: 1, tide: 1, d: '두 번 베어 출혈을 새긴다. 혈조 +1.' },
      { id: 'hb_thrust', n: '핏빛 찌르기', hpCost: 0.07, cd: 2, type: 'pierce', hits: [20], st: { bleed: [3, 2] }, anim: 'thrust', fx: 'hb_thrust', melee: 1, tide: 2, d: '체력 7%를 바쳐 꿰뚫는다. 출혈 3·2, 혈조 +2.' },
      { id: 'hb_waltz', n: '혈무', cost: 2, cd: 3, type: 'slash', hits: [5, 5, 5, 5, 5], anim: 'spin', fx: 'hb_waltz', melee: 1, tide: 1,
        hit: (B, c, h) => { if (B.stv(c.tgt, 'bleed')) B.heal(B.p, B.p.mhp * 0.02, 1); }, d: '다섯 번 휘몰아친다. 출혈 중인 적을 벨 때마다 체력 2% 회복.' },
      { id: 'hb_let', n: '사혈', cost: 1, cd: 4, type: null, hits: [], anim: 'buff', fx: 'hb_let', self: { bleed: [3, 3] }, bfS: { str: [2, 2] }, tide: 3, d: '스스로 피를 낸다(자기 출혈 3·3). 2턴 공격 강화 2, 혈조 +3.' },
      { id: 'hb_hemo', n: '혈조 폭발', cost: 3, cd: 4, type: 'slash', hits: [10], anim: 'smash', fx: 'hb_hemo', melee: 1, req: B => B.stv(B.f, 'bleed') > 0, reqT: '적이 출혈 중',
        post: (B, c) => { const s = B.f.st.bleed; if (!s) return; const v = B.sc(s.p * Math.min(6, s.c) * 1.0); B.trueDmg(B.f, v, 'bleed', c); B.heal(B.p, v * 0.3, 1); B.clearSt(B.f, 'bleed'); }, d: '적의 출혈을 모두 터뜨린다: 위력×횟수(최대 6) 고정 피해, 그 30% 회복.' },
      { id: 'hb_ult', n: '진홍의 만개', ult: 1, cost: 2, cd: 5, type: 'slash', hits: [7, 7, 7, 7, 7, 7, 9], anim: 'release', fx: 'hb_ult', melee: 0, req: B => B.r.tide >= 5, reqT: '혈조 5 이상', st: { bleed: [5, 3] },
        pre: (B, c) => { c.spent = B.r.tide; c.mul *= 1 + c.spent * 0.06; c.lifesteal = (c.lifesteal || 0) + 0.5; B.res('tide', -B.r.tide); }, d: '혈조를 모두 쓴다. 일곱 번 피의 꽃잎을 흩뿌린다(혈조당 피해 +6%, 흡혈 50%). 출혈 5·3.' },
    ],
    hk: {
      start(B) { B.r.tide = 0; B.r.unb = 0; },
      afterSkill(B, c) {
        let g = c.sk.tide || 0; if (B.tal('hb_t1a') && c.sk.hpCost) g += 1;
        if (g) B.res('tide', g);
        if (B.r.tide >= 10 && !B.r.unb) { B.r.unb = B.tal('hb_t3a') ? 3 : 2; B.res('tide', -10); B.fx('unbreak'); B.log('🩸 불괴 — 쓰러지지 않는 피', 'good'); }
      },
      outMul(B, c) { let m = 1; if (B.p.hp <= B.p.mhp * 0.5) m += 0.2; if (B.r.unb) m += 0.3; return m; },
      onHit(B, c, h) { if (c.src === B.p && B.stv(c.tgt, 'bleed')) B.heal(B.p, h.dmg * (0.08 + (B.r.unb ? 0.3 : 0) + (B.tal('hb_t2a') ? 0.06 : 0)), 1); },
      stPot(B, k) { return k === 'bleed' ? 1 + (B.tal('hb_t2b') ? 1 : 0) : 0; },
      turnEnd(B) { if (B.r.unb) { B.r.unb--; if (!B.r.unb) B.log('불괴가 풀렸다', 'sys'); } },
      death(B) { if (B.r.unb) { B.p.hp = 1; return true; } return false; },
    },
    tal: [
      [{ id: 'hb_t1a', n: '피의 계약', d: '체력을 바치는 기술의 혈조 +1' }, { id: 'hb_t1b', n: '응고', d: '전투 시작 시 보호막 (최대 체력 12%)' }],
      [{ id: 'hb_t2a', n: '갈증', d: '출혈 적 흡혈량 8% → 14%' }, { id: 'hb_t2b', n: '깊은 상처', d: '내가 거는 출혈 위력 추가 +1' }],
      [{ id: 'hb_t3a', n: '영원한 불괴', d: '불괴 지속 2턴 → 3턴' }, { id: 'hb_t3b', n: '피의 순환', d: '혈조가 오를 때마다 에너지 확률 회복 (25%)' }],
    ],
  },

  /* ---------------- 잿불 사제 ---------------- */
  ember: {
    n: '잿불 사제', en: 'Ember Priest', c: '#ff922b', i: '🔥', tag: '열기를 다스리는 향로의 사제',
    stat: { hp: 1.05, atk: 1.0, def: 1.0, spd: 0.95 },
    gim: '기술마다 「열기」가 오른다. 열기 100 이상은 「과열」: 화상과 피해가 크게 늘지만 턴마다 스스로 탄다. 150에 닿으면 폭주해 큰 폭발과 함께 열기 30으로 식는다. 「재의 기도」는 열기를 보호막(재)으로 바꾼다.',
    res: [{ k: 'heat', n: '열기', max: 150, c: '#ff922b', i: '🔥', line: 100 }],
    passive: '성화 — 적이 화상으로 받는 피해의 25%만큼 회복. 과열 중 피해 +30%, 화상 위력 +2.',
    skills: [
      { id: 'em_spark', n: '불씨', type: 'blunt', hits: [12], energy: 1, st: { burn: [1, 2] }, anim: 'slashA', fx: 'em_spark', melee: 1, heat: 15, d: '향로를 휘둘러 불씨를 옮긴다. 화상 1·2, 열기 +15.' },
      { id: 'em_bapt', n: '화염 세례', cost: 2, cd: 2, type: 'blunt', hits: [28], st: { burn: [3, 2] }, anim: 'cast', fx: 'em_bapt', heat: 30, d: '불의 세례. 화상 3·2, 열기 +30.' },
      { id: 'em_ash', n: '재의 기도', cost: 1, cd: 3, type: null, hits: [], anim: 'buff', fx: 'em_ash', heat: 0,
        pre: (B, c) => { const use = Math.min(60, B.r.heat); B.res('heat', -use); B.shield(B.p, B.p.mhp * (0.04 + use * 0.0035)); B.cleanse(B.p, 1); }, d: '열기를 최대 60까지 재로 바꿔 보호막을 두르고 해로운 효과 하나를 씻는다.' },
      { id: 'em_flurry', n: '향로 난무', cost: 2, cd: 3, type: 'blunt', hits: [6, 6, 6, 6], anim: 'spin', fx: 'em_flurry', melee: 1, heat: 22, stEach: { burn: [1, 0] }, d: '네 번 내리친다. 타마다 화상 위력 +1. 열기 +22.' },
      { id: 'em_purge', n: '정화의 불길', cost: 3, cd: 4, type: null, hits: [], anim: 'cast', fx: 'em_purge', heat: 25, req: B => B.stv(B.f, 'burn') > 0, reqT: '적이 화상 중',
        post: (B, c) => { const s = B.f.st.burn; if (!s) return; let v = B.sc(s.p * Math.min(6, s.c) * 0.9); if (B.r.heat >= 100) v *= 1.4; B.trueDmg(B.f, v, 'burn', c); s.c = 1; B.emitSt(B.f, 'burn'); }, d: '적의 화상을 한꺼번에 태운다: 위력×횟수(최대 6)×0.9 고정 피해(과열이면 ×1.4). 화상 횟수가 1로.' },
      { id: 'em_ult', n: '잿빛 승천', ult: 1, cost: 2, cd: 5, type: 'blunt', hits: [40], anim: 'release', fx: 'em_ult', heat: 0, req: B => B.r.heat >= 100, reqT: '열기 100 이상', st: { burn: [6, 4] },
        pre: (B, c) => { c.spent = B.r.heat; c.hits = [40 + c.spent * 0.45]; B.res('heat', -B.r.heat); }, post: B => B.shield(B.p, B.p.mhp * 0.2), d: '열기를 모두 불기둥으로 바꾼다(열기당 위력 +0.45). 화상 6·4, 최대 체력 20% 보호막.' },
    ],
    hk: {
      start(B) { B.r.heat = B.tal('em_t1b') ? 40 : 0; },
      afterSkill(B, c) {
        const g = c.sk.heat || 0; if (g) B.res('heat', Math.round(g * (B.tal('em_t1a') ? 1.25 : 1)));
        if (B.r.heat >= 150) { B.fx('overheat'); B.log('🔥 폭주! 열기가 터진다', 'good'); B.trueDmg(B.f, B.p.atk * 4, 'burn', c); B.st(B.f, 'burn', 4, 3); B.trueDmg(B.p, B.p.mhp * (B.tal('em_t3b') ? 0.06 : 0.12), 'burn'); B.res('heat', 30 - B.r.heat); }
      },
      outMul(B) { return B.r.heat >= 100 ? 1.3 : 1; },
      stPot(B, k) { return k === 'burn' && B.r.heat >= 100 ? 2 : 0; },
      foeBurn(B, v) { B.heal(B.p, v * (B.tal('em_t2a') ? 0.45 : 0.25), 1); },
      turnEnd(B) { if (B.r.heat >= 100) B.trueDmg(B.p, Math.round(B.r.heat / 10 * (B.tal('em_t3b') ? 0.5 : 1) * B.p.mhp / 200), 'burn'); if (B.tal('em_t2b') && B.r.heat < 100) B.res('heat', 10); },
    },
    tal: [
      [{ id: 'em_t1a', n: '풀무', d: '열기 획득 +25%' }, { id: 'em_t1b', n: '남은 불씨', d: '전투를 열기 40으로 시작' }],
      [{ id: 'em_t2a', n: '성화의 은총', d: '화상 피해 회복 25% → 45%' }, { id: 'em_t2b', n: '꺼지지 않는 향', d: '과열이 아닐 때 턴마다 열기 +10' }],
      [{ id: 'em_t3a', n: '순교자', d: '과열 중 기술 쿨타임 -1' }, { id: 'em_t3b', n: '내화', d: '과열·폭주 자기 피해 절반' }],
    ],
  },

  /* ---------------- 종지기 ---------------- */
  bell: {
    n: '종지기', en: 'Bellringer', c: '#fcc419', i: '🔔', tag: '박자를 잇는 종소리의 수호자',
    stat: { hp: 1.05, atk: 0.98, def: 1.05, spd: 1.0 },
    gim: '기술마다 음(저·중·고)이 있다. 저→중→고 순서로 이으면 「박자」가 오르고, 셋을 완성하면 다음 기술이 「대종」이 되어 진동 폭발을 두 번 일으킨다. 순서가 틀리면 박자가 처음부터.',
    res: [{ k: 'beat', n: '박자', max: 3, c: '#fcc419', i: '♪', pips: 1 }],
    passive: '박자 감각 — 저·중·고를 완성하면 에너지 +2, 신속 1. 진동 폭발이 일어날 때 진동 위력×4.5 피해.',
    skills: [
      { id: 'bl_toll', n: '첫 종', tone: 1, type: 'blunt', hits: [12], energy: 1, st: { tremor: [2, 2] }, anim: 'slashA', fx: 'bl_toll', melee: 1, d: '[저음] 종을 울려 진동 2·2.' },
      { id: 'bl_res', n: '울림', tone: 2, cost: 1, cd: 1, type: 'blunt', hits: [18], st: { tremor: [3, 2] }, anim: 'smash', fx: 'bl_res', melee: 1, d: '[중음] 진동 3·2.' },
      { id: 'bl_peal', n: '파쇄 타종', tone: 3, cost: 2, cd: 2, type: 'blunt', hits: [24], anim: 'cast', fx: 'bl_peal', post: (B, c) => B.burst(B.f, 1, c), d: '[고음] 진동 폭발.' },
      { id: 'bl_echo', n: '메아리', tone: 2, cost: 1, cd: 3, type: 'blunt', hits: [10, 10], anim: 'cast', fx: 'bl_echo', bfS: { guard: [1, 1] }, st: { tremor: [2, 1] }, d: '[중음] 두 번 되울린다. 보호 1, 진동 2·1.' },
      { id: 'bl_hush', n: '침묵의 종', tone: 1, cost: 2, cd: 4, type: 'blunt', hits: [16], anim: 'cast', fx: 'bl_hush', st: { tremor: [2, 3] }, post: (B) => { B.weakenIntent(0.4); }, d: '[저음] 적이 준비한 행동의 위력 -40%. 진동 2·3.' },
      { id: 'bl_ult', n: '종장', tone: 3, ult: 1, cost: 4, cd: 6, type: 'blunt', hits: [12, 16, 26], anim: 'release', fx: 'bl_ult', st: { tremor: [4, 3] },
        hit: (B, c, h, i) => { if (i === 2) { B.burst(B.f, 1, c); B.burst(B.f, 1, c); B.burst(B.f, 1, c); } }, post: B => { B.r.beat = 3; B.emitRes('beat'); }, d: '저·중·고를 한 번에. 세 번째 타격에 진동 폭발 ×3, 박자 3.' },
    ],
    hk: {
      start(B) { B.r.beat = 0; B.r.big = 0; },
      beforeSkill(B, c) {
        const t = c.sk.tone; if (!t) return;
        if (B.r.big && c.sk.type) { c.great = 1; B.r.big = 0; c.mul *= 1.45; B.fx('greatbell'); B.log('🔔 대종!', 'good'); }
        const want = B.r.beat + 1;
        if (t === want) { B.res('beat', 1); if (B.r.beat >= 3) { B.res('beat', -3); B.r.big = 1; B.energy(2 + (B.tal('bl_t1a') ? 1 : 0)); B.bf(B.p, 'haste', 1, 2); B.fx('chord'); B.log('♪ 화음 완성 — 다음 기술이 대종', 'good'); } }
        else if (!(t === 2 && B.tal('bl_t2b'))) { B.r.beat = t === 1 ? 1 : 0; B.emitRes('beat'); }
      },
      afterHits(B, c) { if (c.great) { B.burst(B.f, 1, c); B.burst(B.f, 1, c); } },
      burstDmg(B, pot) { return pot * (4.5 + (B.tal('bl_t3a') ? 2.5 : 0)); },
      turnStart(B) { if (B.tal('bl_t1b') && B.stv(B.f, 'tremor') >= 6) B.bf(B.p, 'guard', 1, 1); },
    },
    tal: [
      [{ id: 'bl_t1a', n: '조율', d: '화음 완성 에너지 +2 → +3' }, { id: 'bl_t1b', n: '공명 방벽', d: '적 진동 위력 6 이상이면 턴마다 보호 1' }],
      [{ id: 'bl_t2a', n: '깊은 울림', d: '진동 폭발이 흐트러짐 게이지를 50% 더 채운다' }, { id: 'bl_t2b', n: '자유 박자', d: '중음은 순서가 틀려도 박자를 깨지 않는다' }],
      [{ id: 'bl_t3a', n: '천둥 종', d: '진동 폭발 피해 위력×4.5 → ×7' }, { id: 'bl_t3b', n: '여운', d: '진동 폭발 후 진동 횟수가 줄지 않는다' }],
    ],
  },

  /* ---------------- 결투사 ---------------- */
  duelist: {
    n: '결투사', en: 'Duelist', c: '#e9ecef', i: '🤺', tag: '받아치고 몰아붙이는 일대일의 장인',
    stat: { hp: 1.0, atk: 1.06, def: 1.0, spd: 1.15 },
    gim: '완벽 방어에 성공하면 자동으로 「응수」해 반격하고 기세 +2. 방어만 해도 기세 +1. 막지 못하고 맞으면 기세가 절반으로. 기세 6 이상이면 필살 「일섬」.',
    res: [{ k: 'mo', n: '기세', max: 10, c: '#e9ecef', i: '⚔' }],
    passive: '결투의 법칙 — 치명타 피해 +30%. 방어 판정 폭 +25%. 호흡 치명타가 날 때마다 기세 +1.',
    skills: [
      { id: 'du_lunge', n: '찌르기', type: 'pierce', hits: [13], energy: 1, self: { poise: [2, 1] }, anim: 'thrust', fx: 'du_lunge', melee: 1, mo: 1, d: '날카롭게 찌른다. 호흡 2·1, 기세 +1.' },
      { id: 'du_feint', n: '견제', cost: 1, cd: 2, type: 'pierce', hits: [10, 10], bfT: { weak: [1, 1] }, self: { poise: [2, 2] }, anim: 'slashB', fx: 'du_feint', melee: 1, d: '두 번 견제한다. 적 약화 1, 호흡 2·2.' },
      { id: 'du_stance', n: '응수 자세', cost: 1, cd: 3, type: null, hits: [], anim: 'parry', fx: 'du_stance', post: B => { B.r.stance = 1; }, d: '이번 적 공격을 최소한 방어로 받는다. 완벽 방어면 응수 피해 2배.' },
      { id: 'du_flurry', n: '연속 찌르기', cost: 2, cd: 3, type: 'pierce', hits: [6, 6, 6, 6], anim: 'thrust', fx: 'du_flurry', melee: 1, pre: (B, c) => { c.hits = c.hits.map(v => v + B.r.mo * 0.9); }, d: '네 번 찌른다. 타마다 위력 +기세×0.9.' },
      { id: 'du_duel', n: '결투 선언', cost: 1, cd: 5, type: null, hits: [], anim: 'buff', fx: 'du_duel', bfT: { vuln: [2, 3] }, mo: 3, d: '3턴 동안 적 취약 2. 기세 +3.' },
      { id: 'du_ult', n: '일섬', ult: 1, cost: 1, cd: 5, type: 'slash', hits: [30], anim: 'dashSlash', fx: 'du_ult', melee: 0, req: B => B.r.mo >= 6, reqT: '기세 6 이상',
        pre: (B, c) => { c.spent = B.r.mo; c.hits = [24 + c.spent * 6]; c.critAdd = 999; c.ignoreGuard = 1; B.res('mo', -B.r.mo); }, d: '기세를 모두 쓴다. 확정 치명타의 일섬(기세당 위력 +6), 보호 무시.' },
    ],
    hk: {
      start(B) { B.r.mo = B.tal('du_t1b') ? 4 : 1; B.r.stance = 0; },
      qteBonus() { return 0.25; },
      afterSkill(B, c) { if (c.sk.mo) B.res('mo', c.sk.mo); },
      critMul(B) { return 0.3 + (B.tal('du_t3b') ? 0.3 : 0); },
      onCrit(B, c, viaPoise) { if (viaPoise) B.res('mo', 1); },
      defense(B, res, sk) {
        if (B.r.stance && res === 'none' && !sk.ub) res = 'block';
        return res;
      },
      defended(B, res, sk) {
        if (res === 'perfect') { B.res('mo', 2); const m = (B.r.stance ? 2 : 1) * (B.tal('du_t2a') ? 1.5 : 1); B.counter(14 * m, 'pierce', 'du_riposte'); }
        else if (res === 'block') { B.res('mo', 1); if (B.tal('du_t2b')) B.counter(7, 'pierce', 'du_riposte'); }
        B.r.stance = 0;
      },
      hurt(B, dmg, res) { if (res === 'none' && dmg > 0 && !B.tal('du_t3a')) { if (B.r.mo) B.res('mo', -Math.ceil(B.r.mo / 2)); } },
    },
    tal: [
      [{ id: 'du_t1a', n: '예리한 눈', d: '방어 판정 폭 +25%' }, { id: 'du_t1b', n: '선수 필승', d: '전투를 기세 4로 시작' }],
      [{ id: 'du_t2a', n: '역습', d: '응수 피해 +50%' }, { id: 'du_t2b', n: '흘려내기', d: '일반 방어에도 약한 응수' }],
      [{ id: 'du_t3a', n: '평정', d: '맞아도 기세가 줄지 않는다' }, { id: 'du_t3b', n: '급소', d: '치명타 피해 추가 +30%' }],
    ],
  },

  /* ---------------- 수호기사 ---------------- */
  bulwark: {
    n: '수호기사', en: 'Bulwark', c: '#74c0fc', i: '🛡', tag: '맞을수록 단단해지는 철벽',
    stat: { hp: 1.15, atk: 0.9, def: 1.2, spd: 0.85 },
    gim: '받은 피해가 「인내」로 쌓인다(막아낸 피해는 두 배로). 인내를 소모해 「응징」으로 되갚는다. 「맹세」를 세우면 그 맹세가 깨지기 전까지 쓰러지지 않는다.',
    res: [{ k: 'end', n: '인내', max: 100, c: '#74c0fc', i: '🛡' }],
    passive: '수호자의 긍지 — 방어 시 피해 60% 경감(기본 50%). 완벽 방어는 받은 피해의 50%를 되돌린다. 기본 피해 +15%, 인내 1당 피해 +0.25%.',
    skills: [
      { id: 'bw_bash', n: '방패 강타', type: 'blunt', hits: [13], energy: 1, bfS: { guard: [1, 1] }, anim: 'slashA', fx: 'bw_bash', melee: 1, stgMul: 1.5, d: '방패로 친다. 보호 1, 흐트러짐 +50%.' },
      { id: 'bw_wall', n: '철벽', cost: 1, cd: 2, type: null, hits: [], anim: 'guard', fx: 'bw_wall', pre: B => { B.shield(B.p, B.p.mhp * 0.15); B.res('end', 10); }, d: '최대 체력 15% 보호막. 인내 +10.' },
      { id: 'bw_taunt', n: '도전의 함성', cost: 1, cd: 3, type: null, hits: [], anim: 'buff', fx: 'bw_taunt', bfS: { guard: [3, 1], thorns: [6, 2] }, d: '보호 3(1턴), 가시 6(2턴).' },
      { id: 'bw_crash', n: '성벽 붕괴', cost: 2, cd: 3, type: 'blunt', hits: [28], anim: 'smash', fx: 'bw_crash', melee: 1, st: { tremor: [3, 2] },
        pre: (B, c) => { if (B.r.end >= 20) { B.res('end', -20); c.mul *= 1.6; c.boosted = 1; } }, d: '내리친다. 인내 20이 있으면 소모해 피해 +60%. 진동 3·2.' },
      { id: 'bw_vow', n: '불굴의 맹세', cost: 2, cd: 6, type: null, hits: [], anim: 'buff', fx: 'bw_vow', bfS: { regen: [3, 3] }, post: B => { B.r.vow = 3; }, d: '3턴 동안 쓰러지지 않는다(대신 인내 -40). 재생 3%.' },
      { id: 'bw_ult', n: '응징', ult: 1, cost: 2, cd: 5, type: 'blunt', hits: [24], anim: 'smash', fx: 'bw_ult', melee: 1, req: B => B.r.end >= 40, reqT: '인내 40 이상',
        pre: (B, c) => { c.spent = B.r.end; c.hits = [30 + c.spent * 1.5]; c.stgMul = 2; B.res('end', -B.r.end); }, post: (B, c) => { if (c.spent >= 80) B.bf(B.f, 'stun', 1, 1); }, d: '인내를 모두 쏟는다(인내당 위력 +1.5). 인내 80 이상이면 적 기절.' },
    ],
    hk: {
      start(B) { B.r.end = 0; B.r.vow = 0; if (B.tal('bw_t1b')) B.shield(B.p, B.p.mhp * 0.2); },
      blockRed(B) { return 0.6 + (B.tal('bw_t2a') ? 0.1 : 0); },
      hurt(B, dmg, res, raw) { const v = (res === 'none' ? dmg : raw) / B.p.mhp * 100 * (res === 'none' ? 1.5 : 3) * (B.tal('bw_t1a') ? 1.3 : 1); if (v > 0) B.res('end', Math.round(v)); },
      defended(B, res, sk, raw) { if (res === 'perfect') { B.trueDmg(B.f, raw * (B.tal('bw_t3a') ? 1 : 0.5), 'reflect'); } },
      death(B) { if (B.r.vow > 0) { B.p.hp = 1; B.res('end', -40); return true; } return false; },
      turnEnd(B) { if (B.r.vow > 0) B.r.vow--; },
      outMul(B) { return 1.15 + B.r.end / (B.tal('bw_t2b') ? 150 : 400); },
    },
    tal: [
      [{ id: 'bw_t1a', n: '굳은 의지', d: '인내 획득 +30%' }, { id: 'bw_t1b', n: '선봉', d: '전투 시작 시 최대 체력 20% 보호막' }],
      [{ id: 'bw_t2a', n: '대방패', d: '방어 경감 60% → 70%' }, { id: 'bw_t2b', n: '분노의 인내', d: '인내 1당 피해 +0.25% → +0.67%' }],
      [{ id: 'bw_t3a', n: '반사 갑주', d: '완벽 방어 반사 50% → 100%' }, { id: 'bw_t3b', n: '두 번째 맹세', d: '불굴의 맹세 쿨타임 -2' }],
    ],
  },

  /* ---------------- 도박사 ---------------- */
  gambler: {
    n: '도박사', en: 'Gambler', c: '#ffd43b', i: '🎲', tag: '동전 한 닢에 모든 것을 거는 승부사',
    stat: { hp: 0.95, atk: 1.04, def: 0.92, spd: 1.1 },
    gim: '기술이 동전을 던진다(정신력과 무관하게 50%). 뒷면이 나올 때마다 「행운」이 쌓이고, 행운 7이면 「잭팟」: 다음 동전 기술은 전부 앞면에 피해 2배.',
    res: [{ k: 'luck', n: '행운', max: 7, c: '#ffd43b', i: '🍀', pips: 1 }],
    passive: '승부사 — 앞면이 연속으로 나오는 동안 치명타 확률이 5%씩 오른다(뒷면에서 초기화).',
    skills: [
      { id: 'gb_toss', n: '카드 던지기', type: 'pierce', hits: [5, 5, 5], energy: 1, coinEach: 1, anim: 'throw', fx: 'gb_toss', hit: (B, c, h) => { if (h.heads) c.bonus = 5; }, d: '카드 세 장. 장마다 동전: 앞면이면 위력 +5.' },
      { id: 'gb_coin', n: '코인 토스', cost: 1, cd: 1, type: 'pierce', hits: [28], anim: 'throw', fx: 'gb_coin', coinGate: 1, onTails: B => { B.energy(2); B.res('luck', 1); }, d: '동전 하나. 앞면이면 강타(28), 뒷면이면 에너지 +2, 행운 +1.' },
      { id: 'gb_allin', n: '올인', cost: 3, cd: 4, type: 'pierce', hits: [], anim: 'throw', fx: 'gb_allin',
        pre: (B, c) => { let h = 0; c.flips = []; for (let i = 0; i < 5; i++) { const r = B.flip(); c.flips.push(r); if (r) h++; } c.hits = h ? Array(h).fill(4 + h * 3.2) : [2]; c.heads = h; B.fx('flips', { flips: c.flips }); }, d: '동전 다섯 개. 앞면 수만큼 타격하고, 앞면이 많을수록 타마다 강해진다(5개면 20×5).' },
      { id: 'gb_sleight', n: '속임수', cost: 1, cd: 3, type: null, hits: [], anim: 'buff', fx: 'gb_sleight', self: { poise: [3, 2] }, post: B => { B.r.rig = 2; }, d: '다음 동전 두 개는 무조건 앞면. 호흡 3·2.' },
      { id: 'gb_edge', n: '하우스 엣지', cost: 2, cd: 4, type: 'pierce', hits: [12], anim: 'throw', fx: 'gb_edge', bfT: { vuln: [1, 2] }, post: B => { B.r.jinx = 1; }, d: '적에게 불운: 적의 다음 공격은 50% 확률로 빗나간다. 취약 1.' },
      { id: 'gb_ult', n: '로열 플러시', ult: 1, cost: 3, cd: 6, type: 'pierce', hits: [22, 22, 22, 22, 22], coinEach: 1, anim: 'throw', fx: 'gb_ult',
        hit: (B, c, h) => { if (!h.heads) c.zero = 1; }, post: (B, c) => { if (c.allHeads) { B.log('♠ 로열 플러시!', 'good'); B.trueDmg(B.f, B.p.atk * 8, 'pierce', c); B.bf(B.f, 'stun', 1, 1); } }, d: '카드 다섯 장, 장마다 동전: 앞면만 적중. 다섯 장 모두 앞면이면 추가 강타와 기절.' },
    ],
    hk: {
      start(B) { B.r.luck = 0; B.r.rig = 0; B.r.jinx = 0; B.r.streak = 0; B.r.jack = 0; },
      flip(B) {
        if (B.r.jack || B.r.rig > 0) { if (B.r.rig > 0 && !B.r.jack) B.r.rig--; B.r.streak++; return true; }
        const h = B.rng() < 0.5 + (B.tal('gb_t2a') ? 0.08 : 0);
        if (h) B.r.streak++; else { B.r.streak = 0; B.res('luck', 1 + (B.tal('gb_t1a') && B.rng() < 0.3 ? 1 : 0)); if (B.r.luck >= 7 && !B.r.jack) { B.r.jack = 1; B.fx('jackpotReady'); B.log('🍀 행운 7 — 다음 기술은 잭팟', 'good'); } }
        return h;
      },
      beforeSkill(B, c) { if (B.r.jack && (c.sk.coinEach || c.sk.coinGate || c.sk.id === 'gb_allin')) { c.jackpot = 1; c.mul *= B.tal('gb_t2b') ? 2.6 : 2; B.fx('jackpot'); } },
      afterSkill(B, c) { if (c.jackpot) { B.r.jack = 0; B.res('luck', -B.r.luck); B.stats.jackpots = (B.stats.jackpots || 0) + 1; } },
      critAdd(B) { return B.r.streak * (B.tal('gb_t3b') ? 8 : 5); },
      foeMiss(B) { if (B.r.jinx) { B.r.jinx = 0; return B.rng() < 0.5; } return false; },
      turnStart(B) { if (B.tal('gb_t1b') && B.rng() < 0.25) B.energy(1); },
    },
    tal: [
      [{ id: 'gb_t1a', n: '네잎클로버', d: '뒷면일 때 30% 확률로 행운 +1 추가' }, { id: 'gb_t1b', n: '용돈', d: '턴 시작 시 25% 확률로 에너지 +1' }],
      [{ id: 'gb_t2a', n: '무게추 동전', d: '앞면 확률 50% → 58%' }, { id: 'gb_t2b', n: '판돈 올리기', d: '잭팟 피해 2배 → 2.6배' }],
      [{ id: 'gb_t3a', n: '타짜', d: '속임수 쿨타임 -1, 앞면 보장 3개' }, { id: 'gb_t3b', n: '연승', d: '연속 앞면 치명타 5% → 8%' }],
    ],
  },

  /* ---------------- 심해 시인 ---------------- */
  poet: {
    n: '심해 시인', en: 'Abyss Poet', c: '#3bc9db', i: '🌊', tag: '절망을 운율로 바꾸는 가라앉은 시인',
    stat: { hp: 0.98, atk: 1.04, def: 0.95, spd: 1.0 },
    gim: '정신력을 스스로 깎는다. 공황에 빠지지 않으며, 정신력이 낮을수록 강해진다. 정신력 −45에 닿으면 3턴 동안 「심연」: 침잠 위력 +2, 기술 비용 −1, 피해 +40%.',
    res: [{ k: 'abyss', n: '심연', max: 3, c: '#3bc9db', i: '🌀', pips: 1 }],
    passive: '깊이 — 정신력 −10마다 피해 +6%, 치명타 확률 +3%. 적이 가진 침잠 위력 1당 적의 피해 -1% (최대 30%).',
    skills: [
      { id: 'po_verse', n: '젖은 문장', type: 'pierce', hits: [12], energy: 1, st: { sinking: [2, 2] }, anim: 'thrust', fx: 'po_verse', melee: 1, sp: -4, d: '깃펜으로 새긴다. 침잠 2·2, 정신력 -4.' },
      { id: 'po_meter', n: '심연의 운율', cost: 1, cd: 2, type: 'slash', hits: [7, 7, 7], stEach: { sinking: [1, 1] }, anim: 'slashB', fx: 'po_meter', sp: -9, d: '세 번 긋는다. 타마다 침잠 1·1, 정신력 -9.' },
      { id: 'po_jelly', n: '해파리 비가', cost: 2, cd: 4, type: null, hits: [], anim: 'cast', fx: 'po_jelly', post: B => { B.r.jelly = 3; }, sp: -6, d: '해파리를 띄운다: 3턴 동안 내 턴 시작마다 쏘아 피해와 침잠 2·1.' },
      { id: 'po_surface', n: '수면 위로', cost: 1, cd: 4, type: null, hits: [], anim: 'buff', fx: 'po_surface', pre: B => { B.sp(28); B.heal(B.p, B.p.mhp * 0.12); B.cleanse(B.p, 2); }, d: '숨을 쉰다. 정신력 +28, 체력 12% 회복, 해로운 효과 둘 제거.' },
      { id: 'po_drown', n: '익사', cost: 3, cd: 4, type: null, hits: [], anim: 'cast', fx: 'po_drown', req: B => B.stv(B.f, 'sinking') > 0, reqT: '적이 침잠 중',
        post: (B, c) => { const s = B.f.st.sinking; if (!s) return; B.trueDmg(B.f, B.sc(s.p * Math.min(6, s.c) * 0.6 * (B.r.abyss ? 1.3 : 1)), 'sinking', c); s.c = Math.ceil(s.c / 2); B.emitSt(B.f, 'sinking'); }, sp: -6, d: '침잠이 적을 삼킨다: 위력×횟수(최대 6)×0.6 고정 피해(심연이면 ×1.3). 침잠 횟수 절반.' },
      { id: 'po_ult', n: '해구의 시', ult: 1, cost: 3, cd: 5, type: 'pierce', hits: [36], anim: 'release', fx: 'po_ult', req: B => B.p.sp <= -20, reqT: '정신력 -20 이하', st: { sinking: [6, 5] },
        pre: (B, c) => { c.hits = [36 + Math.abs(B.p.sp) * 1.2]; }, post: B => { B.sp(-45 - B.p.sp); }, d: '해구를 연다(정신력 1당 위력 +1.2). 침잠 6·5. 정신력이 −45로 떨어져 심연에 든다.' },
    ],
    hk: {
      start(B) { B.r.abyss = 0; B.r.jelly = 0; B.p.noPanic = 1; if (B.tal('po_t1b')) B.sp(-20); },
      afterSkill(B, c) { if (c.sk.sp) B.sp(c.sk.sp * (B.tal('po_t1a') ? 1.3 : 1)); },
      onSp(B) { if (B.p.sp <= -45 && !B.r.abyss) { B.res('abyss', 3 - B.r.abyss); B.fx('abyss'); B.log('🌀 심연 — 가라앉을수록 맑아진다', 'good'); } },
      costMod(B, sk) { return B.r.abyss ? -1 : 0; },
      outMul(B) { return 1 + Math.max(0, -B.p.sp) / 10 * 0.06 + (B.r.abyss ? 0.4 : 0); },
      critAdd(B) { return Math.max(0, -B.p.sp) / 10 * 3; },
      stCnt(B, k) { return 0; },
      stPot(B, k) { return k === 'sinking' && B.r.abyss ? 2 : 0; },
      foeOutMul(B) { return 1 - Math.min(0.3, B.stp(B.f, 'sinking') * (B.tal('po_t2a') ? 0.02 : 0.01)); },
      turnStart(B) { if (B.r.jelly > 0) { B.r.jelly--; B.counter(9, 'pierce', 'po_sting', { sinking: [2, 1] }); } },
      turnEnd(B) { if (B.r.abyss) { B.res('abyss', -1); if (!B.r.abyss) { B.sp(-10 - B.p.sp + (B.tal('po_t3b') ? -15 : 0)); B.log('심연에서 떠올랐다', 'sys'); } } },
    },
    tal: [
      [{ id: 'po_t1a', n: '투신', d: '기술로 깎는 정신력 +30%' }, { id: 'po_t1b', n: '젖은 출발', d: '전투를 정신력 -20으로 시작' }],
      [{ id: 'po_t2a', n: '짓누르는 물', d: '침잠의 적 피해 감소 1% → 2%' }, { id: 'po_t2b', n: '해파리 떼', d: '해파리 비가 4턴, 쿨타임 -1' }],
      [{ id: 'po_t3a', n: '심해어', d: '심연 중 받는 피해 -25%' }, { id: 'po_t3b', n: '잠수', d: '심연이 끝나도 정신력 −25에 머문다' }],
    ],
  },

  /* ---------------- 포격수 ---------------- */
  gunner: {
    n: '포격수', en: 'Gunner', c: '#ffa94d', i: '💥', tag: '장전과 충전으로 한 방을 노리는 포병',
    stat: { hp: 1.05, atk: 1.06, def: 1.0, spd: 0.9 },
    gim: '사격 기술은 「탄약」을 쓴다(최대 6). 장전으로 채우며 「충전」을 쌓는다. 충전 5 이상이면 모든 충전을 쏟는 「과충전 포격」.',
    res: [{ k: 'ammo', n: '탄약', max: 6, c: '#ffa94d', i: '▮', pips: 1 }],
    passive: '탄도학 — 파열 중인 적에게 관통 피해 +15%. 충전 1당 관통 피해 +2%. 탄약 0에서 장전하면 충전 +2 추가.',
    skills: [
      { id: 'gn_shot', n: '사격', type: 'pierce', hits: [15], energy: 1, anim: 'shoot', fx: 'gn_shot', ammo: 1,
        pre: (B, c) => { if (B.r.ammo < 1) { c.hits = [6]; c.type = 'blunt'; c.fx = 'gn_butt'; c.anim = 'slashA'; c.melee = 1; c.noAmmo = 1; } }, d: '한 발 쏜다(탄약 1). 탄약이 없으면 개머리판으로 친다.' },
      { id: 'gn_reload', n: '장전', cost: 0, cd: 1, type: null, hits: [], anim: 'item', fx: 'gn_reload',
        pre: B => { const empty = B.r.ammo === 0; B.res('ammo', 6 - B.r.ammo); B.st(B.p, 'charge', 2 + (empty ? 2 : 0), 2); }, d: '탄약을 가득 채우고 충전 2·2 (탄약 0이었으면 충전 +2).' },
      { id: 'gn_buck', n: '산탄', cost: 1, cd: 2, type: 'pierce', hits: [4, 4, 4, 4, 4, 4], ammo: 2, stEach: { rupture: [1, 0] }, st: { rupture: [1, 2] }, anim: 'shoot', fx: 'gn_buck', req: B => B.r.ammo >= 2, reqT: '탄약 2', d: '탄약 2로 산탄 여섯 알. 파열이 쌓인다.' },
      { id: 'gn_charge', n: '충전', cost: 1, cd: 3, type: null, hits: [], anim: 'charge', fx: 'gn_charge', self: { charge: [5, 3] }, bfS: { guard: [1, 1] }, d: '포신을 달군다. 충전 5·3, 보호 1.' },
      { id: 'gn_ap', n: '철갑탄', cost: 2, cd: 3, type: 'pierce', hits: [30], ammo: 1, st: { rupture: [4, 2] }, anim: 'shoot', fx: 'gn_ap', req: B => B.r.ammo >= 1, reqT: '탄약 1', pre: (B, c) => { c.ignoreDef = 0.5; }, d: '방어 50% 무시. 파열 4·2.' },
      { id: 'gn_ult', n: '과충전 포격', ult: 1, cost: 2, cd: 5, type: 'pierce', hits: [30], anim: 'shoot', fx: 'gn_ult', req: B => B.stp(B.p, 'charge') >= 5, reqT: '충전 5 이상', st: { rupture: [6, 3] },
        pre: (B, c) => { c.spent = B.stp(B.p, 'charge'); c.hits = [26 + c.spent * 5]; B.clearSt(B.p, 'charge'); B.res('ammo', -B.r.ammo); }, d: '충전을 모두 쏟는 포격(충전당 위력 +5). 탄약도 모두 쓴다. 파열 6·3.' },
    ],
    hk: {
      start(B) { B.r.ammo = B.tal('gn_t1b') ? 6 : 4; },
      beforeSkill(B, c) { if (c.sk.ammo && !c.noAmmo) { B.res('ammo', -Math.min(B.r.ammo, c.sk.ammo)); } if (c.type === 'pierce' && B.stp(B.p, 'charge') && c.sk.id !== 'gn_ult') c.mul *= 1 + B.stp(B.p, 'charge') * (B.tal('gn_t2a') ? 0.035 : 0.02); },
      outMul(B, c) { return c && c.type === 'pierce' && B.stv(B.f, 'rupture') ? 1.15 + (B.tal('gn_t3a') ? 0.15 : 0) : 1; },
      turnStart(B) { if (B.tal('gn_t2b') && B.r.ammo < 6) B.res('ammo', 1); },
    },
    tal: [
      [{ id: 'gn_t1a', n: '속사', d: '사격이 두 발 (각 65%)' }, { id: 'gn_t1b', n: '탄띠', d: '전투를 탄약 6으로 시작' }],
      [{ id: 'gn_t2a', n: '열선', d: '충전 1당 관통 피해 +3% → +5%' }, { id: 'gn_t2b', n: '자동 장전', d: '턴 시작 시 탄약 +1' }],
      [{ id: 'gn_t3a', n: '파쇄탄', d: '파열 적 관통 피해 +20% → +35%' }, { id: 'gn_t3b', n: '포병의 집념', d: '과충전 포격 후 충전 3·2 회복' }],
    ],
  },

  /* ---------------- 인형술사 ---------------- */
  puppeteer: {
    n: '인형술사', en: 'Puppeteer', c: '#e599f7', i: '🧵', tag: '실과 인형으로 적의 칼끝을 돌리는 연출가',
    stat: { hp: 0.9, atk: 1.0, def: 0.95, spd: 1.05 },
    gim: '인형 「마리」가 곁에 있다: 받는 피해의 40%를 대신 받고, 턴마다 작게 공격한다. 적에게 「실」을 4개 엮으면 「꼭두각시 춤」으로 적의 다음 공격을 적 자신에게 돌린다.',
    res: [{ k: 'doll', n: '마리', max: 100, c: '#e599f7', i: '🎎', bar: 1 }, { k: 'thread', n: '실', max: 6, c: '#f783ac', i: '🧵', pips: 1 }],
    passive: '인형과 함께 — 마리의 공격이 30% 확률로 실을 하나 엮는다. 마리가 부서지면 2턴 뒤 절반으로 다시 일어난다.',
    skills: [
      { id: 'pp_pull', n: '실 뽑기', type: 'slash', hits: [11], energy: 1, anim: 'throw', fx: 'pp_pull', thread: 1, d: '실로 벤다. 실 +1.' },
      { id: 'pp_charge', n: '인형 돌격', cost: 1, cd: 2, type: 'blunt', hits: [20], anim: 'puppet', fx: 'pp_charge', bfT: { bind: [1, 1] }, req: B => B.r.doll > 0, reqT: '마리가 있어야 함', d: '마리가 들이받는다. 속박 1.' },
      { id: 'pp_mend', n: '수선', cost: 1, cd: 3, type: null, hits: [], anim: 'buff', fx: 'pp_mend', pre: B => { B.r.dollDown = 0; B.res('doll', 50); B.shield(B.p, B.p.mhp * 0.08); }, d: '마리를 50% 고친다(부서졌으면 다시 세운다). 보호막 8%.' },
      { id: 'pp_tangle', n: '엮기', cost: 2, cd: 3, type: 'slash', hits: [10, 10], anim: 'throw', fx: 'pp_tangle', bfT: { bind: [2, 2] }, st: { rupture: [2, 2] }, thread: 2, d: '실을 감는다. 실 +2, 속박 2, 파열 2·2.' },
      { id: 'pp_dance', n: '꼭두각시 춤', cost: 2, cd: 4, type: null, hits: [], anim: 'cast', fx: 'pp_dance', req: B => B.r.thread >= (B.tal('pp_t3a') ? 3 : 4), reqT: '실 4개', post: B => { B.res('thread', B.tal('pp_t3a') ? -3 : -4); B.r.dance = 1; }, d: '실 4개를 당긴다. 적의 다음 공격은 적 자신을 때린다.' },
      { id: 'pp_ult', n: '인형극의 막', ult: 1, cost: 3, cd: 6, type: 'slash', hits: [8, 8, 8, 8, 8, 8], anim: 'release', fx: 'pp_ult', req: B => B.r.doll > 0, reqT: '마리가 있어야 함',
        post: (B, c) => { const v = B.p.atk * (2 + B.r.doll / 25); B.trueDmg(B.f, v, 'blunt', c); B.res('doll', -B.r.doll); B.r.dollDown = 1; B.res('thread', 2); }, d: '여섯 번 벤 뒤 마리가 터진다(남은 내구도 비례 피해). 마리는 1턴 뒤 절반으로 돌아온다. 실 +2.' },
    ],
    hk: {
      start(B) { B.r.doll = 100; B.r.thread = 0; B.r.dance = 0; B.r.dollDown = 0; },
      afterSkill(B, c) { if (c.sk.thread) B.res('thread', c.sk.thread + (B.tal('pp_t1a') ? 1 : 0)); },
      absorb(B, dmg) { if (B.r.doll <= 0) return dmg; const share = B.tal('pp_t2a') ? 0.55 : 0.4; const take = Math.round(dmg * share); const dollHp = B.p.mhp * 0.4; const lost = Math.ceil(take / dollHp * 100); B.res('doll', -Math.min(B.r.doll, lost)); if (B.r.doll <= 0) { B.r.dollDown = 2; B.fx('dollBreak'); B.log('🎎 마리가 부서졌다', 'bad'); } return dmg - take; },
      turnStart(B) {
        if (B.r.dollDown > 0) { B.r.dollDown--; if (!B.r.dollDown && B.r.doll <= 0) { B.res('doll', 50); B.log('🎎 마리가 다시 일어났다', 'good'); } }
        else if (B.r.doll > 0) { B.counter(9 + (B.tal('pp_t3b') ? 5 : 0), 'blunt', 'pp_doll'); if (B.rng() < (B.tal('pp_t1b') ? 0.6 : 0.3)) B.res('thread', 1); }
      },
      redirect(B) { if (B.r.dance) { B.r.dance = 0; return true; } return false; },
    },
    tal: [
      [{ id: 'pp_t1a', n: '자수', d: '실을 엮는 기술의 실 +1' }, { id: 'pp_t1b', n: '바늘손', d: '마리 공격의 실 확률 30% → 60%' }],
      [{ id: 'pp_t2a', n: '대역', d: '마리가 대신 받는 피해 40% → 55%' }, { id: 'pp_t2b', n: '앙코르', d: '꼭두각시 춤으로 돌린 공격 피해 +50%' }],
      [{ id: 'pp_t3a', n: '끊어지지 않는 실', d: '꼭두각시 춤이 실 3개만 쓴다' }, { id: 'pp_t3b', n: '전투 인형', d: '마리의 턴 공격 위력 +5' }],
    ],
  },

  /* ---------------- 시계공 ---------------- */
  clock: {
    n: '시계공', en: 'Clockmaker', c: '#ffd43b', i: '⚙', tag: '태엽을 감아 시간을 되돌리는 장인',
    stat: { hp: 1.0, atk: 0.98, def: 1.05, spd: 1.05 },
    gim: '적의 행동을 두 수 앞까지 본다. 공격하면 「태엽」이 감기고, 태엽으로 체력을 2턴 전으로 「되감거나」 적의 시간을 멈춘다.',
    res: [{ k: 'wind', n: '태엽', max: 5, c: '#ffd43b', i: '⚙', pips: 1 }],
    passive: '정밀 — 적의 다음 두 행동을 미리 본다. 방어 판정 폭 +30%. 기본 피해 +8%, 감긴 태엽 1당 피해 +7%.',
    skills: [
      { id: 'ck_cog', n: '톱니 치기', type: 'blunt', hits: [12], energy: 1, anim: 'slashA', fx: 'ck_cog', melee: 1, wind: 1, st: { tremor: [1, 2] }, d: '렌치로 친다. 진동 1·2, 태엽 +1.' },
      { id: 'ck_second', n: '초침', cost: 1, cd: 1, type: 'pierce', hits: [10, 10], anim: 'throw', fx: 'ck_second', bfT: { bind: [1, 1] }, wind: 1, d: '초침 두 개를 날린다. 속박 1, 태엽 +1.' },
      { id: 'ck_rewind', n: '되감기', cost: 2, cd: 5, type: null, hits: [], anim: 'buff', fx: 'ck_rewind', req: B => B.r.wind >= 2, reqT: '태엽 2',
        pre: B => { B.res('wind', -2); const old = B.hpAgo(2); if (old > B.p.hp) B.heal(B.p, old - B.p.hp); B.cleanse(B.p, 9); for (const k in B.cds) if (B.cds[k] > 0) B.cds[k]--; }, d: '태엽 2. 체력을 2턴 전으로 되돌리고 해로운 효과를 모두 지운다. 쿨타임 -1.' },
      { id: 'ck_over', n: '가속', cost: 1, cd: 4, type: null, hits: [], anim: 'buff', fx: 'ck_over', bfS: { haste: [2, 3] }, wind: 1, post: B => { B.r.nextEn = 2; }, d: '신속 2(3턴). 다음 턴 에너지 +2. 태엽 +1.' },
      { id: 'ck_stop', n: '시간 정지', cost: 3, cd: 6, type: null, hits: [], anim: 'cast', fx: 'ck_stop', req: B => B.r.wind >= 3, reqT: '태엽 3', post: B => { B.res('wind', -3); B.r.stopped = 1; B.f.frozen = 1; }, d: '태엽 3. 적의 다음 턴을 멈춘다(준비 중인 행동도 그대로 멈춘다).' },
      { id: 'ck_ult', n: '영겁의 톱니', ult: 1, cost: 3, cd: 6, type: 'blunt', hits: [], anim: 'release', fx: 'ck_ult', req: B => B.r.wind >= 3, reqT: '태엽 3', stEach: { tremor: [1, 0] },
        pre: (B, c) => { c.spent = B.r.wind; c.hits = Array(12).fill(4.5 + c.spent * 1.1); B.res('wind', -B.r.wind); }, post: (B, c) => { B.burst(B.f, 1, c); B.delayCharge(1); }, d: '태엽을 모두 푼다. 열두 번 시계탑이 무너진다(태엽당 위력 +1.1), 타마다 진동 위력 +1, 마지막에 진동 폭발. 적의 준비 시간 +1.' },
    ],
    hk: {
      start(B) { B.r.wind = B.tal('ck_t1b') ? 2 : 0; B.r.stopped = 0; B.r.nextEn = 0; B.p.foresight = 1; },
      afterSkill(B, c) { if (c.sk.wind) B.res('wind', c.sk.wind + (B.tal('ck_t1a') && c.sk.type ? 1 : 0)); },
      qteBonus() { return 0.3; },
      outMul(B) { return 1.08 + B.r.wind * 0.07; },
      turnStart(B) { if (B.r.nextEn) { B.energy(B.r.nextEn); B.r.nextEn = 0; } },
    },
    tal: [
      [{ id: 'ck_t1a', n: '정밀 가공', d: '공격 기술의 태엽 +1' }, { id: 'ck_t1b', n: '미리 감기', d: '전투를 태엽 2로 시작' }],
      [{ id: 'ck_t2a', n: '역행', d: '되감기 쿨타임 -2' }, { id: 'ck_t2b', n: '초정밀', d: '방어 판정 폭 추가 +20%' }],
      [{ id: 'ck_t3a', n: '시간 도둑', d: '시간 정지 후 에너지 +3' }, { id: 'ck_t3b', n: '무한 태엽', d: '태엽 최대 5 → 7' }],
    ],
  },
};
const CLASS_ORDER = ['hemoblade', 'ember', 'bell', 'duelist', 'bulwark', 'gambler', 'poet', 'gunner', 'puppeteer', 'clock'];
const SKILL_ORDER = {
  duelist: ['du_lunge', 'du_feint', 'du_flurry', 'du_stance', 'du_duel', 'du_ult'],
  bulwark: ['bw_bash', 'bw_wall', 'bw_crash', 'bw_taunt', 'bw_vow', 'bw_ult'],
  gunner: ['gn_shot', 'gn_reload', 'gn_ap', 'gn_buck', 'gn_charge', 'gn_ult'],
  puppeteer: ['pp_pull', 'pp_charge', 'pp_tangle', 'pp_mend', 'pp_dance', 'pp_ult'],
};
for (const k in SKILL_ORDER) CLASSES[k].skills = SKILL_ORDER[k].map(id => CLASSES[k].skills.find(s => s.id === id));
for (const k of CLASS_ORDER) CLASSES[k].skills.forEach((s, i) => { s.cls = k; s.slot = i; s.unlock = UNLOCK[i]; if (i === 0) s.basic = 1; if (s.cost == null) s.cost = 0; if (s.cd == null) s.cd = 0; });
const SKILL = {};
for (const k of CLASS_ORDER) for (const s of CLASSES[k].skills) SKILL[s.id] = s;

/* ===== 직업별 자동 전투 판단 (has(id) → 쓸 수 있으면 그 기술) ===== */
CLASSES.hemoblade.ai = (B, has) => {
  const p = B.p, b = B.f.st.bleed;
  if (has('hb_ult') && B.r.tide >= 7) return 'hb_ult';
  if (has('hb_hemo') && b && b.p * b.c >= 18) return 'hb_hemo';
  if (has('hb_let') && p.hp > p.mhp * 0.65 && B.r.tide <= 6) return 'hb_let';
  if (has('hb_thrust') && p.hp > p.mhp * 0.35) return 'hb_thrust';
  if (has('hb_waltz')) return 'hb_waltz';
  if (has('hb_ult')) return 'hb_ult';
  return 'hb_line';
};
CLASSES.ember.ai = (B, has) => {
  const p = B.p, b = B.f.st.burn;
  if (has('em_ult')) return 'em_ult';
  if (has('em_ash') && (B.r.heat >= 125 || (p.hp < p.mhp * 0.4 && B.r.heat >= 30))) return 'em_ash';
  if (has('em_purge') && b && b.p * Math.min(6, b.c) >= 18) return 'em_purge';
  if (has('em_flurry')) return 'em_flurry';
  if (has('em_bapt')) return 'em_bapt';
  return 'em_spark';
};
CLASSES.bell.ai = (B, has, ok) => {
  const want = B.r.beat + 1;
  if (has('bl_ult') && (B.r.beat === 0 || B.r.big)) return 'bl_ult';
  if (has('bl_hush') && want === 1 && B.threat() > 0.2) return 'bl_hush';
  const tone = ok.filter(u => u.sk.tone === want).sort((a, b) => b.cost - a.cost);
  if (tone.length) return tone[0].id;
  return 'bl_toll';
};
CLASSES.duelist.ai = (B, has) => {
  if (has('du_ult') && B.r.mo >= 7) return 'du_ult';
  if (has('du_stance') && B.threat() > 0.14) return 'du_stance';
  if (has('du_duel') && !B.bfv(B.f, 'vuln')) return 'du_duel';
  if (has('du_flurry')) return 'du_flurry';
  if (has('du_feint')) return 'du_feint';
  if (has('du_ult')) return 'du_ult';
  return 'du_lunge';
};
CLASSES.bulwark.ai = (B, has) => {
  const p = B.p;
  if (has('bw_vow') && p.hp < p.mhp * 0.35) return 'bw_vow';
  if (has('bw_ult') && B.r.end >= 60) return 'bw_ult';
  if (has('bw_wall') && B.threat() > 0.15) return 'bw_wall';
  if (has('bw_taunt') && B.threat() > 0.1) return 'bw_taunt';
  if (has('bw_crash')) return 'bw_crash';
  return 'bw_bash';
};
CLASSES.gambler.ai = (B, has) => {
  if (B.r.jack && has('gb_ult')) return 'gb_ult';
  if (B.r.jack && has('gb_allin')) return 'gb_allin';
  if (has('gb_sleight') && (has('gb_ult') || B.p.en >= 4)) return 'gb_sleight';
  if (has('gb_ult') && B.r.rig >= 2) return 'gb_ult';
  if (has('gb_allin')) return 'gb_allin';
  if (has('gb_edge') && B.threat() > 0.15) return 'gb_edge';
  if (has('gb_coin')) return 'gb_coin';
  return 'gb_toss';
};
CLASSES.poet.ai = (B, has) => {
  const p = B.p, s = B.f.st.sinking;
  if (has('po_ult')) return 'po_ult';
  if (has('po_surface') && p.hp < p.mhp * 0.35) return 'po_surface';
  if (has('po_drown') && s && s.p * s.c >= 16) return 'po_drown';
  if (has('po_jelly') && !B.r.jelly) return 'po_jelly';
  if (has('po_meter')) return 'po_meter';
  return 'po_verse';
};
CLASSES.gunner.ai = (B, has) => {
  const ch = B.stp(B.p, 'charge');
  if (B.r.ammo < 1 && has('gn_reload')) return 'gn_reload';
  if (has('gn_ult') && ch >= 9) return 'gn_ult';
  if (has('gn_charge') && ch < 9) return 'gn_charge';
  if (has('gn_ap')) return 'gn_ap';
  if (has('gn_buck')) return 'gn_buck';
  if (has('gn_ult')) return 'gn_ult';
  if (B.r.ammo < 2 && has('gn_reload') && B.p.en < 2) return 'gn_reload';
  return 'gn_shot';
};
CLASSES.puppeteer.ai = (B, has) => {
  if (has('pp_mend') && B.r.doll < 35) return 'pp_mend';
  if (has('pp_dance') && B.threat() > 0.12) return 'pp_dance';
  if (has('pp_ult') && B.r.doll >= 60) return 'pp_ult';
  if (has('pp_tangle')) return 'pp_tangle';
  if (has('pp_charge')) return 'pp_charge';
  return 'pp_pull';
};
CLASSES.clock.ai = (B, has) => {
  const p = B.p;
  if (has('ck_rewind') && B.hpAgo(2) - p.hp > p.mhp * 0.25) return 'ck_rewind';
  if (has('ck_stop') && B.threat() > 0.3) return 'ck_stop';
  if (has('ck_ult') && B.r.wind >= 5) return 'ck_ult';
  if (has('ck_over') && !B.bfv(p, 'haste')) return 'ck_over';
  if (has('ck_second')) return 'ck_second';
  return 'ck_cog';
};
