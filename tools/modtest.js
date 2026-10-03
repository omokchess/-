const { X } = require('./sim');
const pool = ['serin','mujin','doyun','eve','haram','yeon','roa','kai','viola','sion'];
const sets = [['shade','memeater','attendant'],['gardener','moth','golem'],['reflection','warped','mirrorarmor'],['mason','tortoise','tremorworm']];
function trial(mods, L, N = 12) {
  let w = 0, hp = 0;
  for (let i = 0; i < N; i++) {
    const party = pool.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    const allies = party.map(c => X.makeAlly(c, { lvl: 60, asc: 4, m: [5,5,5,5], imp: [true, true] }, { hpMul: mods.allyHp || 1 }));
    const set = sets[i % sets.length];
    const waves = [set.map(id => X.makeEnemy(id, L)), [set[0], set[1]].map(id => X.makeEnemy(id, L))];
    const b = new X.Battle({ allies, waves, mods });
    let t = 0; while (!b.over && t < 50) { b.startTurn(); b.autoAll(); b.resolve(); t++; }
    if (b.over === 'win') { w++; hp += allies.reduce((a, u) => a + u.hp / u.maxHp, 0) / 5; }
  }
  return `win ${w}/${N} hp ${(hp / Math.max(1, w) * 100).toFixed(0)}%`;
}
const full = { eHpMul: 1.3, eliteHp: 0.3, ePow: 2, eInfl: 1, eSpd: 1, allySp: -10, allyHp: 0.9 };
console.log('none L53', trial({}, 53));
console.log('full L53', trial(full, 53));
for (const k of Object.keys(full)) { const m = Object.assign({}, full); delete m[k]; console.log('full minus', k.padEnd(7), trial(m, 53)); }
