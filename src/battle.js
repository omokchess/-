'use strict';
/* ===== 잔향선 · 일대일 전투 엔진 =====
 * 동기식. 모든 결과는 사건(ev) 목록으로 남고, 화면은 그것을 연출로 재생한다.
 * 흐름: start() → [플레이어 차례: act(choice)] → [적 차례: peek() → step(방어 결과)] 반복.
 * 방어 결과: 'none' | 'block' | 'perfect' (빠른 반응 입력 또는 자동 판정) */

const ITEMS = {
  potion: { n: '회복약', i: '🧪', d: '체력 35% 회복', use: B => B.heal(B.p, B.p.mhp * 0.35) },
  tonic: { n: '안정제', i: '💊', d: '정신력 +35, 해로운 효과 모두 제거', use: B => { B.sp(35); B.cleanse(B.p, 9); } },
  ether: { n: '에너지 앰플', i: '⚡', d: '에너지 +4', use: B => B.energy(4) },
  bomb: { n: '화염병', i: '🍾', d: '공격력×6 피해 + 화상 3·3', use: B => { B.trueDmg(B.f, B.p.atk * 6, 'burn'); B.st(B.f, 'burn', 3, 3); } },
  elixir: { n: '영약', i: '✨', d: '체력·에너지 가득, 정신력 0으로', use: B => { B.heal(B.p, B.p.mhp); B.energy(10); B.sp(-B.p.sp); } },
};
const ITEM_ORDER = ['potion', 'tonic', 'ether', 'bomb', 'elixir'];
const STG_K = { blunt: 0.9, slash: 0.45, pierce: 0.45 };
const lvG = L => 1 + 0.075 * (L - 1);

class Battle {
  constructor(o) {
    this.o = o;
    this.rng = mulberry32(o.seed || (Date.now() & 0xffffff));
    this.ev = []; this.turn = 0; this.phase = 'init'; this.r = {}; this.cds = {}; this.ranks = {}; this.stats = { dealt: 0, taken: 0, maxHit: 0, crits: 0, perfect: 0, block: 0, staggers: 0, skills: {}, turns: 0, kills: 0 };
    this.mods = o.mods || {};
    const h = o.hero;
    this.cls = CLASSES[h.cls]; this.clsId = h.cls;
    this.talents = new Set(h.tal || []);
    this.relics = new Set(h.relics || []);
    this.items = Object.assign({}, h.items || {});
    this.skillIds = [];
    for (const s of h.skills) { this.skillIds.push(s.id || s); this.ranks[s.id || s] = s.rank || 1; }
    const st = h.stats;
    this.p = { side: 'p', name: h.name || this.cls.n, mhp: Math.round(st.mhp), hp: Math.round(h.hp != null ? h.hp : st.mhp), atk: st.atk, def: st.def, spd: st.spd, crit: st.crit || 5, critDmg: st.critDmg || 1.5, sh: 0, st: {}, bf: {}, sp: h.sp || 0, en: 1, enMax: 10, lv: h.lv || 1 };
    this.foeQ = o.foes.slice();
    this.foeIdx = 0;
    this.hpHist = [];
    this.itemUsed = 0;
    this.lastSkill = null;
    this.result = null;
  }
  /* ---------- 공용 ---------- */
  tal(id) { return this.talents.has(id); }
  rel(id) { return this.relics.has(id); }
  hk(name, ...a) { const f = this.cls.hk && this.cls.hk[name]; return f ? f(this, ...a) : undefined; }
  fg(name, ...a) { const g = this.f && this.f.D.gim; const fn = g && g[name]; return fn ? fn(this, this.f, ...a) : undefined; }
  relHook(name, ...a) { let out; for (const id of this.relics) { const R = (typeof RELICS !== 'undefined') && RELICS[id]; if (R && R[name]) { const v = R[name](this, ...a); if (v !== undefined) out = (out || 0) + v; } } return out; }
  snap() {
    const u = x => x && ({ hp: Math.max(0, Math.round(x.hp)), mhp: x.mhp, sh: Math.round(x.sh || 0), st: JSON.parse(JSON.stringify(x.st)), bf: JSON.parse(JSON.stringify(x.bf)) });
    const p = u(this.p); p.sp = Math.round(this.p.sp); p.en = this.p.en;
    const f = this.f ? u(this.f) : null;
    if (f) { f.stg = Math.round(this.f.stg); f.stgMax = Math.round(this.f.stgMax); f.staggered = this.f.staggered; f.parts = (this.f.parts || []).map(q => ({ n: q.n, hp: Math.max(0, Math.round(q.hp)), mhp: q.mhp, alive: q.alive })); f.gim = Object.assign({}, this.f.gim); f.id = this.f.id; }
    return { p, f, r: Object.assign({}, this.r) };
  }
  emit(type, o = {}) { const e = Object.assign({}, o, { type, snap: this.snap() }); this.ev.push(e); return e; }
  log(txt, cls = 'sys') { this.emit('log', { txt, cls }); }
  fx(key, data) { this.emit('fx', { key, data }); }
  stv(u, k) { return u && u.st[k] ? u.st[k].c : 0; }
  stp(u, k) { return u && u.st[k] ? u.st[k].p : 0; }
  bfv(u, k) { return u && u.bf[k] ? u.bf[k].v : 0; }
  res(k, d) {
    const R = this.cls.res.find(x => x.k === k); let max = R ? R.max : 99;
    if (k === 'wind' && this.tal('ck_t3b')) max = 7;
    const old = this.r[k] || 0; this.r[k] = clamp(old + d, 0, max);
    if (this.r[k] !== old) {
      this.emit('res', { k, v: this.r[k], d: this.r[k] - old });
      if (k === 'tide' && d > 0 && this.tal('hb_t3b') && this.rng() < 0.25) this.energy(1);
    }
  }
  emitRes(k) { this.emit('res', { k, v: this.r[k], d: 0 }); }
  energy(n) { const o = this.p.en; this.p.en = clamp(o + n, 0, this.p.enMax); if (this.p.en !== o) this.emit('energy', { d: this.p.en - o, v: this.p.en }); }
  sp(d) {
    const o = this.p.sp; this.p.sp = clamp(o + d, -45, 45);
    if (Math.round(this.p.sp) !== Math.round(o)) this.emit('sp', { d: this.p.sp - o, v: this.p.sp });
    this.hk('onSp');
    if (this.p.sp <= -45 && !this.p.noPanic && !this.p.panic) { this.p.panic = 1; this.emit('panic', {}); this.log('😱 공황 — 다음 차례를 스스로 다룰 수 없다', 'bad'); }
  }
  heal(u, v, quiet) {
    if (u.hp <= 0) return 0;
    let m = 1; if (u === this.p) { m += (this.relHook('healMul') || 0); if (this.f && this.f.gim.noHeal) m *= 0.5; }
    const amt = Math.max(0, Math.min(u.mhp - u.hp, Math.round(v * m)));
    if (amt <= 0) return 0;
    u.hp += amt; this.emit('heal', { who: u.side, v: amt, quiet: !!quiet }); return amt;
  }
  shield(u, v) { const a = Math.round(v); if (a <= 0) return; u.sh = (u.sh || 0) + a; this.emit('shield', { who: u.side, v: a }); }
  st(u, k, p, c) {
    if (!u || u.hp <= 0 && u.side === 'f') return;
    if (u.side === 'f' && this.f && this.f.gim.immune && this.f.gim.immune.includes(k)) { this.emit('immune', { who: 'f', k }); return; }
    if (u.side === 'p' && this.relHook('immune', k)) { this.emit('immune', { who: 'p', k }); return; }
    let pp = p, cc = c;
    if (u.side === 'f' && (p > 0)) { pp += this.hk('stPot', k) || 0; pp += this.relHook('stPot', k) || 0; pp *= this.hk('stMul', k) || 1; }
    if (u.side === 'f' && c > 0) cc += this.relHook('stCnt', k) || 0;
    const s = u.st[k] || (u.st[k] = { p: 0, c: 0 });
    const capP = (k === 'bleed' || k === 'burn') ? 30 : 20;
    s.p = clamp(Math.round(s.p + pp), 0, capP); s.c = clamp(Math.round(s.c + cc), 0, 20);
    if (s.c === 0 && s.p > 0) s.c = 1;
    if (s.p <= 0 || s.c <= 0) delete u.st[k];
    this.emit('st', { who: u.side, k, p: pp, c: cc });
  }
  emitSt(u, k) { this.emit('st', { who: u.side, k, p: 0, c: 0 }); }
  clearSt(u, k) { if (u.st[k]) { delete u.st[k]; this.emit('st', { who: u.side, k, p: 0, c: 0, clear: 1 }); } }
  bf(u, k, v, t) {
    if (!u) return;
    if (u.side === 'f' && k === 'stun' && this.f.gim.stunImmune) { this.emit('immune', { who: 'f', k }); return; }
    if (u.side === 'p' && BF[k] && !BF[k].good && this.relHook('immune', k)) { this.emit('immune', { who: 'p', k }); return; }
    const own = (this.phase === 'p' && u.side === 'p') || (this.phase === 'f' && u.side === 'f');
    const b = u.bf[k] || (u.bf[k] = { v: 0, t: 0 });
    b.v = Math.max(b.v, v); b.t = Math.max(b.t, t + (own ? 1 : 0));
    this.emit('bf', { who: u.side, k, v, t });
  }
  cleanse(u, n) {
    let k = 0;
    for (const s of Object.keys(u.st)) if (ST[s].bad && k < n) { delete u.st[s]; k++; }
    for (const b of Object.keys(u.bf)) if (!BF[b].good && k < n) { delete u.bf[b]; k++; }
    if (k) this.emit('cleanse', { who: u.side, n: k });
  }
  flip() { const v = this.hk('flip'); return v === undefined ? this.rng() < 0.5 : v; }
  /* 잠재 상태 피해는 거는 쪽의 힘에 비례한다 */
  potV(u, pot) { return u.side === 'p' ? pot * (this.f ? this.f.atk / 10 : 1) * 0.9 : pot * this.p.atk / 10; }
  sc(v) { return v * this.p.atk / 10; }
  hpAgo(n) { const i = this.hpHist.length - 1 - n; return i >= 0 ? this.hpHist[i] : this.p.hp; }

