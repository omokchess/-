// 직업별 턴당 피해량 (허수아비 상대)
const { run, heroStats, heroSkills, X } = require('./sim.js');
const { CLASSES, CLASS_ORDER, Battle } = X;
const L = +process.argv[2] || 20, T = 20;
for (const cls of CLASS_ORDER) {
  let dealt = 0, taken = 0, n = 12;
  for (let s = 0; s < n; s++) {
    const B = new Battle({ seed: s + 1, hero: { cls, lv: L, stats: heroStats(cls, L), skills: heroSkills(cls, L), items: {} }, foes: [{ id: 'vagrant', lv: L, hpMul: 80 }] });
    B.start(); let g = 0;
    while (!B.result && B.turn <= T && g++ < 500) {
      if (B.phase === 'p') B.act(B.autoChoice());
      else { const q = B.peek(); B.step(B.autoDef(q && q.kind === 'attack' ? q : null)); }
    }
    dealt += B.stats.dealt / B.turn; taken += B.stats.taken / B.turn;
  }
  console.log(cls.padEnd(10), 'dmg/turn', (dealt / n).toFixed(0), ' taken/turn', (taken / n).toFixed(0), ' hp', Math.round(heroStats(cls, L).mhp), 'atk', heroStats(cls, L).atk.toFixed(1));
}
