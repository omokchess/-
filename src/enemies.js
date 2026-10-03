'use strict';
/* ===== 잔향선 · 적 · 정예 · 잔향체(보스) ===== */

function S(name, dt, emo, base, cp, coins, x) { return Object.assign({ name, kind: 'atk', dt, emo, base, cp, coins }, x || {}); }
function GD(name, base, cp, coins, x) { return Object.assign({ name, kind: 'guard', dt: 'blunt', emo: 'void', base, cp, coins, w: 0.5 }, x || {}); }
function EV(name, base, cp, x) { return Object.assign({ name, kind: 'evade', dt: 'slash', emo: 'void', base, cp, coins: 1, w: 0.5 }, x || {}); }
const eInf = (key, p, n) => c => c.b.inflict(c.u, c.t, key, p, n, c.s);
const eSp = d => c => c.b.addSp(c.t, d);
const eBuf = (key, x) => c => c.b.buff(c.t, key, x);

function dmgFx(b, t, d, label, src) { const dd = b.damage(t, d, { kind: 'fx', src, noShare: true }); b.emit('dot', { t: t.uid, k: 'fx', d: dd, label }); return dd; }
function vanish(b, u, text) { u.alive = false; u.hp = 0; for (const a of b.acts) if (a.u === u) { a.done = true; a.spent = true; } b.emit('die', { t: u.uid, text }); }
function revive(b, u, frac) { u.alive = true; u.hp = Math.round(u.maxHp * frac); u.st = {}; u.stag = 0; u.panic = 0; u.thIdx = u.th.filter(v => v >= u.hp).length; b.spdRoll(u); b.emit('revive', { t: u.uid }); }
const livingOf = (b, id) => b.enemies.filter(e => e.alive && e.eid === id);
const actsOf = (b, u) => b.acts.filter(a => a.u === u && a.used);

