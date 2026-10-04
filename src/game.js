'use strict';
/* ===== 잔향선 · 진행 (저장 슬롯 · 성장 · 장비 · 보상 · 미궁) ===== */

const SAVE_KEY = 'echoline_solo_v2';
const SLOT_N = 3;
const ITEM_PRICE = { potion: 25, tonic: 30, ether: 35, bomb: 40, elixir: 220 };
const BAG_MAX = 40;

function xpNeed(L) { return Math.round(160 + 40 * L + 0.2 * L * L); }
function newSlot(cls) {
  return {
    v: 2, cls, created: Date.now(), playtime: 0, lvl: 1, xp: 0, shards: 60, crystals: 0,
    gear: { weapon: null, armor: null, charm: null }, trophy: null, bag: [], tal: [null, null, null], ranks: {},
    items: { potion: 3, tonic: 1, ether: 1, bomb: 0, elixir: 0 },
    story: { prog: {}, nmProg: {}, boss: {}, nmBoss: {}, read: {} },
    seen: {}, lab: { best: 0, runs: 0, run: null }, ach: {},
    stats: { wins: 0, losses: 0, perfect: 0, staggers: 0, maxHit: 0, legend: 0, maxPlus: 0, jackpots: 0, flawless: 0, fastBoss: 0, maxRelics: 0, kills: 0 },
  };
}
function newRoot() { return { v: 2, cur: null, slots: [null, null, null], settings: { speed: 1, qte: true, fps: 24, shake: true, auto: false, hint: true }, savedAt: 0 }; }

/* claude.ai 안에서 열면 계정별 비공개 문서에 저장을 한 부 더 둔다. 쓸 수 없는 환경에서는 브라우저 저장만 쓴다. */
const Cloud = {
  ref: null, ready: false, busy: false, pending: false, timer: 0, last: '', remote: null, state: 'off',
  async init(onRemote) {
    try {
      const c = typeof window !== 'undefined' && window.claude;
      if (!c || !c.use) return;
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.ref = db.doc('data/users/' + id + '/solo');
      const snap = await this.ref.get();
      if (snap.exists) { const d = snap.data(); if (d && typeof d.json === 'string') { this.remote = d; this.last = d.json; } }
      this.state = 'on'; this.ready = true;
      if (this.remote && onRemote) onRemote(this.remote);
      this.push();
    } catch (e) { this.ref = null; this.state = 'off'; }
  },
  schedule() { if (!this.ref || !this.ready) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 4000); },
  async push() {
    if (!this.ref || !this.ready || !Game.root) return;
    if (this.busy) { this.pending = true; return; }
    const json = JSON.stringify(Game.root);
    if (json === this.last) return;
    this.busy = true;
    try { await this.ref.set({ json, at: Game.root.savedAt || Date.now(), v: 2 }); this.last = json; this.state = 'on'; }
    catch (e) { const code = e && e.code; if (code === 'unavailable' || code === 'resource_exhausted') this.pending = true; else { this.ref = null; this.state = 'off'; } }
    this.busy = false;
    if (this.pending && this.ref) { this.pending = false; this.schedule(); }
  },
};

