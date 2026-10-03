'use strict';
/* ===== 잔향선 · 진행(저장 · 성장 · 보상 · 미궁) ===== */

const SAVE_KEY = 'echoline_save_v1';
const LVL_CAP = [20, 30, 40, 50, 60];
const ASC_COST = [{ cr: 5, sh: 300 }, { cr: 10, sh: 1000 }, { cr: 18, sh: 2500 }, { cr: 30, sh: 5000 }];
const MAST_COST = [0, 60, 150, 350, 800];
const SKILL_KEYS = ['s1', 's2', 's3', 'def'];
const SKILL_LABEL = { s1: 'S1', s2: 'S2', s3: 'S3', def: '방어' };
const START_CHARS = ['serin', 'mujin', 'doyun', 'eve'];

function xpNeed(L) { return Math.round(10 * Math.pow(L, 1.55) + 30); }
function newProg() { return { lvl: 1, xp: 0, asc: 0, m: [1, 1, 1, 1] }; }
function newSave() {
  const chars = {};
  START_CHARS.forEach(c => { chars[c] = newProg(); });
  return {
    v: 1, created: Date.now(), playtime: 0, chars, party: START_CHARS.slice(), slots: 4,
    story: { stage: {}, boss: {}, nm: {}, nmBoss: {}, seen: {} },
    shards: 0, crystals: 0,
    lab: { best: 0, runs: 0, run: null },
    ach: {}, relicSeen: {},
    stats: { wins: 0, losses: 0, clashWin: 0, maxHit: 0, maxClash: 0, infl: {}, jackpots: 0, imps: 0, staggers: 0, kills: 0, bursts: 0 },
    settings: { speed: 2, auto: false, lines: true },
  };
}

/* claude.ai 안에서 열면 계정별 비공개 문서(data/users/<id>/save)에 저장을 한 부 더 둔다.
 * 쓸 수 없는 환경(로그아웃, 보기 전용, 단독 파일)에서는 브라우저 저장만 쓴다. */
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
      this.ref = db.doc('data/users/' + id + '/save');
      const snap = await this.ref.get();
      if (snap.exists) { const d = snap.data(); if (d && typeof d.json === 'string') { this.remote = d; this.last = d.json; } }
      this.state = 'on'; this.ready = true;
      if (this.remote && onRemote) onRemote(this.remote);
      this.push();
    } catch (e) { this.ref = null; this.state = 'off'; }
  },
  schedule() { if (!this.ref || !this.ready) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 4000); },
  async push() {
    if (!this.ref || !this.ready || !Game.s) return;
    if (this.busy) { this.pending = true; return; }
    const json = JSON.stringify(Game.s);
    if (json === this.last) return;
    this.busy = true;
    try { await this.ref.set({ json, at: Game.s.savedAt || Date.now(), v: 1 }); this.last = json; this.state = 'on'; }
    catch (e) {
      const code = e && e.code;
      if (code === 'unavailable' || code === 'resource_exhausted') this.pending = true;
      else { this.ref = null; this.state = 'off'; }
    }
    this.busy = false;
    if (this.pending && this.ref) { this.pending = false; this.schedule(); }
  },
};