const ENEMIES = {
  /* ============ 1장 잿빛 승강장 ============ */
  vagrant: { name: '승강장 부랑자', hp: 48, spd: [2, 5], res: { slash: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('쇠파이프', 'blunt', 'fury', 3, 3, 2), S('깨진 병', 'slash', 'sorrow', 4, 2, 2, { hit: eInf('bleed', 1, 1) })], desc: '막차를 놓치고 승강장에 눌어붙은 사람.' },
  clockrat: { name: '태엽쥐', hp: 32, spd: [4, 7], sp: false, res: { slash: 0.75, blunt: 1.5 }, th: [],
    skills: [S('물어뜯기', 'pierce', 'fury', 3, 2, 2), S('톱니 돌진', 'blunt', 'void', 2, 3, 2)], desc: '태엽이 다 풀릴 때까지 뛰는 쥐.' },
  luggage: { name: '잃어버린 수하물', hp: 72, spd: [1, 3], sp: false, res: { slash: 0.75, pierce: 0.5, blunt: 1.5 }, th: [0.5],
    skills: [S('덮치기', 'blunt', 'void', 4, 2, 2), GD('가방 닫기', 5, 2, 2)], desc: '주인을 기다리다 이빨이 난 가방.' },
  inspector: { name: '녹슨 검표원', elite: true, hp: 190, spd: [3, 6], res: { pierce: 0.75, blunt: 1.25 }, th: [0.6, 0.3],
    skills: [S('개찰 펀치', 'pierce', 'fury', 4, 3, 2), S('벌금 고지', 'blunt', 'dread', 5, 2, 3)],
    mech: [{ n: '검표', d: '매 턴 아군 하나를 「무임승차」로 지목한다. 그 아군이 이번 턴 검표원을 공격하지 않으면 다음 턴 취약 2, 정신력 −10.' }],
    h: {
      turnStart(r, self, b) { const t = pick(b.livingAllies(), b.rng); if (t) { b.vars.ticket = t.uid; b.msg(`검표원이 ${t.name}을(를) 지목한다. "표를 보여 주시죠."`, 'warn'); } },
      turnEnd(r, self, b) {
        const t = b.byUid(b.vars.ticket); if (!t || !t.alive) return;
        if (!b.acts.some(a => a.u === t && a.used && a.target === self)) { b.buff(t, 'fragile', 2); b.addSp(t, -10); b.msg(`${t.name}: 무임승차 벌금.`); }
      },
    } },

  /* ============ 2장 녹슨 정육시장 ============ */
  cleaver: { name: '시장 도살꾼', hp: 60, spd: [3, 5], res: { pierce: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('정육칼', 'slash', 'fury', 4, 3, 2, { hit: eInf('bleed', 1, 1) }), S('뼈 자르기', 'slash', 'obsession', 3, 4, 2)], desc: '고기와 손님을 구분하지 않게 된 상인.' },
  hookhound: { name: '갈고리 사냥개', hp: 46, spd: [4, 7], sp: false, res: { slash: 1.25, pierce: 0.75 }, th: [],
    skills: [S('갈고리 물기', 'pierce', 'fury', 3, 3, 2, { hit: eInf('bleed', 1, 0) }), S('덮치기', 'slash', 'fury', 5, 2, 1)] },
  bloodmerchant: { name: '핏빛 상인', hp: 56, spd: [2, 5], res: { slash: 1.25, blunt: 1 }, th: [0.5],
    skills: [S('흥정', 'blunt', 'obsession', 3, 2, 3, { hit: eBuf('fragile', 1) }), GD('시장 저울', 5, 3, 2)] },
  freezer: { name: '냉동고의 주인', elite: true, hp: 250, spd: [2, 5], res: { slash: 0.75, pierce: 1, blunt: 1.25 }, th: [0.6, 0.3],
    skills: [S('얼어붙은 갈고리', 'pierce', 'sorrow', 5, 3, 2, { hit: eBuf('bind', 1) }), S('냉동 고기', 'blunt', 'void', 6, 2, 2)],
    mech: [{ n: '냉동', d: '공격받은 아군은 다음 턴 속박. 체력이 절반 이하가 되면 「해동」: 기본 위력 +2 (영구).' }],
    h: {
      basePower(c, self) { return c.u === self && self.flags.thaw ? 2 : 0; },
      hit(c, self, b) { if (c.t === self && !self.flags.thaw && self.hp <= self.maxHp / 2) { self.flags.thaw = true; b.msg('냉동고의 주인이 해동된다. 더 사나워졌다.', 'warn'); } },
    } },

  /* ============ 3장 침수된 도서관 ============ */
  soakedpage: { name: '젖은 사서보', hp: 58, spd: [3, 5], res: { slash: 1.25, pierce: 1 }, th: [0.5],
    skills: [S('종이 베기', 'slash', 'sorrow', 3, 3, 2, { hit: eInf('sinking', 1, 1) }), S('각주 찌르기', 'pierce', 'void', 4, 2, 2)] },
  inkjelly: { name: '잉크 해파리', hp: 52, spd: [2, 4], sp: false, res: { pierce: 1.5, blunt: 0.5 }, th: [],
    skills: [S('촉수', 'blunt', 'sorrow', 2, 3, 3, { hit: eInf('sinking', 1, 0) }), EV('흐물거림', 4, 2)] },
  shelf: { name: '금서 서가', hp: 92, spd: [1, 3], sp: false, res: { slash: 0.75, blunt: 1.5 }, th: [0.5],
    skills: [S('책장 무너뜨리기', 'blunt', 'dread', 5, 3, 2, { tgt: 2 })] },
  reader: { name: '수몰된 낭독자', elite: true, hp: 300, spd: [3, 5], res: { slash: 1, pierce: 1.25, blunt: 0.75 }, th: [0.6, 0.3],
    skills: [S('젖은 문장', 'slash', 'sorrow', 4, 3, 3, { hit: eInf('sinking', 1, 1) }), S('침묵 낭독', 'blunt', 'sorrow', 3, 2, 2, { tgt: 'all', hit: eSp(-3) })],
    mech: [{ n: '낭독', d: '매 턴이 끝날 때 아군 전체 정신력 −5. 정신력 −20 이하인 아군이 있으면 기본 위력 +2.' }],
    h: {
      turnEnd(r, self, b) { for (const a of b.livingAllies()) b.addSp(a, -5, true); b.msg('낭독이 이어진다. 아군 정신력 −5.'); },
      basePower(c, self, b) { return c.u === self && b.livingAllies().some(a => a.sp <= -20) ? 2 : 0; },
    } },

  /* ============ 4장 불타는 극장 ============ */
  extra: { name: '그을린 단역', hp: 64, spd: [3, 5], res: { slash: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('횃불', 'blunt', 'fury', 3, 3, 2, { hit: eInf('burn', 1, 1) }), S('대사 실수', 'pierce', 'elation', 3, 2, 3)] },
  dancer: { name: '불꽃 무희', hp: 56, spd: [5, 8], res: { slash: 1, pierce: 1.25, blunt: 1 }, th: [0.5],
    skills: [S('회전 베기', 'slash', 'fury', 3, 3, 3, { hit: eInf('burn', 1, 0) }), S('피날레', 'slash', 'elation', 6, 3, 1)] },
  stagerig: { name: '무대 장치', hp: 100, spd: [1, 3], sp: false, res: { slash: 1.25, blunt: 0.5 }, th: [0.5],
    skills: [S('조명 낙하', 'blunt', 'dread', 6, 2, 2, { tgt: 2 }), GD('커튼', 6, 2, 2)] },
  prompter: { name: '프롬프터', elite: true, hp: 340, spd: [3, 6], res: { pierce: 0.75, blunt: 1.25 }, th: [0.6, 0.3],
    skills: [S('대본 던지기', 'blunt', 'fury', 4, 3, 2, { hit: eInf('burn', 2, 1) }), S('큐 사인', 'pierce', 'elation', 5, 3, 2)],
    mech: [{ n: '대본', d: '매 턴 아군 하나에게 쓸 기술(S1~S3)을 지시한다. 따르면 다음 턴 위력 +2, 어기면 화상 3·2.' }],
    h: {
      turnStart(r, self, b) { const t = pick(b.livingAllies().filter(a => b.canAct(a)), b.rng); if (t) { b.vars.prompt = { uid: t.uid, slot: ri(1, 3, b.rng) }; b.msg(`프롬프터: "${t.name}, 다음 대사는 S${b.vars.prompt.slot}."`, 'warn'); } else b.vars.prompt = null; },
      turnEnd(r, self, b) {
        const p = b.vars.prompt; if (!p) return; const t = b.byUid(p.uid); if (!t || !t.alive) return;
        const a = b.acts.find(x => x.u === t && x.side === 'A');
        if (a && a.s.slot === p.slot) { b.buff(t, 'pwrUp', 2); b.msg(`${t.name}이(가) 대본을 따랐다. 박수.`); }
        else { b.inflict(self, t, 'burn', 3, 2); b.msg(`${t.name}의 애드리브에 객석이 불탄다.`); }
      },
    } },

  /* ============ 5장 가면 공장 ============ */
  apprentice: { name: '견습 가면공', hp: 64, spd: [3, 6], res: { slash: 1, pierce: 1.25 }, th: [0.5],
    skills: [S('끌', 'pierce', 'obsession', 4, 3, 2), S('가면 씌우기', 'blunt', 'dread', 3, 2, 2, { hit: eBuf('pwrDown', 1) })] },
  blankface: { name: '빈 얼굴', hp: 62, spd: [3, 6], res: {}, th: [0.5],
    skills: [S('얼굴 할퀴기', 'slash', 'dread', 4, 3, 2)],
    mech: [{ n: '적응', d: '지난 턴 가장 많이 맞은 속성에 견딤(0.75)이 된다.' }],
    h: {
      hit(c, self) { if (c.t === self) { self.r.hitT = self.r.hitT || {}; self.r.hitT[c.s.dt] = (self.r.hitT[c.s.dt] || 0) + 1; } },
      turnEnd(r, self) { const h = self.r.hitT || {}; const top = Object.keys(h).sort((a, c) => h[c] - h[a])[0]; self.res = { slash: 1, pierce: 1, blunt: 1 }; if (top) self.res[top] = 0.75; self.r.hitT = {}; },
    } },
  pressarm: { name: '조립 팔', hp: 92, spd: [1, 4], sp: false, res: { pierce: 0.75, blunt: 1.25 }, th: [0.5],
    skills: [S('프레스', 'blunt', 'void', 6, 3, 2), S('집게', 'pierce', 'obsession', 3, 3, 2, { hit: eBuf('bind', 1) })] },
  foreman: { name: '공장장', elite: true, hp: 380, spd: [3, 6], slots: 2, res: { slash: 0.75, blunt: 1.25 }, th: [0.6, 0.3],
    skills: [S('작업 지시', 'blunt', 'obsession', 4, 3, 2, { hit: eBuf('fragile', 1) }), S('불량품 폐기', 'slash', 'fury', 5, 3, 2)],
    mech: [{ n: '생산 라인', d: '3턴마다 견습 가면공을 불러온다(최대 2).' }],
    h: { turnEnd(r, self, b) { if (b.turn % 3 === 0 && livingOf(b, 'apprentice').length < 2) b.spawn('apprentice', self.lvl - 2); } } },

  /* ============ 6장 끝없는 선로 ============ */
  trackwraith: { name: '선로 잔향', hp: 68, spd: [5, 9], sp: false, res: { slash: 1.25, pierce: 0.75 }, th: [],
    skills: [S('스쳐 지나가기', 'slash', 'void', 3, 4, 2), S('경적', 'blunt', 'dread', 2, 3, 2, { hit: eSp(-4) })] },
  signalman: { name: '녹슨 신호수', hp: 74, spd: [3, 6], res: { slash: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('신호봉', 'blunt', 'void', 4, 3, 2, { hit: eBuf('bind', 1) }), S('정지 신호', 'blunt', 'dread', 3, 2, 2, { hit: eBuf('paralyze', 1) })] },
  freight: { name: '탈선 화차', hp: 118, spd: [1, 4], sp: false, res: { pierce: 0.5, blunt: 1.25 }, th: [0.5],
    skills: [S('돌진', 'blunt', 'fury', 5, 4, 2)],
    h: { turnEnd(r, self, b) { if (self.alive) b.buff(self, 'pwrUp', Math.min(4, b.turn)); } }, mech: [{ n: '관성', d: '턴이 지날수록 다음 턴 위력이 오른다(최대 +4).' }] },
  stationmaster: { name: '역무원장', elite: true, hp: 430, spd: [7, 7], slots: 2, res: { pierce: 1.25, blunt: 0.75 }, th: [0.6, 0.3],
    skills: [S('시간표 낭독', 'blunt', 'void', 4, 3, 2, { hit: eBuf('bind', 2) }), S('정시 출발', 'pierce', 'fury', 5, 3, 2)],
    mech: [{ n: '시간표', d: '속도가 늘 7. 이번 턴 속도가 7보다 빠른 아군에게 받는 피해 +40%.' }],
    h: { dmgMod(c, self) { if (c.t === self && (c.act.spd || 0) > 7) c.mult *= 1.4; } } },

  /* ============ 7장 웃는 광장 ============ */
  citizen: { name: '웃는 시민', hp: 74, spd: [2, 5], res: { slash: 1.25, blunt: 1 }, th: [0.5],
    skills: [S('박수', 'blunt', 'elation', 3, 3, 2, { hit: eSp(-3) }), S('포옹', 'blunt', 'elation', 4, 2, 3)] },
  clown: { name: '광대', hp: 64, spd: [5, 8], res: { pierce: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('저글링', 'pierce', 'elation', 2, 3, 4), S('농담', 'blunt', 'dread', 3, 2, 2, { hit: eInf('sinking', 2, 1) })] },
  megaphone: { name: '확성기', hp: 80, spd: [2, 4], sp: false, res: { pierce: 1.5, slash: 0.75 }, th: [0.5],
    skills: [S('선전', 'blunt', 'elation', 2, 2, 2, { tgt: 'all', hit: eSp(-4) })] },
  mc: { name: '축제 사회자', elite: true, hp: 470, spd: [4, 7], slots: 2, res: { slash: 1, pierce: 0.75, blunt: 1.25 }, th: [0.6, 0.3],
    skills: [S('마이크 휘두르기', 'blunt', 'elation', 4, 3, 2), S('환호 유도', 'blunt', 'elation', 3, 2, 3, { hit: eSp(-3) })],
    mech: [{ n: '분위기 몰이', d: '사회자가 이번 턴 합에서 한 번도 지지 않으면 턴 종료 시 아군 전체 정신력 −5, 적 전체 정신력 +10.' }],
    h: {
      turnStart(r, self, b) { b.vars.mcLost = false; },
      clashEnd(r, self, b) { if (r.l === self) b.vars.mcLost = true; },
      turnEnd(r, self, b) { if (!b.vars.mcLost) { for (const a of b.livingAllies()) b.addSp(a, -5, true); for (const e of b.livingEnemies()) b.addSp(e, 10, true); b.msg('사회자가 분위기를 띄운다. 아군 정신력 −5.'); } },
    } },

  /* ============ 8장 채석장 협곡 ============ */
  mason: { name: '석공', hp: 90, spd: [2, 5], res: { slash: 0.75, blunt: 1.25 }, th: [0.5],
    skills: [S('정', 'blunt', 'obsession', 4, 3, 2, { hit: eInf('tremor', 2, 1) }), S('망치질', 'blunt', 'fury', 5, 2, 3)] },
  tortoise: { name: '바위 거북', hp: 140, spd: [1, 3], sp: false, res: { slash: 0.5, pierce: 0.5, blunt: 1.5 }, th: [0.5],
    skills: [S('몸통 박치기', 'blunt', 'void', 5, 3, 2), GD('등껍질', 7, 3, 2)] },
  tremorworm: { name: '진동충', hp: 82, spd: [3, 5], sp: false, res: { slash: 1.25, pierce: 1 }, th: [],
    skills: [S('땅울림', 'blunt', 'dread', 3, 2, 2, { tgt: 'all', hit: eInf('tremor', 2, 1) })] },
  demolition: { name: '폭파 기술자', elite: true, hp: 520, spd: [3, 6], slots: 2, res: { pierce: 1.25, blunt: 0.75 }, th: [0.6, 0.3],
    skills: [S('곡괭이', 'pierce', 'fury', 4, 4, 2), S('도화선', 'blunt', 'fury', 3, 3, 3, { hit: eInf('burn', 2, 1) })],
    mech: [{ n: '발파 예고', d: '아군 하나에 폭약을 설치한다(2턴). 그 아군이 폭파 기술자와의 합에서 이기면 해체된다. 터지면 대상은 최대 체력 35%, 나머지는 15% 피해.' }],
    h: {
      turnStart(r, self, b) { if (!b.vars.bomb) { const t = pick(b.livingAllies(), b.rng); if (t) { b.vars.bomb = { uid: t.uid, t: 2 }; b.msg(`${t.name}에게 폭약이 설치되었다! (2턴)`, 'warn'); } } b.setGauge('bomb', { n: '폭약', text: b.vars.bomb ? `${(b.byUid(b.vars.bomb.uid) || {}).name} · ${b.vars.bomb.t}턴` : '없음', c: '#e07b2c' }); },
      clashEnd(r, self, b) { if (b.vars.bomb && r.l === self && r.w.uid === b.vars.bomb.uid) { b.vars.bomb = null; b.msg('폭약 해체 성공!', 'gold'); } },
      turnEnd(r, self, b) {
        const bm = b.vars.bomb; if (!bm) return;
        const t = b.byUid(bm.uid); if (!t || !t.alive) { b.vars.bomb = null; return; }
        if (--bm.t <= 0) { b.msg('폭발!', 'warn'); dmgFx(b, t, t.maxHp * 0.35, '폭발', self); for (const a of b.livingAllies()) if (a !== t) dmgFx(b, a, a.maxHp * 0.15, '폭풍', self); b.vars.bomb = null; }
      },
    } },

  /* ============ 9장 재봉실 ============ */
  sewdoll: { name: '재봉 인형', hp: 84, spd: [3, 6], sp: false, res: { slash: 1.25, pierce: 0.75 }, th: [],
    skills: [S('바늘', 'pierce', 'obsession', 3, 3, 3, { hit: eInf('rupture', 1, 1) })] },
  spoolspider: { name: '실타래 거미', hp: 90, spd: [3, 6], sp: false, res: { slash: 1.5, blunt: 0.75 }, th: [0.5],
    skills: [S('실 뿜기', 'pierce', 'dread', 2, 3, 2, { hit: eBuf('bind', 2) }), S('물기', 'slash', 'dread', 5, 3, 2, { hit: eInf('rupture', 2, 0) })] },
  cutter: { name: '재단사', hp: 96, spd: [3, 5], res: { pierce: 1.25, blunt: 1 }, th: [0.5],
    skills: [S('가위질', 'slash', 'fury', 4, 4, 2), S('재단', 'slash', 'obsession', 3, 3, 3, { hit: eInf('rupture', 1, 1) })] },
  mender: { name: '수선공', elite: true, hp: 580, spd: [2, 5], slots: 2, res: { slash: 0.75, pierce: 1.25 }, th: [0.6, 0.3],
    skills: [S('꿰매기', 'pierce', 'obsession', 4, 3, 2, { hit: eInf('rupture', 2, 1) }), S('덧대기', 'blunt', 'void', 5, 2, 2)],
    mech: [{ n: '수선', d: '턴 종료 시 다른 적 전체 체력 10% 회복. 이번 턴 코인 3개 이상에 맞았다면 수선하지 못한다.' }],
    h: {
      turnStart(r, self) { self.r.hits = 0; },
      hit(c, self) { if (c.t === self) self.r.hits = (self.r.hits || 0) + 1; },
      turnEnd(r, self, b) { if ((self.r.hits || 0) >= 3) { b.msg('수선공의 손이 멈췄다.'); return; } for (const e of b.livingEnemies()) if (e !== self) b.heal(e, e.maxHp * 0.1); },
    } },

  /* ============ 10장 달의 정원 ============ */
  gardener: { name: '달빛 정원사', hp: 100, spd: [3, 5], res: { slash: 1, blunt: 1.25 }, th: [0.5],
    skills: [S('전정 가위', 'slash', 'obsession', 4, 4, 2), S('물주기', 'blunt', 'sorrow', 3, 3, 2, { hit: eInf('sinking', 2, 1) })] },
  moth: { name: '밤나방', hp: 74, spd: [5, 8], sp: false, res: { slash: 1.5, pierce: 0.75 }, th: [],
    skills: [S('인분', 'pierce', 'dread', 2, 2, 4, { hit: eSp(-2) }), S('날갯짓', 'blunt', 'sorrow', 3, 2, 2, { tgt: 'all' })] },
  golem: { name: '월광석 골렘', hp: 160, spd: [1, 3], sp: false, res: { slash: 0.5, pierce: 0.75, blunt: 1.25 }, th: [0.5],
    skills: [S('짓누르기', 'blunt', 'void', 6, 3, 2), GD('월광 장벽', 7, 3, 2)] },
  sundial: { name: '해시계 수도사', elite: true, hp: 640, spd: [3, 6], slots: 2, res: { slash: 1, pierce: 1.25, blunt: 0.75 }, th: [0.6, 0.3],
    skills: [S('정오의 일격', 'blunt', 'elation', 5, 4, 2), S('그림자 찌르기', 'pierce', 'sorrow', 4, 3, 3), GD('명상', 8, 3, 2)],
    mech: [{ n: '낮과 밤', d: '홀수 턴(낮)에는 두 번 공격, 짝수 턴(밤)에는 방어하며 체력 8% 회복.' }],
    plan(u, b) { if (b.turn % 2 === 1) return [{ s: u.skills[0] }, { s: u.skills[1] }]; b.heal(u, u.maxHp * 0.08); return [{ s: u.skills[2] }, { s: u.skills[1] }]; } },

  /* ============ 11장 거울의 객차 ============ */
  reflection: { name: '깨진 반영', hp: 88, spd: [3, 6], sp: false, res: { slash: 1, pierce: 1, blunt: 1.5 }, th: [],
    skills: [S('거울 조각', 'slash', 'void', 4, 3, 3), S('되비춤', 'pierce', 'dread', 5, 3, 2)] },
  warped: { name: '일그러진 승객', hp: 98, spd: [2, 5], res: { slash: 1.25, pierce: 1 }, th: [0.5],
    skills: [S('손잡이', 'blunt', 'fury', 4, 3, 2), S('비명', 'blunt', 'dread', 3, 2, 2, { tgt: 'all', hit: eSp(-4) })] },
  mirrorarmor: { name: '반사 갑주', hp: 118, spd: [1, 4], sp: false, res: { slash: 0.75, pierce: 0.75, blunt: 1.25 }, th: [0.5],
    skills: [S('반사 일격', 'blunt', 'void', 5, 3, 2)],
    mech: [{ n: '반사', d: '받은 공격 피해의 20%를 공격자에게 돌려준다.' }],
    h: { hit(c, self, b) { if (c.t === self && c.dmg > 0 && c.u.alive) dmgFx(b, c.u, c.dmg * 0.2, '반사', self); } } },
  otherpax: { name: '또 다른 승객', elite: true, hp: 600, spd: [4, 7], slots: 2, res: {}, th: [0.6, 0.3],
    skills: [S('흉내', 'slash', 'void', 5, 3, 2)],
    mech: [{ n: '도플갱어', d: '전투 시작 시 아군 하나의 모습과 내성, 기술을 그대로 베낀다.' }],
    init(u, b) {
      const t = pick(b.allies, b.rng); if (!t) return;
      u.name = '또 다른 ' + t.name; u.res = Object.assign({}, t.res); u.color = t.color; u.copyOf = t.cid;
      u.skills = ['s1', 's2', 's3'].map(k => { const s = t.sk[k]; return S(s.name, s.dt, s.emo, s.base, s.cp, typeof s.coins === 'function' ? 2 : s.coins, { tgt: s.tgt }); });
    } },

  /* ============ 12장 종착역 ============ */
  shade: { name: '망각의 그림자', hp: 100, spd: [3, 6], sp: false, res: { slash: 0.75, pierce: 1.25 }, th: [],
    skills: [S('지우기', 'slash', 'void', 4, 3, 3, { hit: eSp(-4) })] },
  memeater: { name: '기억 포식자', hp: 115, spd: [3, 5], sp: false, res: { pierce: 0.75, blunt: 1.25 }, th: [0.5],
    skills: [S('삼키기', 'pierce', 'obsession', 4, 4, 2, { hit: c => c.b.heal(c.u, c.dmg * 0.3) })] },
  attendant: { name: '마지막 역무원', hp: 108, spd: [3, 6], res: { slash: 1.25, blunt: 0.75 }, th: [0.5],
    skills: [S('종착 안내', 'blunt', 'sorrow', 5, 3, 2), S('개찰', 'pierce', 'void', 4, 3, 2, { hit: eBuf('fragile', 1) })] },
  gatekeeper: { name: '문지기', elite: true, hp: 720, spd: [3, 6], slots: 2, res: { slash: 1, pierce: 1, blunt: 1 }, th: [0.6, 0.3],
    skills: [S('통행 금지', 'blunt', 'void', 6, 3, 2), S('검문', 'pierce', 'dread', 4, 4, 2)],
    mech: [{ n: '통행증', d: '이번 턴 합에서 이긴 아군만 문지기에게 제대로 피해를 준다(그 외 60% 감소).' }],
    h: {
      turnStart(r, self, b) { b.vars.pass = {}; },
      clashEnd(r, self, b) { if (r.w.side === 'A') b.vars.pass[r.w.uid] = 1; },
      dmgMod(c, self, b) { if (c.t === self && !c.hypoClash && !(b.vars.pass || {})[c.u.uid]) c.mult *= 0.4; },
    } },

  /* =================================================================== */
  /*                              잔향체                                  */
  /* =================================================================== */

  clockwarden: {
    name: '녹슨 시계수', boss: true, hp: 520, spd: [3, 6], slots: 2, sp: false, th: [0.7, 0.4, 0.15], res: { pierce: 1.5, blunt: 0.75 }, color: '#c8b04f',
    desc: '멈춘 시계탑을 지키다 시계가 되어 버린 수위.',
    mech: [
      { n: '자정까지', d: '시계가 매 턴 1시간씩 흐른다. 시계수가 합에서 이기면 1시간 앞으로, 지면 1시간 뒤로. 12시(악몽 10시)가 되면 그 턴 「자정의 종」으로 아군 전체를 강타한다. 흐트러지면 시계가 3시간 되돌아간다.' },
    ],
    skills: [S('시침 베기', 'slash', 'sorrow', 5, 3, 2), S('분침 찌르기', 'pierce', 'void', 4, 2, 3), GD('태엽 감기', 6, 2, 2, { use: c => cwTick(c.b, 1) })],
    init(u, b) { b.vars.clock = 6; cwTick(b, 0); },
    plan(u, b) {
      const lim = u.nightmare ? 10 : 12;
      const out = b.defaultPlan(u);
      if (b.vars.clock >= lim) { out[0] = { s: CW_MIDNIGHT, t: b.pickAllyTarget(u) }; b.msg('시계가 자정을 가리킨다. 종이 울리기 직전이다!', 'warn'); }
      return out;
    },
    h: {
      clashEnd(r, self, b) { if (r.w === self) cwTick(b, 1); else if (r.l === self) cwTick(b, -1); },
      turnEnd(r, self, b) { cwTick(b, 1); },
      stagger(r, self, b) { if (r.u === self) { cwTick(b, -3); b.msg('시계가 거꾸로 돈다. (−3시간)'); } },
    },
  },

  butcher: {
    name: '굶주린 정육업자', boss: true, hp: 760, spd: [3, 6], slots: 2, th: [0.75, 0.5, 0.25], res: { slash: 1.25, blunt: 0.75 }, color: '#c4473a',
    desc: '배고픔이 칼이 되었다. 시장의 모든 고기가 그의 것이다.',
    mech: [
      { n: '식탐', d: '턴이 끝날 때 살아 있는 고기 걸이 하나를 먹어 체력 12%를 회복하고 다음 턴 위력 +2. 3턴마다 고기 걸이를 다시 건다(최대 2).' },
      { n: '도축 표식', d: '매 턴 체력 비율이 가장 낮은 아군에게 표식을 새긴다. 표식 대상에게 주는 피해 +40%, 적중 시 출혈 위력 +2.' },
      { n: '광란', d: '체력 50% 이하에서 행동 3회.' },
    ],
    skills: [S('정육칼', 'slash', 'fury', 5, 3, 2, { hit: eInf('bleed', 1, 1) }), S('뼈 바르기', 'slash', 'obsession', 4, 4, 2), S('갈고리 던지기', 'pierce', 'fury', 3, 3, 3, { hit: eBuf('bind', 1) })],
    init(u, b) { b.vars.hooks = 0; b.spawn('meathook', u.lvl); b.spawn('meathook', u.lvl); },
    h: {
      turnStart(r, self, b) {
        if (self.hp <= self.maxHp * 0.5 && self.slots === 2) { self.slots = 3; b.spdRoll(self); b.msg('정육업자가 광란에 빠진다!', 'warn'); }
        const t = b.livingAllies().sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
        if (t) { b.vars.mark = t.uid; b.msg(`${t.name}에게 도축 표식이 새겨진다.`, 'warn'); }
      },
      dmgMod(c, self, b) { if (c.u === self && c.t.uid === b.vars.mark) c.mult *= 1.4; },
      hit(c, self, b) { if (c.u === self && c.t.uid === b.vars.mark) b.inflict(self, c.t, 'bleed', 2, 0); },
      turnEnd(r, self, b) {
        const hk = livingOf(b, 'meathook')[0];
        if (hk) { vanish(b, hk, '먹혔다'); b.heal(self, self.maxHp * 0.12); b.buff(self, 'pwrUp', 2); b.msg('정육업자가 고기 걸이를 먹어치운다.', 'warn'); }
        if (b.turn % 3 === 0) { const n = 2 - livingOf(b, 'meathook').length; for (let i = 0; i < n; i++) b.spawn('meathook', self.lvl); }
      },
    },
  },
  meathook: { name: '고기 걸이', part: true, core: false, hp: 80, spd: [1, 1], slots: 0, sp: false, th: [], res: { slash: 1.5 }, skills: [], color: '#8a3b33',
    mech: [{ n: '먹잇감', d: '정육업자가 턴이 끝날 때 먹어치운다. 먼저 부숴라.' }] },

  librarian: {
    name: '익사한 사서', boss: true, hp: 980, spd: [3, 5], slots: 2, sp: false, th: [0.7, 0.45, 0.2], res: { slash: 0.75, pierce: 1.25 }, emoRes: { sorrow: 0.5 }, color: '#4e6fd0',
    desc: '물에 잠긴 서고에서 아직도 반납을 기다린다.',
    mech: [
      { n: '수위', d: '매 턴 수위 +1(배수구 둘 다 살아 있으면 +2). 수위 4 이상: 아군 전체 다음 턴 속박 1. 7 이상: 턴 시작 시 아군 전체 침잠 2·1. 10: 「범람」 아군 전체 정신력 −20, 수위 5로.' },
      { n: '배수구', d: '배수구를 부수면 수위 −3. 3턴 뒤 다시 막힌다.' },
      { n: '금서', d: '매 턴 아군 하나의 기술 한 종류를 봉인한다.' },
    ],
    skills: [S('젖은 책장', 'slash', 'sorrow', 4, 3, 2, { hit: eInf('sinking', 1, 1) }), S('잉크 파도', 'blunt', 'sorrow', 3, 3, 2, { tgt: 2, hit: eInf('sinking', 1, 0) }), S('사서의 침묵', 'pierce', 'void', 6, 2, 2)],
    init(u, b) { b.vars.water = 0; b.vars.drainBack = []; b.spawn('drain', u.lvl); b.spawn('drain', u.lvl); libGauge(b); },
    h: {
      turnStart(r, self, b) {
        if (b.vars.water >= 7) for (const a of b.livingAllies()) b.inflict(self, a, 'sinking', 2, 1);
        const cands = b.livingAllies().filter(a => a.hand.length);
        const t = pick(cands, b.rng);
        if (t) { const k = pick(t.hand, b.rng); t.sealed[k] = true; b.msg(`금서: ${t.name}의 「${t.sk[k].name}」이(가) 봉인되었다.`, 'warn'); }
      },
      kill(r, self, b) { if (r.u.eid === 'drain') { b.vars.water = Math.max(0, b.vars.water - 3); b.vars.drainBack.push(b.turn + 3); libGauge(b); b.msg('배수구가 뚫렸다. 수위 −3'); } },
      turnEnd(r, self, b) {
        const drains = livingOf(b, 'drain').length;
        b.vars.water += (drains >= 2 ? 2 : 1) + (self.nightmare ? 1 : 0);
        if (b.vars.water >= 10) { b.msg('범람! 서고가 물에 잠긴다.', 'warn'); for (const a of b.livingAllies()) b.addSp(a, -20); b.vars.water = 5; }
        if (b.vars.water >= 4) for (const a of b.livingAllies()) b.buff(a, 'bind', 1);
        const due = b.vars.drainBack.filter(t => t <= b.turn);
        b.vars.drainBack = b.vars.drainBack.filter(t => t > b.turn);
        for (let i = 0; i < due.length; i++) if (livingOf(b, 'drain').length < 2) b.spawn('drain', self.lvl);
        libGauge(b);
      },
    },
  },
  drain: { name: '배수구', part: true, core: false, hp: 140, spd: [1, 1], slots: 0, sp: false, th: [], res: { blunt: 1.5, pierce: 0.75 }, skills: [], color: '#3d5a8a',
    mech: [{ n: '막힌 배수구', d: '부수면 수위 −3. 3턴 뒤 다시 막힌다.' }] },

  diva: {
    name: '앙코르의 디바', boss: true, hp: 1120, spd: [4, 7], slots: 2, th: [0.7, 0.4], res: { pierce: 1.25 }, emoRes: { fury: 0.75 }, color: '#e07b2c',
    desc: '불타는 무대 위에서 끝나지 않는 커튼콜을 부른다.',
    mech: [
      { n: '독무대', d: '짝수 턴마다 아군 하나에게 조명이 떨어진다. 그 턴에는 조명 받은 아군만 디바에게 제대로 피해를 준다(나머지 85% 감소). 조명 받은 아군이 디바와의 합에서 이기면 「갈채」: 아군 전체 정신력 +10, 관객 −2.' },
      { n: '관객', d: '턴이 끝날 때 직전 턴과 같은 기술을 다시 쓴 아군 수만큼 관객 +1, 아무도 반복하지 않으면 −1. 관객 8 이상: 기립 박수(디바 체력 10% 회복, 다음 턴 위력 +3) 후 4로.' },
      { n: '앙코르', d: '처음 쓰러질 때 관객이 5 이상이면 체력 40%로 되살아난다.' },
    ],
    skills: [S('불꽃 아리아', 'blunt', 'fury', 4, 3, 3, { hit: eInf('burn', 1, 1) }), S('하이라이트', 'pierce', 'elation', 5, 3, 2), S('커튼콜', 'slash', 'fury', 3, 4, 2, { tgt: 2, hit: eInf('burn', 2, 0) })],
    init(u, b) { b.vars.aud = 3; b.vars.prev = {}; divaGauge(b); },
    h: {
      turnStart(r, self, b) {
        if (b.turn % 2 === 0) { const t = pick(b.livingAllies(), b.rng); b.vars.spot = t ? t.uid : 0; if (t) b.msg(`조명이 ${t.name}에게 떨어진다. 독무대!`, 'gold'); }
        else b.vars.spot = 0;
        divaGauge(b);
      },
      dmgMod(c, self, b) { if (c.t === self && b.vars.spot && c.u.uid !== b.vars.spot) c.mult *= 0.15; },
      clashEnd(r, self, b) { if (r.l === self && b.vars.spot && r.w.uid === b.vars.spot) { for (const a of b.livingAllies()) b.addSp(a, 10, true); b.vars.aud = Math.max(0, b.vars.aud - 2); b.msg('갈채! 아군 정신력 +10, 관객 −2', 'gold'); } },
      turnEnd(r, self, b) {
        let rep = 0;
        for (const a of b.acts) if (a.side === 'A' && a.used && !a.charmed) { const k = a.s.key; if (b.vars.prev[a.u.uid] === k) rep++; b.vars.prev[a.u.uid] = k; }
        b.vars.aud = clamp(b.vars.aud + (rep ? rep : -1), 0, 10);
        if (b.vars.aud >= 8) { b.heal(self, self.maxHp * 0.1); b.buff(self, 'pwrUp', 3); b.vars.aud = 4; b.msg('기립 박수! 디바가 기운을 되찾는다.', 'warn'); }
        divaGauge(b);
      },
      death(r, self, b) {
        if (r.u !== self || b.vars.encored) return;
        b.vars.encored = true;
        if (b.vars.aud >= 5) { self.hp = Math.round(self.maxHp * 0.4); self.thIdx = self.th.filter(v => v >= self.hp).length; b.msg('"앙코르!" 디바가 다시 일어선다.', 'warn'); return true; }
        b.msg('객석이 조용하다. 앙코르는 없다.');
      },
    },
  },

  masque: {
    name: '변덕의 가면', boss: true, hp: 1280, spd: [4, 7], slots: 2, sp: false, th: [0.75, 0.5, 0.25], res: {}, color: '#9468c9',
    desc: '수천 개의 얼굴을 가졌지만 진짜 얼굴은 없다.',
    mech: [
      { n: '가면 교체', d: '매 턴 가면을 바꿔 쓴다. 웃는 가면: 참격 무효·타격 치명. 우는 가면: 관통 무효·참격 치명. 성난 가면: 타격 무효·관통 치명. 다음 가면이 미리 보인다.' },
      { n: '가면 파괴', d: '한 턴에 치명 속성으로 5번(악몽 6번) 적중하면 가면이 깨져 즉시 흐트러진다.' },
    ],
    skills: [S('가면 베기', 'slash', 'dread', 5, 3, 2), S('비웃음', 'blunt', 'elation', 4, 2, 3, { hit: eSp(-4) }), S('눈물 바늘', 'pierce', 'sorrow', 3, 3, 3, { hit: eInf('sinking', 1, 1) })],
    init(u, b) { b.vars.mask = ri(0, 2, b.rng); b.vars.nextMask = (b.vars.mask + ri(1, 2, b.rng)) % 3; },
    h: {
      turnStart(r, self, b) {
        if (b.turn > 1) { b.vars.mask = b.vars.nextMask; b.vars.nextMask = (b.vars.mask + ri(1, 2, b.rng)) % 3; }
        self.res = Object.assign({}, MASKS[b.vars.mask].res);
        b.vars.weak = 0;
        b.setGauge('mask', { n: '가면', text: `${MASKS[b.vars.mask].n} → 다음 ${MASKS[b.vars.nextMask].n}`, c: '#9468c9' });
      },
      hit(c, self, b) {
        if (c.t !== self || self.stag || c.res < 2) return;
        if (++b.vars.weak >= (self.nightmare ? 6 : 5)) { b.vars.weak = -99; b.msg('가면이 산산조각 난다!', 'gold'); b.stagger(self); }
      },
    },
  },

  express: {
    name: '급행 유령열차', boss: true, hp: 1400, spd: [6, 9], slots: 3, sp: false, th: [0.7, 0.45, 0.2], res: { slash: 1.25, pierce: 0.75 }, color: '#7aa0b8',
    desc: '종착역이 없는 열차. 멈추는 법을 잊었다.',
    mech: [
      { n: '가속', d: '매 턴 가속 +1, 합에서 이길 때마다 +1. 가속만큼 속도가 빨라지고, 가속 5부터 코인 위력 +1. 가속 10에서 「탈선」: 아군 전체를 들이받고 가속 0.' },
      { n: '제동', d: '속박을 받으면 그 위력만큼 가속이 줄어든다. 흐트러지면 가속 0.' },
    ],
    skills: [S('돌진', 'blunt', 'fury', 5, 3, 2, { tgt: 2 }), S('기적 소리', 'blunt', 'dread', 3, 2, 2, { hit: eSp(-5) }), S('차륜 베기', 'slash', 'fury', 4, 4, 2)],
    init(u, b) { b.vars.accel = 0; exGauge(b); },
    plan(u, b) {
      const out = b.defaultPlan(u);
      if (b.vars.accel >= 10) { out[0] = { s: EX_DERAIL, t: b.pickAllyTarget(u) }; b.msg('열차가 궤도를 벗어난다. 탈선 직전!', 'warn'); }
      return out;
    },
    h: {
      turnStart(r, self, b) {
        const bind = self.buf.bind || 0;
        if (bind) { b.vars.accel = Math.max(0, b.vars.accel - bind); b.msg(`제동! 가속 −${bind}`); }
        self.spdVals = self.spdVals.map(v => v + b.vars.accel);
        exGauge(b);
      },
      coinPower(c, self, b) { return c.u === self && b.vars.accel >= 5 ? 1 : 0; },
      clashEnd(r, self, b) { if (r.w === self) { b.vars.accel = Math.min(10, b.vars.accel + 1); exGauge(b); } },
      stagger(r, self, b) { if (r.u === self) { b.vars.accel = 0; exGauge(b); } },
      turnEnd(r, self, b) { b.vars.accel = Math.min(10, b.vars.accel + 1); exGauge(b); },
    },
  },

  grin: {
    name: '웃는 얼굴', boss: true, hp: 1450, spd: [3, 6], slots: 2, sp: false, th: [0.7, 0.4, 0.15], res: { blunt: 1.25 }, emoRes: { elation: 0.5 }, color: '#dca23a',
    desc: '광장의 모든 얼굴이 같은 표정을 짓게 만든 무언가.',
    mech: [
      { n: '전염되는 미소', d: '웃는 얼굴과 군중의 공격은 적중마다 정신력을 떨어뜨린다.' },
      { n: '동화', d: '공황에 빠진 아군은 대신 2턴 동안 군중에 동화되어 무작위 아군을 공격한다.' },
      { n: '웃음의 장벽', d: '아군 평균 정신력이 0 미만이면 웃는 얼굴이 받는 피해 −40%, 15 이상이면 +25%.' },
    ],
    skills: [S('함박웃음', 'blunt', 'elation', 4, 3, 2, { hit: eSp(-4) }), S('웃음 폭발', 'blunt', 'elation', 3, 2, 3, { tgt: 'all', hit: eSp(-3) }), S('찢어진 입', 'slash', 'dread', 6, 3, 2, { hit: eSp(-3) })],
    init(u, b) { b.spawn('crowd', u.lvl - 2); b.spawn('crowd', u.lvl - 2); grinGauge(b); },
    h: {
      panic(r, self, b) {
        if (r.u.side !== 'A' || (r.u.r.abyss && r.u.r.abyss >= b.turn)) return;
        r.u.flags.charmed = b.turn + 2; b.msg(`${r.u.name}이(가) 웃기 시작한다… 군중에 동화되었다!`, 'warn');
        return true;
      },
      dmgMod(c, self, b) { if (c.t !== self) return; const al = b.livingAllies(); const avg = al.reduce((s, a) => s + a.sp, 0) / Math.max(1, al.length); if (avg < 0) c.mult *= 0.6; else if (avg >= 15) c.mult *= 1.25; },
      turnStart(r, self, b) { grinGauge(b); },
      turnEnd(r, self, b) {
        for (const a of b.livingAllies()) if (a.flags.charmed && a.flags.charmed <= b.turn) { a.flags.charmed = 0; a.sp = 0; b.msg(`${a.name}이(가) 정신을 차린다.`); }
        if (b.turn % 2 === 0) { const n = 2 - livingOf(b, 'crowd').length; for (let i = 0; i < n; i++) b.spawn('crowd', self.lvl - 2); }
        grinGauge(b);
      },
    },
  },
  crowd: { name: '군중', core: false, hp: 260, spd: [2, 5], sp: false, th: [], res: { slash: 1.25 }, color: '#a58a4a',
    skills: [S('밀치기', 'blunt', 'elation', 3, 3, 2, { hit: eSp(-3) })] },

  colossus: {
    name: '무너지는 거인', boss: true, hp: 2500, spd: [1, 3], slots: 1, sp: false, th: [0.85, 0.7, 0.55, 0.4, 0.25, 0.1], res: { blunt: 1.25 }, color: '#a08f74',
    desc: '채석장의 돌이 모여 사람의 형상을 했다. 끊임없이 무너지고 다시 선다.',
    mech: [
      { n: '석화 피부', d: '흐트러지지 않은 거인은 모든 피해를 절반만 받는다. 흐트러지면 모든 속성이 치명(2배).' },
      { n: '두 팔', d: '팔이 따로 공격한다. 팔을 부수면 거인이 즉시 흐트러진다.' },
      { n: '지진', d: '3턴마다 아군 전체에 진동 3·2와 마비 1.' },
    ],
    skills: [S('짓밟기', 'blunt', 'fury', 7, 3, 2), S('바위 던지기', 'blunt', 'void', 5, 3, 2, { tgt: 2 })],
    init(u, b) { const l = b.spawn('colossus_arm', u.lvl); l.name = '거인의 왼팔'; const rr = b.spawn('colossus_arm', u.lvl); rr.name = '거인의 오른팔'; },
    plan(u, b) { if (b.turn % 3 === 0) { b.msg('땅이 갈라진다. 지진!', 'warn'); return [{ s: CO_QUAKE, t: b.pickAllyTarget(u) }]; } return b.defaultPlan(u); },
    h: {
      dmgMod(c, self) { if (c.t === self && !self.stag) c.mult *= 0.5; },
      kill(r, self, b) { if (r.u.eid === 'colossus_arm' && self.alive) { b.msg(`${r.u.name}이(가) 떨어져 나간다! 거인이 균형을 잃는다.`, 'gold'); if (!self.stag) b.stagger(self); } },
    },
  },
  colossus_arm: { name: '거인의 팔', part: true, core: false, hp: 480, spd: [2, 5], slots: 1, sp: false, th: [], res: { slash: 1.25, blunt: 1 }, color: '#8a7b64',
    skills: [S('붕괴 주먹', 'blunt', 'fury', 6, 4, 2, { hit: eInf('tremor', 2, 1) })], mech: [{ n: '균형추', d: '부서지면 거인이 즉시 흐트러진다.' }] },

  seamstress: {
    name: '실의 재봉사', boss: true, hp: 2200, spd: [4, 7], slots: 3, th: [0.7, 0.45, 0.2], res: { pierce: 0.75, blunt: 1.25 }, color: '#d39be6',
    desc: '끊어진 인연을 꿰매어 다시는 풀리지 않게 만든다.',
    mech: [
      { n: '운명 꿰매기', d: '매 턴 아군 둘을 꿰맨다. 꿰매진 두 아군은 받는 공격 피해를 반씩 나눈다. 둘이 이번 턴 같은 적을 공격하지 않으면 턴 종료 시 둘 다 파열 3·2.' },
      { n: '재단', d: '체력 50% 이하에서 매 턴 종료 시 아군 전체 파열 1·1.' },
    ],
    skills: [S('바늘 세례', 'pierce', 'obsession', 3, 3, 3, { hit: eInf('rupture', 1, 1) }), S('큰 가위', 'slash', 'dread', 5, 4, 2), S('되감는 실', 'pierce', 'obsession', 4, 3, 2, { tgt: 2, hit: eBuf('bind', 1) })],
    h: {
      turnStart(r, self, b) {
        const al = shuffle(b.livingAllies().slice(), b.rng);
        if (al.length >= 2) { b.vars.stitch = [al[0].uid, al[1].uid]; b.msg(`${al[0].name}와(과) ${al[1].name}의 운명이 꿰매어진다.`, 'warn'); }
        else b.vars.stitch = null;
        b.setGauge('stitch', { n: '꿰맴', text: b.vars.stitch ? b.vars.stitch.map(u => b.byUid(u).name).join(' ↔ ') : '없음', c: '#d39be6' });
      },
      preDamage(r, self, b) {
        const st = b.vars.stitch; if (!st || r.kind !== 'hit' || r.info.noShare || !st.includes(r.t.uid)) return;
        const o = b.byUid(st.find(x => x !== r.t.uid)); if (!o || !o.alive) return;
        const half = Math.round(r.dmg / 2); r.dmg -= half; b.damage(o, half, { kind: 'stitch', noShare: true });
      },
      turnEnd(r, self, b) {
        const st = b.vars.stitch;
        if (st) {
          const tg = st.map(uid => { const a = b.acts.find(x => x.u.uid === uid && x.side === 'A' && x.s.kind === 'atk' && x.used); return a && a.target ? a.target.uid : null; });
          if (!tg[0] || tg[0] !== tg[1]) { for (const uid of st) { const u = b.byUid(uid); if (u && u.alive) b.inflict(self, u, 'rupture', 3, 2); } b.msg('실이 살을 파고든다.'); }
        }
        if (self.hp <= self.maxHp / 2) for (const a of b.livingAllies()) b.inflict(self, a, 'rupture', 1, 1);
      },
    },
  },

  moon_silver: {
    name: '은월', boss: true, hp: 1150, spd: [3, 6], slots: 2, sp: false, th: [0.66, 0.33], res: { slash: 0.75, pierce: 1.25 }, color: '#c9d2e0',
    desc: '낮에만 뜨는 달. 쌍둥이를 잃은 적이 없다.',
    mech: [
      { n: '낮과 밤', d: '홀수 턴은 낮: 은월이 피해를 90% 덜 받고 방어만 한다. 짝수 턴은 밤: 흑월이 그렇게 된다.' },
      { n: '달의 공명', d: '턴이 끝날 때 두 달의 체력 비율 차이가 20%p를 넘으면 낮은 쪽이 그 차이의 절반만큼 회복한다.' },
      { n: '월식', d: '한쪽 달이 쓰러지면 2턴 뒤 체력 50%로 되살아난다. 2턴 안에 둘 다 쓰러뜨려야 한다.' },
    ],
    skills: [S('은빛 칼날', 'slash', 'sorrow', 5, 3, 2), S('월광', 'pierce', 'elation', 3, 3, 3, { tgt: 2 }), S('조수', 'blunt', 'sorrow', 4, 3, 2, { hit: eInf('sinking', 2, 1) })],
    init(u, b) { b.vars.dead = {}; b.spawn('moon_black', u.lvl); moonGauge(b); },
    plan: moonPlan,
    h: {
      always: true,
      dmgMod(c, self, b) { const day = b.turn % 2 === 1; if ((day && c.t.eid === 'moon_silver') || (!day && c.t.eid === 'moon_black')) c.mult *= 0.1; },
      kill(r, self, b) { if (r.u.eid === 'moon_silver' || r.u.eid === 'moon_black') b.vars.dead[r.u.eid] = b.turn; },
      turnStart(r, self, b) { moonGauge(b); },
      turnEnd(r, self, b) {
        const ms = b.enemies.filter(e => e.eid === 'moon_silver' || e.eid === 'moon_black');
        const alive = ms.filter(m => m.alive);
        if (alive.length === 2) {
          const [a, c] = alive; const fa = a.hp / a.maxHp, fc = c.hp / c.maxHp;
          if (Math.abs(fa - fc) > 0.2) { const lo = fa < fc ? a : c, hi = fa < fc ? c : a; b.heal(lo, (hi.hp / hi.maxHp - lo.hp / lo.maxHp) * lo.maxHp / 2); b.msg(`달의 공명: ${lo.name}이(가) 차오른다.`, 'warn'); }
        } else if (alive.length === 1) {
          for (const m of ms) if (!m.alive && b.vars.dead[m.eid] != null && b.turn >= b.vars.dead[m.eid] + 2) { revive(b, m, 0.5); b.vars.dead[m.eid] = null; b.msg(`월식이 끝났다. ${m.name}이(가) 다시 떠오른다.`, 'warn'); }
        }
        moonGauge(b);
      },
    },
  },
  moon_black: { name: '흑월', boss: true, hp: 1150, spd: [4, 7], slots: 2, sp: false, th: [0.66, 0.33], res: { slash: 1.25, pierce: 0.75 }, color: '#5a5470', plan: moonPlan,
    desc: '밤에만 뜨는 달.',
    skills: [S('흑요석 낫', 'slash', 'dread', 5, 4, 2), S('그믐', 'blunt', 'void', 4, 3, 2, { hit: eSp(-5) }), S('밤의 장막', 'pierce', 'dread', 3, 3, 3, { tgt: 2, hit: eInf('bleed', 1, 1) })] },

  mirror: {
    name: '거울 속의 차장', boss: true, hp: 2300, spd: [4, 7], slots: 4, th: [0.75, 0.5, 0.25], res: {}, color: '#b9c4cf',
    desc: '당신과 같은 제복을 입고 있다. 표정만 다르다.',
    mech: [
      { n: '거울 반사', d: '매 턴, 지난 턴 아군이 쓴 기술을 그대로 베껴 그 아군에게 되돌린다(행동 수 = 아군 수).' },
      { n: '거울 조각', d: '조각 5개. 조각이 남아 있으면 받은 공격 피해의 20%를 공격자에게 반사한다. 거울이 합에서 질 때와 각인에 맞을 때 1개, 흐트러질 때 2개가 깨진다.' },
    ],
    skills: [S('뒤집힌 개찰', 'slash', 'void', 5, 3, 2), S('반전', 'pierce', 'dread', 4, 4, 2), S('거울 망치', 'blunt', 'void', 6, 3, 2)],
    init(u, b) { b.vars.shards = 5; b.vars.last = {}; u.slots = Math.max(3, b.allies.length); mirGauge(b); },
    plan(u, b) {
      const out = [];
      for (const a of b.livingAllies()) { const s = b.vars.last[a.uid]; if (s && out.length < u.slots) out.push({ s, t: s.kind === 'atk' ? a : null }); }
      while (out.length < u.slots) { const s = pick(u.skills, b.rng); out.push({ s, t: b.pickAllyTarget(u) }); }
      return out;
    },
    h: {
      hit(c, self, b) {
        if (c.t !== self) return;
        if (b.vars.shards > 0 && c.dmg > 0 && c.u.alive && !c.preview) dmgFx(b, c.u, c.dmg * 0.2, '반사', self);
        if (c.s.imp && c.last && b.vars.shards > 0) { b.vars.shards--; b.msg('거울 조각이 깨진다.', 'gold'); mirGauge(b); }
      },
      stagger(r, self, b) { if (r.u === self) { b.vars.shards = Math.max(0, b.vars.shards - 2); mirGauge(b); } },
      clashEnd(r, self, b) { if (r.l === self && b.vars.shards > 0) { b.vars.shards--; mirGauge(b); } },
      turnEnd(r, self, b) {
        b.vars.last = {};
        for (const a of b.acts) if (a.side === 'A' && a.used && !a.charmed) {
          const s = a.s; b.vars.last[a.u.uid] = S(s.name + '′', s.dt, s.emo, skBase(s), skCp(s), typeof s.coins === 'function' ? 2 : s.coins, { kind: s.kind === 'counter' ? 'atk' : s.kind, tgt: s.tgt });
        }
      },
    },
  },

  lethe: {
    name: '망각', boss: true, hp: 1300, spd: [4, 7], slots: 3, sp: false, th: [0.66, 0.33], res: {}, color: '#e6e1d3',
    desc: '종착역. 모든 잔향이 마지막에 닿는 곳.',
    mech: [
      { n: '1막 · 지워지는 이름', d: '매 턴 아군 둘의 기술 한 종류씩을 봉인한다. 쓰러지면 2막으로. 막이 바뀔 때마다 아군 체력 30% 회복, 정신력 +15.' },
      { n: '2막 · 회상', d: '지나온 잔향이 번갈아 나타난다. 조명(한 아군만 제대로 피해를 줌) → 범람(아군 전체 침잠 2·1·속박) → 자정(전체 공격). 쓰러지면 3막으로.' },
      { n: '3막 · 종착', d: '8턴(악몽 7턴) 안에 쓰러뜨리지 못하면 열차가 종착역에 닿아 패배한다. 대신 아군 코인 위력 +1, 각인 피해 +50%.' },
    ],
    skills: [S('지우개', 'slash', 'void', 6, 3, 2, { hit: eSp(-5) }), S('망각의 손', 'blunt', 'void', 5, 4, 2, { tgt: 2 }), S('기억 삼키기', 'pierce', 'dread', 4, 3, 3, { hit: c => c.b.heal(c.u, c.dmg * 0.2) })],
    init(u, b) { b.vars.phase = 1; letheGauge(b); },
    plan(u, b) {
      const out = b.defaultPlan(u);
      if (b.vars.phase === 2 && b.turn % 3 === 0) { out[0] = { s: LE_MIDNIGHT, t: b.pickAllyTarget(u) }; b.msg('회상: 자정의 종이 울리려 한다.', 'warn'); }
      return out;
    },
    h: {
      turnStart(r, self, b) {
        const ph = b.vars.phase;
        b.vars.spot = 0;
        if (ph === 1) {
          for (const t of shuffle(b.livingAllies().slice(), b.rng).slice(0, 2)) { const k = pick(t.hand, b.rng); if (k) { t.sealed[k] = true; b.msg(`${t.name}이(가) 「${t.sk[k].name}」을(를) 잊었다.`, 'warn'); } }
        } else if (ph === 2) {
          const m = b.turn % 3;
          if (m === 1) { const t = pick(b.livingAllies(), b.rng); if (t) { b.vars.spot = t.uid; b.msg(`회상: 조명이 ${t.name}에게.`, 'gold'); } }
          if (m === 2) { for (const a of b.livingAllies()) { b.inflict(self, a, 'sinking', 2, 1); b.buff(a, 'bind', 1); } b.msg('회상: 범람.', 'warn'); }
        } else if (ph === 3) {
          b.vars.count--;
          if (b.vars.count <= 2) b.msg(`종착역까지 ${b.vars.count}턴.`, 'warn');
        }
        letheGauge(b);
      },
      coinPower(c, self, b) { return b.vars.phase === 3 && c.u.side === 'A' ? 1 : 0; },
      dmgMod(c, self, b) {
        if (c.t !== self) return;
        if (b.vars.phase === 3 && c.s.imp) c.mult *= 1.5;
        if (b.vars.spot && c.u.uid !== b.vars.spot) c.mult *= 0.15;
      },
      death(r, self, b) {
        if (r.u !== self || b.vars.phase >= 3) return;
        b.vars.phase++;
        self.hp = self.maxHp; self.thIdx = 0; self.th = [0.66, 0.33].map(f => Math.round(self.maxHp * f)); self.st = {}; self.stag = 0;
        if (b.vars.phase === 3) self.slots++;
        for (const a of b.livingAllies()) { b.heal(a, a.maxHp * 0.3); b.addSp(a, 15, true); }
        b.msg('잊었던 기억이 돌아온다. 아군 체력 30% 회복, 정신력 +15.', 'gold');
        if (b.vars.phase === 2) b.msg('2막 · 회상. 지나온 잔향들이 망각의 몸에서 피어오른다.', 'gold');
        else { b.vars.count = self.nightmare ? 7 : 8; b.msg('3막 · 종착. 열차가 마지막 역을 향해 속도를 올린다.', 'gold'); }
        letheGauge(b);
        return true;
      },
      turnEnd(r, self, b) { if (b.vars.phase === 3 && b.vars.count <= 0 && self.alive) { b.msg('열차가 종착역에 닿았다. 모든 것이 잊혀진다.', 'warn'); b.over = 'lose'; } },
    },
  },
};