const Game = {
  root: null,
  get s() { return this.root && this.root.cur != null ? this.root.slots[this.root.cur] : null; },
  get set() { return this.root.settings; },
  load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { this.root = this.migrate(JSON.parse(raw)); return true; } } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
    this.root = newRoot(); return false;
  },
  migrate(r) {
    const d = newRoot();
    for (const k in d) if (r[k] === undefined) r[k] = d[k];
    for (const k in d.settings) if (r.settings[k] === undefined) r.settings[k] = d.settings[k];
    r.slots = (r.slots || []).concat([null, null, null]).slice(0, SLOT_N).map(s => {
      if (!s) return null;
      const n = newSlot(s.cls);
      for (const k in n) if (s[k] === undefined) s[k] = n[k];
      for (const k in n.stats) if (s.stats[k] === undefined) s.stats[k] = n.stats[k];
      for (const k in n.story) if (!s.story[k]) s.story[k] = {};
      for (const k in n.items) if (s.items[k] === undefined) s.items[k] = 0;
      return s;
    });
    return r;
  },
  save() {
    if (!this.root) return;
    this.root.savedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.root)); } catch (e) { /* 저장 실패는 조용히 넘긴다 */ }
    Cloud.schedule();
  },
  createSlot(i, cls) {
    const s = newSlot(cls);
    const L = 1;
    s.gear.weapon = rollGear('weapon', L, 0); s.gear.armor = rollGear('armor', L, 0);
    this.root.slots[i] = s; this.root.cur = i; this.save(); return s;
  },
  useSlot(i) { if (this.root.slots[i]) { this.root.cur = i; this.save(); } },
  deleteSlot(i) { this.root.slots[i] = null; if (this.root.cur === i) this.root.cur = null; this.save(); },
  tick(sec) { if (this.s) this.s.playtime += sec; },

  /* ---------- 능력치 ---------- */
  stats(extra) {
    const s = this.s, c = CLASSES[s.cls].stat, g = lvG(s.lvl);
    const o = { mhp: 220 * g * c.hp, atk: 10 * g * c.atk, def: 10 * g * c.def, spd: (20 + s.lvl * 0.6) * c.spd, crit: 5, critDmg: 1.5, enStart: 0, qte: 0, stg: 0, heal: 0, stPot: 0 };
    let P = { atkP: 0, hpP: 0, defP: 0 };
    for (const k of ['weapon', 'armor', 'charm']) {
      const it = s.gear[k]; if (!it) continue;
      const m = gearMain(it); if (m.atk) o.atk += m.atk; if (m.hp) o.mhp += m.hp; if (m.def) o.def += m.def;
      for (const [ak, v] of it.ax) {
        if (ak in P) P[ak] += v;
        else if (ak === 'crit') o.crit += v; else if (ak === 'critDmg') o.critDmg += v / 100; else if (ak === 'spd') o.spd += v;
        else if (ak === 'enStart') o.enStart += v; else if (ak === 'qte') o.qte += v / 100; else if (ak === 'stg') o.stg += v / 100; else if (ak === 'heal') o.heal += v / 100; else if (ak === 'stPot') o.stPot += v;
      }
    }
    o.atk *= 1 + P.atkP / 100; o.mhp *= 1 + P.hpP / 100; o.def *= 1 + P.defP / 100;
    if (extra) { if (extra.atkB) o.atk *= 1 + extra.atkB; if (extra.hpB) o.mhp *= 1 + extra.hpB; if (extra.critB) o.crit += extra.critB; if (extra.maxHp) o.mhp *= 1 + extra.maxHp; }
    o.mhp = Math.round(o.mhp); o.atk = Math.round(o.atk * 10) / 10; o.def = Math.round(o.def * 10) / 10; o.spd = Math.round(o.spd);
    return o;
  },
  power() { const o = this.stats(); return Math.round(o.atk * 10 + o.mhp / 4 + o.def * 6 + o.crit * 4); },
  skills() { const s = this.s; return CLASSES[s.cls].skills.filter(k => k.unlock <= s.lvl).map(k => ({ id: k.id, rank: s.ranks[k.id] || 1 })); },
  look() { return Object.assign({ seed: 7 }, HERO_LOOK[this.s.cls]); },
  /* 장비 효과를 전투에 넘기는 가상 유물 */
  gearRelics() {
    const s = this.s, list = [];
    if (s.trophy && s.story.boss[s.trophy]) list.push('t_' + s.trophy);
    return list;
  },
  battleHero(o = {}) {
    const s = this.s, st = this.stats(o.bonus);
    const tal = s.tal.filter(Boolean);
    return {
      cls: s.cls, lv: s.lvl, stats: st, skills: this.skills(), tal, relics: (o.relics || []).concat(this.gearRelics()).concat(st.enStart || st.qte || st.stg || st.heal || st.stPot ? ['_gear'] : []),
      items: o.items || Object.assign({}, s.items), hp: o.hp, sp: o.sp, gear: st,
    };
  },

  /* ---------- 이야기 진행 ---------- */
  progKey(nm) { return nm ? 'nmProg' : 'prog'; },
  cleared(ch, nm) { return this.s.story[this.progKey(nm)][ch] || 0; },
  chapterOpen(ch, nm) { if (nm && !this.s.story.boss.lethe) return false; return ch === 1 || this.cleared(ch - 1, nm) >= 6; },
  stageOpen(st) { return this.chapterOpen(st.ch, st.nm) && this.cleared(st.ch, st.nm) >= st.k - 1; },
  nextStage() {
    for (const nm of [false, true]) for (const C of CHAPTERS) { if (!this.chapterOpen(C.id, nm)) continue; const c = this.cleared(C.id, nm); if (c < 6) return stageList(C.id, nm)[c]; }
    return null;
  },
  battleConfig(st) {
    const foes = st.foes.map(id => ({ id, lv: st.lv, nm: st.nm }));
    return { seed: Date.now() & 0xffffff, hero: this.battleHero(), foes };
  },
  /* 전투 결과 정산 (이야기) */
  finish(st, B) {
    const s = this.s, win = B.result && B.result.win, out = { win, xp: 0, shards: 0, crystals: 0, drops: [], levels: 0, first: false, trophy: null };
    this.recordBattle(B);
    // 소모품 사용 반영
    for (const k in s.items) s.items[k] = B.items[k] != null ? B.items[k] : s.items[k];
    if (!win) { s.stats.losses++; out.xp = Math.round(this.foeXp(st) * 0.2); out.levels = this.gainXp(out.xp); this.save(); return out; }
    s.stats.wins++;
    const key = this.progKey(st.nm);
    const first = (s.story[key][st.ch] || 0) < st.k;
    out.first = first;
    if (first) s.story[key][st.ch] = st.k;
    out.xp = Math.round(this.foeXp(st) * (first ? 1.5 : 1));
    out.shards = Math.round(st.foes.length * (4 + st.lv / 2.5) * (st.boss ? 4 : st.elite ? 2 : 1) * (st.nm ? 1.4 : 1));
    if (first) out.crystals = st.boss ? (st.nm ? 15 : 10) : st.elite ? 3 : 1;
    if (st.boss) {
      const bid = st.foes[0];
      if (st.nm) s.story.nmBoss[bid] = 1;
      else if (!s.story.boss[bid]) { s.story.boss[bid] = 1; out.trophy = bid; if (!s.trophy) s.trophy = bid; }
      if (B.p.hp >= B.p.mhp) s.stats.flawless++;
      if (B.turn <= 6) s.stats.fastBoss++;
    }
    // 장비
    const dropN = st.boss ? 2 : st.elite ? 1 : (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < dropN; i++) out.drops.push(this.dropGear(st.lv, st.boss ? 2 : st.elite ? 1 : 0, st.nm));
    if (Math.random() < (st.boss ? 1 : 0.25)) { const it = pick(['potion', 'potion', 'tonic', 'ether', 'bomb'], Math.random); s.items[it] = (s.items[it] || 0) + 1; out.item = it; }
    s.shards += out.shards; s.crystals += out.crystals;
    out.levels = this.gainXp(out.xp);
    out.ach = this.checkAch();
    this.save();
    return out;
  },
  foeXp(st) { return st.foes.reduce((a, id) => a + (30 + st.lv * 7) * (FOES[id].boss ? 6 : FOES[id].elite ? 2.5 : 1), 0) * (st.nm ? 1.3 : 1); },
  recordBattle(B) {
    const s = this.s; if (!B) return;
    s.stats.perfect += B.stats.perfect || 0; s.stats.staggers += B.stats.staggers || 0; s.stats.kills += B.stats.kills || 0;
    s.stats.maxHit = Math.max(s.stats.maxHit, B.stats.maxHit || 0); s.stats.jackpots += B.stats.jackpots || 0;
    for (const f of B.foeQ.slice(0, B.foeIdx + 1)) s.seen[f.id] = (s.seen[f.id] || 0) + 1;
  },
  gainXp(n) {
    const s = this.s; let lv = 0;
    if (s.lvl >= LV_CAP) { s.shards += Math.round(n / 10); return 0; }
    s.xp += n;
    while (s.lvl < LV_CAP && s.xp >= xpNeed(s.lvl)) { s.xp -= xpNeed(s.lvl); s.lvl++; lv++; }
    if (s.lvl >= LV_CAP) s.xp = 0;
    return lv;
  },
  dropGear(L, minRar, nm) {
    const r = Math.random();
    let rar = r < 0.04 + (nm ? 0.04 : 0) ? 3 : r < 0.18 + (nm ? 0.08 : 0) ? 2 : r < 0.5 ? 1 : 0;
    rar = Math.max(rar, minRar || 0); if (rar === 3 && minRar < 2 && !nm) rar = 2;
    const g = rollGear(pick(['weapon', 'armor', 'charm'], Math.random), Math.min(LV_CAP, L + (nm ? 2 : 0)), rar);
    this.addBag(g);
    if (rar === 3) this.s.stats.legend++;
    return g;
  },
  addBag(g) { const s = this.s; if (s.bag.length >= BAG_MAX) { s.shards += SELL(g); g.sold = 1; return; } s.bag.push(g); },
  equip(id) {
    const s = this.s, i = s.bag.findIndex(g => g.id === id); if (i < 0) return;
    const g = s.bag[i], old = s.gear[g.slot];
    s.bag.splice(i, 1); s.gear[g.slot] = g; if (old) s.bag.push(old);
    this.save();
  },
  unequip(slot) { const s = this.s; const g = s.gear[slot]; if (!g || s.bag.length >= BAG_MAX) return; s.gear[slot] = null; s.bag.push(g); this.save(); },
  sell(id) { const s = this.s, i = s.bag.findIndex(g => g.id === id); if (i < 0) return 0; const v = SELL(s.bag[i]); s.shards += v; s.bag.splice(i, 1); this.save(); return v; },
  sellCommon() { const s = this.s; let v = 0; s.bag = s.bag.filter(g => { if (g.rar === 0) { v += SELL(g); return false; } return true; }); s.shards += v; this.save(); return v; },
  findGear(id) { const s = this.s; for (const k in s.gear) if (s.gear[k] && s.gear[k].id === id) return s.gear[k]; return s.bag.find(g => g.id === id); },
  enhance(id) {
    const g = this.findGear(id), s = this.s; if (!g || g.plus >= 10) return false;
    const c = ENH_COST(g.plus) * (1 + g.rar * 0.5); if (s.shards < c) return false;
    s.shards -= Math.round(c); g.plus++; s.stats.maxPlus = Math.max(s.stats.maxPlus, g.plus); this.save(); return true;
  },
  enhCost(g) { return Math.round(ENH_COST(g.plus) * (1 + g.rar * 0.5)); },
  buyItem(id) { const s = this.s, c = ITEM_PRICE[id]; if (s.shards < c) return false; s.shards -= c; s.items[id] = (s.items[id] || 0) + 1; this.save(); return true; },
  gearBoxCost() { return Math.round(60 + this.s.lvl * 6); },
  buyGearBox() { const s = this.s, c = this.gearBoxCost(); if (s.shards < c || s.bag.length >= BAG_MAX) return null; s.shards -= c; const g = this.dropGear(s.lvl, Math.random() < 0.3 ? 1 : 0); this.save(); return g; },
  rankCost(id) { const r = this.s.ranks[id] || 1; return r >= 5 ? null : { cr: r * 3, lv: [0, 8, 20, 35, 50][r] }; },
  rankUp(id) { const s = this.s, c = this.rankCost(id); if (!c || s.crystals < c.cr || s.lvl < c.lv) return false; s.crystals -= c.cr; s.ranks[id] = (s.ranks[id] || 1) + 1; this.checkAch(); this.save(); return true; },
  talOpen(tier) { return this.s.lvl >= TAL_LV[tier]; },
  chooseTal(tier, id) { const s = this.s; if (!this.talOpen(tier) || s.tal[tier]) return false; s.tal[tier] = id; this.checkAch(); this.save(); return true; },
  resetTal() { const s = this.s; if (s.crystals < 5) return false; s.crystals -= 5; s.tal = [null, null, null]; this.save(); return true; },
  setTrophy(id) { if (this.s.story.boss[id]) { this.s.trophy = id; this.save(); } },
  checkAch() {
    const s = this.s, got = [];
    for (const a of ACHS) if (!s.ach[a.id] && a.f(s)) { s.ach[a.id] = Date.now(); got.push(a); s.crystals += 2; }
    return got;
  },

  /* ---------- 미궁 ---------- */
  labStart() {
    const s = this.s, st = this.stats();
    const r = { depth: 1, hp: st.mhp, mhp: st.mhp, sp: 0, relics: [], tok: 20, items: { potion: 2, tonic: 1, ether: 0, bomb: 0, elixir: 0 }, seed: Date.now() & 0xffff, nodes: null, log: [], kills: 0, atkB: 0, hpB: 0, critB: 0 };
    r.relics.push(pick(RELIC_IDS.filter(k => RELICS[k].r === 0), Math.random));
    s.lab.run = r; s.lab.runs++;
    r.nodes = this.labRoll(r);
    this.save(); return r;
  },
  labLv(r) { return Math.min(LV_CAP + 10, Math.max(1, this.s.lvl - 5 + Math.ceil(r.depth * 0.7))); },
  labRoll(r) {
    const d = r.depth;
    if (d % 5 === 0) return [{ t: 'boss' }];
    const types = [['battle', 45], ['elite', d > 2 ? 16 : 0], ['event', 20], ['rest', d > 1 ? 10 : 0], ['shop', d > 1 ? 10 : 0]];
    const out = [];
    while (out.length < 3) { const t = wpick(types, x => x[1], Math.random)[0]; if (out.filter(o => o.t === t).length >= (t === 'battle' ? 2 : 1)) continue; out.push({ t }); }
    return out;
  },
  labFoes(r, t) {
    const L = this.labLv(r), maxCh = clamp(Math.ceil(r.depth / 1.4), 1, 12);
    const chs = CHAPTERS.filter(c => c.id <= maxCh);
    const C = pick(chs, Math.random);
    const hpMul = r.depth > 15 ? 1 + (r.depth - 15) * 0.12 : 1;
    if (t === 'boss') { const B = pick(CHAPTERS.filter(c => c.id <= Math.min(12, Math.ceil(r.depth / 1.25))), Math.random); return { foes: [{ id: B.boss, lv: L + 1, hpMul }], theme: B.theme }; }
    if (t === 'elite') return { foes: [{ id: C.elite, lv: L + 1, hpMul }], theme: C.theme };
    const n = r.depth >= 8 && Math.random() < 0.4 ? 2 : 1;
    return { foes: Array.from({ length: n }, () => ({ id: pick(C.set, Math.random), lv: L, hpMul })), theme: C.theme };
  },
  labBattle(r, t) {
    const F = this.labFoes(r, t);
    const relics = r.relics.slice();
    const hero = this.battleHero({ relics, hp: r.hp, sp: r.sp, items: r.items, bonus: { atkB: r.atkB, hpB: r.hpB, critB: r.critB, maxHp: r.relics.includes('heart') ? 0.2 : 0 } });
    hero.stats.mhp = r.mhp;
    return { cfg: { seed: Date.now() & 0xffffff, hero, foes: F.foes }, theme: F.theme, t };
  },
  labRelic(r, minR) {
    const pool = RELIC_IDS.filter(k => !RELICS[k].trophy && !r.relics.includes(k) && RELICS[k].r >= (minR || 0) && RELICS[k].r <= 2);
    if (!pool.length) { r.tok += 15; return '유물이 더 없다. 토큰 +15'; }
    const k = wpick(pool, x => [6, 3, 1][RELICS[x].r], Math.random);
    r.relics.push(k);
    if (k === 'heart') { const add = Math.round(r.mhp * 0.2); r.mhp += add; r.hp += add; }
    this.s.stats.maxRelics = Math.max(this.s.stats.maxRelics, r.relics.length);
    return `유물 「${RELICS[k].i} ${RELICS[k].n}」을(를) 얻었다.`;
  },
  labRelicChoices(r, n = 3, minR = 0) {
    const pool = RELIC_IDS.filter(k => !RELICS[k].trophy && !r.relics.includes(k) && RELICS[k].r >= minR && RELICS[k].r <= 2);
    return shuffle(pool.slice(), Math.random).slice(0, n);
  },
  labTakeRelic(r, k) { if (!r.relics.includes(k)) { r.relics.push(k); if (k === 'heart') { const add = Math.round(r.mhp * 0.2); r.mhp += add; r.hp += add; } } this.s.stats.maxRelics = Math.max(this.s.stats.maxRelics, r.relics.length); this.save(); },
  labAfterBattle(r, B, t) {
    this.recordBattle(B);
    r.items = Object.assign({}, B.items);
    if (!B.result.win) return this.labEnd(r, false);
    r.hp = Math.max(1, B.p.hp); r.sp = Math.round(B.p.sp * 0.5);
    r.kills += B.foeQ.length; this.s.stats.wins++;
    const tok = (t === 'boss' ? 30 : t === 'elite' ? 16 : 8) + Math.floor(r.depth / 2);
    r.tok += tok;
    r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.12);
    const res = { tok, relicPick: t === 'elite' || t === 'boss' ? this.labRelicChoices(r, 3, t === 'boss' ? 1 : 0) : null };
    if (t === 'battle' && Math.random() < 0.2) res.relicMsg = this.labRelic(r, 0);
    r.depth++; r.nodes = this.labRoll(r);
    if (r.depth - 1 > this.s.lab.best) this.s.lab.best = r.depth - 1;
    this.save();
    return res;
  },
  labAdvance(r) { r.depth++; r.nodes = this.labRoll(r); if (r.depth - 1 > this.s.lab.best) this.s.lab.best = r.depth - 1; this.save(); },
  labShop(r) {
    if (!r.shop) r.shop = { relics: this.labRelicChoices(r, 3, 0).map(k => ({ k, price: [22, 34, 48][RELICS[k].r] })), bought: {} };
    return r.shop;
  },
  labEnd(r, alive) {
    const s = this.s, d = r.depth - (alive ? 0 : 1);
    const out = { depth: d, shards: Math.round(20 + d * d * 2.5 + d * 12), crystals: Math.floor(d / 3) + (d >= 15 ? 5 : 0), drops: [] };
    s.shards += out.shards; s.crystals += out.crystals;
    const n = Math.min(4, Math.floor(d / 4));
    for (let i = 0; i < n; i++) out.drops.push(this.dropGear(Math.min(LV_CAP, s.lvl + Math.floor(d / 5)), d >= 10 ? 2 : 1, d >= 15));
    out.xp = Math.round(r.kills * (30 + s.lvl * 7) * 0.8);
    out.levels = this.gainXp(out.xp);
    if (d > s.lab.best) s.lab.best = d;
    s.lab.run = null;
    out.ach = this.checkAch();
    this.save();
    return out;
  },
};
const heroStats = () => Game.stats();

/* 장비 부가 효과를 전투 유물 훅으로 */
RELICS._gear = {
  n: '장비', i: '⚙', r: 9, trophy: 1, d: '',
  start: B => { const g = B.o.hero.gear; if (g && g.enStart) B.energy(g.enStart); },
  qte: B => (B.o.hero.gear && B.o.hero.gear.qte) || 0,
  stgMul: B => (B.o.hero.gear && B.o.hero.gear.stg) || 0,
  healMul: B => (B.o.hero.gear && B.o.hero.gear.heal) || 0,
  stPot: (B, k) => (B.o.hero.gear && B.o.hero.gear.stPot && ['bleed', 'burn', 'tremor', 'rupture', 'sinking'].includes(k)) ? B.o.hero.gear.stPot : 0,
};
