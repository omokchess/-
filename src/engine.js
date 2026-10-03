'use strict';
/* ===== 잔향선 · 전투 엔진 =====
 * 합(코인 비교) · 정신력 · 흐트러짐 · 잠재 상태 · 공명 · 각인.
 * 엔진은 동기식으로 상태를 바꾸고, 각 사건을 스냅샷과 함께 ev 배열에 쌓는다.
 * UI는 ev를 재생하며 연출한다.
 */

let UID = 1;
const DECK = ['s1', 's1', 's1', 's2', 's2', 's3'];
const SLOT_OF = { s1: 1, s2: 2, s3: 3, def: 0 };

function skBase(s) { const m = s.m || 1; return s.base + (m >= 2 ? 1 : 0) + (m >= 4 ? 1 : 0); }
function skCp(s) { const m = s.m || 1; return s.cp + (m >= 3 ? 1 : 0); }
function skCoins(s, c) { return typeof s.coins === 'function' ? s.coins(c) : s.coins; }

function makeUnit(o) {
  return Object.assign({
    uid: UID++, alive: true, side: 'E', name: '?', lvl: 1, hp: 1, maxHp: 1, sp: 0, hasSP: true,
    spd: [3, 6], slots: 1, spdVals: [], th: [], thIdx: 0, stag: 0, panic: 0,
    st: {}, buf: {}, bufNext: {}, res: { slash: 1, pierce: 1, blunt: 1 }, emoRes: {},
    shields: [], guard: null, r: {}, hooks: [], core: true, sealed: {}, flags: {},
  }, o);
}

/* ---------- 아군 생성 ---------- */
function makeAlly(cid, prog, opt = {}) {
  const d = CHARS[cid];
  const lvl = prog.lvl || 1, asc = prog.asc || 0;
  const m = prog.m || [1, 1, 1, 1];
  const maxHp = Math.round(d.hp * G(lvl) * (1 + 0.05 * asc) * (opt.hpMul || 1));
  const sk = {};
  ['s1', 's2', 's3', 'def'].forEach((k, i) => { sk[k] = Object.assign({}, d.sk[k], { key: k, slot: SLOT_OF[k], m: m[i], owner: cid }); });
  const imps = [];
  (d.imps || []).forEach((im, i) => {
    if (!(prog.imp && prog.imp[i])) return;
    const cost = {};
    for (const [k, v] of Object.entries(im.cost)) cost[k] = asc >= 4 ? Math.max(1, v - 1) : v;
    imps.push(Object.assign({}, im, { key: 'i' + i, slot: 0, imp: true, cost, m: 1, owner: cid }));
  });
  const u = makeUnit({
    side: 'A', cid, name: d.name, cls: d.cls, lvl, asc, maxHp, hp: maxHp,
    spd: [d.spd[0], d.spd[1] + (asc >= 2 ? 1 : 0)], res: Object.assign({}, d.res), emoRes: {},
    th: [0.6, 0.3].map(f => Math.round(maxHp * f)), sk, imps, hand: [], pile: [], deck: DECK.slice(),
    flip: d.flip || 'sp', color: d.color,
  });
  if (opt.hpFrac != null) u.hp = Math.max(1, Math.round(maxHp * opt.hpFrac));
  u.thIdx = u.th.filter(v => v >= u.hp).length;
  if (d.init) d.init(u);
  if (d.passive) u.hooks.push(d.passive.h);
  if (d.tal) d.tal.forEach((t, i) => { if (asc >= (i === 0 ? 1 : 3) && t.h) u.hooks.push(t.h); });
  return u;
}

/* ---------- 적 생성 ---------- */
function makeEnemy(id, lvl, opt = {}) {
  const d = ENEMIES[id];
  if (!d) throw new Error('unknown enemy ' + id);
  const cat = d.boss || d.part ? 1 : d.elite ? 1.35 : 1.8;
  const maxHp = Math.round(d.hp * cat * G(lvl) * (opt.hpMul || 1));
  const u = makeUnit({
    side: 'E', eid: id, def: d, name: d.name, lvl, maxHp, hp: maxHp, hasSP: d.sp !== false,
    spd: d.spd.slice(), slots: d.slots != null ? d.slots : 1, res: Object.assign({ slash: 1, pierce: 1, blunt: 1 }, d.res),
    emoRes: Object.assign({}, d.emoRes), th: (d.th || [0.5]).map(f => Math.round(maxHp * f)),
    skills: d.skills.map(s => Object.assign({ m: 1 }, s)), core: d.core !== false, boss: !!d.boss, elite: !!d.elite,
    part: !!d.part, nightmare: !!opt.nightmare, color: d.color, dmgMul: d.boss || d.part ? 1 : d.elite ? 1.2 : 1.45 - 0.2 * clamp((lvl - 30) / 30, 0, 1),
  });
  if (opt.slots) u.slots += opt.slots;
  if (d.h) u.hooks.push(d.h);
  return u;
}

/* =========================================================== */
class Battle {
  constructor(cfg) {
    this.cfg = cfg;
    this.rng = cfg.rng || Math.random;
    this.allies = cfg.allies;
    this.enemies = [];
    this.waves = (cfg.waves || []).map(w => w.slice());
    this.turn = 0;
    this.ev = [];
    this.emo = {}; EMO_KEYS.forEach(k => { this.emo[k] = cfg.emoStart || 0; });
    this.vars = {};
    this.gauges = [];
    this.over = null;
    this.mods = cfg.mods || {};
    this.eActs = [];
    this.acts = [];
    this.hist = {};
    this.killed = [];
    this.stats = { clashWin: 0, clashLose: 0, maxHit: 0, dmgDealt: 0, dmgTaken: 0, kills: 0, maxClash: 0, imps: 0, infl: {}, staggers: 0, jackpots: 0, bursts: 0 };
    this.providers = [];
    for (const u of this.allies) this.attach(u);
    for (const r of (cfg.relics || [])) this.providers.push({ self: null, h: r.h || {}, relic: r });
    if (this.mods.allySp) for (const u of this.allies) u.sp = clamp(u.sp + this.mods.allySp, -45, 45);
    this.spawnWave();
    this.fire('battleStart', {});
  }

