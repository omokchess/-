const { X } = require('./sim');
const party = (process.argv[3] || 'serin,mujin,haram,yeon,sion').split(',');
const L = +process.argv[2] || 64;
const allies = party.map(c => X.makeAlly(c, { lvl: 60, asc: 4, m: [5,5,5,5], imp: [true, true] }));
const waves = [['memeater','attendant','reflection'], ['shade','memeater','attendant','mirrorarmor']].map(w => w.map(id => X.makeEnemy(id, L, { nightmare: true, hpMul: 1.1 })));
const b = new X.Battle({ allies, waves });
let t = 0;
while (!b.over && t < 30) {
  b.startTurn(); b.autoAll(); const ev = b.resolve(); t++;
  const hits = ev.filter(e => e.type === 'hit');
  const toA = hits.filter(e => allies.some(a => a.uid === e.t)).reduce((s, e) => s + e.d, 0);
  const toE = hits.filter(e => !allies.some(a => a.uid === e.t)).reduce((s, e) => s + e.d, 0);
  const dots = ev.filter(e => e.type === 'dot' && allies.some(a => a.uid === e.t)).reduce((s, e) => s + (e.d || 0), 0);
  console.log(`T${t} dmg→적 ${toE} dmg→아군 ${toA} (+dot ${dots}) | 아군 ${allies.map(a => a.hp + '/' + a.maxHp + (a.alive ? '' : 'x') + ' sp' + a.sp).join(' ')} | 적 ${b.enemies.filter(e => e.alive).map(e => e.name + ' ' + e.hp).join(', ')} | clashW ${b.stats.clashWin} L ${b.stats.clashLose}`);
}
console.log(b.over);
