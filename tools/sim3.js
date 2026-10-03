const { run } = require('./sim');
const sets = [
 ['vagrant','clockrat','luggage'],['cleaver','hookhound','bloodmerchant'],['soakedpage','inkjelly','shelf'],['extra','dancer','stagerig'],
 ['apprentice','blankface','pressarm'],['trackwraith','signalman','freight'],['citizen','clown','megaphone'],['mason','tortoise','tremorworm'],
 ['sewdoll','spoolspider','cutter'],['gardener','moth','golem'],['reflection','warped','mirrorarmor'],['shade','memeater','attendant']];
const elites = ['inspector','freezer','reader','prompter','foreman','stationmaster','mc','demolition','mender','sundial','otherpax','gatekeeper'];
const pool = ['serin','mujin','doyun','eve','haram','yeon','roa','kai','viola','sion'];
const N = 8;
for (let ch = 1; ch <= 12; ch++) {
  const L = 5 * ch - 2, asc = Math.min(4, Math.floor((L - 1) / 10)), mm = Math.min(5, 1 + Math.floor(ch / 2.5));
  const unlocked = pool.slice(0, Math.min(10, 4 + ch)); const size = ch >= 6 ? 5 : 4;
  for (const kind of ['normal', 'elite']) {
    let wins = 0, turns = 0, hp = 0;
    for (let i = 0; i < N; i++) {
      const party = unlocked.slice().sort(() => Math.random() - 0.5).slice(0, size);
      const w = kind === 'normal' ? [sets[ch-1].map(e => [e, L])] : [[[elites[ch-1], L + 1], [sets[ch-1][0], L]]];
      const r = run(party, L, w, { asc, m: [mm,mm,mm,mm], imp2: ch > 3 });
      if (r.over === 'win') wins++; turns += r.turns; hp += r.hp.reduce((a,b)=>a+b,0)/r.hp.length;
    }
    console.log(`ch${ch} ${kind}`.padEnd(12), 'win', wins+'/'+N, 'turns', (turns/N).toFixed(1), 'avgHP%', (hp/N).toFixed(0));
  }
}