  /* ---------- 시작 ---------- */
  start() {
    this.ev = [];
    this.hk('start');
    this.relHook('start');
    if (this.tal('hb_t1b')) this.shield(this.p, this.p.mhp * 0.12);
    this.enterFoe(this.foeQ[0], true);
    this.emit('start', {});
    this.beginP();
    return this.ev;
  }
  enterFoe(fo, first) {
    const D = FOES[fo.id]; const L = fo.lv || 1, g = lvG(L) * (fo.hpMul || 1);
    const nm = fo.nm ? 1 : 0;
    const f = {
      side: 'f', id: fo.id, D, name: D.n, lv: L, boss: !!D.boss, elite: !!D.elite,
      mhp: Math.round(D.hp * 55 * (D.boss ? 1.2 : D.elite ? 1.45 : 1.3) * g * (this.mods.foeHp || 1) * (nm ? 1.15 : 1)), atk: D.atk * 24 * lvG(L) * (this.mods.foeAtk || 1) * (nm ? 1.1 : 1), def: (D.def || 1) * 10 * lvG(L),
      res: Object.assign({ slash: 1, pierce: 1, blunt: 1 }, D.res || {}), st: {}, bf: {}, sh: 0, stg: 0, staggered: 0, phaseN: 1, plan: [], cd: {}, gim: {}, nm, acts: D.acts || 1,
    };
    f.hp = f.mhp; f.stgMax = Math.round(f.mhp * (D.stg || 0.28));
    const gap = L - this.p.lv; f.gapOut = clamp(1 + gap * 0.045, 0.7, 1.6); f.gapIn = clamp(1 - gap * 0.035, 0.6, 1.3);
    if (D.parts) f.parts = D.parts.map(q => ({ id: q.id, n: q.n, mhp: Math.round(q.hp * f.mhp), hp: Math.round(q.hp * f.mhp), alive: true, core: !!q.core, res: Object.assign({ slash: 1, pierce: 1, blunt: 1 }, q.res || {}) }));
    this.f = f; this.tgt = -1;
    if (f.parts && f.parts.some(q => q.core)) { this.tgt = 0; f.hp = f.parts.reduce((a, q) => a + q.hp, 0); f.mhp = f.parts.reduce((a, q) => a + q.mhp, 0); }
    this.fg('init');
    if (nm) this.fg('nightmare');
    this.emit('enter', { id: fo.id, name: f.name, first: !!first, idx: this.foeIdx, total: this.foeQ.length });
    this.plan(true);
  }
  /* ---------- 의도(적의 다음 행동) ---------- */
  pickSkill() {
    const f = this.f, D = f.D;
    if (D.ai) { const id = D.ai(this, f); if (id) return id; }
    const pool = (f.dynSk || D.sk).filter(s => !(f.cd[s.id] > 0) && (!s.cond || s.cond(this, f)) && (!s.ph || s.ph.includes(f.phaseN)));
    if (!pool.length) return D.sk[0].id;
    return wpick(pool, s => s.w == null ? 1 : (typeof s.w === 'function' ? s.w(this, f) : s.w), this.rng).id;
  }
  makeIntent() {
    const f = this.f, acts = [];
    const n = f.acts + (f.gim.extraAct || 0);
    for (let i = 0; i < n; i++) {
      const id = this.pickSkill(); const s = this.fsk(id);
      if (s.cd) f.cd[id] = s.cd + 1;
      acts.push({ id, ch: s.charge || 0, pw: 1 });
      if (s.charge) break;
    }
    return acts;
  }
  plan(fresh) {
    const f = this.f; if (!f || f.hp <= 0) return;
    if (fresh) f.plan = [];
    while (f.plan.length < 2) f.plan.push(this.makeIntent());
    this.emit('intent', { plan: this.intentInfo() });
  }
  fsk(id) { const f = this.f; return (f.dynSk && f.dynSk.find(s => s.id === id)) || f.D.sk.find(s => s.id === id) || (f.D.extra && f.D.extra[id]) || { id, n: '…', hits: [] }; }
  hitsOf(s) { return s.dyn ? s.dyn(this, this.f) : (s.hits || []); }
  skName(s) { return s.dynN ? s.dynN(this, this.f) : s.n; }
  intentInfo() {
    const f = this.f; if (!f) return [];
    return f.plan.map(acts => acts.map(a => { if (a.id === '_stagger') return { id: a.id, n: '흐트러짐', util: 1, stagger: 1, hits: 0, est: 0 }; const s = this.fsk(a.id); const hs = this.hitsOf(s); return { id: a.id, n: this.skName(s), ch: a.ch, ub: !!s.ub || !!f.gim.ubAll, hits: hs.length, est: this.estFoe(s, a), type: s.type, d: s.d, util: !hs.length, pw: a.pw, ult: !!s.ult, melee: !!s.melee, st: s.st ? Object.keys(s.st) : [] }; }));
  }
  estFoe(s, a) {
    const hs = this.hitsOf(s); if (!hs.length) return 0;
    let t = 0; for (const pw of hs) t += this.calcFoeHit(pw, s, 'none', true) * (a ? a.pw : 1);
    return Math.round(t);
  }
  weakenIntent(k) { const a = this.f.plan[0]; if (a) for (const x of a) x.pw *= (1 - k); this.emit('intent', { plan: this.intentInfo() }); this.log(`적의 다음 행동 위력 -${Math.round(k * 100)}%`, 'good'); }
  delayCharge(n) { const a = this.f.plan[0]; let ok = 0; if (a) for (const x of a) if (x.ch > 0) { x.ch += n; ok = 1; } if (ok) { this.emit('intent', { plan: this.intentInfo() }); this.log('적의 준비가 늦춰졌다', 'good'); } }

