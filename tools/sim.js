// 직업 × 적 자동 전투 시뮬레이션.  node tools/sim.js [n]
const X = require('./load')();
const { CLASSES, CLASS_ORDER, FOES, Battle, lvG } = X;
function heroStats(cls, L, gear = 1.25) { const c = CLASSES[cls].stat, g = lvG(L); return { mhp: 220 * g * c.hp * gear, atk: 10 * g * c.atk * gear, def: 10 * g * c.def * gear, spd: 20 + L * 0.6, crit: 5, critDmg: 1.5 }; }
function heroSkills(cls, L) { return CLASSES[cls].skills.filter(s => s.unlock <= L).map(s => ({ id: s.id, rank: 1 + Math.floor(L / 15) })); }
function ai(B) {
  const us = B.usable().filter(u => u.ok);
  const p = B.p;
  if (p.hp < p.mhp * 0.3 && B.items.potion > 0 && B.itemUsed === 0) return { k: 'item', id: 'potion' };
  // 부위: 살아 있는 부위가 있으면 가끔 노린다
  if (B.f.parts && B.f.parts.some(q => q.alive) && !B.f.parts.some(q => q.core) && B.tgt === -1 && B.rng() < 0.6) return { k: 'target', i: B.f.parts.findIndex(q => q.alive) };
  if (B.f.parts && B.f.parts.some(q => q.core)) { const i = B.f.parts.findIndex(q => q.alive); if (B.tgt !== i && i >= 0 && !B.f.parts[B.tgt]?.alive) return { k: 'target', i }; }
  const ult = us.find(u => u.sk.ult); if (ult) return { k: 'skill', id: ult.id };
  const atk = us.filter(u => !u.sk.basic).sort((a, b) => b.cost - a.cost);
  if (atk.length && B.rng() < 0.85) return { k: 'skill', id: atk[0].id };
  if (p.en < 2 && p.hp < p.mhp * 0.5 && B.rng() < 0.4) return { k: 'focus' };
  return { k: 'skill', id: us.find(u => u.sk.basic)?.id || us[0].id };
}
function run(cls, foes, L, seed, opt = {}) {
  const B = new Battle({ seed, hero: { cls, lv: L, stats: heroStats(cls, L, opt.gear), skills: heroSkills(cls, L), tal: opt.tal || [], items: { potion: 2, tonic: 1 } }, foes: foes.map(id => ({ id, lv: opt.flv || L })) });
  B.start();
  let guard = 0;
  while (!B.result && guard++ < 400) {
    if (B.phase === 'p') { B.act(opt.dumb ? ai(B) : B.autoChoice()); }
    else if (B.phase === 'f') { const q = B.peek(); B.step(B.autoDef(q && q.kind === 'attack' ? q : null)); }
    else break;
  }
  return { win: B.result ? B.result.win : false, turns: B.turn, hp: B.p.hp / B.p.mhp, stats: B.stats };
}
module.exports = { run, heroStats, heroSkills, X };
if (require.main === module) {
  const N = +process.argv[2] || 30;
  const lvOf = ch => 1 + (ch - 1) * 5;
  const bosses = Object.values(FOES).filter(f => f.boss).sort((a, b) => a.ch - b.ch);
  console.log('보스별 승률/평균 턴 (직업 평균, 레벨 = 장 기준 +3)');
  for (const b of bosses) {
    const row = [];
    for (const cls of CLASS_ORDER) { let w = 0, t = 0; for (let i = 0; i < N; i++) { const r = run(cls, [b.id], lvOf(b.ch) + 3, i * 7 + 1); w += r.win; t += r.turns; } row.push(`${cls.slice(0, 4)} ${Math.round(w / N * 100)}%/${(t / N).toFixed(0)}`); }
    console.log(b.id.padEnd(12), row.join(' '));
  }
  console.log('\n일반 적 (레벨 = 장 기준), 승률/턴/남은체력');
  for (let ch = 1; ch <= 12; ch++) {
    const ids = Object.values(FOES).filter(f => f.ch === ch && !f.boss).map(f => f.id);
    let w = 0, t = 0, hp = 0, n = 0;
    for (const id of ids) for (const cls of CLASS_ORDER) for (let i = 0; i < 4; i++) { const r = run(cls, [id], lvOf(ch) + (FOES[id].elite ? 2 : 0), i + 3); w += r.win; t += r.turns; hp += r.hp; n++; }
    console.log(`ch${ch}`, `${Math.round(w / n * 100)}%`, (t / n).toFixed(1), (hp / n).toFixed(2));
  }
}