const Game = {
  s: null,
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { this.s = this.migrate(JSON.parse(raw)); return true; }
    } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
    return false;
  },
  migrate(s) {
    const d = newSave();
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const k of Object.keys(d.story)) if (!s.story[k]) s.story[k] = {};
    for (const k of Object.keys(d.stats)) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
    for (const k of Object.keys(d.settings)) if (s.settings[k] === undefined) s.settings[k] = d.settings[k];
    return s;
  },
  save() {
    if (!this.s) return false;
    this.s.savedAt = Date.now();
    Cloud.schedule();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); return true; } catch (e) { return false; }
  },
  hasSave() { if (Cloud.remote) return true; try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  reset() { this.s = newSave(); this.save(); },
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.s)))); },
  importCode(code) {
    const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!s || !s.chars || !s.story) throw new Error('형식이 맞지 않습니다');
    this.s = this.migrate(s); this.save();
  },

  /* ---------- 승객 ---------- */
  owned(cid) { return !!this.s.chars[cid]; },
  ownedList() { return CHAR_ORDER.filter(c => this.owned(c)); },
  cap(cid) { return LVL_CAP[this.s.chars[cid].asc]; },
  impUnlocked(cid) {
    const d = CHARS[cid];
    return d.imps.map(im => !im.boss || !!this.s.story.boss[im.boss]);
  },
  progFor(cid) {
    const p = this.s.chars[cid];
    return { lvl: p.lvl, asc: p.asc, m: p.m.slice(), imp: this.impUnlocked(cid) };
  },
  addXp(cid, amt) {
    const p = this.s.chars[cid];
    if (!p) return 0;
    let ups = 0;
    p.xp += Math.round(amt);
    while (p.lvl < this.cap(cid) && p.xp >= xpNeed(p.lvl)) { p.xp -= xpNeed(p.lvl); p.lvl++; ups++; }
    if (p.lvl >= this.cap(cid)) p.xp = Math.min(p.xp, xpNeed(p.lvl) - 1);
    return ups;
  },
  mastCost(cid, i) { const m = this.s.chars[cid].m[i]; return m >= 5 ? null : MAST_COST[m] * (1 + (i === 2 ? 0.25 : 0)); },
  upgradeMastery(cid, i) {
    const p = this.s.chars[cid], c = this.mastCost(cid, i);
    if (c == null || this.s.shards < c) return false;
    this.s.shards -= c; p.m[i]++; this.save(); return true;
  },
  ascCost(cid) { const a = this.s.chars[cid].asc; return a >= 4 ? null : ASC_COST[a]; },
  canAscend(cid) {
    const p = this.s.chars[cid], c = this.ascCost(cid);
    return c && p.lvl >= this.cap(cid) && this.s.shards >= c.sh && this.s.crystals >= c.cr;
  },
  ascend(cid) {
    if (!this.canAscend(cid)) return false;
    const p = this.s.chars[cid], c = this.ascCost(cid);
    this.s.shards -= c.sh; this.s.crystals -= c.cr; p.asc++; this.save(); return true;
  },
  setParty(list) { this.s.party = list.filter(c => this.owned(c)).slice(0, this.s.slots); this.save(); },

  /* ---------- 노선 ---------- */
  stageKey(ch, k, nm) { return (nm ? 'n' : '') + ch + '-' + k; },
  chapterOpen(ch, nm) { return nm ? !!this.s.story.boss[ch] : (ch === 1 || !!this.s.story.boss[ch - 1]); },
  stageOpen(ch, k, nm) {
    if (!this.chapterOpen(ch, nm)) return false;
    if (k === 1) return true;
    return !!(nm ? this.s.story.nm : this.s.story.stage)[this.stageKey(ch, k - 1, nm)];
  },
  stageCleared(ch, k, nm) { return !!(nm ? this.s.story.nm : this.s.story.stage)[this.stageKey(ch, k, nm)]; },
  labOpen() { return !!this.s.story.boss[2]; },
  maxChapterCleared() { let m = 0; for (let i = 1; i <= 12; i++) if (this.s.story.boss[i]) m = i; return m; },

  partyUnits(opt = {}) {
    return this.s.party.filter(c => this.owned(c)).map(cid => makeAlly(cid, this.progFor(cid), { hpFrac: opt.hp ? opt.hp[cid] : null, hpMul: opt.hpMul }));
  },
  stageBattle(chId, k, nm) {
    const ch = CHAPTERS[chId - 1];
    const st = chapterStages(ch)[k - 1];
    const lvl = nm ? Math.min(62, st.lvl + 6) : st.lvl;
    const waves = st.waves.map(w => w.map(id => makeEnemy(id, lvl + (ENEMIES[id].elite ? 1 : 0), { nightmare: nm, hpMul: nm ? 1.1 : 1 })));
    return { allies: this.partyUnits(), waves, kind: 'story', ch: chId, k, nm, stage: st, lvl };
  },

  /* ---------- 보상 ---------- */
  rewardFor(b, info) {
    let xp = 0, sh = 0, cr = 0;
    for (const e of b.killed) {
      const mult = e.boss ? 12 : e.elite ? 4 : e.part ? 0.5 : 1;
      xp += (3 * e.lvl + 5) * mult;
      sh += (2.5 * e.lvl + 8) * (e.boss ? 10 : e.elite ? 3 : e.part ? 0.3 : 1);
    }
    let first = false;
    if (info.kind === 'story') {
      first = !this.stageCleared(info.ch, info.k, info.nm);
      if (first) { xp *= 1.25; sh *= 1.5; }
      if (info.nm) { xp *= 1.6; sh *= 1.6; }
      if (info.stage.boss) cr += info.nm ? (first ? 20 : 4) : (first ? 15 : 2);
      else if (info.stage.elite) cr += first ? (info.nm ? 7 : 5) : (Math.random() < (info.nm ? 0.6 : 0.3) ? 1 : 0);
      else if (first) cr += info.nm ? 2 : 1;
    }
    return { xp: Math.round(xp), sh: Math.round(sh), cr, first };
  },
  mergeStats(bs) {
    const s = this.s.stats;
    s.clashWin += bs.clashWin; s.maxHit = Math.max(s.maxHit, bs.maxHit); s.maxClash = Math.max(s.maxClash, bs.maxClash);
    s.jackpots += bs.jackpots; s.imps += bs.imps; s.staggers += bs.staggers; s.kills += bs.kills; s.bursts += bs.bursts;
    for (const [k, v] of Object.entries(bs.infl)) s.infl[k] = (s.infl[k] || 0) + v;
  },
  /* 전투 종료 처리. 결과 요약을 돌려준다 */
  finishBattle(b, info) {
    const res = { win: b.over === 'win', xp: 0, sh: 0, cr: 0, ups: {}, unlocks: [], ach: [] };
    this.mergeStats(b.stats);
    if (res.win) {
      this.s.stats.wins++;
      const rw = this.rewardFor(b, info);
      res.xp = rw.xp; res.sh = rw.sh; res.cr = rw.cr; res.first = rw.first;
      if (info.kind === 'story') {
        const key = this.stageKey(info.ch, info.k, info.nm);
        (info.nm ? this.s.story.nm : this.s.story.stage)[key] = true;
        if (info.stage.boss) {
          if (info.nm) this.s.story.nmBoss[info.ch] = true;
          else if (!this.s.story.boss[info.ch]) {
            this.s.story.boss[info.ch] = true;
            const ch = CHAPTERS[info.ch - 1];
            if (ch.recruit && !this.owned(ch.recruit)) {
              const p = newProg(); const avg = Math.max(1, Math.round(this.s.party.reduce((a, c) => a + this.s.chars[c].lvl, 0) / this.s.party.length) - 2);
              p.lvl = Math.min(LVL_CAP[0], avg); this.s.chars[ch.recruit] = p; res.unlocks.push(`${CHARS[ch.recruit].name} 합류`);
            }
            if (info.ch === 6 && this.s.slots < 5) { this.s.slots = 5; res.unlocks.push('편성 칸 +1 (5명)'); }
            if (info.ch === 2) res.unlocks.push('잔향 미궁 개방');
            res.unlocks.push(`악몽: ${ch.title} 개방`);
            for (const cid of CHAR_ORDER) CHARS[cid].imps.forEach(im => { if (im.boss === info.ch) res.unlocks.push(`각인 해방: ${CHARS[cid].name} 「${im.name}」${this.owned(cid) ? '' : ' (합류 후 사용)'}`); });
          }
        }
      }
      this.grant(res, b);
    } else this.s.stats.losses++;
    res.ach = this.checkAch();
    this.save();
    return res;
  },
  grant(res, b, xpMul = 1) {
    this.s.shards += res.sh; this.s.crystals += res.cr;
    const party = new Set(b ? b.allies.map(a => a.cid) : this.s.party);
    for (const cid of this.ownedList()) {
      const amt = res.xp * xpMul * (party.has(cid) ? 1 : 0.25);
      const ups = this.addXp(cid, amt);
      if (ups) res.ups[cid] = ups;
    }
  },
  checkAch() {
    const got = [];
    for (const a of ACHS) {
      if (this.s.ach[a.id]) continue;
      let ok = false; try { ok = a.c(this.s); } catch (e) { ok = false; }
      if (ok) { this.s.ach[a.id] = Date.now(); this.s.shards += a.r; got.push(a); }
    }
    return got;
  },

  /* =========================== 미궁 =========================== */
  labPool() {
    const n = Math.max(2, this.maxChapterCleared());
    return CHAPTERS.slice(0, n);
  },
  labBase(depth) { return 8 + 3 * Math.min(depth, 10) + 2 * Math.max(0, depth - 10); },
  labLevel(run, bonus = 0) { return Math.round(this.labBase(run.depth) + (run.floor - 1) + run.step * 0.3 + bonus); },
  startRun(depth) {
    const team = this.s.party.filter(c => this.owned(c));
    const hp = {}; team.forEach(c => { hp[c] = 1; });
    const run = { depth, floor: 1, step: 0, team, hp, relics: [], gold: 30, offer: null, log: [], battles: 0, earned: { xp: 0, sh: 0, cr: 0 }, mods: depthMods(depth), started: Date.now() };
    this.s.lab.run = run; this.s.lab.runs++;
    run.pendingGift = true;
    this.labOffer(run);
    this.save();
    return run;
  },
  labOffer(run) {
    run.step++;
    if (run.step >= 5) { run.offer = [{ type: 'boss' }]; return; }
    const types = [];
    const pool = [['battle', 45], ['elite', run.step > 1 ? 16 : 0], ['event', 22], ['shop', run.shopFloor === run.floor ? 0 : 9], ['rest', run.step >= 3 ? 12 : 0]];
    while (types.length < 3) {
      const t = wpick(pool.filter(p => p[1] > 0), p => p[1])[0];
      if (t === 'shop' && types.includes('shop')) continue;
      if (t === 'rest' && types.includes('rest')) continue;
      types.push(t);
    }
    if (!types.includes('battle') && !types.includes('elite')) types[0] = 'battle';
    run.offer = types.map(type => ({ type }));
  },
  labEncounter(run, node) {
    const pool = this.labPool();
    const L = this.labLevel(run, run.nextLv || 0);
    run.nextLv = 0;
    const ch = pick(pool);
    const ch2 = pick(pool);
    const mix = shuffle(ch.set.concat(ch2.set));
    let waves;
    if (node.type === 'battle') waves = [mix.slice(0, 3), mix.slice(3, 3 + ri(1, 3))];
    else if (node.type === 'elite') waves = [mix.slice(0, 2), [ch.elite, mix[2]]];
    else if (run.floor < 5) waves = [mix.slice(0, 3), [pick(pool).elite, ch.elite === pick(pool).elite ? mix[3] : pick(pool).elite]];
    else {
      const bossCh = pick(CHAPTERS.slice(0, this.maxChapterCleared() || 2));
      waves = [mix.slice(0, 3), [bossCh.boss]];
    }
    const m = run.mods;
    const lvlOf = id => L + (ENEMIES[id].boss ? 3 + (run.floor === 5 ? m.finalLv : 0) : ENEMIES[id].elite ? 1 : 0);
    return waves.map(w => w.filter(Boolean).map(id => makeEnemy(id, lvlOf(id))));
  },
  labBattleCfg(run, node) {
    const m = run.mods;
    const allies = run.team.filter(c => this.owned(c)).map(cid => makeAlly(cid, this.progFor(cid), { hpFrac: Math.max(0, run.hp[cid] == null ? 1 : run.hp[cid]), hpMul: m.allyHp }));
    const alive = allies.filter(a => a.hp > 0 && (run.hp[a.cid] == null || run.hp[a.cid] > 0));
    const relics = run.relics.map(id => RELIC[id]).filter(r => r && r.h).concat(relicSetHooks(run.relics));
    if (run.powTurns > 0) { relics.push({ id: 'voicepow', h: { basePower(c) { return c.u.side === 'A' ? 1 : 0; } } }); run.powTurns--; }
    if (m.eFirst) relics.push({ id: 'efirst', h: { battleStart(r, _, b) { for (const e of b.enemies) e.bufNext.pwrUp = (e.bufNext.pwrUp || 0) + m.eFirst; } } });
    const mods = { eDmgMul: 0.85, eHpMul: m.eHpMul, eliteHp: m.eliteHp || 0, ePow: m.ePow || 0, eCp: m.eCp || 0, eInfl: m.eInfl || 0, eSpd: m.eSpd || 0, bossSlots: m.bossSlots || 0, allySp: (m.allySp || 0) + (run.spBonus || 0) + (run.nextSp || 0) };
    run.nextSp = 0;
    return { allies: alive, waves: this.labEncounter(run, node), relics, mods, kind: 'lab', node };
  },
  labRelicTier(run) {
    const r = Math.random(), f = run.floor + run.depth * 0.3;
    if (r < 0.06 + f * 0.03) return 3;
    if (r < 0.35 + f * 0.04) return 2;
    return 1;
  },
  labRelicChoices(run, tierMin = 1) {
    const n = Math.max(1, run.mods.choices);
    const have = new Set(run.relics);
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const t = Math.max(tierMin, this.labRelicTier(run));
      const cands = RELICS.filter(r => r.t === t && !have.has(r.id) && !out.includes(r.id));
      if (cands.length) out.push(pick(cands).id);
    }
    return out;
  },
  labTakeRelic(run, id) { run.relics.push(id); this.s.relicSeen[id] = true; this.save(); },
  labAfterBattle(run, b, node) {
    const res = { win: b.over === 'win', xp: 0, sh: 0, cr: 0, gold: 0, ups: {}, unlocks: [], ach: [] };
    this.mergeStats(b.stats);
    for (const a of b.allies) run.hp[a.cid] = a.alive ? a.hp / a.maxHp : 0;
    if (!res.win) { this.s.stats.losses++; res.ach = this.checkAch(); this.save(); return res; }
    this.s.stats.wins++;
    run.battles++;
    let xp = 0, sh = 0;
    for (const e of b.killed) { const mult = e.boss ? 12 : e.elite ? 4 : 1; xp += (3 * e.lvl + 5) * mult * 1.1; sh += (2.5 * e.lvl + 8) * (e.boss ? 8 : e.elite ? 3 : 1); }
    xp *= run.xpBoost || 1;
    res.xp = Math.round(xp); res.sh = Math.round(sh);
    res.gold = node.type === 'boss' ? 80 + run.depth * 5 : node.type === 'elite' ? 45 + run.depth * 3 : 18 + run.depth * 2 + ri(0, 10);
    if (node.type === 'boss') res.cr = run.floor === 5 ? 0 : 1 + Math.floor(run.depth / 4);
    run.gold += res.gold;
    run.earned.xp += res.xp; run.earned.sh += res.sh; run.earned.cr += res.cr;
    this.grant(res, b);
    // 쓰러진 승객은 20%로 일어난다
    for (const cid of run.team) run.hp[cid] = run.hp[cid] > 0 ? Math.min(1, run.hp[cid] + (run.mods.post != null ? run.mods.post : 0.2)) : 0.2;
    if (run.relics.includes('medkit')) for (const cid of run.team) run.hp[cid] = Math.min(1, run.hp[cid] + 0.08);
    res.ach = this.checkAch();
    this.save();
    return res;
  },
  labNextFloor(run) {
    run.floor++; run.step = 0; run.xpBoost = 1;
    for (const cid of run.team) run.hp[cid] = Math.min(1, run.hp[cid] + 0.3);
    this.labOffer(run);
    this.save();
  },
  labEnd(run, cleared) {
    const out = { cleared, sh: 0, cr: 0 };
    if (cleared) {
      out.sh = 150 * run.depth + 200; out.cr = 3 + 2 * run.depth;
      if (run.depth > this.s.lab.best) this.s.lab.best = run.depth;
    } else {
      out.sh = Math.round(30 * run.depth * (run.floor - 1 + run.step / 5));
    }
    this.s.shards += out.sh; this.s.crystals += out.cr;
    this.s.lab.run = null;
    out.ach = this.checkAch();
    this.save();
    return out;
  },
  shopStock(run) {
    if (run.shop && run.shop.floor === run.floor) return run.shop;
    const have = new Set(run.relics);
    const items = [];
    for (const t of [1, 1, 2, 3]) {
      const c = RELICS.filter(r => r.t === t && !have.has(r.id) && !items.some(i => i.id === r.id));
      if (c.length) items.push({ id: pick(c).id, price: Math.round([0, 60, 110, 180][t] * run.mods.price), sold: false });
    }
    run.shop = { floor: run.floor, items, healPrice: Math.round(40 * run.mods.price), healed: false };
    run.shopFloor = run.floor;
    return run.shop;
  },
};
