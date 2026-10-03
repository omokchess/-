const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'src');
const files = ['core.js', 'engine.js', 'chars.js', 'enemies.js', 'world.js', 'game.js'];
const store = {};
const ctx = { console, Math, JSON, Object, Array, Set, Map, Date, Error, String, Number, Boolean, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), unescape, escape, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
vm.createContext(ctx);
vm.runInContext(files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') + '\n;globalThis.__x={Game,Battle,CHAPTERS,CHAR_ORDER,LAB_EVENTS,RELICS,newProg};', ctx);
const { Game, Battle, CHAR_ORDER, LAB_EVENTS, RELICS } = ctx.__x;
const PL = +process.argv[3] || 60, M = +process.argv[4] || 5;
Game.reset();
for (const c of CHAR_ORDER) Game.s.chars[c] = { lvl: PL, xp: 0, asc: Math.min(4, Math.floor((PL - 1) / 10)), m: [M, M, M, M] };
for (let i = 1; i <= 12; i++) Game.s.story.boss[i] = true;
Game.s.slots = 5;
const depths = (process.argv[2] || '1,5,10,15').split(',').map(Number);
const api = run => ({ relicChoice(t) { run.pendingRelic = t; }, hurtAll(f) { for (const c of run.team) run.hp[c] = Math.max(0.05, run.hp[c] - f); }, healAll(f) { for (const c of run.team) run.hp[c] = Math.min(1, run.hp[c] + f); }, metaShards(n) { Game.s.shards += n; }, metaCrystals(n) { Game.s.crystals += n; } });
for (const d of depths) {
  let cleared = 0, floors = 0; const N = +process.argv[5] || 4;
  for (let r = 0; r < N; r++) {
    Game.setParty(CHAR_ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 5));
    const run = Game.startRun(d);
    { const ids = Game.labRelicChoices(run, 1); if (ids.length) Game.labTakeRelic(run, ids[0]); run.pendingGift = false; }
    let ok = true, guard = 0;
    while (ok && guard++ < 60) {
      const nd = run.offer[Math.floor(Math.random() * run.offer.length)];
      if (['battle', 'elite', 'boss'].includes(nd.type)) {
        const cfg = Game.labBattleCfg(run, nd);
        const b = new Battle(cfg); let t = 0;
        while (!b.over && t < 60) { b.startTurn(); b.autoAll(); b.resolve(); t++; }
        if (!b.over) b.over = 'lose';
        const res = Game.labAfterBattle(run, b, nd);
        if (!res.win) { if (process.env.DBG) console.log('  lost at', run.floor + '-' + run.step, nd.type, 'turns', t, 'enemies', b.enemies.map(e => e.eid + (e.alive ? '' : 'x')).join(','), 'hp', JSON.stringify(run.hp)); Game.labEnd(run, false); ok = false; break; }
        if (nd.type !== 'battle' || Math.random() < 0.3) { const ids = Game.labRelicChoices(run, nd.type === 'boss' ? 2 : 1); if (ids.length) Game.labTakeRelic(run, ids[0]); }
        if (nd.type === 'boss') { floors++; if (run.floor >= 5) { Game.labEnd(run, true); cleared++; ok = false; break; } Game.labNextFloor(run); continue; }
      } else if (nd.type === 'event') {
        const ev = LAB_EVENTS[Math.floor(Math.random() * LAB_EVENTS.length)];
        ev.ch[Math.floor(Math.random() * ev.ch.length)].fx(run, api(run));
        if (run.pendingRelic) { const ids = Game.labRelicChoices(run, run.pendingRelic); if (ids.length) Game.labTakeRelic(run, ids[0]); run.pendingRelic = 0; }
      } else if (nd.type === 'shop') {
        const sh = Game.shopStock(run); for (const it of sh.items) if (run.gold >= it.price) { run.gold -= it.price; it.sold = true; Game.labTakeRelic(run, it.id); }
      } else if (nd.type === 'rest') { for (const c of run.team) run.hp[c] = Math.min(1, run.hp[c] + run.mods.rest); }
      Game.labOffer(run);
    }
  }
  console.log(`depth ${d} (party L${PL} M${M}): cleared ${cleared}/${N}, floors avg ${(floors / N).toFixed(1)}`);
}
console.log('relics seen', Object.keys(Game.s.relicSeen).length, '/', RELICS.length);