  /* ---------- 훅 ---------- */
  attach(u) { for (const h of u.hooks) this.providers.push({ self: u, h }); }
  detach(u) { this.providers = this.providers.filter(p => p.self !== u); }
  _each(name, ctx, fn) {
    for (const p of this.providers.slice()) {
      const f = p.h[name];
      if (!f) continue;
      if (p.self && !p.self.alive && !p.h.always) continue;
      fn(f.call(p.h, ctx, p.self, this));
    }
  }
  fireSum(name, ctx) { let s = 0; this._each(name, ctx, r => { if (typeof r === 'number') s += r; }); return s; }
  fireAny(name, ctx) { let a = false; this._each(name, ctx, r => { if (r === true) a = true; }); return a; }
  fire(name, ctx) { this._each(name, ctx, () => {}); }

  /* ---------- 유닛 목록 ---------- */
  units() { return this.allies.concat(this.enemies); }
  livingAllies() { return this.allies.filter(u => u.alive); }
  livingEnemies() { return this.enemies.filter(u => u.alive); }
  foesOf(u) { return u.side === 'A' ? this.livingEnemies() : this.livingAllies(); }
  friendsOf(u) { return u.side === 'A' ? this.livingAllies() : this.livingEnemies(); }
  byUid(uid) { return this.units().find(u => u.uid === uid); }
  canAct(u) { return u.alive && !u.stag && !(u.panic && u.panic <= this.turn) && !u.flags.frozen; }
  isPanicked(u) { return !!(u.panic && u.panic <= this.turn); }

  spawnWave() {
    const w = this.waves.shift();
    if (!w) return;
    for (const u of w) this.addEnemy(u);
  }
  addEnemy(u) {
    this.enemies.push(u);
    this.attach(u);
    if (u.def && u.def.init) u.def.init(u, this);
    if (this.mods.eHpMul && !u.flags.modded) {
      const mul = this.mods.eHpMul * ((u.elite || u.boss) ? 1 + (this.mods.eliteHp || 0) : 1);
      u.maxHp = Math.round(u.maxHp * mul); u.hp = u.maxHp; u.th = u.th.map(v => Math.round(v * mul));
    }
    u.flags.modded = true;
    if (this.mods.bossSlots && u.boss) u.slots += this.mods.bossSlots;
    return u;
  }
  spawn(id, lvl, opt) {
    const u = makeEnemy(id, lvl, opt);
    this.addEnemy(u);
    this.spdRoll(u);
    this.emit('spawn', { t: u.uid, text: `${u.name} 등장` });
    return u;
  }

  /* ---------- 이벤트 ---------- */
  snap() {
    const s = {};
    for (const u of this.units()) {
      s[u.uid] = {
        hp: u.hp, maxHp: u.maxHp, sp: u.sp, alive: u.alive, stag: u.stag, panic: u.panic,
        sh: u.shields.reduce((a, x) => a + x.amt, 0), st: JSON.parse(JSON.stringify(u.st)),
        buf: Object.assign({}, u.buf), r: Object.assign({}, u.r), th: u.th.slice(), thIdx: u.thIdx,
      };
    }
    return s;
  }
  emit(type, o = {}) { this.ev.push(Object.assign({ snap: this.snap(), gauges: JSON.parse(JSON.stringify(this.gauges)) }, o, { type })); }
  msg(text, cls = '') { this.emit('msg', { text, cls }); }

  setGauge(id, o) {
    let g = this.gauges.find(x => x.id === id);
    if (!g) { g = { id }; this.gauges.push(g); }
    Object.assign(g, o);
  }
  removeGauge(id) { this.gauges = this.gauges.filter(g => g.id !== id); }

