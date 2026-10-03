'use strict';
/* ===== 잔향선 · 승객(플레이어 직업) 10종 ===== */

const inf = (c, key, p, n, tgt) => c.b.inflict(c.u, tgt || c.t, key, p, n, c.s);
const selfHurt = (b, u, amt) => b.damage(u, Math.min(Math.round(amt), u.hp - 1), { kind: 'self', noStag: true, noShare: true });
const capR = (u, k, d, max) => { u.r[k] = clamp((u.r[k] || 0) + d, 0, max); };
const lowestHpAlly = (b, except) => b.livingAllies().filter(x => x !== except).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];

const CHARS = {
  /* ---------------------------------------------------------- 1 */
  serin: {
    name: '세린', cls: '혈검사', color: '#c4473a', hp: 82, spd: [4, 7],
    res: { slash: 0.75, pierce: 1.25, blunt: 1 },
    quote: '피는 거짓말을 하지 않아. 흘린 만큼 앞으로 간다.',
    bio: '언니를 출혈로 잃은 펜싱 사범. 자신의 피를 대가로 칼끝을 벼린다.',
    init(u) { u.r.tide = 0; },
    rdisp: u => [{ n: '혈조', v: u.r.tide, max: 10, c: '#c4473a' }],
    passive: {
      n: '혈맹', d: '체력이 50% 이하이면 코인 위력 +1. 출혈을 부여하거나 자신이 출혈 피해를 받을 때마다 혈조 +1(최대 10).',
      h: {
        coinPower(c, self) { return c.u === self && self.hp <= self.maxHp * 0.5 ? 1 : 0; },
        inflict(r, self) { if (r.src === self && r.key === 'bleed' && r.t !== self) capR(self, 'tide', 1, 10); },
        statusDmg(r, self) { if (r.u === self && r.key === 'bleed') capR(self, 'tide', 1, 10); },
      },
    },
    sk: {
      s1: { name: '혈선 긋기', kind: 'atk', dt: 'slash', emo: 'fury', base: 4, cp: 3, coins: 2, d: '적중 시 출혈 1·1', hit: c => inf(c, 'bleed', 1, 1) },
      s2: {
        name: '붉은 서약', kind: 'atk', dt: 'slash', emo: 'obsession', base: 5, cp: 3, coins: 3,
        d: '사용 시 자신 체력 6% 소모, 혈조 +2. 적중 시 출혈 위력 +2',
        use: c => { selfHurt(c.b, c.u, c.u.maxHp * 0.06); capR(c.u, 'tide', 2, 10); },
        hit: c => inf(c, 'bleed', 2, 0),
      },
      s3: {
        name: '혈조 해방', kind: 'atk', dt: 'slash', emo: 'fury', base: 6, cp: 4, coins: 3,
        d: '혈조를 모두 소모해 2당 기본 위력 +1(최대 +5). 혈조 10을 소모하면 모든 코인 불괴. 마지막 코인 적중 시 출혈 격발(대상 출혈 위력×1.5 피해, 횟수 유지).',
        use: c => { c.act.v.tide = c.u.r.tide; c.u.r.tide = 0; if (c.act.v.tide >= 10) { c.act.v.unbreak = true; c.b.msg('혈조가 넘친다. 칼날이 부서지지 않는다.', 'gold'); } },
        pow: c => Math.min(5, Math.floor((c.act.v.tide != null ? c.act.v.tide : c.u.r.tide) / 2)),
        hit: c => { if (c.last && c.t.alive && c.t.st.bleed) { const s = c.t.st.bleed; const d = c.b.damage(c.t, Math.round(s.p * G(s.lv) * 1.5), { kind: 'bleed', src: c.u }); c.b.emit('dot', { t: c.t.uid, k: 'bleed', d, label: '출혈 격발' }); } },
      },
      def: { name: '흘려베기', kind: 'evade', dt: 'slash', emo: 'sorrow', base: 5, cp: 3, coins: 1, d: '회피. 회피에 성공하면 혈조 +1', win: c => capR(c.u, 'tide', 1, 10) },
    },
    imps: [
      {
        name: '적혈 만개', cost: { fury: 3, obsession: 1 }, spc: 10, kind: 'atk', dt: 'slash', emo: 'fury', base: 6, cp: 3, coins: 3, tgt: 'all',
        d: '적 전체 공격. 적중 시 출혈 2·1, 준 피해의 25%만큼 회복.',
        hit: c => { inf(c, 'bleed', 2, 1); c.b.heal(c.u, c.dmg * 0.25); },
      },
      {
        name: '혈월의 처형', cost: { fury: 4, sorrow: 2, obsession: 2 }, spc: 20, kind: 'atk', dt: 'slash', emo: 'fury', base: 10, cp: 5, coins: 4, unbreak: true, boss: 2,
        d: '불괴 코인 4개. 코인이 적중할 때마다 대상의 출혈을 격발(위력만큼 피해, 횟수 유지).',
        hit: c => { inf(c, 'bleed', 1, 0); if (c.t.alive && c.t.st.bleed) { const s = c.t.st.bleed; const d = c.b.damage(c.t, Math.round(s.p * G(s.lv)), { kind: 'bleed', src: c.u }); c.b.emit('dot', { t: c.t.uid, k: 'bleed', d, label: '격발' }); } },
      },
    ],
    tal: [
      { n: '피의 연대', d: '합에서 이길 때마다 혈조 +1', h: { clashEnd(r, self) { if (r.w === self) capR(self, 'tide', 1, 10); } } },
      { n: '혈월', d: '혈조가 8 이상이면 주는 피해 +15%', h: { dmgMod(c, self) { if (c.u === self && self.r.tide >= 8) c.mult *= 1.15; } } },
    ],
  },

  /* ---------------------------------------------------------- 2 */
  doyun: {
    name: '도윤', cls: '잿불 사제', color: '#e07b2c', hp: 90, spd: [3, 6],
    res: { slash: 1.25, pierce: 1, blunt: 0.75 },
    quote: '불은 정화가 아니다. 그저 남은 것을 가르쳐 줄 뿐.',
    bio: '불탄 성당의 마지막 사제. 몸에 열을 모았다가 아군을 지키는 재로 바꾼다.',
    init(u) { u.r.heat = 0; u.r.over = 0; },
    rdisp: u => [{ n: '열기', v: u.r.heat, max: 100, c: '#e07b2c', tag: u.r.over ? '과열' : '' }],
    passive: {
      n: '순교자의 불', d: '자신이 받는 화상 피해 절반. 열기 100 이상으로 턴을 마치면 다음 턴 「과열」: 기본 위력 +2, 부여하는 화상 위력 2배, 대신 자신에게 화상 4·2. 과열이 끝나면 열기 0.',
      h: {
        statusDmgMod(r, self) { if (r.u === self && r.key === 'burn') r.dmg = Math.max(1, Math.round(r.dmg / 2)); },
        turnEnd(r, self, b) {
          if (self.r.over && self.r.over <= b.turn) { self.r.over = 0; self.r.heat = 0; }
          else if (self.r.heat >= 100 && !self.r.over) { self.r.over = b.turn + 1; b.msg('도윤의 몸이 달아오른다. 다음 턴 과열.', 'warn'); }
        },
        turnStart(r, self, b) { if (self.r.over === b.turn) b.inflict(self, self, 'burn', 4, 2); },
        basePower(c, self, b) { return c.u === self && self.r.over === b.turn ? 2 : 0; },
        inflict(r, self, b) { if (r.src === self && r.key === 'burn' && self.r.over === b.turn && r.t !== self) r.p *= 2; },
      },
    },
    sk: {
      s1: { name: '불씨 축도', kind: 'atk', dt: 'blunt', emo: 'fury', base: 3, cp: 4, coins: 2, d: '열기 +20. 적중 시 화상 1·1', use: c => capR(c.u, 'heat', 20, 150), hit: c => inf(c, 'burn', 1, 1) },
      s2: {
        name: '재의 성가', kind: 'atk', dt: 'blunt', emo: 'sorrow', base: 4, cp: 3, coins: 2,
        d: '전투 시작 시 열기를 모두 소모해 아군 전체에 보호막(각자 최대 체력의 열기÷4 %)을 다음 턴까지 부여. 열기 60 이상이면 아군 전체 보호 1(다음 턴). 적중 시 화상 횟수 +2',
        start: c => {
          const h = c.u.r.heat; if (h <= 0 || c.u.r.over === c.b.turn) return;
          c.u.r.heat = 0;
          const mul = c.u.asc >= 3 ? 1.5 : 1;
          for (const a of c.b.livingAllies()) { c.b.addShield(a, a.maxHp * h / 400 * mul, c.b.turn + 1); if (h >= 60) c.b.buff(a, 'protect', 1); }
          c.b.msg(`재의 성가: 열기 ${h}이(가) 보호막이 된다.`);
        },
        hit: c => inf(c, 'burn', 0, 2),
      },
      s3: {
        name: '화장 의식', kind: 'atk', dt: 'blunt', emo: 'fury', base: 5, cp: 4, coins: 3,
        d: '열기 +35. 마지막 코인 적중 시 대상 화상 위력×횟수(최대 6)×0.8만큼 추가 피해 후 화상 제거',
        use: c => capR(c.u, 'heat', 35, 150),
        hit: c => { if (c.last && c.t.alive && c.t.st.burn) { const s = c.t.st.burn; const d = c.b.damage(c.t, Math.round(s.p * Math.min(6, s.c) * G(s.lv) * 0.8), { kind: 'burn', src: c.u }); delete c.t.st.burn; c.b.emit('dot', { t: c.t.uid, k: 'burn', d, label: '화장' }); } },
      },
      def: { name: '잿불 장막', kind: 'guard', dt: 'blunt', emo: 'sorrow', base: 6, cp: 3, coins: 2, d: '방어. 열기 +10', use: c => capR(c.u, 'heat', 10, 150) },
    },
    imps: [
      { name: '성화', cost: { fury: 2, elation: 2 }, spc: 10, kind: 'atk', dt: 'blunt', emo: 'fury', base: 5, cp: 4, coins: 2, tgt: 'all', d: '적 전체. 적중 시 화상 3·2. 열기 +50', use: c => capR(c.u, 'heat', 50, 150), hit: c => inf(c, 'burn', 3, 2) },
      {
        name: '앙코르 화형', cost: { fury: 3, elation: 2, dread: 2 }, spc: 18, kind: 'atk', dt: 'blunt', emo: 'elation', base: 8, cp: 5, coins: 3, boss: 4,
        d: '적중 시 화상 2·1. 공격 후 대상의 화상이 즉시 세 번 타오른다.',
        hit: c => inf(c, 'burn', 2, 1),
        after: c => { for (let i = 0; i < 3; i++) if (c.t && c.t.alive && c.t.st.burn) c.b.statusDmg(c.t, 'burn'); },
      },
    ],
    tal: [
      { n: '타오르는 신앙', d: '과열 상태에서 합 위력 +1', h: { clashPower(c, self, b) { return c.u === self && self.r.over === b.turn ? 1 : 0; } } },
      { n: '잿더미의 위안', d: '재의 성가 보호막 50% 증가' },
    ],
  },

  /* ---------------------------------------------------------- 3 */
  haram: {
    name: '하람', cls: '종지기', color: '#c8b04f', hp: 100, spd: [3, 5],
    res: { slash: 0.75, pierce: 1.25, blunt: 1 },
    quote: '한 박자씩. 서두르면 종은 금이 가.',
    bio: '물에 잠긴 마을의 종지기. 박자를 이어 갈수록 종소리가 깊어진다.',
    init(u) { u.r.rhythm = 0; u.r.last = 0; },
    rdisp: u => [{ n: '박자', v: u.r.rhythm, max: 3, c: '#c8b04f', tag: '다음 S' + ((u.r.last % 3) + 1) }],
    passive: {
      n: '박자', d: '기술을 S1→S2→S3→S1… 순서로 이어 쓰면 박자 +1(최대 3), 순서가 끊기면 0. 방어와 각인은 쉼표라 박자를 유지. 부여하는 진동 위력 +박자, 박자 3이면 코인 위력 +1. 진동 폭발이 일어날 때마다 정신력 +3.',
      h: {
        skillUse(r, self) { if (r.u !== self) return; const sl = r.s.slot; if (!sl) return; const exp = (self.r.last % 3) + 1; self.r.rhythm = sl === exp ? Math.min(3, self.r.rhythm + 1) : 0; self.r.last = sl; },
        inflict(r, self) { if (r.src === self && r.key === 'tremor' && r.p > 0) r.p += self.r.rhythm; },
        coinPower(c, self) { return c.u === self && self.r.rhythm >= 3 ? 1 : 0; },
        burst(r, self, b) { b.addSp(self, 3, true); },
      },
    },
    sk: {
      s1: { name: '첫 타종', kind: 'atk', dt: 'blunt', emo: 'sorrow', base: 4, cp: 3, coins: 2, d: '적중 시 진동 2·1', hit: c => inf(c, 'tremor', 2, 1) },
      s2: { name: '울림', kind: 'atk', dt: 'blunt', emo: 'void', base: 4, cp: 4, coins: 2, d: '적중 시 진동 1·1. 마지막 코인 적중 시 진동 폭발', hit: c => { inf(c, 'tremor', 1, 1); if (c.last) c.b.tremorBurst(c.u, c.t); } },
      s3: {
        name: '대종', kind: 'atk', dt: 'blunt', emo: 'sorrow', base: 6, cp: 3, coins: 3,
        d: '적중 시 진동 3·1. 공격 후 대상 진동 폭발. 박자 3에서 울리면 적 전체 진동 폭발 + 적 전체 마비 1(다음 턴)',
        hit: c => inf(c, 'tremor', 3, 1),
        after: c => {
          if (c.u.r.rhythm >= 3) {
            c.b.msg('대종이 울린다. 모든 것이 흔들린다.', 'gold');
            for (const e of c.b.foesOf(c.u)) { c.b.tremorBurst(c.u, e); c.b.buff(e, 'paralyze', 1); }
          } else if (c.t && c.t.alive) c.b.tremorBurst(c.u, c.t);
        },
      },
      def: { name: '종의 장막', kind: 'guard', dt: 'blunt', emo: 'void', base: 7, cp: 3, coins: 2, d: '방어. 박자를 유지(쉼표)' },
    },
    imps: [
      { name: '만종', cost: { sorrow: 3, void: 1 }, spc: 10, kind: 'atk', dt: 'blunt', emo: 'sorrow', base: 5, cp: 3, coins: 3, tgt: 'all', d: '적 전체. 적중 시 진동 3·2. 공격 후 적 전체 진동 폭발', hit: c => inf(c, 'tremor', 3, 2), after: c => { for (const e of c.b.foesOf(c.u)) c.b.tremorBurst(c.u, e); } },
      { name: '붕괴의 종', cost: { sorrow: 3, void: 3, dread: 1 }, spc: 18, kind: 'atk', dt: 'blunt', emo: 'void', base: 9, cp: 5, coins: 3, boss: 8, d: '적중 시 진동 4·2. 공격 후 대상 진동 폭발 3회', hit: c => inf(c, 'tremor', 4, 2), after: c => { for (let i = 0; i < 3; i++) if (c.t && c.t.alive) c.b.tremorBurst(c.u, c.t); } },
    ],
    tal: [
      { n: '여운', d: '진동 폭발이 일어나면 그 대상은 다음 턴 취약 1', h: { burst(r, self, b) { b.buff(r.t, 'fragile', 1); } } },
      { n: '완전한 박자', d: '박자 3일 때 받는 피해 −20%', h: { dmgMod(c, self) { if (c.t === self && self.r.rhythm >= 3) c.mult *= 0.8; } } },
    ],
  },

  /* ---------------------------------------------------------- 4 */
  eve: {
    name: '이브', cls: '결투사', color: '#86cde3', hp: 78, spd: [5, 8],
    res: { slash: 1, pierce: 0.75, blunt: 1.5 },
    quote: '상대는 하나면 충분해. 끝날 때까지.',
    bio: '한 번도 진 적 없던 결투사. 단 하나의 상대에게 모든 것을 건다.',
    init(u) { u.r.duel = 0; u.r.mom = 0; },
    rdisp: u => [{ n: '기세', v: u.r.mom, max: 5, c: '#86cde3' }],
    passive: {
      n: '결투 선언', d: '처음 공격한 적이 결투 상대가 된다(상대가 쓰러지면 다음 공격 대상으로). 결투 상대와의 합에서 이기면 기세 +1(최대 5)·호흡 2, 지면 기세 0. 다른 적을 공격하면 기세 −1. 기세 2당 결투 상대와의 합 위력 +1, 결투 상대에게 주는 피해 +기세×6%.',
      h: {
        skillUse(r, self, b) {
          if (r.u !== self || r.s.kind !== 'atk' || !r.t || r.t.side !== 'E') return;
          const d = b.byUid(self.r.duel);
          if (!d || !d.alive) { self.r.duel = r.t.uid; b.emit('msg', { text: `이브가 ${r.t.name}에게 결투를 선언한다.`, cls: 'gold' }); }
          else if (r.t.uid !== self.r.duel) self.r.mom = Math.max(0, self.r.mom - 1);
        },
        clashEnd(r, self, b) {
          if (r.w === self && r.l.uid === self.r.duel) { self.r.mom = Math.min(5, self.r.mom + 1); b.inflict(self, self, 'poise', 2, 0); }
          else if (r.l === self && r.w.uid === self.r.duel) { self.r.mom = 0; }
        },
        clashPower(c, self) { return c.u === self && c.opp && c.opp.uid === self.r.duel ? Math.floor(self.r.mom / 2) : 0; },
        dmgMod(c, self) { if (c.u === self && c.t.uid === self.r.duel) c.mult *= 1 + 0.06 * self.r.mom; },
        kill(r, self) { if (r.u.uid === self.r.duel && self.asc < 1) self.r.mom = Math.floor(self.r.mom / 2); },
      },
    },
    sk: {
      s1: { name: '찌르기', kind: 'atk', dt: 'pierce', emo: 'elation', base: 4, cp: 3, coins: 2, d: '적중 시 자신 호흡 1·1', hit: c => inf(c, 'poise', 1, 1, c.u) },
      s2: { name: '받아넘기기', kind: 'atk', dt: 'pierce', emo: 'void', base: 5, cp: 3, coins: 2, d: '합에서 이기면 호흡 횟수 +2, 결투 상대라면 기세 +1 추가', win: c => { inf(c, 'poise', 0, 2, c.u); if (c.t.uid === c.u.r.duel) c.u.r.mom = Math.min(5, c.u.r.mom + 1); } },
      s3: {
        name: '일섬', kind: 'atk', dt: 'pierce', emo: 'elation', base: 7, cp: 6, coins: 2,
        d: '기세 5에서 쓰면 기세를 모두 소모해 「필살」: 모든 코인 불괴, 모든 적중 치명타, 피해 +50%',
        use: c => { if (c.u.r.mom >= 5) { c.act.v.unbreak = true; c.act.v.allCrit = true; c.act.v.dmgMul = 1.5; c.u.r.mom = 0; c.b.msg('필살 일섬!', 'gold'); } },
      },
      def: { name: '반격 자세', kind: 'counter', dt: 'pierce', emo: 'void', base: 5, cp: 4, coins: 1, d: '반격. 공격받으면 합을 걸고, 이기면 되받아친다' },
    },
    imps: [
      { name: '결투의 끝', cost: { elation: 3, void: 1 }, spc: 10, kind: 'atk', dt: 'pierce', emo: 'elation', base: 8, cp: 4, coins: 3, d: '자신 호흡 3. 결투 상대에게 피해 +30%', use: c => { inf(c, 'poise', 3, 1, c.u); if (c.t && c.t.uid === c.u.r.duel) c.act.v.dmgMul = 1.3; } },
      {
        name: '선로 위의 섬광', cost: { elation: 3, void: 2, fury: 2 }, spc: 18, kind: 'atk', dt: 'pierce', emo: 'elation', base: 10, cp: 6, coins: 2, boss: 6,
        d: '자신의 속도가 대상보다 2 높을 때마다 기본 위력 +1(최대 +4)',
        pow: c => { if (!c.t) return 0; const ts = Math.max(...(c.t.spdVals.length ? c.t.spdVals : [0])); return clamp(Math.floor((c.act.spd - ts) / 2), 0, 4); },
      },
    ],
    tal: [
      { n: '검의 명예', d: '결투 상대를 쓰러뜨리면 정신력 +15, 기세 유지', h: { kill(r, self, b) { if (r.u.uid === self.r.duel) b.addSp(self, 15); } } },
      { n: '간파', d: '결투 상대에게 받는 피해 −20%', h: { dmgMod(c, self) { if (c.t === self && c.u.uid === self.r.duel) c.mult *= 0.8; } } },
    ],
  },

  /* ---------------------------------------------------------- 5 */
  mujin: {
    name: '무진', cls: '수호기사', color: '#8f9bb0', hp: 130, spd: [2, 5],
    res: { slash: 0.75, pierce: 0.75, blunt: 1.25 },
    quote: '내 뒤로. 아무도 지나가지 못한다.',
    bio: '무너진 성벽의 마지막 경비병. 맞을수록 단단해지고, 쌓인 인내를 한 번에 되돌려준다.',
    init(u) { u.r.fort = 0; u.r.oath = 0; u.r.chain = 0; },
    rdisp: u => [{ n: '인내', v: u.r.fort, max: 30, c: '#8f9bb0', tag: u.r.oath ? '' : '맹세' }],
    passive: {
      n: '수호 맹세', d: '피격될 때마다 인내 +2, 방어로 막은 피해에 비례해 인내 추가(최대 30). 전투마다 한 번, 다른 아군이 쓰러질 피해를 받으면 그 아군을 체력 1로 버티게 하고 무진이 최대 체력 20%의 피해를 대신 받는다.',
      h: {
        hit(c, self) { if (c.t === self) capR(self, 'fort', 2, 30); },
        guardAbsorb(r, self) { if (r.u === self) capR(self, 'fort', Math.ceil(r.amt / (4 * G(self.lvl))), 30); },
        death(r, self, b) {
          if (r.u === self || r.u.side !== 'A' || self.r.oath || !b.canAct(self)) return;
          self.r.oath = 1; r.u.hp = 1;
          b.msg(`무진이 ${r.u.name}의 앞을 막아선다! (수호 맹세)`, 'gold');
          b.damage(self, Math.round(self.maxHp * 0.2), { kind: 'oath', noShare: true });
          return true;
        },
        preDamage(r, self, b) {
          if (self.r.chain >= b.turn && r.t.side === 'A' && r.t !== self && r.kind === 'hit' && self.alive) {
            const mv = Math.round(r.dmg * 0.4); r.dmg -= mv; b.damage(self, mv, { kind: 'chain', noShare: true });
          }
        },
      },
    },
    sk: {
      s1: { name: '방패 강타', kind: 'atk', dt: 'blunt', emo: 'obsession', base: 4, cp: 3, coins: 2, d: '전투 시작 시 이번 턴 보호 1', start: c => c.b.buff(c.u, 'protect', 1, true) },
      s2: {
        name: '도발', kind: 'atk', dt: 'blunt', emo: 'fury', base: 5, cp: 2, coins: 2,
        d: '전투 시작 시 이번 턴 보호 2. 다른 아군을 노리는 적 행동 중 무진보다 느린 것 최대 2개를 자신에게 끌어온다.',
        start: c => {
          c.b.buff(c.u, 'protect', 2, true);
          let n = 0;
          for (const e of c.b.eActs.slice().sort((x, y) => y.spd - x.spd)) {
            if (n >= 2) break;
            if (e.done || !e.u.alive || e.s.kind !== 'atk' || e.target === c.u || e.spd >= c.act.spd || e.hijacked) continue;
            e.target = c.u; n++;
          }
          if (n) c.b.msg(`무진이 적 ${n}명의 공격을 끌어온다.`);
        },
      },
      s3: { name: '응징', kind: 'atk', dt: 'blunt', emo: 'fury', base: 4, cp: 3, coins: 3, d: '인내를 모두 소모해 3당 기본 위력 +1(최대 +8)', use: c => { c.act.v.f = c.u.r.fort; c.u.r.fort = 0; }, pow: c => Math.min(8, Math.floor((c.act.v.f != null ? c.act.v.f : c.u.r.fort) / 3)) },
      def: {
        name: '철벽', kind: 'guard', dt: 'blunt', emo: 'obsession', base: 8, cp: 4, coins: 2, d: '강력한 방어. 막아낸 피해만큼 인내 획득',
        start: c => { if (c.u.asc >= 3) for (const a of c.b.livingAllies()) if (a !== c.u) c.b.buff(a, 'protect', 1, true); },
      },
    },
    imps: [
      {
        name: '불굴의 성채', cost: { obsession: 3, void: 1 }, spc: 8, kind: 'atk', dt: 'blunt', emo: 'obsession', base: 6, cp: 3, coins: 2,
        d: '전투 시작 시 아군 전체에 보호막(무진 최대 체력 20%), 적 행동 최대 3개를 자신에게 끌어온다.',
        start: c => {
          for (const a of c.b.livingAllies()) c.b.addShield(a, c.u.maxHp * 0.2, c.b.turn);
          let n = 0;
          for (const e of c.b.eActs) { if (n >= 3) break; if (e.done || !e.u.alive || e.s.kind !== 'atk' || e.target === c.u || e.hijacked) continue; e.target = c.u; n++; }
          c.b.msg('불굴의 성채가 솟아오른다.', 'gold');
        },
      },
      { name: '맹세의 사슬', cost: { obsession: 3, fury: 2, sorrow: 2 }, spc: 15, kind: 'atk', dt: 'blunt', emo: 'obsession', base: 8, cp: 4, coins: 3, boss: 10, d: '공격 후 다음 턴이 끝날 때까지 다른 아군이 받는 공격 피해의 40%를 무진이 대신 받는다', after: c => { c.u.r.chain = c.b.turn + 1; c.b.msg('사슬이 아군을 묶는다.'); } },
    ],
    tal: [
      { n: '불굴', d: '인내 15 이상이면 받는 피해 −15%', h: { dmgMod(c, self) { if (c.t === self && self.r.fort >= 15) c.mult *= 0.85; } } },
      { n: '성벽', d: '철벽을 쓰면 다른 아군 전체도 이번 턴 보호 1' },
    ],
  },

  /* ---------------------------------------------------------- 6 */
  roa: {
    name: '로아', cls: '도박사', color: '#dca23a', hp: 76, spd: [4, 8], flip: 'fixed',
    res: { slash: 1.25, pierce: 1, blunt: 1 },
    quote: '확률은 공평해. 그래서 재밌는 거고.',
    bio: '얼굴을 판돈으로 걸었다가 잃은 도박사. 운은 쌓이고, 언젠가는 터진다.',
    init(u) { u.r.fortune = 0; u.r.rr = 0; },
    rdisp: u => [{ n: '행운', v: u.r.fortune, max: 7, c: '#dca23a', tag: u.r.fortune >= 7 ? '잭팟' : '' }],
    passive: {
      n: '판돈', d: '코인 앞면 확률이 정신력과 무관하게 50%. 공격 코인이 뒷면이거나 합 한 판을 질 때마다 행운 +1(최대 7). 행운 7에서 기술을 쓰면 잭팟: 모든 코인 앞면, 코인 위력 2배. 턴마다 한 번, 합 한 판에서 지면 행운 2를 써서 다시 던진다.',
      h: {
        coinFlip(r, self) { if (r.u === self && !r.h) capR(self, 'fortune', 1, 7); },
        reroll(r, self, b) { if (r.act.u !== self || self.r.fortune < 2 || self.r.rr === b.turn || self.r.fortune >= 7) return; self.r.fortune -= 2; self.r.rr = b.turn; return true; },
      },
    },
    sk: {
      s1: { name: '동전 튕기기', kind: 'atk', dt: 'pierce', emo: 'elation', base: 2, cp: 7, coins: 1, d: '단 한 번의 큰 승부' },
      s2: {
        name: '더블 오어 낫싱', kind: 'atk', dt: 'pierce', emo: 'obsession', base: 3, cp: 4, coins: 2,
        d: '공격 코인이 모두 앞면이면 같은 공격을 한 번 더. 뒷면이 하나라도 나오면 정신력 −5',
        after: c => {
          if (c.act.v.again) return;
          if (c.act.v.fl > 0 && c.act.v.hh === c.act.v.fl) { c.act.v.again = true; c.b.msg('더블!', 'gold'); c.b.doAttack(c.act, [{ i: 0 }, { i: 1 }], 0); }
          else c.b.addSp(c.u, -5);
        },
      },
      s3: {
        name: '러시안 룰렛', kind: 'atk', dt: 'pierce', emo: 'dread', base: 1, cp: 2, coins: 6,
        d: '코인 적중마다 1/6 확률(행운 4 이상이면 1/3)로 실탄: 그 적중 피해 3배',
        mod: c => { if (c.b.rng() < (c.u.r.fortune >= 4 ? 1 / 3 : 1 / 6)) { c.mult *= 3; c.live = true; } },
      },
      def: { name: '패 바꾸기', kind: 'evade', dt: 'pierce', emo: 'elation', base: 4, cp: 4, coins: 1, d: '회피. 회피에 성공하면 행운 +2', win: c => capR(c.u, 'fortune', 2, 7) },
    },
    imps: [
      { name: '올 인', cost: { elation: 2, dread: 2 }, spc: 10, kind: 'atk', dt: 'pierce', emo: 'dread', base: 4, cp: 4, coins: 4, d: '행운을 모두 소모. 소모한 수만큼 앞쪽 코인이 반드시 앞면', use: c => { c.act.v.forceN = c.u.r.fortune; c.u.r.fortune = 0; } },
      {
        name: '가면무도회', cost: { dread: 3, elation: 2, obsession: 2 }, spc: 16, kind: 'atk', dt: 'pierce', emo: 'dread', base: 6, cp: 4, coins: 3, tgt: 'all', boss: 5,
        d: '적 전체. 적중마다 무작위 상태 2·1(출혈·화상·진동·파열·침잠)',
        hit: c => inf(c, pick(['bleed', 'burn', 'tremor', 'rupture', 'sinking'], c.b.rng), 2, 1),
      },
    ],
    tal: [
      { n: '타짜', d: '전투 시작 시 행운 3', h: { battleStart(r, self) { self.r.fortune = 3; } } },
      { n: '하우스 엣지', d: '잭팟 공격의 피해 +30%', h: { dmgMod(c, self) { if (c.u === self && c.act.v.jackpot) c.mult *= 1.3; } } },
    ],
  },

  /* ---------------------------------------------------------- 7 */
  yeon: {
    name: '연', cls: '심해 시인', color: '#4e6fd0', hp: 84, spd: [3, 6], flip: 'abs',
    res: { slash: 1, pierce: 1.25, blunt: 0.75 },
    quote: '가라앉을수록 문장은 맑아진다.',
    bio: '원고를 강에 던지고 따라 들어간 시인. 절망마저 운으로 바꾼다.',
    init(u) { u.r.abyss = 0; u.r.abyssUsed = 0; },
    rdisp: u => [{ n: '심연', v: u.r.abyss ? 1 : 0, max: 1, c: '#4e6fd0', tag: u.r.abyss ? '심연' : ('위력+' + Math.min(3, Math.floor(Math.max(0, -u.sp) / 15))) }],
    passive: {
      n: '익사의 시학', d: '앞면 확률이 50%+|정신력|%(절망도 행운이 된다). 정신력이 0 아래로 15 내려갈 때마다 코인 위력 +1(최대 +3). 처음 공황에 빠질 때 대신 2턴간 「심연」: 모든 공격이 적 전체를 치고, 부여하는 침잠 위력 +2, 정신력이 줄지 않는다. 심연이 끝나면 정신력 0.',
      h: {
        coinPower(c, self) { return c.u === self ? Math.min(3, Math.floor(Math.max(0, -self.sp) / 15)) : 0; },
        panic(r, self, b) {
          if (r.u !== self || self.r.abyssUsed >= (self.asc >= 3 ? 2 : 1)) return;
          self.r.abyssUsed++; self.r.abyss = b.turn + 2;
          b.msg('연이 심연으로 가라앉는다. 2턴 동안 그의 노래가 모두를 덮친다.', 'gold');
          return true;
        },
        inflict(r, self, b) { if (r.src === self && r.key === 'sinking' && self.r.abyss >= b.turn) r.p += 2; },
        spChange(r, self, b) { if (r.u === self && self.r.abyss >= b.turn && r.d < 0) r.d = 0; },
        turnEnd(r, self, b) { if (self.r.abyss && self.r.abyss <= b.turn) { self.r.abyss = 0; self.sp = 0; b.msg('연이 심연에서 떠오른다.'); } },
      },
    },
    sk: {
      s1: { name: '가라앉는 노래', kind: 'atk', dt: 'slash', emo: 'sorrow', base: 4, cp: 3, coins: 2, d: '적중 시 침잠 1·1', hit: c => inf(c, 'sinking', 1, 1) },
      s2: {
        name: '비가', kind: 'atk', dt: 'slash', emo: 'sorrow', base: 4, cp: 4, coins: 2, d: '전투 시작 시 자신 정신력 −15, 다른 아군 전체 정신력 +8. 적중 시 침잠 2·0',
        start: c => { c.b.addSp(c.u, -15); for (const a of c.b.livingAllies()) if (a !== c.u) c.b.addSp(a, 8); },
        hit: c => inf(c, 'sinking', 2, 0),
      },
      s3: {
        name: '익사', kind: 'atk', dt: 'slash', emo: 'void', base: 5, cp: 4, coins: 3, d: '마지막 코인 적중 시 대상 침잠 위력×횟수(최대 6)×0.7만큼 추가 피해 후 침잠 제거',
        hit: c => { if (c.last && c.t.alive && c.t.st.sinking) { const s = c.t.st.sinking; const d = c.b.damage(c.t, Math.round(s.p * Math.min(6, s.c) * G(s.lv) * 0.7), { kind: 'sinking', src: c.u }); delete c.t.st.sinking; c.b.emit('dot', { t: c.t.uid, k: 'sinking', d, label: '익사' }); } },
      },
      def: { name: '물러나는 파도', kind: 'evade', dt: 'slash', emo: 'sorrow', base: 4, cp: 3, coins: 1, d: '회피' },
    },
    imps: [
      { name: '심해의 장송', cost: { sorrow: 3, void: 1 }, spc: 20, kind: 'atk', dt: 'slash', emo: 'sorrow', base: 5, cp: 3, coins: 3, tgt: 'all', d: '적 전체. 적중 시 침잠 3·2. (정신력 소모가 연에게는 힘이 된다)', hit: c => inf(c, 'sinking', 3, 2) },
      {
        name: '젖은 원고', cost: { sorrow: 3, dread: 2, void: 2 }, spc: 20, kind: 'atk', dt: 'slash', emo: 'sorrow', base: 7, cp: 5, coins: 3, boss: 3,
        d: '적중마다 대상 정신력 −8. 대상이 공황 상태이거나 정신력이 없으면 피해 +50%',
        mod: c => { if (!c.t.hasSP || c.b.isPanicked(c.t)) c.mult *= 1.5; },
        hit: c => c.b.addSp(c.t, -8),
      },
    ],
    tal: [
      { n: '수면의 반사', d: '자신의 정신력이 0 이하이면 받는 피해 −15%', h: { dmgMod(c, self) { if (c.t === self && self.sp <= 0) c.mult *= 0.85; } } },
      { n: '깊은 숨', d: '심연에 전투마다 두 번 들어갈 수 있다' },
    ],
  },

  /* ---------------------------------------------------------- 8 */
  kai: {
    name: '카이', cls: '포격수', color: '#a3b86c', hp: 80, spd: [3, 6],
    res: { slash: 1.25, pierce: 1, blunt: 0.75 },
    quote: '탄창은 거짓말 안 해. 세어 두기만 하면.',
    bio: '광장에서 발포 명령을 따랐던 포병. 남은 탄을 세는 버릇이 있다.',
    init(u) { u.r.ammo = 6; u.r.charge = 0; },
    rdisp: u => [{ n: '탄약', v: u.r.ammo, max: 6, c: '#a3b86c' }, { n: '충전', v: u.r.charge, max: 10, c: '#dca23a' }],
    passive: {
      n: '탄약 관리', d: '탄약 6발로 시작. 매 턴 시작 시 충전 +1(최대 10). 속사는 탄약을 쓰면 강해지고, 과충전 포격은 충전을 코인으로 바꾼다.',
      h: { turnStart(r, self) { capR(self, 'charge', 1, 10); if (self.asc >= 1 && self.r.ammo === 0) self.r.ammo = 2; } },
    },
    sk: {
      s1: {
        name: '속사', kind: 'atk', dt: 'pierce', emo: 'fury', base: 4, cp: 3, coins: 3, d: '탄약을 최대 3발 소모, 1발당 기본 위력 +1. 탄약이 없으면 기본 위력 −2',
        use: c => { const n = Math.min(3, c.u.r.ammo); c.u.r.ammo -= n; c.act.v.am = n; },
        pow: c => { const n = c.act.v.am != null ? c.act.v.am : Math.min(3, c.u.r.ammo); return n > 0 ? n : -2; },
      },
      s2: { name: '재장전 사격', kind: 'atk', dt: 'pierce', emo: 'void', base: 4, cp: 3, coins: 2, d: '전투 시작 시 탄약 6발로 장전, 충전 +3', start: c => { c.u.r.ammo = 6; capR(c.u, 'charge', 3, 10); } },
      s3: {
        name: '과충전 포격', kind: 'atk', dt: 'pierce', emo: 'elation', base: 5, cp: 4, tgt: 2,
        coins: c => 1 + Math.floor((c.act.v.ch != null ? c.act.v.ch : c.u.r.charge) / 3),
        d: '충전을 모두 소모. 코인 수 = 1 + 충전÷3(최대 4). 대상 포함 2명 공격',
        use: c => { c.act.v.ch = c.u.r.charge; c.u.r.charge = 0; },
      },
      def: { name: '엄폐', kind: 'guard', dt: 'pierce', emo: 'void', base: 5, cp: 3, coins: 2, d: '방어. 충전 +2', use: c => capR(c.u, 'charge', 2, 10) },
    },
    imps: [
      { name: '일제 사격', cost: { fury: 2, elation: 2 }, spc: 8, kind: 'atk', dt: 'pierce', emo: 'fury', base: 4, cp: 3, tgt: 'all', coins: c => Math.max(2, c.act.v.am != null ? c.act.v.am : c.u.r.ammo), d: '탄약을 모두 소모. 코인 수 = 탄약 수(최소 2). 적 전체', use: c => { c.act.v.am = c.u.r.ammo; c.u.r.ammo = 0; } },
      { name: '침묵의 탄환', cost: { fury: 3, elation: 2, void: 2 }, spc: 15, kind: 'atk', dt: 'pierce', emo: 'void', base: 12, cp: 6, coins: 1, unbreak: true, ignoreRes: true, boss: 7, d: '불괴 코인 1개. 대상의 내성을 무시(최소 취약 배율)' },
    ],
    tal: [
      { n: '예비 탄창', d: '턴 시작 시 탄약이 0이면 2발 자동 장전' },
      { n: '포병의 눈', d: '과충전 포격의 피해 +25%', h: { dmgMod(c, self) { if (c.u === self && c.s.key === 's3') c.mult *= 1.25; } } },
    ],
  },

  /* ---------------------------------------------------------- 9 */
  viola: {
    name: '비올라', cls: '인형술사', color: '#d39be6', hp: 74, spd: [4, 7],
    res: { slash: 1, pierce: 1.25, blunt: 1 },
    quote: '줄을 쥔 쪽이 이야기를 정해요.',
    bio: '재봉실에서 자란 인형술사. 적에게 실을 엮어, 그 칼끝을 다른 곳으로 돌린다.',
    init(u) { u.r.pmax = Math.round(u.maxHp * 0.2); u.r.puppet = u.r.pmax; },
    rdisp: u => [{ n: '인형', v: u.r.puppet, max: u.r.pmax, c: '#d39be6' }],
    passive: {
      n: '마리오네트', d: '인형이 비올라 대신 피해를 받는다(최대 체력 20%, 매 턴 5% 회복). 실이 4개 이상 엮인 적은 꼭두각시 춤으로 조종할 수 있다.',
      h: { turnStart(r, self) { self.r.puppet = Math.min(self.r.pmax, self.r.puppet + Math.round(self.maxHp * 0.05)); } },
    },
    sk: {
      s1: { name: '실 감기', kind: 'atk', dt: 'slash', emo: 'obsession', base: 3, cp: 3, coins: 3, d: '적중 시 실 +1, 파열 위력 +1', hit: c => { inf(c, 'thread', c.u.asc >= 1 ? 2 : 1, 0); inf(c, 'rupture', 1, 0); } },
      s2: {
        name: '꼭두각시 춤', kind: 'atk', dt: 'slash', emo: 'dread', base: 4, cp: 3, coins: 2,
        d: '전투 시작 시, 노린 적 행동의 주인에게 실이 4개 이상이면 실 4를 소모해 그 행동을 조종: 다른 적을 공격하게 만들고 합을 막는다. 적중 시 파열 횟수 +1',
        start: c => {
          const e = c.act.tAct, t = c.act.target;
          if (!e || !t || e.done || c.b.pot(t, 'thread') < 4 || e.s.kind !== 'atk') return;
          c.b.consume(t, 'thread', 4);
          const others = c.b.livingEnemies().filter(x => x !== e.u);
          e.target = others.length ? pick(others, c.b.rng) : e.u;
          e.noClash = true; e.hijacked = true; c.act.tAct = null;
          c.b.msg(`비올라가 실을 당긴다! ${e.u.name}의 공격이 ${e.target.name}에게 향한다.`, 'gold');
        },
        hit: c => inf(c, 'rupture', 0, 1),
      },
      s3: {
        name: '실 끊기', kind: 'atk', dt: 'slash', emo: 'dread', base: 5, cp: 3, coins: 3,
        d: '대상의 실을 모두 소모. 실 1개당 파열 위력 +1, 2개당 파열 횟수 +1과 기본 위력 +1(최대 +4)',
        use: c => { const n = c.t ? c.b.consume(c.t, 'thread') : 0; c.act.v.th = n; if (n) inf(c, 'rupture', n, Math.ceil(n / 2)); },
        pow: c => Math.min(4, Math.floor((c.act.v.th != null ? c.act.v.th : (c.t ? c.b.pot(c.t, 'thread') : 0)) / 2)),
      },
      def: { name: '인형 방패', kind: 'guard', dt: 'slash', emo: 'obsession', base: 5, cp: 3, coins: 2, d: '방어. 전투 시작 시 인형 내구 15% 회복', start: c => { c.u.r.puppet = Math.min(c.u.r.pmax, c.u.r.puppet + Math.round(c.u.maxHp * 0.15)); } },
    },
    imps: [
      { name: '줄인형 극장', cost: { obsession: 2, dread: 2 }, spc: 10, kind: 'atk', dt: 'slash', emo: 'dread', base: 4, cp: 3, coins: 3, tgt: 'all', d: '적 전체. 적중 시 실 +1, 파열 2·1', hit: c => { inf(c, 'thread', 1, 0); inf(c, 'rupture', 2, 1); } },
      {
        name: '달의 실', cost: { dread: 3, obsession: 2, sorrow: 2 }, spc: 16, kind: 'atk', dt: 'slash', emo: 'obsession', base: 8, cp: 4, coins: 3, boss: 9,
        d: '공격 후 대상의 실을 모두 소모. 실 3개당 대상의 다음 턴 행동 1개 봉쇄(최대 2)',
        after: c => { if (!c.t || !c.t.alive) return; const n = c.b.consume(c.t, 'thread'); const k = Math.min(2, Math.floor(n / 3)); if (k) { c.t.flags.skip = (c.t.flags.skip || 0) + k; c.b.msg(`${c.t.name}의 행동 ${k}개가 실에 묶인다.`, 'gold'); } },
      },
    ],
    tal: [
      { n: '촘촘한 실', d: '실 감기 적중 시 실 +1 추가' },
      { n: '인형의 반격', d: '인형이 피해를 흡수하면 공격자에게 파열 1·1', h: { hit(c, self, b) { if (c.t === self && c.pab > 0) b.inflict(self, c.u, 'rupture', 1, 1); } } },
    ],
  },

  /* ---------------------------------------------------------- 10 */
  sion: {
    name: '시온', cls: '시계공', color: '#b9a37e', hp: 88, spd: [5, 5],
    res: { slash: 1, pierce: 0.75, blunt: 1.25 },
    quote: '늦었다고? 그럼 되감으면 되지.',
    bio: '시계탑지기의 도제였던 소년. 태엽을 감아 아군의 시간을 되돌린다.',
    init(u) { u.r.cog = u.asc >= 3 ? 3 : 0; },
    rdisp: u => [{ n: '태엽', v: u.r.cog, max: 5, c: '#b9a37e' }],
    passive: {
      n: '정밀 기계', d: '속도가 늘 일정하다. 이번 턴 가장 빠른 유닛이면 합 위력 +1. 기술(S1~S3)을 쓸 때마다 태엽 +1(최대 5).',
      h: {
        clashPower(c, self, b) { if (c.u !== self) return 0; const sp = b.units().filter(x => x.alive && x !== self).flatMap(x => x.spdVals); return sp.length && self.spdVals[0] > Math.max(...sp) ? 1 : 0; },
        skillUse(r, self) { if (r.u === self && r.s.slot) capR(self, 'cog', 1, 5); },
        coinPower(c, self) { return c.u === self && self.asc >= 1 && self.r.cog >= 5 ? 1 : 0; },
      },
    },
    sk: {
      s1: { name: '톱니 내려치기', kind: 'atk', dt: 'blunt', emo: 'void', base: 4, cp: 3, coins: 2, d: '사용 시 자신 신속 1(다음 턴). 적중 시 대상 속박 1(다음 턴)', use: c => c.b.buff(c.u, 'haste', 1), hit: c => c.b.buff(c.t, 'bind', 1) },
      s2: {
        name: '가속', kind: 'atk', dt: 'blunt', emo: 'elation', base: 4, cp: 3, coins: 2, d: '전투 시작 시 이번 턴 가장 느린 다른 아군에게 다음 턴 신속 3, 위력 증가 1',
        start: c => { const t = c.b.livingAllies().filter(x => x !== c.u).sort((a, d) => a.spdVals[0] - d.spdVals[0])[0]; if (t) { c.b.buff(t, 'haste', 3); c.b.buff(t, 'pwrUp', 1); } },
      },
      s3: {
        name: '되감기', kind: 'atk', dt: 'blunt', emo: 'void', base: 5, cp: 3, coins: 2,
        d: '전투 시작 시 태엽 3을 소모해, 체력 비율이 가장 낮은 아군의 체력을 2턴 전으로 되돌린다(최소 최대 체력 15% 회복). 정신력 +10, 출혈·화상·파열·침잠 제거',
        start: c => {
          if (c.u.r.cog < 3) return;
          const t = lowestHpAlly(c.b) || c.u;
          c.u.r.cog -= 3;
          const h = c.b.hist[t.uid];
          const past = h && h[0] ? h[0].hp : t.hp;
          c.b.heal(t, Math.max(past - t.hp, Math.round(t.maxHp * 0.15)));
          c.b.addSp(t, 10);
          ['bleed', 'burn', 'rupture', 'sinking'].forEach(k => delete t.st[k]);
          c.b.msg(`시온이 ${t.name}의 시간을 되감는다.`, 'gold');
        },
      },
      def: { name: '시간 유예', kind: 'evade', dt: 'blunt', emo: 'void', base: 5, cp: 3, coins: 1, d: '회피' },
    },
    imps: [
      {
        name: '시간 정지', cost: { void: 3, elation: 1 }, spc: 10, kind: 'atk', dt: 'blunt', emo: 'void', base: 5, cp: 3, coins: 2,
        d: '전투 시작 시 시온보다 느린 적 행동 중 가장 느린 2개를 취소한다',
        start: c => {
          const list = c.b.eActs.filter(e => !e.done && e.u.alive && e.spd < c.act.spd).sort((a, d) => a.spd - d.spd).slice(0, 2);
          list.forEach(e => { e.done = true; e.spent = true; });
          if (list.length) c.b.msg(`시간이 멈춘다. 적 행동 ${list.length}개가 취소되었다.`, 'gold');
        },
      },
      { name: '역행', cost: { void: 3, elation: 2, sorrow: 2 }, spc: 16, kind: 'atk', dt: 'blunt', emo: 'void', base: 7, cp: 4, coins: 3, boss: 1, d: '적중 시 대상 속박 2. 공격 후 아군 전체 정신력 +10, 신속 2(다음 턴)', hit: c => c.b.buff(c.t, 'bind', 2), after: c => { for (const a of c.b.livingAllies()) { c.b.addSp(a, 10); c.b.buff(a, 'haste', 2); } } },
    ],
    tal: [
      { n: '과부하 태엽', d: '태엽 5일 때 코인 위력 +1' },
      { n: '정확한 시각', d: '전투 시작 시 태엽 3' },
    ],
  },
};

const CHAR_ORDER = ['serin', 'mujin', 'doyun', 'eve', 'haram', 'yeon', 'roa', 'kai', 'viola', 'sion'];