  /* ---------- 플레이어 차례 ---------- */
  beginP() {
    const p = this.p; this.turn++; this.phase = 'p'; this.itemUsed = 0; this.stats.turns = this.turn;
    this.hpHist.push(p.hp);
    if (p.sh) { p.sh = Math.floor(p.sh * 0.7); }
    const rg = this.bfv(p, 'regen'); if (rg) this.heal(p, p.mhp * rg / 100, 1);
    let en = 2; if (this.bfv(p, 'haste') && this.rng() < 0.35) en++; en += this.relHook('energyTurn') || 0;
    if (this.turn > 1 || true) this.energy(en);
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k]--;
    this.hk('turnStart'); this.relHook('turnStart'); this.fg('pTurnStart');
    this.emit('pturn', { turn: this.turn });
    if (this.checkEnd()) return;
    if (this.bfv(p, 'stun')) { this.log('기절해 움직일 수 없다', 'bad'); this.emit('skip', { who: 'p' }); this.endP(); return; }
    if (p.panic) {
      const opts = this.usable().filter(s => s.ok);
      const s = opts.length ? pick(opts, this.rng) : null;
      this.log('😱 공황에 빠져 제멋대로 움직인다', 'bad');
      p.panic = 0;
      if (s) this.doSkill(s.id); else this.doFocus();
      this.sp(-15 - p.sp);
      if (!this.checkEnd()) this.endP();
    }
  }
  costOf(sk) {
    let c = sk.cost + (this.hk('costMod', sk) || 0) + (this.f && this.f.gim.costUp && !sk.basic ? this.f.gim.costUp : 0);
    return Math.max(0, c);
  }
  usable() {
    return this.skillIds.map(id => {
      const sk = SKILL[id]; let ok = true, why = '';
      const cost = this.costOf(sk);
      if (this.cds[id] > 0) { ok = false; why = `${this.cds[id]}턴`; }
      else if (this.p.en < cost) { ok = false; why = '에너지'; }
      else if (sk.hpCost && this.p.hp <= this.p.mhp * sk.hpCost) { ok = false; why = '체력'; }
      else if (sk.req && !sk.req(this)) { ok = false; why = sk.reqT || '조건'; }
      else if (!sk.basic && this.bfv(this.p, 'seal')) { ok = false; why = '봉인'; }
      else if (this.f && this.f.gim.sealed && this.f.gim.sealed[id]) { ok = false; why = '봉인'; }
      return { id, sk, ok, why, cost };
    });
  }
  /* choice: {k:'skill', id} | {k:'focus'} | {k:'item', id} | {k:'target', i} */
  act(choice) {
    this.ev = [];
    if (this.phase !== 'p') return this.ev;
    if (choice.k === 'target') { this.tgt = choice.i; this.emit('target', { i: choice.i }); return this.ev; }
    if (choice.k === 'item') {
      if (this.itemUsed >= 1 + (this.rel('belt') ? 1 : 0) || !(this.items[choice.id] > 0)) return this.ev;
      this.items[choice.id]--; this.itemUsed++;
      this.emit('item', { id: choice.id });
      ITEMS[choice.id].use(this);
      this.checkEnd();
      return this.ev;
    }
    if (choice.k === 'focus') this.doFocus();
    else {
      const u = this.usable().find(x => x.id === choice.id);
      if (!u || !u.ok) return this.ev;
      this.doSkill(choice.id);
    }
    if (!this.checkEnd()) this.endP();
    return this.ev;
  }
  doFocus() {
    const p = this.p;
    this.emit('act', { who: 'p', focus: 1, n: '집중', anim: 'focus', fx: 'focus' });
    this.energy(3 + (this.relHook('focusEn') || 0)); this.heal(p, p.mhp * 0.06); this.sp(10); this.bf(p, 'guard', 2, 1);
    this.lastSkill = 'focus';
    this.relHook('afterFocus');
  }
  doSkill(id) {
    const sk = SKILL[id], p = this.p, f = this.f;
    const rank = this.ranks[id] || 1;
    const c = { sk, src: p, tgt: f, hits: (sk.hits || []).slice(), mul: 1 + (rank - 1) * 0.1, critAdd: 0, type: sk.type, fx: sk.fx, anim: sk.anim, melee: sk.melee, total: 0, crits: 0, n: 0, stgMul: sk.stgMul || 1, results: [] };
    const cost = this.costOf(sk);
    this.p.en -= cost; if (cost) this.emit('energy', { d: -cost, v: this.p.en });
    if (sk.hpCost) this.trueDmg(p, p.mhp * sk.hpCost, 'blood');
    let cd = sk.cd + (this.hk('cdMod', sk) || 0);
    if (id === 'ck_rewind' && this.tal('ck_t2a')) cd -= 2;
    if (id === 'bw_vow' && this.tal('bw_t3b')) cd -= 2;
    if (id === 'gb_sleight' && this.tal('gb_t3a')) cd -= 1;
    if (id === 'po_jelly' && this.tal('po_t2b')) cd -= 1;
    if (this.clsId === 'ember' && this.tal('em_t3a') && this.r.heat >= 100) cd -= 1;
    if (cd > 0) this.cds[id] = cd;
    // 행동 시 출혈
    this.actTick(p);
    if (p.hp <= 0 && !this.cheatDeath()) return;
    this.hk('beforeSkill', c);
    if (sk.pre) sk.pre(this, c);
    if (id === 'gn_shot' && this.tal('gn_t1a') && !c.noAmmo) { c.hits = [c.hits[0] * 0.65, c.hits[0] * 0.65]; }
    this.emit('act', { who: 'p', id, n: sk.n, anim: c.anim, fx: c.fx, melee: !!c.melee && c.hits.length > 0, hits: c.hits.length, ult: !!sk.ult, type: c.type, spent: c.spent, heads: c.heads, flips: c.flips, great: c.great, jackpot: c.jackpot });
    this.stats.skills[id] = (this.stats.skills[id] || 0) + 1;
    // 타격
    let allHeads = true;
    for (let i = 0; i < c.hits.length; i++) {
      if (!this.f || this.f.hp <= 0) break;
      let pow = c.hits[i];
      const h = { i, n: c.hits.length };
      if (sk.coinEach || (sk.coinGate && i === 0)) { h.heads = this.flip(); if (!h.heads) allHeads = false; this.emit('coin', { heads: h.heads, i }); if (sk.coinGate && !h.heads) { if (sk.onTails) sk.onTails(this, c); c.miss = 1; break; } }
      c.bonus = 0; c.zero = 0;
      if (sk.hit) sk.hit(this, c, h, i);
      if (c.zero) { this.emit('miss', { who: 'p', i }); continue; }
      pow += c.bonus;
      const r = this.hitFoe(pow, c, h);
      if (sk.stEach && this.f.hp > 0) for (const k in sk.stEach) this.st(this.f, k, sk.stEach[k][0], sk.stEach[k][1]);
      c.results.push(r);
    }
    c.allHeads = sk.coinEach ? allHeads : false;
    this.hk('afterHits', c);
    if (!c.miss && this.f && this.f.hp > 0) {
      if (sk.st) for (const k in sk.st) this.st(this.f, k, sk.st[k][0], sk.st[k][1]);
      if (sk.bfT) for (const k in sk.bfT) this.bf(this.f, k, sk.bfT[k][0], sk.bfT[k][1]);
    }
    if (sk.self) for (const k in sk.self) this.st(p, k, sk.self[k][0], sk.self[k][1]);
    if (sk.bfS) for (const k in sk.bfS) this.bf(p, k, sk.bfS[k][0], sk.bfS[k][1]);
    if (sk.energy) this.energy(sk.energy);
    if (sk.post && !c.miss) sk.post(this, c);
    if (id === 'gb_sleight' && this.tal('gb_t3a')) this.r.rig = 3;
    if (id === 'po_jelly' && this.tal('po_t2b')) this.r.jelly = 4;
    if (id === 'ck_stop' && this.tal('ck_t3a')) this.energy(3);
    if (id === 'gn_ult' && this.tal('gn_t3b')) this.st(p, 'charge', 3, 2);
    this.hk('afterSkill', c);
    this.relHook('afterSkill', c);
    this.fg('afterPSkill', c);
    this.lastSkill = id;
    this.emit('actEnd', { who: 'p', id, total: Math.round(c.total), crits: c.crits });
  }
  /* 직업 반격·소환물 타격 (차례 밖의 공격) */
  counter(pow, type, fx, st) {
    if (!this.f || this.f.hp <= 0) return;
    const c = { sk: { id: fx, n: '' }, src: this.p, tgt: this.f, mul: 1, critAdd: 0, type, total: 0, crits: 0, stgMul: 1, counter: 1 };
    this.emit('counter', { fx, type });
    this.hitFoe(pow, c, { i: 0, n: 1 });
    if (st && this.f.hp > 0) for (const k in st) this.st(this.f, k, st[k][0], st[k][1]);
    this.checkFoeDown();
  }
  actTick(u) {
    const s = u.st.bleed; if (!s) return;
    const v = this.potV(u, s.p); s.c--; if (s.c <= 0) delete u.st.bleed;
    this.trueDmg(u, v, 'bleed');
  }
  /* 고정 피해 (방어·저항 무시, 보호막은 깎는다) */
  trueDmg(u, v, kind, c) {
    if (!u || u.hp <= 0) return 0;
    let d = Math.max(1, Math.round(v));
    if (u.side === 'f') d = Math.max(1, Math.round(d * (this.f.gapIn || 1)));
    if (u.side === 'f' && this.f.gim.dmgCap) d = Math.min(d, Math.round(this.f.mhp * this.f.gim.dmgCap));
    if (u.side === 'f' && this.f.gim.shell && kind !== 'reflect') d = Math.round(d * this.f.gim.shell);
    let ab = 0;
    if (u.sh > 0 && kind !== 'blood' && kind !== 'bleed') { ab = Math.min(u.sh, d); u.sh -= ab; d -= ab; }
    if (u.side === 'f' && this.tgt >= 0 && this.f.parts && this.f.parts[this.tgt] && this.f.parts[this.tgt].core) { this.partDmg(this.tgt, d); }
    else u.hp -= d;
    if (u.side === 'f') { this.stats.dealt += d; if (kind === 'burn') this.hk('foeBurn', d); }
    else this.stats.taken += d;
    this.emit('dot', { who: u.side, v: d, kind, ab });
    if (u.side === 'f') { this.fg('hurt', d, kind); this.checkPhase(); }
    else if (u.hp <= 0) this.cheatDeath();
    return d;
  }
  partDmg(i, d) {
    const q = this.f.parts[i]; if (!q || !q.alive) return;
    q.hp -= d;
    if (q.core) this.f.hp = this.f.parts.reduce((a, x) => a + Math.max(0, x.hp), 0);
    if (q.hp <= 0) { q.hp = 0; q.alive = false; this.emit('partBreak', { i, n: q.n }); this.log(`💥 ${q.n} 파괴!`, 'good'); this.fg('partBreak', i, q); if (this.tgt === i) { const nx = this.f.parts.findIndex(x => x.alive && (x.core || !this.f.parts.some(y => y.core))); this.tgt = nx >= 0 && this.f.parts[nx].core ? nx : -1; this.emit('target', { i: this.tgt }); } }
  }
  outMul(c) {
    let m = c.mul;
    const p = this.p;
    m *= 1 + 0.1 * (this.bfv(p, 'str') - this.bfv(p, 'weak'));
    m *= 1 + p.sp / 200;
    m *= this.hk('outMul', c) || 1;
    m *= 1 + (this.relHook('outMul', c) || 0);
    return m;
  }
  /* 플레이어 → 적 한 번의 타격 */
  hitFoe(pow, c, h) {
    const f = this.f, p = this.p;
    const part = this.tgt >= 0 && f.parts ? f.parts[this.tgt] : null;
    let m = this.outMul(c);
    const type = c.type || 'blunt';
    const res = part ? part.res[type] : this.resOf(type);
    m *= res;
    if (!c.ignoreGuard) m *= 1 + 0.1 * (this.bfv(f, 'vuln') - this.bfv(f, 'guard'));
    else m *= 1 + 0.1 * this.bfv(f, 'vuln');
    if (f.staggered) m *= 1.5;
    // 치명
    const poise = this.stp(p, 'poise');
    let cc = p.crit + poise * 5 + this.bfv(p, 'focus') * 5 + p.sp / 4 + (this.hk('critAdd') || 0) + c.critAdd + (this.relHook('critAdd', c) || 0);
    const crit = this.rng() * 100 < cc;
    if (crit) { m *= p.critDmg + (this.hk('critMul') || 0) + (this.relHook('critDmg') || 0); c.crits++; this.stats.crits++; if (poise && p.st.poise) { p.st.poise.c--; if (p.st.poise.c <= 0) delete p.st.poise; } this.hk('onCrit', c, poise > 0); }
    const defK = 1 / (1 + (f.def * (1 - (c.ignoreDef || 0))) / (4 * p.atk));
    let dmg = pow * p.atk / 10 * m * defK * (0.94 + this.rng() * 0.12);
    dmg *= f.gapIn || 1;
    if (f.gim.shell && !part) dmg *= f.gim.shell;
    if (f.gim.dmgCap) dmg = Math.min(dmg, f.mhp * f.gim.dmgCap);
    const gm = this.fg('inMul', c, type, part); if (gm != null) dmg *= gm;
    dmg = Math.max(1, Math.round(dmg));
    let ab = 0;
    if (!part && f.sh > 0) { ab = Math.min(f.sh, dmg); f.sh -= ab; }
    const real = dmg - ab;
    const extra = [];
    if (part && !part.core) { part.hp -= real; }
    else if (part && part.core) this.partDmg(this.tgt, real);
    else f.hp -= real;
    let broke = false;
    if (part && !part.core && part.hp <= 0 && part.alive) { part.hp = 0; part.alive = false; broke = true; }
    c.total += dmg; this.stats.dealt += real; if (dmg > this.stats.maxHit) this.stats.maxHit = dmg;
    // 파열·침잠
    if (!part || part.core) {
      if (f.st.rupture) { const s = f.st.rupture; const v = Math.round(this.potV(f, s.p) * 0.6 * (1 + (this.relHook('ruptureMul') || 0))); if (part) this.partDmg(this.tgt, v); else f.hp -= v; s.c--; if (s.c <= 0) delete f.st.rupture; extra.push(['rupture', v]); c.total += v; this.stats.dealt += v; }
      if (f.st.sinking) { const s = f.st.sinking; const v = Math.round(this.potV(f, s.p) * 0.45); if (part) this.partDmg(this.tgt, v); else f.hp -= v; s.c--; if (s.c <= 0) delete f.st.sinking; extra.push(['sinking', v]); c.total += v; this.stats.dealt += v; }
      // 흐트러짐
      if (!f.staggered && !f.gim.noStagger) { f.stg += real * (STG_K[type] || 0.5) * c.stgMul * (1 + (this.relHook('stgMul') || 0)); }
    }
    if (c.lifesteal) this.heal(p, real * c.lifesteal, 1);
    this.emit('hit', { who: 'p', tgt: part ? 'part' : 'f', part: part ? this.tgt : -1, dmg, ab, crit, type, i: h.i, n: h.n, res, extra, heads: h.heads, counter: !!c.counter });
    this.hk('onHit', c, { dmg: real, crit });
    this.relHook('onHit', c, { dmg: real, crit });
    this.fg('hurt', real, type, part, c);
    if (broke) { this.emit('partBreak', { i: this.tgt, n: part.n }); this.log(`💥 ${part.n} 파괴!`, 'good'); this.fg('partBreak', this.tgt, part); this.tgt = -1; this.emit('target', { i: -1 }); }
    this.checkStagger();
    this.checkPhase();
    return { dmg, crit };
  }
  resOf(type) { const f = this.f; const g = this.fg('res', type); return g != null ? g : f.res[type]; }
  burst(u, mult = 1, c) {
    const s = u.st.tremor; if (!s) return;
    const pot = s.p;
    const add = pot * 0.05 * u.stgMax * mult * (this.tal('bl_t2a') ? 1.5 : 1) * (1 + (this.relHook('burstMul') || 0));
    if (!u.staggered && !u.gim.noStagger) u.stg += add;
    const bd = this.hk('burstDmg', pot); const dmg = Math.round((bd != null ? bd : pot) * this.p.atk / 10);
    if (!this.tal('bl_t3b')) { s.c--; if (s.c <= 0) delete u.st.tremor; }
    this.emit('burst', { who: u.side, pot, stg: Math.round(add) });
    if (dmg > 0) this.trueDmg(u, dmg, 'tremor', c);
    this.checkStagger();
  }
  checkStagger() {
    const f = this.f; if (!f || f.hp <= 0 || f.staggered) return;
    if (f.stg >= f.stgMax) {
      f.staggered = 1; f.stg = f.stgMax; this.stats.staggers++;
      f.plan[0] = [{ id: '_stagger', ch: 0, pw: 0 }];
      this.emit('stagger', {}); this.log('💫 흐트러짐! 다음 행동을 잃고 받는 피해 +50%', 'good');
      this.fg('staggered');
      this.relHook('onStagger');
      this.emit('intent', { plan: this.intentInfo() });
    }
  }
  checkPhase() {
    const f = this.f; if (!f) return;
    const D = f.D;
    if (D.phases) for (let i = f.phaseN - 1; i < D.phases.length; i++) {
      const ph = D.phases[i];
      if (f.phaseN === i + 1 && f.hp > 0 && f.hp <= f.mhp * ph.hp) {
        f.phaseN = i + 2;
        if (ph.on) ph.on(this, f);
        this.emit('phase', { n: f.phaseN, txt: ph.txt || '' });
        if (ph.txt) this.log(ph.txt, 'warn');
        this.plan(true);
      }
    }
  }
  checkFoeDown() {
    const f = this.f; if (!f || f.hp > 0) return false;
    if (this.fg('beforeDeath')) { this.emit('intent', { plan: this.intentInfo() }); return false; }
    f.hp = 0; this.stats.kills++;
    this.emit('kill', { id: f.id, name: f.name, boss: f.boss });
    this.relHook('onKill');
    this.foeIdx++;
    if (this.foeIdx < this.foeQ.length) {
      this.p.st = Object.fromEntries(Object.entries(this.p.st).filter(([k]) => !ST[k].bad));
      this.enterFoe(this.foeQ[this.foeIdx]);
      return false;
    }
    this.finish(true);
    return true;
  }
  cheatDeath() {
    const p = this.p; if (p.hp > 0) return true;
    if (this.hk('death')) { this.emit('cheat', { kind: this.clsId }); return true; }
    if (this.rel('phoenix') && !this.r._phoenix) { this.r._phoenix = 1; p.hp = Math.round(p.mhp * 0.3); this.emit('cheat', { kind: 'phoenix' }); this.log('🔥 불사조 깃털이 타올라 되살아났다', 'good'); return true; }
    p.hp = 0; return false;
  }
  checkEnd() {
    if (this.result) return true;
    if (this.p.hp <= 0 && !this.cheatDeath()) { this.finish(false); return true; }
    if (this.f && this.f.hp <= 0) return this.checkFoeDown();
    return false;
  }
  finish(win, why) {
    if (this.result) return;
    this.result = { win, turns: this.turn, why: why || '' };
    this.phase = 'end';
    this.emit(win ? 'win' : 'lose', { why: why || '' });
  }
  endP() {
    const p = this.p;
    this.tickEnd(p);
    this.hk('turnEnd'); this.relHook('turnEnd');
    if (this.checkEnd()) return;
    this.phase = 'f'; this.fStep = 0; this.fStarted = false;
    this.emit('fturn', {});
  }
  tickEnd(u) {
    if (u.st.burn) { const s = u.st.burn; const v = this.potV(u, s.p); s.c--; if (s.c <= 0) delete u.st.burn; this.trueDmg(u, v, 'burn'); }
    for (const k of ['tremor', 'charge', 'poise']) if (u.st[k]) { u.st[k].c--; if (u.st[k].c <= 0) delete u.st[k]; }
    for (const k of Object.keys(u.bf)) { u.bf[k].t--; if (u.bf[k].t <= 0) delete u.bf[k]; }
    this.emit('tick', { who: u.side });
  }

  /* ---------- 적 차례 ---------- */
  /* 다음에 일어날 적 행동 (화면이 방어 입력을 받을지 정한다) */
  peek() {
    const f = this.f;
    if (this.phase !== 'f' || !f) return null;
    if (!this.fStarted) { if (f.frozen || f.staggered || this.bfv(f, 'stun')) return { kind: 'skip' }; }
    const acts = f.plan[0] || [];
    const a = acts[this.fStep];
    if (!a) return { kind: 'end' };
    if (a.id === '_stagger') return { kind: 'skip' };
    const s = this.fsk(a.id);
    if (a.ch > 1) return { kind: 'charge', n: s.n, left: a.ch - 1 };
    const hs = this.hitsOf(s), atk = hs.length;
    return { kind: atk ? 'attack' : 'util', n: this.skName(s), ub: !!s.ub || !!f.gim.ubAll, hits: atk, ult: !!s.ult, melee: !!s.melee, id: s.id };
  }
  step(def = 'none') {
    this.ev = [];
    const f = this.f;
    if (this.phase !== 'f' || !f) return this.ev;
    if (!this.fStarted) {
      this.fStarted = true;
      this.fg('turnStart');
      const rg = this.bfv(f, 'regen'); if (rg) this.heal(f, f.mhp * rg / 100, 1);
      if (f.frozen) { f.frozen = 0; this.log('⏸ 적의 시간이 멈췄다', 'good'); this.emit('skip', { who: 'f', why: 'frozen' }); this.endF({ tick: false, keep: true }); return this.ev; }
      if (f.staggered) { this.emit('skip', { who: 'f', why: 'stagger' }); this.endF(); return this.ev; }
      if (this.bfv(f, 'stun')) { this.log('적이 기절해 있다', 'good'); this.emit('skip', { who: 'f', why: 'stun' }); this.endF(); return this.ev; }
      if (this.checkEnd()) return this.ev;
    }
    const acts = f.plan[0] || [];
    const a = acts[this.fStep];
    if (!a) { this.endF(); return this.ev; }
    this.fStep++;
    if (a.ch > 1) { a.ch--; this.emit('charge', { n: this.fsk(a.id).n, left: a.ch }); this.log(`⚠ ${this.fsk(a.id).n} 준비 중… (${a.ch}턴 남음)`, 'warn'); f.plan.splice(1, 0, [a]); f.plan[0] = []; this.endF({ keep: true }); return this.ev; }
    this.foeAct(a, def);
    if (this.checkEnd()) return this.ev;
    if (this.fStep >= acts.length) this.endF();
    return this.ev;
  }
  foeAct(a, def) {
    const f = this.f, p = this.p, s = this.fsk(a.id);
    const hits = this.hitsOf(s);
    const c = { sk: s, pw: a.pw || 1, def, total: 0, landed: 0, blocked: def !== 'none', dodged: false, hits };
    this.emit('act', { who: 'f', id: s.id, n: this.skName(s), anim: s.anim || (s.melee ? 'battack' : 'bcast'), fx: (s.fxDyn ? s.fxDyn(this, f) : s.fx) || null, melee: !!s.melee && hits.length > 0, hits: hits.length, ult: !!s.ult, ub: !!s.ub, type: s.type, def });
    this.actTick(f);
    if (f.hp <= 0) { this.checkFoeDown(); return; }
    this.fg('beforeAct', s, c);
    if (s.run) s.run(this, f, c);
    if (hits.length) {
      if (this.hk('foeMiss')) { this.emit('miss', { who: 'f' }); this.log('🍀 불운! 적의 공격이 빗나갔다', 'good'); }
      else if (this.hk('redirect')) {
        this.emit('redirect', {}); this.log('🧵 꼭두각시 춤 — 적이 제 몸을 벤다', 'good');
        for (const pw of hits) { const d = this.calcFoeHit(pw * c.pw, s, 'none') * (this.tal('pp_t2b') ? 1.5 : 1); this.trueDmg(f, d, 'redirect'); if (f.hp <= 0) break; }
      } else {
        let d = s.ub || f.gim.ubAll ? 'none' : def;
        const hk = this.hk('defense', d, s); if (hk) d = hk;
        if (d === 'perfect') this.stats.perfect++; else if (d === 'block') this.stats.block++;
        c.def = d;
        let raw = 0;
        for (let i = 0; i < hits.length; i++) {
          if (p.hp <= 0) break;
          const r = this.hitPlayer(hits[i] * c.pw, s, d, i, hits.length);
          raw += r.raw; c.total += r.dmg; if (r.dmg > 0) c.landed++;
          if (s.stEach && d !== 'perfect') for (const k in s.stEach) this.st(p, k, s.stEach[k][0], s.stEach[k][1]);
        }
        if (d !== 'perfect' && p.hp > 0) {
          if (s.st) for (const k in s.st) this.st(p, k, s.st[k][0], s.st[k][1]);
          if (s.bfT) for (const k in s.bfT) this.bf(p, k, s.bfT[k][0], s.bfT[k][1]);
          if (s.sp) this.sp(s.sp);
        }
        this.hk('defended', d, s, raw);
        if (d === 'perfect') { this.sp(4); this.relHook('onPerfect'); this.fg('perfect', s); }
        if (d === 'block') this.relHook('onBlock');
      }
    }
    if (!hits.length) {
      if (s.st) for (const k in s.st) this.st(p, k, s.st[k][0], s.st[k][1]);
      if (s.bfT) for (const k in s.bfT) this.bf(p, k, s.bfT[k][0], s.bfT[k][1]);
      if (s.sp) this.sp(s.sp);
    }
    if (s.bfS) for (const k in s.bfS) this.bf(f, k, s.bfS[k][0], s.bfS[k][1]);
    if (s.selfSt) for (const k in s.selfSt) this.st(f, k, s.selfSt[k][0], s.selfSt[k][1]);
    if (s.heal) this.heal(f, f.mhp * s.heal);
    if (s.shield) this.shield(f, f.mhp * s.shield);
    if (s.post) s.post(this, f, c);
    this.emit('actEnd', { who: 'f', id: s.id, total: c.total });
    this.cheatDeath();
  }
  calcFoeHit(pow, s, d, est) {
    const f = this.f, p = this.p;
    let m = 1 + 0.1 * (this.bfv(f, 'str') - this.bfv(f, 'weak'));
    m *= 1 + 0.1 * (this.bfv(p, 'vuln') - this.bfv(p, 'guard'));
    m *= this.hk('foeOutMul') || 1;
    m *= 1 - (this.relHook('inRed', s) || 0);
    if (this.clsId === 'poet' && this.tal('po_t3a') && this.r.abyss) m *= 0.75;
    const gm = this.fg('outMul', s); if (gm != null) m *= gm;
    if (f.nm) m *= 1.05;
    m *= f.gapOut || 1;
    const defK = 1 / (1 + p.def / (4 * f.atk));
    let dmg = pow * f.atk / 10 * m * defK * (est ? 1 : (0.94 + this.rng() * 0.12));
    if (d === 'block') dmg *= 1 - (this.hk('blockRed') || 0.5) - (this.relHook('blockRed') || 0);
    if (d === 'perfect') dmg = 0;
    return Math.max(d === 'perfect' ? 0 : 1, dmg);
  }
  hitPlayer(pow, s, d, i, n) {
    const p = this.p;
    const raw = Math.round(this.calcFoeHit(pow, s, 'none'));
    let dmg = d === 'none' ? raw : Math.round(this.calcFoeHit(pow, s, d));
    let ab = 0;
    if (dmg > 0) {
      const ab0 = this.hk('absorb', dmg); if (ab0 != null) dmg = ab0;
      if (p.sh > 0) { ab = Math.min(p.sh, dmg); p.sh -= ab; dmg -= ab; }
      p.hp -= dmg; this.stats.taken += dmg;
    }
    const extra = [];
    if (dmg + ab > 0) {
      if (p.st.rupture) { const st = p.st.rupture; const rv = Math.round(this.potV(p, st.p)); p.hp -= rv; extra.push(['rupture', rv]); st.c--; if (st.c <= 0) delete p.st.rupture; }
      if (p.st.sinking) { const st = p.st.sinking; extra.push(['sinking', st.p]); st.c--; if (st.c <= 0) delete p.st.sinking; this.sp(-st.p); if (p.sp <= -45) p.hp -= Math.round(this.potV(p, st.p)); }
      if (this.bfv(p, 'thorns') && s.melee) this.trueDmg(this.f, this.bfv(p, 'thorns') * this.p.atk / 10, 'thorns');
    }
    this.emit('hit', { who: 'f', tgt: 'p', dmg, ab, raw, def: d, i, n, type: s.type, extra });
    this.hk('hurt', dmg, d, raw);
    this.relHook('hurt', dmg, d);
    if (dmg > p.mhp * 0.25) this.sp(-6);
    if (p.hp <= 0) this.cheatDeath();
    return { dmg, raw };
  }
  endF(o = {}) {
    const f = this.f; if (!f) return;
    const keepPlan = !!o.keep;
    if (f.staggered && o.tick !== false) { f.staggered = 0; f.stg = 0; f.stgMax = Math.round(f.stgMax * 1.3); this.emit('recover', {}); }
    if (o.tick !== false) this.tickEnd(f);
    this.fg('turnEnd');
    for (const k in f.cd) if (f.cd[k] > 0) f.cd[k]--;
    if (this.checkEnd()) return;
    if (!keepPlan) f.plan.shift();
    else if (!f.plan[0] || !f.plan[0].length) f.plan.shift();
    if (f.plan[0] && f.plan[0][0] && f.plan[0][0].id === '_stagger') f.plan.shift();
    this.plan(false);
    this.beginP();
  }
  /* 자동 전투: 직업별 판단 → 없으면 기본 판단 */
  autoChoice() {
    const us = this.usable(), ok = us.filter(u => u.ok), p = this.p, f = this.f;
    if (!ok.length) return { k: 'focus' };
    if (p.hp < p.mhp * 0.3 && this.items.potion > 0 && this.itemUsed === 0) return { k: 'item', id: 'potion' };
    if (p.sp <= -32 && !p.noPanic && this.items.tonic > 0 && this.itemUsed === 0) return { k: 'item', id: 'tonic' };
    if (f && f.parts) {
      const cores = f.parts.some(q => q.core);
      if (cores) { const cur = f.parts[this.tgt]; if (!cur || !cur.alive) { const i = f.parts.findIndex(q => q.alive); if (i >= 0 && i !== this.tgt) return { k: 'target', i }; } }
      else if (this.tgt === -1 && f.parts.some(q => q.alive) && !f.D.noPartAi) return { k: 'target', i: f.parts.findIndex(q => q.alive) };
    }
    const has = id => ok.find(u => u.id === id);
    const pick1 = this.cls.ai ? this.cls.ai(this, has, ok) : null;
    if (pick1 === 'focus') return { k: 'focus' };
    if (pick1 && has(pick1)) return { k: 'skill', id: pick1 };
    const ult = ok.find(u => u.sk.ult); if (ult) return { k: 'skill', id: ult.id };
    const atk = ok.filter(u => !u.sk.basic && u.sk.hits && u.sk.hits.length).sort((a, b) => b.cost - a.cost);
    if (atk.length) return { k: 'skill', id: atk[0].id };
    return { k: 'skill', id: (ok.find(u => u.sk.basic) || ok[0]).id };
  }
  /* 다음 적 행동이 얼마나 아플지 (최대 체력 비율) */
  threat() { const pl = this.f && this.f.plan[0]; if (!pl) return 0; let t = 0; for (const a of pl) { if (a.ch > 1 || a.id === '_stagger') continue; t += this.estFoe(this.fsk(a.id), a); } return t / this.p.mhp; }
  /* 자동 방어 판정 (빠른 반응 끔 · 시뮬레이션) */
  autoDef(q) {
    if (!q || q.ub) return 'none';
    const p = this.p; const w = this.qteWidth();
    const r = this.rng();
    const per = 0.06 + w * 0.3, blk = 0.3 + w;
    return r < per ? 'perfect' : r < per + blk ? 'block' : 'none';
  }
  qteWidth() {
    const p = this.p;
    let w = 0.16 + Math.min(0.12, p.spd / 400);
    if (this.bfv(p, 'haste')) w += 0.05; if (this.bfv(p, 'bind')) w -= 0.05; w -= this.stp(p, 'tremor') * 0.006;
    w *= 1 + (this.hk('qteBonus') || 0) + (this.tal('du_t1a') ? 0.25 : 0) + (this.tal('ck_t2b') ? 0.2 : 0) + (this.relHook('qte') || 0);
    return clamp(w, 0.06, 0.5);
  }
}