/* ---------- 보스 보조 ---------- */
const CW_MIDNIGHT = S('자정의 종', 'blunt', 'dread', 8, 3, 3, { tgt: 'all', hit: eSp(-5), after: c => { if (c.b.vars.clock != null) { c.b.vars.clock = 3; cwTick(c.b, 0); } } });
const LE_MIDNIGHT = S('회상: 자정의 종', 'blunt', 'dread', 6, 3, 3, { tgt: 'all', hit: eSp(-5) });
const EX_DERAIL = S('탈선', 'blunt', 'fury', 9, 4, 3, { tgt: 'all', after: c => { c.b.vars.accel = 0; exGauge(c.b); } });
const CO_QUAKE = S('지진', 'blunt', 'dread', 4, 2, 2, { tgt: 'all', hit: c => { c.b.inflict(c.u, c.t, 'tremor', 3, 2, c.s); c.b.buff(c.t, 'paralyze', 1); } });
const MASKS = [
  { n: '웃는 가면', res: { slash: 0.25, pierce: 1, blunt: 2 } },
  { n: '우는 가면', res: { slash: 2, pierce: 0.25, blunt: 1 } },
  { n: '성난 가면', res: { slash: 1, pierce: 2, blunt: 0.25 } },
];
const MOON_GUARD = GD('달무리', 8, 3, 2);
function moonPlan(u, b) {
  const day = b.turn % 2 === 1;
  if ((day && u.eid === 'moon_silver') || (!day && u.eid === 'moon_black')) return [{ s: MOON_GUARD }];
  return b.defaultPlan(u);
}
function cwTick(b, d) { b.vars.clock = clamp((b.vars.clock || 0) + d, 0, 12); b.setGauge('clock', { n: '시계', v: b.vars.clock, max: 12, c: '#c8b04f', text: b.vars.clock + '시' }); }
function libGauge(b) { b.setGauge('water', { n: '수위', v: b.vars.water, max: 10, c: '#4e6fd0', text: String(b.vars.water) }); }
function divaGauge(b) {
  b.setGauge('aud', { n: '관객', v: b.vars.aud, max: 10, c: '#e07b2c', text: String(b.vars.aud) });
  const t = b.vars.spot ? b.byUid(b.vars.spot) : null;
  b.setGauge('spot', { n: '조명', text: t ? t.name : '없음', c: '#f2d27a' });
}
function exGauge(b) { b.setGauge('accel', { n: '가속', v: b.vars.accel, max: 10, c: '#7aa0b8', text: String(b.vars.accel) }); }
function grinGauge(b) { const al = b.livingAllies(); const avg = Math.round(al.reduce((s, a) => s + a.sp, 0) / Math.max(1, al.length)); b.setGauge('grin', { n: '평균 정신력', text: (avg > 0 ? '+' : '') + avg, c: avg < 0 ? '#c4473a' : avg >= 15 ? '#46a274' : '#dca23a' }); }
function moonGauge(b) { b.setGauge('moon', { n: '하늘', text: b.turn % 2 === 1 ? '낮 · 은월 보호' : '밤 · 흑월 보호', c: '#c9d2e0' }); }
function mirGauge(b) { b.setGauge('shard', { n: '거울 조각', v: b.vars.shards, max: 5, c: '#b9c4cf', text: String(b.vars.shards) }); }
function letheGauge(b) {
  const ph = b.vars.phase;
  b.setGauge('phase', { n: '막', text: ['', '1막 · 지워지는 이름', '2막 · 회상', '3막 · 종착'][ph], c: '#e6e1d3' });
  if (ph === 3) b.setGauge('count', { n: '종착까지', v: b.vars.count, max: 8, c: '#c4473a', text: b.vars.count + '턴' }); else b.removeGauge('count');
}
