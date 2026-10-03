const { run } = require('./sim');
const bosses = ['clockwarden','butcher','librarian','diva','masque','express','grin','colossus','seamstress','moon_silver','mirror','lethe'];
const pool = ['serin','mujin','doyun','eve','haram','yeon','roa','kai','viola','sion'];
const N = +process.argv[2] || 8;
for (let ch = 1; ch <= 12; ch++) {
  const L = 5 * ch, asc = Math.min(4, Math.floor((L - 1) / 10)), mm = Math.min(5, 1 + Math.floor(ch / 2.5));
  const unlocked = pool.slice(0, Math.min(10, 4 + ch));
  const size = ch >= 6 ? 5 : 4;
  let wins = 0, turns = 0; const tags = [];
  for (let i = 0; i < N; i++) {
    const party = unlocked.slice().sort(() => Math.random() - 0.5).slice(0, size);
    const r = run(party, L, [[[bosses[ch - 1], L]]], { asc, m: [mm, mm, mm, mm], imp2: ch > 3 });
    if (r.over === 'win') wins++; turns += r.turns; tags.push(r.over[0] + r.turns);
  }
  console.log(`ch${ch} L${L} A${asc} M${mm} size${size}`.padEnd(26), 'win', wins + '/' + N, 'turns', (turns / N).toFixed(1), tags.join(' '));
}
