// 피해 출처 분석.  node tools/brk.js cls lv
const { heroStats, heroSkills, X } = require('./sim.js');
const { Battle } = X;
const cls = process.argv[2] || 'poet', L = +process.argv[3] || 50;
const tot = {}; let turns = 0;
for (let sd = 1; sd <= 8; sd++) {
  const B = new Battle({ seed: sd, hero: { cls, lv: L, stats: heroStats(cls, L), skills: heroSkills(cls, L), items: {} }, foes: [{ id: 'vagrant', lv: L, hpMul: 80 }] });
  let cur = '?'; const eat = ev => { for (const e of ev) { if (e.type === 'act' && e.who === 'p') cur = e.id || 'focus'; if (e.type === 'counter') cur = 'counter:' + e.fx; if (e.type === 'hit' && e.who === 'p') { tot[cur] = (tot[cur] || 0) + e.dmg; for (const [k, v] of e.extra) tot['x:' + k] = (tot['x:' + k] || 0) + v; } if (e.type === 'dot' && e.who === 'f') tot['dot:' + e.kind + '@' + cur] = (tot['dot:' + e.kind + '@' + cur] || 0) + e.v; if (e.type === 'act' && e.who === 'f') cur = 'foe'; } };
  eat(B.start()); let g = 0;
  while (!B.result && B.turn <= 20 && g++ < 500) { if (B.phase === 'p') eat(B.act(B.autoChoice())); else { const q = B.peek(); eat(B.step(B.autoDef(q && q.kind === 'attack' ? q : null))); } }
  turns += B.turn;
}
for (const [k, v] of Object.entries(tot).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(28), Math.round(v / turns));
