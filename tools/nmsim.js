const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'src');
const files = ['core.js', 'engine.js', 'chars.js', 'enemies.js', 'world.js', 'game.js'];
const store = {};
const ctx = { console, Math, JSON, Object, Array, Set, Map, Date, Error, String, Number, Boolean, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), unescape, escape, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
vm.createContext(ctx);
vm.runInContext(files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') + '\n;globalThis.__x={Game,Battle,CHAR_ORDER};', ctx);
const { Game, Battle, CHAR_ORDER } = ctx.__x;
Game.reset();
for (const c of CHAR_ORDER) Game.s.chars[c] = { lvl: 60, xp: 0, asc: 4, m: [5, 5, 5, 5] };
for (let i = 1; i <= 12; i++) Game.s.story.boss[i] = true;
Game.s.slots = 5;
for (const ch of [11, 12]) for (const k of [3, 4, 5, 6]) {
  let w = 0; const N = 4;
  for (let i = 0; i < N; i++) {
    Game.setParty(CHAR_ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 5));
    const cfg = Game.stageBattle(ch, k, true); const b = new Battle(cfg); let t = 0;
    while (!b.over && t < 60) { b.startTurn(); b.autoAll(); b.resolve(); t++; }
    if (b.over === 'win') w++;
  }
  console.log(`악몽 ${ch}-${k} (Lv ${Game.stageBattle(ch, k, true).lvl}) win ${w}/${N}`);
}
