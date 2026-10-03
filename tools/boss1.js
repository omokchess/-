const { X } = require('./sim');
const id = process.argv[2], L = +process.argv[3] || 60, PL = +process.argv[4] || 60, N = +process.argv[5] || 6;
const pool = ['serin','mujin','doyun','eve','haram','yeon','roa','kai','viola','sion'];
for (let i = 0; i < N; i++) {
  const party = pool.slice().sort(() => Math.random() - 0.5).slice(0, 5);
  const allies = party.map(c => X.makeAlly(c, { lvl: PL, asc: 4, m: [5,5,5,5], imp: [true, true] }));
  const b = new X.Battle({ allies, waves: [[X.makeEnemy(id, L)]] });
  let t = 0; const trace = [];
  while (!b.over && t < 60) { b.startTurn(); b.autoAll(); b.resolve(); t++;
    const boss = b.enemies.filter(e => e.boss); trace.push(boss.map(e => (e.alive ? Math.round(e.hp / e.maxHp * 100) : 'x') + (b.vars.phase ? 'p' + b.vars.phase : '')).join('/') + ' a' + b.livingAllies().length); }
  console.log(b.over, t, party.join(','), '|', trace.join(' '));
}