  /* ---------- 상태 ---------- */
  inflict(src, t, key, p, c, s) {
    if (!t || !t.alive) return;
    if (s && s.m >= 5 && p > 0) p += 1;
    if (src && src.side === 'E' && this.mods.eInfl && t.side === 'A' && p > 0) p += this.mods.eInfl;
    const r = { src, t, key, p, c, s };
    this.fire('inflict', r);
    p = r.p; c = r.c;
    if (p <= 0 && c <= 0) return;
    const st = t.st[key] || (t.st[key] = { p: 0, c: 0, lv: 1 });
    st.p = Math.min(99, st.p + Math.max(0, p));
    st.c = Math.min(99, st.c + Math.max(0, c));
    if (key === 'thread') st.c = 1;
    if (st.c <= 0 && st.p > 0) st.c = 1;
    if (st.p <= 0 && st.c > 0) st.p = 1;
    st.lv = Math.max(st.lv, src ? src.lvl : 1);
    if (src && src.side === 'A') this.stats.infl[key] = (this.stats.infl[key] || 0) + Math.max(0, p);
    this.emit('st', { t: t.uid, k: key, p, c });
  }
  consume(t, key, n) {
    const st = t.st[key];
    if (!st) return 0;
    const had = st.p;
    if (n == null || n >= st.p) { delete t.st[key]; return had; }
    st.p -= n;
    return n;
  }
  pot(t, key) { return t.st[key] ? t.st[key].p : 0; }
  cnt(t, key) { return t.st[key] ? t.st[key].c : 0; }
  buff(t, key, x, now = false) {
    if (!t || !t.alive || !x) return;
    const o = now ? t.buf : t.bufNext;
    o[key] = (o[key] || 0) + x;
    if (now && key === 'haste') { /* 즉시 신속은 이번 턴 속도에 반영하지 않는다 */ }
    this.emit('buf', { t: t.uid, k: key, x, now });
  }
  addShield(t, amt, until) {
    if (!t.alive || amt <= 0) return;
    t.shields.push({ amt: Math.round(amt), until: until == null ? this.turn : until });
    this.emit('shield', { t: t.uid, d: Math.round(amt) });
  }
  heal(t, amt) {
    if (!t.alive || amt <= 0) return 0;
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + Math.round(amt));
    const d = t.hp - before;
    if (d > 0) this.emit('heal', { t: t.uid, d });
    return d;
  }
  addSp(t, d, quiet) {
    if (!t.alive || !t.hasSP || !d) return;
    const r = { u: t, d };
    this.fire('spChange', r);
    d = r.d;
    if (!d) return;
    const before = t.sp;
    t.sp = clamp(t.sp + d, -45, 45);
    if (t.sp !== before && !quiet) this.emit('sp', { t: t.uid, d: t.sp - before });
  }
  statusDmg(u, key, mul = 1) {
    const st = u.st[key];
    if (!st || !u.alive) return 0;
    const r = { u, key, dmg: Math.max(1, Math.round(st.p * G(st.lv) * mul)) };
    this.fire('statusDmgMod', r);
    st.c--;
    if (st.c <= 0) delete u.st[key];
    const d = this.damage(u, r.dmg, { kind: key });
    this.emit('dot', { t: u.uid, k: key, d });
    this.fire('statusDmg', { u, key, dmg: d });
    return d;
  }
  tremorBurst(src, t) {
    const st = t.st.tremor;
    if (!st || !t.alive) return;
    const p = st.p;
    st.c--;
    if (st.c <= 0) delete t.st.tremor;
    this.stats.bursts++;
    if (t.thIdx < t.th.length) {
      t.th[t.thIdx] += Math.round(t.maxHp * p / 100);
      this.emit('burst', { t: t.uid, p });
      this.checkStagger(t);
    } else {
      const d = this.damage(t, Math.round(p * G(st.lv) * 0.6), { kind: 'tremor' });
      this.emit('burst', { t: t.uid, p, d });
    }
    this.fire('burst', { src, t });
  }

  /* ---------- 피해 · 사망 · 흐트러짐 ---------- */
  damage(t, dmg, info = {}) {
    if (!t.alive || dmg <= 0) return 0;
    const r = { t, dmg: Math.round(dmg), src: info.src, kind: info.kind || 'hit', info };
    if (!info.noShare) this.fire('preDamage', r);
    dmg = Math.max(0, Math.round(r.dmg));
    if (dmg <= 0) return 0;
    t.hp -= dmg;
    if (t.side === 'A') this.stats.dmgTaken += dmg;
    else this.stats.dmgDealt += dmg;
    if (t.hp <= 0) {
      t.hp = 0;
      const saved = this.fireAny('death', { u: t, src: info.src });
      if (saved && t.hp > 0) { this.checkStagger(t); return dmg; }
      this.kill(t, info.src);
      return dmg;
    }
    if (!info.noStag) this.checkStagger(t);
    return dmg;
  }
  kill(t, src) {
    t.hp = 0;
    t.alive = false;
    t.shields = [];
    for (const a of this.acts) if (a.u === t) { a.done = true; a.spent = true; }
    this.emit('die', { t: t.uid });
    if (t.side === 'E') {
      this.stats.kills++;
      this.killed.push(t);
      if (src && src.side === 'A') this.addSp(src, 10);
      for (const a of this.livingAllies()) if (a !== src) this.addSp(a, 3, true);
    } else {
      for (const a of this.livingAllies()) this.addSp(a, -10);
      for (const e of this.livingEnemies()) this.addSp(e, 5, true);
    }
    this.fire('kill', { u: t, src });
    this.checkOver();
  }
  checkStagger(t) {
    if (!t.alive) return;
    let hit = false;
    while (t.thIdx < t.th.length && t.hp <= t.th[t.thIdx]) { t.thIdx++; hit = true; }
    if (hit && !t.stag) this.stagger(t);
  }
  stagger(t) {
    if (!t.alive || t.flags.noStagger) return;
    t.stag = this.turn + 1;
    t.guard = null;
    for (const a of this.acts) if (a.u === t && !a.done) { a.done = true; a.spent = true; }
    if (t.side === 'E') this.stats.staggers++;
    this.emit('stag', { t: t.uid });
    this.fire('stagger', { u: t });
  }
  waveCleared() {
    const cores = this.enemies.filter(u => u.core);
    return cores.length ? !cores.some(u => u.alive) : !this.enemies.some(u => u.alive);
  }
  checkOver() {
    if (this.over) return this.over;
    if (!this.livingAllies().length) { this.over = 'lose'; return this.over; }
    const cores = this.enemies.filter(u => u.core);
    const alive = cores.length ? cores.some(u => u.alive) : this.enemies.some(u => u.alive);
    if (!alive && !this.waves.length) this.over = 'win';
    return this.over;
  }

  /* ---------- 턴 시작 ---------- */
  spdRoll(u) {
    u.spdVals = [];
    for (let i = 0; i < u.slots; i++) {
      let v = ri(u.spd[0], u.spd[1], this.rng) + (u.buf.haste || 0) - (u.buf.bind || 0);
      if (u.side === 'E' && this.mods.eSpd) v += this.mods.eSpd;
      u.spdVals.push(Math.max(1, v));
    }
    if (u.side === 'E') u.spdVals.sort((a, b) => b - a);
  }
  startTurn() {
    this.turn++;
    this.ev = [];
    this.acts = [];
    for (const u of this.units()) {
      if (!u.alive) continue;
      u.buf = u.bufNext; u.bufNext = {};
      u.shields = u.shields.filter(s => s.until >= this.turn && s.amt > 0);
      u.guard = null; u.plan = null; u.sealed = {}; u.flags.frozen = false;
      this.hist[u.uid] = this.hist[u.uid] || [];
      this.hist[u.uid].push({ turn: this.turn, hp: u.hp, sp: u.sp });
      if (this.hist[u.uid].length > 3) this.hist[u.uid].shift();
    }
    for (const u of this.units()) if (u.alive) this.spdRoll(u);
    this.emit('turn', { n: this.turn });
    this.fire('turnStart', {});
    this.drawHands();
    this.planEnemies();
    this.fire('afterPlan', {});
    return this.ev;
  }
  drawHands() {
    for (const u of this.livingAllies()) {
      while (u.hand.length < 2) {
        if (!u.pile.length) u.pile = shuffle(u.deck.slice(), this.rng);
        u.hand.push(u.pile.pop());
      }
    }
  }
  pickAllyTarget(u, s) {
    const al = this.livingAllies().filter(a => !a.flags.untargetable);
    if (!al.length) return this.livingAllies()[0] || null;
    const taunt = al.filter(a => a.flags.taunt);
    if (taunt.length && this.rng() < 0.6) return pick(taunt, this.rng);
    if (this.rng() < 0.3) return al.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    return pick(al, this.rng);
  }
  defaultPlan(u) {
    const out = [];
    const pool = u.skills.filter(s => !s.cond || s.cond(u, this));
    if (!pool.length) return out;
    for (let i = 0; i < u.slots; i++) {
      const s = wpick(pool, x => x.w || 1, this.rng);
      out.push({ s, t: s.kind === 'atk' ? this.pickAllyTarget(u, s) : null });
    }
    return out;
  }
  planEnemies() {
    this.eActs = [];
    for (const u of this.livingEnemies()) {
      if (!this.canAct(u) || u.slots <= 0) continue;
      const plan = (u.def && u.def.plan) ? u.def.plan(u, this) : this.defaultPlan(u);
      const skip = u.flags.skip || 0; u.flags.skip = 0;
      if (skip) this.msg(`${u.name}의 행동 ${Math.min(skip, plan.length)}개가 봉쇄되었다.`);
      plan.slice(0, Math.max(0, u.spdVals.length - skip)).forEach((p, i) => {
        if (!p || !p.s) return;
        const a = this.mkAct(u, p.s, i);
        a.target = p.t || (p.s.kind === 'atk' ? this.pickAllyTarget(u, p.s) : null);
        if (p.s.kind === 'atk' && !a.target) return;
        this.eActs.push(a);
      });
    }
    this.eActs.forEach((a, i) => { a.id = 'e' + i; });
  }
  mkAct(u, s, slot) {
    return { id: '', u, s, slot, side: u.side, spd: u.spdVals[slot] || u.spdVals[0] || 1, target: null, tAct: null, clash: null, done: false, used: false, spent: false, v: {}, reso: 0, coinList: null };
  }

  /* ---------- 아군 선택지 ---------- */
  allyOptions(u) {
    const out = [];
    u.hand.forEach((k, i) => out.push({ opt: 'h' + i, s: u.sk[k], src: 'hand', sealed: !!u.sealed[k] }));
    out.push({ opt: 'def', s: u.sk.def, src: 'def', sealed: !!u.sealed.def });
    u.imps.forEach((s, i) => out.push({ opt: 'i' + i, s, src: 'imp', sealed: false }));
    return out;
  }
  optSkill(u, opt) {
    if (!opt) return null;
    if (opt === 'def') return u.sk.def;
    if (opt[0] === 'h') return u.sk[u.hand[+opt.slice(1)]];
    if (opt[0] === 'i') return u.imps[+opt.slice(1)];
    return null;
  }
  impBudget(exceptU) {
    const left = Object.assign({}, this.emo);
    for (const u of this.livingAllies()) {
      if (u === exceptU || !u.plan) continue;
      const s = this.optSkill(u, u.plan.opt);
      if (s && s.imp) for (const [k, v] of Object.entries(s.cost)) left[k] -= v;
    }
    return left;
  }
  canAfford(u, s) {
    if (!s.imp) return true;
    const left = this.impBudget(u);
    return Object.entries(s.cost).every(([k, v]) => left[k] >= v);
  }
  setPlan(u, opt, tUid, tActId) {
    u.plan = { opt, tUid: tUid || null, tAct: tActId || null };
  }

  /* 공명: 같은 감정의 기술 수 */
  resonance() {
    const cnt = {};
    for (const u of this.livingAllies()) {
      if (!u.plan || !this.canAct(u)) continue;
      const s = this.optSkill(u, u.plan.opt);
      if (s) cnt[s.emo] = (cnt[s.emo] || 0) + 1;
    }
    return cnt;
  }
  resoBonus(cnt, emo) { const k = cnt[emo] || 0; return k >= 2 ? Math.min(3 + (this.mods.resoMax || 0), k - 1) : 0; }

  /* ---------- 위력 계산 ---------- */
  headsChance(u) {
    let ch;
    if (!u.hasSP) ch = 0.5;
    else if (u.flip === 'abs') ch = 0.5 + Math.abs(u.sp) / 100;
    else if (u.flip === 'fixed') ch = 0.5;
    else ch = 0.5 + u.sp / 100;
    ch += this.fireSum('heads', { u }) / 100;
    return clamp(ch, 0, 1);
  }
  basePower(a, opp) {
    const u = a.u, s = a.s;
    let p = skBase(s) + a.reso + (u.buf.pwrUp || 0) - (u.buf.pwrDown || 0);
    const c = { b: this, u, act: a, s, t: a.target, opp: opp ? opp.u : null };
    if (s.pow) p += s.pow(c);
    if (opp) {
      const d = u.lvl - opp.u.lvl;
      if (d > 0) p += Math.min(3, Math.floor(d / 6));
      p += this.fireSum('clashPower', c);
    }
    p += this.fireSum('basePower', c);
    if (u.side === 'E') p += (this.mods.ePow || 0) + (u.nightmare && (u.boss || u.elite) ? 1 : 0) + (u.boss || u.part ? 0 : 1 + Math.floor(u.lvl / 20));
    if (a.v.corrupt) p += 2;
    return p;
  }
  coinPower(a) {
    const u = a.u, s = a.s;
    let cp = skCp(s) + (u.buf.cpUp || 0) - (u.buf.cpDown || 0);
    cp += this.fireSum('coinPower', { b: this, u, act: a, s });
    if (s.cpf) cp += s.cpf({ b: this, u, act: a, s });
    if (u.side === 'E') cp += (this.mods.eCp || 0) + (u.boss ? 0 : Math.floor(u.lvl / 50));
    return Math.max(0, cp);
  }
  flip(a, i) {
    if (a.v.jackpot || a.v.allHeads) return true;
    if (a.v.forceN && i != null && i < a.v.forceN) return true;
    return this.rng() < this.headsChance(a.u);
  }
  buildCoins(a) {
    if (a.coinList) return a.coinList;
    const n = Math.max(1, skCoins(a.s, { b: this, u: a.u, act: a, s: a.s }));
    const par = Math.min(n, a.u.buf.paralyze || 0);
    a.coinList = [];
    for (let i = 0; i < n; i++) {
      const ub = a.s.unbreak === true || (Array.isArray(a.s.unbreak) && a.s.unbreak.includes(i)) || !!a.v.unbreak;
      a.coinList.push({ i, ub, par: i < par });
    }
    return a.coinList;
  }
  roll(a, coins, opp) {
    let p = this.basePower(a, opp);
    const cp = this.coinPower(a);
    const f = [];
    for (const c of coins) {
      const h = this.flip(a, c.i);
      f.push(h ? 1 : 0);
      if (h && !c.par) p += (a.s.neg ? -cp : cp) * (a.v.jackpot ? 2 : 1);
    }
    return { p: Math.max(0, p), f };
  }

  /* 합 승률 미리보기 (부작용 없음) */
  estimate(a, o, trials = 300) {
    const saveRng = this.rng;
    const A = Object.assign({}, a, { v: Object.assign({}, a.v), coinList: null });
    const O = Object.assign({}, o, { v: Object.assign({}, o.v), coinList: null });
    const ca0 = this.buildCoins(A).length, co0 = this.buildCoins(O).length;
    let win = 0, pa = 0, po = 0;
    const bpA = this.basePower(A, O), bpO = this.basePower(O, A);
    const cpA = this.coinPower(A), cpO = this.coinPower(O);
    const hA = A.v.jackpot ? 1 : this.headsChance(A.u), hO = this.headsChance(O.u);
    for (let t = 0; t < trials; t++) {
      let na = ca0, no = co0, n = 0, ties = 0;
      while (na > 0 && no > 0 && n < 30) {
        let x = bpA, y = bpO;
        for (let i = 0; i < na; i++) if (Math.random() < hA) x += (A.s.neg ? -cpA : cpA) * (A.v.jackpot ? 2 : 1);
        for (let i = 0; i < no; i++) if (Math.random() < hO) y += O.s.neg ? -cpO : cpO;
        x = Math.max(0, x); y = Math.max(0, y);
        if (n === 0) { pa += x; po += y; }
        n++;
        if (x > y) { no--; ties = 0; } else if (y > x) { na--; ties = 0; } else if (++ties >= 3) { na--; no--; ties = 0; }
      }
      if (na > 0 && no === 0) win++;
    }
    this.rng = saveRng;
    const lo = p => p;
    return {
      win: win / trials,
      aMin: lo(Math.max(0, bpA + (A.s.neg ? -cpA * ca0 : 0))), aMax: Math.max(0, bpA + (A.s.neg ? 0 : cpA * ca0 * (A.v.jackpot ? 2 : 1))),
      oMin: Math.max(0, bpO + (O.s.neg ? -cpO * co0 : 0)), oMax: Math.max(0, bpO + (O.s.neg ? 0 : cpO * co0)),
      aAvg: pa / trials, oAvg: po / trials,
    };
  }

  /* 플랜 미리보기용 가상 행동 */
  previewAct(u) {
    if (!u.plan) return null;
    const s = this.optSkill(u, u.plan.opt);
    if (!s) return null;
    const a = this.mkAct(u, s, 0);
    a.reso = this.resoBonus(this.resonance(), s.emo);
    a.target = u.plan.tUid ? this.byUid(u.plan.tUid) : null;
    a.tAct = u.plan.tAct ? this.eActs.find(e => e.id === u.plan.tAct) : null;
    if (u.cid === 'roa' && u.r.fortune >= 7) a.v.jackpot = true;
    return a;
  }
  /* 아군 u의 현재 계획이 합이 되는지 */
  clashInfo(u) {
    const a = this.previewAct(u);
    if (!a || a.s.kind !== 'atk' || !a.tAct) return null;
    const e = a.tAct;
    if (e.s.kind !== 'atk' || e.noClash || e.s.unclashable) return { clash: false, reason: e.s.kind !== 'atk' ? '방어 행동' : '합 불가' };
    // 다른 아군이 이미 더 빠르게 이 행동과 합을 잡았는지
    const rivals = this.livingAllies().filter(x => x !== u && x.plan && x.plan.tAct === e.id && this.canAct(x));
    for (const r of rivals) {
      const rs = this.optSkill(r, r.plan.opt);
      if (rs && rs.kind === 'atk' && (r.spdVals[0] > u.spdVals[0])) {
        if (e.target === r || r.spdVals[0] > e.spd) return { clash: false, reason: `${r.name}이(가) 먼저 합` };
      }
    }
    if (e.target === u || u.spdVals[0] > e.spd) {
      const est = this.estimate(a, e);
      return { clash: true, redirect: e.target !== u, est };
    }
    return { clash: false, reason: '속도 부족 (일방 공격)' };
  }

  /* =========================================================== */
  /*                        전투 진행                              */
  /* =========================================================== */
  resolve() {
    this.ev = [];
    const allyActs = [];
    const cnt = this.resonance();
    // 각인 비용 지불 & 아군 행동 구성
    for (const u of this.livingAllies()) {
      const charmed = u.flags.charmed && u.flags.charmed >= this.turn;
      if (!this.canAct(u)) { u.plan = null; continue; }
      if (charmed) {
        const s = u.sk.s1;
        const a = this.mkAct(u, s, 0);
        const others = this.livingAllies().filter(x => x !== u);
        a.target = others.length ? pick(others, this.rng) : u;
        a.charmed = true;
        allyActs.push(a);
        continue;
      }
      if (!u.plan) continue;
      const s = this.optSkill(u, u.plan.opt);
      if (!s || (s.imp && !Object.entries(s.cost).every(([k, v]) => this.emo[k] >= v))) { u.plan = null; continue; }
      const a = this.mkAct(u, s, 0);
      a.reso = this.resoBonus(cnt, s.emo);
      a.opt = u.plan.opt;
      if (s.kind === 'atk') {
        a.tAct = u.plan.tAct ? this.eActs.find(e => e.id === u.plan.tAct) || null : null;
        a.target = u.plan.tUid ? this.byUid(u.plan.tUid) : (a.tAct ? a.tAct.u : null);
        if (a.tAct && a.target !== a.tAct.u) a.tAct = null;
      }
      if (s.imp) {
        for (const [k, v] of Object.entries(s.cost)) this.emo[k] -= v;
        this.stats.imps++;
        this.addSp(u, -(s.spc || 0));
        if (u.sp <= -20 && this.rng() < 0.35) {
          a.v.corrupt = true;
          const pool = this.units().filter(x => x.alive && x !== u);
          a.target = pick(pool, this.rng); a.tAct = null;
          this.msg(`${u.name}의 각인이 잠식되었다! 폭주하여 무작위 대상을 공격한다.`, 'warn');
        } else this.emit('imp', { u: u.uid, s: s.name });
      }
      allyActs.push(a);
    }
    // 감정 자원 획득
    for (const [k, n] of Object.entries(cnt)) this.emo[k] = Math.min(99, this.emo[k] + n + Math.max(0, n - 1));
    const resoList = Object.entries(cnt).filter(([, n]) => n >= 2);
    if (resoList.length) this.emit('reso', { list: resoList });

    const eActs = this.eActs.filter(a => a.u.alive && this.canAct(a.u));
    this.acts = allyActs.concat(eActs);
    for (const a of this.acts) {
      if (a.s.kind === 'guard') a.u.guard = { act: a, rolled: false };
    }
    // 전투 시작 효과
    for (const a of this.acts.slice().sort((x, y) => y.spd - x.spd)) {
      if (a.done || !a.u.alive) continue;
      if (a.s.start) a.s.start(this.ctx(a));
    }
    this.fire('combatStart', { acts: this.acts });

    // 합 결정
    const atkAllies = allyActs.filter(a => a.s.kind === 'atk' && a.tAct && !a.v.corrupt && !a.charmed).sort((x, y) => y.spd - x.spd);
    for (const a of atkAllies) {
      const e = a.tAct;
      if (!e || e.done || e.clash || e.noClash || e.s.unclashable || !e.u.alive || e.s.kind !== 'atk') continue;
      if (e.target === a.u || (a.spd > e.spd && !e.noRedirect)) {
        if (e.target !== a.u) this.emit('redirect', { u: a.u.uid, e: e.u.uid });
        e.target = a.u; a.clash = e; e.clash = a;
      }
    }

    // 속도 순 실행
    const order = this.acts.slice().sort((x, y) => (y.spd - x.spd) || (x.side === 'A' ? -1 : 1));
    for (const a of order) {
      if (this.over) break;
      if (a.done || a.s.kind !== 'atk') continue;
      if (!this.canAct(a.u)) { a.done = true; continue; }
      const o = a.clash;
      if (o && !o.done && o.u.alive && this.canAct(o.u)) this.doClash(a, o, false);
      else { a.clash = null; this.doOneSided(a); }
    }
    // 사용한 패 버리기
    for (const u of this.allies) {
      if (u.plan && u.plan.opt && u.plan.opt[0] === 'h') {
        const i = +u.plan.opt.slice(1);
        u.hand.splice(i, 1);
      }
      u.plan = null;
    }
    if (!this.over) this.endTurn();
    else this.emit('end', { result: this.over });
    return this.ev;
  }

  ctx(a, extra) { return Object.assign({ b: this, u: a.u, act: a, s: a.s, t: a.target, m: a.s.m || 1 }, extra); }

  useSkill(a) {
    if (a.used) return;
    a.used = true;
    if (a.u.cid === 'roa' && a.u.r.fortune >= 7 && a.side === 'A') {
      a.v.jackpot = true; a.u.r.fortune = 0; this.stats.jackpots++;
      this.msg('잭팟! 로아의 모든 코인이 앞면, 코인 위력 2배.', 'gold');
    }
    if (a.s.use) a.s.use(this.ctx(a));
    this.fire('skillUse', { u: a.u, act: a, s: a.s, t: a.target });
    this.buildCoins(a);
    if (a.u.buf.paralyze) a.u.buf.paralyze = Math.max(0, a.u.buf.paralyze - a.coinList.filter(c => c.par).length);
  }

  retarget(a) {
    const foes = a.charmed ? this.livingAllies().filter(x => x !== a.u) : this.foesOf(a.u);
    if (a.v.corrupt) { const pool = this.units().filter(x => x.alive && x !== a.u); return pool.length ? pick(pool, this.rng) : null; }
    if (!foes.length) return null;
    if (a.side === 'E') return this.pickAllyTarget(a.u, a.s);
    return pick(foes, this.rng);
  }
  targetsOf(a) {
    const main = a.target;
    const list = [main];
    let n = a.s.tgt || 1;
    if (a.u.r && a.u.r.abyss && a.u.r.abyss >= this.turn) n = 'all';
    if (a.v.corrupt || a.charmed) n = 1;
    const foes = main.side === 'A' ? this.livingAllies() : this.livingEnemies();
    if (n === 'all') { for (const f of foes) if (f !== main) list.push(f); }
    else if (n > 1) {
      const others = shuffle(foes.filter(f => f !== main), this.rng);
      list.push(...others.slice(0, n - 1));
    }
    return list.filter(x => x && x.alive);
  }
  findReaction(t, a) {
    if (a.s.unclashable || a.v.corrupt || a.charmed) return null;
    return this.acts.find(r => r.u === t && (r.s.kind === 'evade' || r.s.kind === 'counter') && !r.spent && this.canAct(t)) || null;
  }

  doOneSided(a) {
    let t = a.target;
    if (!t || !t.alive) t = a.target = this.retarget(a);
    a.done = true;
    if (!t) return;
    this.useSkill(a);
    const react = t.side !== a.u.side ? this.findReaction(t, a) : null;
    if (react) { this.doClash(a, react, true); return; }
    this.doAttack(a, a.coinList, 0);
  }

  doClash(a, o, reaction) {
    this.useSkill(a);
    if (!o.used) { o.used = true; if (o.s.use) o.s.use(this.ctx(o)); this.fire('skillUse', { u: o.u, act: o, s: o.s, t: a.u }); o.coinList = null; this.buildCoins(o); }
    a.done = true;
    if (!reaction) o.done = true;
    const ca = a.coinList, co = o.coinList.slice();
    const brokenA = [], brokenO = [];
    this.emit('clash', { a: a.u.uid, o: o.u.uid, as: a.s.name, os: o.s.name, ak: a.s.kind, ok: o.s.kind, ae: a.s.emo, oe: o.s.emo });
    let n = 0, ties = 0;
    let rerollA = false, rerollO = false;
    while (ca.length && co.length && n < 40) {
      let ra = this.roll(a, ca, o), ro = this.roll(o, co, a);
      if (ra.p < ro.p && !rerollA && this.fireAny('reroll', { act: a, my: ra, opp: ro })) { rerollA = true; ra = this.roll(a, ca, o); this.msg(`${a.u.name}: 속임수! 코인을 다시 던진다.`, 'gold'); }
      if (ro.p < ra.p && !rerollO && this.fireAny('reroll', { act: o, my: ro, opp: ra })) { rerollO = true; ro = this.roll(o, co, a); this.msg(`${o.u.name}: 속임수! 코인을 다시 던진다.`, 'gold'); }
      n++;
      const w = ra.p > ro.p ? 'a' : ro.p > ra.p ? 'o' : 't';
      this.emit('round', { a: ra, o: ro, w, ac: ca.length, oc: co.length });
      if (w === 'a') { const c = co.shift(); if (c.ub) brokenO.push(c); ties = 0; if (o.u.cid === 'roa') o.u.r.fortune = Math.min(7, (o.u.r.fortune || 0) + 1); }
      else if (w === 'o') { const c = ca.shift(); if (c.ub) brokenA.push(c); ties = 0; if (a.u.cid === 'roa') a.u.r.fortune = Math.min(7, (a.u.r.fortune || 0) + 1); }
      else if (++ties >= 3) { const c1 = ca.shift(), c2 = co.shift(); if (c1.ub) brokenA.push(c1); if (c2.ub) brokenO.push(c2); ties = 0; }
    }
    if (!reaction) o.coinList = co;
    let W = null, L = null;
    if (ca.length && !co.length) { W = a; L = o; }
    else if (co.length && !ca.length) { W = o; L = a; }
    this.stats.maxClash = Math.max(this.stats.maxClash, n);
    this.emit('clashEnd', { w: W ? W.u.uid : null, l: L ? L.u.uid : null, n });
    if (W) {
      if (W.side === 'A') this.stats.clashWin++; else this.stats.clashLose++;
      this.addSp(W.u, 6 + 2 * Math.min(n, 5));
      this.addSp(L.u, -4);
      if (W.side === 'A') { this.emo[W.s.emo] = Math.min(99, this.emo[W.s.emo] + 1); }
      if (W.s.win) W.s.win(this.ctx(W, { t: L.u, n }));
      if (L.s.lose) L.s.lose(this.ctx(L, { t: W.u, n }));
      this.fire('clashEnd', { w: W.u, l: L.u, wa: W, la: L, n });
    }
    // 결과
    if (reaction) {
      if (W === o) {
        if (o.s.kind === 'evade') {
          this.emit('evade', { t: o.u.uid });
          this.addSp(o.u, 3);
          // 회피는 계속 유지된다
        } else {
          o.spent = true; o.done = true;
          o.target = a.u;
          this.doAttack(o, co, n);
        }
        if (brokenA.length && a.u.alive && this.canAct(a.u)) this.doAttack(a, brokenA, 0);
      } else {
        o.spent = true; o.done = true;
        if (W === a) this.doAttack(a, ca, n);
        else if (brokenA.length) this.doAttack(a, brokenA, 0);
        if (brokenO.length && o.s.kind === 'counter' && o.u.alive && this.canAct(o.u)) { o.target = a.u; this.doAttack(o, brokenO, 0); }
      }
      return;
    }
    if (W) {
      W.target = L.u;
      this.doAttack(W, W === a ? ca : co, n);
      const broken = L === a ? brokenA : brokenO;
      if (broken.length && L.u.alive && this.canAct(L.u) && !this.over) { L.target = W.u; this.doAttack(L, broken, 0); }
    } else {
      if (brokenA.length && a.u.alive) this.doAttack(a, brokenA, 0);
      if (brokenO.length && o.u.alive) this.doAttack(o, brokenO, 0);
    }
  }

  doAttack(a, coins, n) {
    const u = a.u, s = a.s;
    if (!coins || !coins.length || !u.alive || this.over) return;
    let t = a.target;
    if (!t || !t.alive) { t = a.target = this.retarget(a); if (!t) return; }
    let targets = this.targetsOf(a);
    if (!targets.length) return;
    this.emit('atk', { u: u.uid, s: s.name, t: targets.map(x => x.uid), e: s.emo, dt: s.dt });
    let p = this.basePower(a, null);
    const cp = this.coinPower(a);
    const total = coins.length;
    for (let i = 0; i < total; i++) {
      if (!u.alive || this.over) break;
      targets = targets.filter(x => x.alive);
      if (!targets.length) break;
      const c = coins[i];
      const h = this.flip(a, c.i);
      if (h && !c.par) p += (s.neg ? -cp : cp) * (a.v.jackpot ? 2 : 1);
      a.v.fl = (a.v.fl || 0) + 1; if (h) a.v.hh = (a.v.hh || 0) + 1;
      this.fire('coinFlip', { u, act: a, h });
      this.emit('coin', { u: u.uid, h, p: Math.max(0, p), i, total });
      if (s.heads && h) s.heads(this.ctx(a, { i }));
      if (u.st.bleed && !s.noBleed) { this.statusDmg(u, 'bleed'); if (!u.alive) break; }
      for (const tt of targets) {
        if (!tt.alive) continue;
        this.hit(a, tt, Math.max(0, p), i, total, n, h);
        if (this.over) break;
      }
    }
    if (s.after && u.alive) s.after(this.ctx(a, { n }));
    this.fire('attackEnd', { u, act: a, s });
  }

  levelFactor(u, t) { const d = u.lvl - t.lvl; return d / (Math.abs(d) + 25); }

  /* 예상 피해 배율 (부작용 없는 미리보기) */
  dmgPreview(u, t, s, opt = {}) {
    const res = t.stag ? 2.0 : (t.res[s.dt] != null ? t.res[s.dt] : 1);
    const emo = t.emoRes[s.emo] != null ? t.emoRes[s.emo] : 1;
    const dm = 1 + 0.1 * ((u.buf.dmgUp || 0) + (t.buf.fragile || 0) - (t.buf.protect || 0));
    const ctx = { b: this, u, t, act: { v: {}, spd: u.spdVals[0] || 0, u, s }, s, i: 0, last: false, n: 0, power: 10, crit: false, flat: 0, preview: true, hypoClash: !!opt.clash, res,
      mult: (s.ignoreRes ? Math.max(res, 1.5) : res) * emo * (1 + this.levelFactor(u, t)) * Math.max(0.1, dm) };
    this.fire('dmgMod', ctx);
    return ctx.mult;
  }

  hit(a, t, power, i, total, n, heads) {
    const u = a.u, s = a.s;
    const ctx = { b: this, u, t, act: a, s, i, last: i === total - 1, n, power, heads, crit: false, mult: 1, flat: 0, m: s.m || 1 };
    const po = u.st.poise;
    if (a.v.allCrit) ctx.crit = true;
    else if (po && po.c > 0 && this.rng() < po.p * 0.05) { ctx.crit = true; po.c--; if (po.c <= 0) delete u.st.poise; }
    let res = t.stag ? 2.0 : (t.res[s.dt] != null ? t.res[s.dt] : 1);
    if (s.ignoreRes) res = Math.max(res, 1.5);
    const emo = t.emoRes[s.emo] != null ? t.emoRes[s.emo] : 1;
    const dm = 1 + 0.1 * ((u.buf.dmgUp || 0) + (t.buf.fragile || 0) - (t.buf.protect || 0));
    ctx.res = res;
    ctx.mult = res * emo * (1 + this.levelFactor(u, t)) * Math.max(0.1, dm) * (ctx.crit ? 1.2 : 1) * (1 + 0.03 * n) * (a.v.dmgMul || 1) * (u.dmgMul || 1) * (u.side === 'E' ? (this.mods.eDmgMul || 1) : 1);
    if (s.mod) s.mod(ctx);
    this.fire('dmgMod', ctx);
    let dmg = power * G(u.lvl) * ctx.mult + ctx.flat;
    dmg = power > 0 ? Math.max(1, Math.round(dmg)) : 0;
    // 방어(가드) 굴림
    if (t.guard && !t.guard.rolled && t.alive && this.canAct(t)) {
      const ga = t.guard.act;
      t.guard.rolled = true;
      this.useSkill(ga);
      const r = this.roll(ga, ga.coinList, null);
      const amt = Math.round(r.p * G(t.lvl) * 1.1);
      t.shields.push({ amt, until: this.turn, guard: true });
      this.emit('guard', { t: t.uid, p: r.p, f: r.f, d: amt });
    }
    // 보호막
    let absorbed = 0;
    if (t.r.puppet > 0 && dmg > 0) { const ab = Math.min(t.r.puppet, dmg); t.r.puppet -= ab; dmg -= ab; absorbed += ab; ctx.pab = ab; }
    for (const sh of t.shields) {
      if (dmg <= 0) break;
      const ab = Math.min(sh.amt, dmg); sh.amt -= ab; dmg -= ab; absorbed += ab;
      if (sh.guard) this.fire('guardAbsorb', { u: t, amt: ab });
    }
    t.shields = t.shields.filter(x => x.amt > 0);
    const before = t.hp;
    const done = this.damage(t, dmg, { src: u, kind: 'hit', act: a });
    ctx.dmg = done;
    ctx.ab = absorbed;
    this.emit('hit', { u: u.uid, t: t.uid, d: done, ab: absorbed, crit: ctx.crit, live: !!ctx.live, res: resLabel(res), rc: resClass(res), dt: s.dt });
    if (done > this.stats.maxHit && u.side === 'A') this.stats.maxHit = done;
    // 파열 · 침잠
    if (t.alive && t.st.rupture) this.statusDmg(t, 'rupture');
    if (t.alive && t.st.sinking) {
      const st = t.st.sinking;
      if (t.hasSP && t.sp > -45 && !(t.r.abyss && t.r.abyss >= this.turn)) {
        const p = st.p; st.c--; if (st.c <= 0) delete t.st.sinking;
        this.addSp(t, -p);
        this.emit('dot', { t: t.uid, k: 'sinking', d: 0, sp: p });
      } else this.statusDmg(t, 'sinking');
    }
    if (s.hit && (t.alive || s.hitDead)) s.hit(ctx);
    this.fire('hit', ctx);
    void before;
  }

  /* ---------- 턴 종료 ---------- */
  endTurn() {
    for (const u of this.units()) if (u.alive && u.st.burn) this.statusDmg(u, 'burn');
    for (const u of this.units()) {
      if (!u.alive) continue;
      if (u.st.tremor) { u.st.tremor.c--; if (u.st.tremor.c <= 0) delete u.st.tremor; }
    }
    for (const u of this.units()) {
      if (!u.alive) continue;
      if (u.panic && u.panic <= this.turn) { u.panic = 0; u.sp = 0; this.emit('calm', { t: u.uid }); }
      if (u.stag && u.stag <= this.turn) { u.stag = 0; this.emit('recover', { t: u.uid }); }
    }
    for (const u of this.units()) {
      if (!u.alive || !u.hasSP) continue;
      if (u.sp <= -45 && !u.panic) {
        if (this.fireAny('panic', { u })) continue;
        u.panic = this.turn + 1;
        this.emit('panic', { t: u.uid });
      }
    }
    this.fire('turnEnd', {});
    if (!this.over && this.waves.length && this.waveCleared()) {
      this.msg('새로운 적이 다가온다.', 'warn');
      this.spawnWave();
      for (const u of this.livingEnemies()) if (!u.spdVals.length) this.spdRoll(u);
    }
    this.checkOver();
    this.emit('end', { result: this.over });
  }

  /* =========================================================== */
  /*                      자동 지정 (AI)                           */
  /* =========================================================== */
  autoPlan(u, opts = {}) {
    if (!this.canAct(u)) { u.plan = null; return; }
    const options = this.allyOptions(u).filter(o => !o.sealed && (o.src !== 'imp' || this.canAfford(u, o.s)));
    const atkOpts = options.filter(o => o.s.kind === 'atk');
    const defOpt = options.find(o => o.src === 'def');
    const claimed = new Set(this.livingAllies().filter(x => x !== u && x.plan && x.plan.tAct).map(x => x.plan.tAct));
    let best = null;
    const consider = (o, e, tUnit) => {
      u.plan = { opt: o.opt, tUid: tUnit.uid, tAct: e ? e.id : null };
      const ci = e ? this.clashInfo(u) : null;
      const pa = this.previewAct(u);
      const pw = this.basePower(pa, null) + this.coinPower(pa) * this.buildCoins(Object.assign({}, pa, { coinList: null })).length * 0.5;
      let score = 0;
      const tgts = o.s.tgt === 'all' ? this.livingEnemies().length : (o.s.tgt || 1);
      const hpFrac = tUnit.hp / tUnit.maxHp;
      const resv = this.dmgPreview(u, tUnit, o.s, { clash: !!(ci && ci.clash) });
      if (ci && ci.clash) {
        const threat = e.target === u || e.target.hp / e.target.maxHp < 0.5 ? 1.4 : 1;
        score = ci.est.win * pw * resv * 1.6 * threat + (ci.est.win - 0.5) * 10;
        if (ci.est.win < 0.35) score -= 8;
      } else {
        score = pw * resv * 0.9 * (1 + (1 - hpFrac) * 0.6);
        if (e && e.target === u) score -= 6;
      }
      score *= 1 + (Math.min(tgts, this.livingEnemies().length) - 1) * 0.45;
      if (tUnit.core) score += 2; else score -= tUnit.part ? 1 : 0;
      if (o.src === 'imp') score += (this.livingEnemies().some(x => x.boss) ? 6 : 0) + (u.sp > -10 ? 3 : -20) - (o.s.spc || 0) * 0.15;
      if (tUnit.flags.untargetableByAlly) score -= 100;
      score += this.rng() * 1.5;
      if (!best || score > best.score) best = { score, plan: { opt: o.opt, tUid: tUnit.uid, tAct: e && ci && ci.clash ? e.id : null } };
    };
    for (const o of atkOpts) {
      for (const e of this.eActs) {
        if (!e.u.alive || claimed.has(e.id)) continue;
        consider(o, e, e.u);
      }
      for (const t of this.livingEnemies()) {
        if (t.flags.untargetableByAlly) continue;
        consider(o, null, t);
      }
    }
    // 방어 고려
    if (defOpt) {
      const incoming = this.eActs.filter(e => e.target === u && e.s.kind === 'atk').length;
      const low = u.hp / u.maxHp < 0.35;
      let ds = incoming * (low ? 9 : 4) - (best ? best.score * 0.5 : 0) + (u.cid === 'mujin' ? 4 : 0);
      if (incoming && (!best || ds > best.score)) best = { score: ds, plan: { opt: 'def', tUid: null, tAct: null } };
    }
    u.plan = best ? best.plan : (defOpt ? { opt: 'def' } : null);
    void opts;
  }
  autoAll() { for (const u of this.livingAllies().sort((a, b) => b.spdVals[0] - a.spdVals[0])) if (!u.plan) this.autoPlan(u); }
}
