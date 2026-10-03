// 한 전투의 사건 기록.  node tools/trace.js cls foe lv [seed]
const { heroStats, heroSkills, X } = require('./sim.js');
const { Battle } = X;
const [cls, foe, lv, seed] = [process.argv[2] || 'duelist', process.argv[3] || 'clockwarden', +process.argv[4] || 4, +process.argv[5] || 1];
const B = new Battle({ seed, hero: { cls, lv, stats: heroStats(cls, lv), skills: heroSkills(cls, lv), items: { potion: 2 } }, foes: foe.split(',').map(id => ({ id, lv })) });
const pr = ev => { for (const e of ev) { if (['act', 'hit', 'log', 'dot', 'win', 'lose', 'stagger', 'phase', 'charge', 'kill', 'enter', 'burst', 'cheat'].includes(e.type)) { const s = e.snap; const o = Object.assign({}, e); delete o.snap; console.log(`T${B.turn} p${s.p.hp}/${s.p.mhp} sp${s.p.sp} en${s.p.en} | f${s.f ? s.f.hp + '/' + s.f.mhp + ' stg' + s.f.stg + '/' + s.f.stgMax : ''}`, JSON.stringify(o)); } } };
pr(B.start()); let g = 0;
const { run } = require('./sim.js');
while (!B.result && g++ < 300) {
  if (B.phase === 'p') pr(B.act(B.autoChoice()));
  else { const q = B.peek(); pr(B.step(B.autoDef(q && q.kind === 'attack' ? q : null))); }
}
