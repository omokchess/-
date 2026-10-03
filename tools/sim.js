const load = require('./load');
const X = load(['core.js', 'engine.js', 'chars.js', 'enemies.js']);
function run(party, lvl, waves, opts = {}) {
  const allies = party.map(c => X.makeAlly(c, { lvl, asc: opts.asc || 0, m: opts.m || [1,1,1,1], imp: [true, !!opts.imp2] }));
  const b = new X.Battle({ allies, waves: waves.map(w => w.map(([id, l]) => X.makeEnemy(id, l, { nightmare: opts.nm }))) });
  let turns = 0;
  while (!b.over && turns < 40) {
    b.startTurn();
    b.autoAll();
    b.resolve();
    turns++;
  }
  return { over: b.over || 'timeout', turns, stats: b.stats, hp: allies.map(a => Math.round(a.hp / a.maxHp * 100)) };
}
module.exports = { run, X };
if (require.main === module) {
  const party = ['serin', 'mujin', 'doyun', 'eve'];
  const tests = [
    ['ch1 normal', 2, [[['vagrant', 2], ['clockrat', 2], ['luggage', 2]]]],
    ['ch1 elite', 4, [[['inspector', 4], ['vagrant', 3]]]],
    ['ch1 boss', 5, [[['clockwarden', 5]]]],
    ['ch2 boss', 10, [[['butcher', 10]]]],
    ['ch3 boss', 15, [[['librarian', 15]]]],
    ['ch4 boss', 20, [[['diva', 20]]]],
    ['ch5 boss', 25, [[['masque', 25]]]],
    ['ch6 boss', 30, [[['express', 30]]]],
    ['ch7 boss', 35, [[['grin', 35]]]],
    ['ch8 boss', 40, [[['colossus', 40]]]],
    ['ch9 boss', 45, [[['seamstress', 45]]]],
    ['ch10 boss', 50, [[['moon_silver', 50]]]],
    ['ch11 boss', 55, [[['mirror', 55]]]],
    ['ch12 boss', 60, [[['lethe', 60]]]],
  ];
  for (const [n, l, w] of tests) {
    const res = [];
    for (let i = 0; i < 6; i++) res.push(run(party, l, w));
    const wins = res.filter(r => r.over === 'win').length;
    const avgT = (res.reduce((s, r) => s + r.turns, 0) / res.length).toFixed(1);
    console.log(n.padEnd(12), "win", wins + "/6", "turns", avgT, "hp", res.map(r => r.hp.join(",")).slice(0,3).join(" | "), res.map(r => r.over[0] + r.turns).join(" "));
  }
}
