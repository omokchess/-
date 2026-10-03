// 미궁 자동 진행.  node tools/labsim.js [cls] [lvl] [runs]
const X = require('./load')(['core.js', 'data_cls.js', 'data_foes.js', 'battle.js', 'world.js', 'game.js']);
global.localStorage = { getItem: () => null, setItem: () => {} };
const G = X.Game, { Battle, LAB_EVENTS } = X;
const cls = process.argv[2] || 'hemoblade', L = +process.argv[3] || 30, RUNS = +process.argv[4] || 10;
G.root = { v: 2, cur: 0, slots: [null, null, null], settings: {}, savedAt: 0 };
G.createSlot(0, cls); const s = G.s; s.lvl = L;
for (const k of ['weapon', 'armor', 'charm']) { s.gear[k] = X.rollGear(k, L, 1); s.gear[k].plus = Math.min(10, Math.floor(L / 8)); }
const depths = [];
for (let run = 0; run < RUNS; run++) {
  const r = G.labStart(); let guard = 0, end = null;
  while (!end && guard++ < 80) {
    const pref = ['elite', 'battle', 'rest', 'shop', 'event', 'boss'];
    const n = r.nodes.slice().sort((a, b) => (r.hp < r.mhp * 0.45 ? (a.t === 'rest' ? -1 : 1) : pref.indexOf(a.t) - pref.indexOf(b.t)))[0];
    if (['battle', 'elite', 'boss'].includes(n.t)) {
      const Lb = G.labBattle(r, n.t); const B = new Battle(Lb.cfg); B.start(); let g = 0;
      while (!B.result && g++ < 600) { if (B.phase === 'p') B.act(B.autoChoice()); else { const q = B.peek(); B.step(B.autoDef(q && q.kind === 'attack' ? q : null)); } }
      if (B.r._phoenix) r.relics = r.relics.filter(k => k !== 'phoenix');
      if (!B.result.win) { r.hp = 0; end = G.labEnd(r, false); break; }
      const res = G.labAfterBattle(r, B, n.t);
      if (res.relicPick && res.relicPick.length) G.labTakeRelic(r, res.relicPick[0]);
    } else if (n.t === 'rest') { r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.3); G.labAdvance(r); }
    else if (n.t === 'shop') { const sh = G.labShop(r); for (const x of sh.relics) if (r.tok >= x.price) { r.tok -= x.price; G.labTakeRelic(r, x.k); } r.shop = null; G.labAdvance(r); }
    else { const E = LAB_EVENTS[Math.floor(Math.random() * LAB_EVENTS.length)]; const o = E.o.find(o => !o.fight && (!o.need || o.need(r))); if (o) o.f(r, G); G.labAdvance(r); }
    if (r.depth > 30) { end = G.labEnd(r, true); }
  }
  depths.push(end ? end.depth : r.depth);
}
console.log(cls, 'L' + L, 'depths', depths.join(','), 'best', s.lab.best, '💠', s.shards, 'lvl', s.lvl);
