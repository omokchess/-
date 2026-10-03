// 실제 진행 코드(Game)로 노선 전체를 자동 진행해 보며 페이스와 오류를 확인한다
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'src');
const files = ['core.js', 'engine.js', 'chars.js', 'enemies.js', 'world.js', 'game.js'];
const store = {};
const ctx = { console, Math, JSON, Object, Array, Set, Map, Date, Error, String, Number, Boolean, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), unescape, escape, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
vm.createContext(ctx);
vm.runInContext(files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') + '\n;globalThis.__x={Game,Battle,CHAPTERS,chapterStages,CHARS,CHAR_ORDER,xpNeed,LVL_CAP};', ctx);
const { Game, Battle, CHAPTERS, chapterStages, CHAR_ORDER } = ctx.__x;
Game.reset();
let battles = 0, turns = 0, losses = 0, hpSum = 0, hpN = 0;
const SEC_PER_TURN = +process.env.SPT || 20;   // 수동 플레이 기준 한 턴 평균 초
function fight(cfg, info) {
  const b = new Battle(cfg);
  let t = 0;
  while (!b.over && t < 60) { b.startTurn(); b.autoAll(); b.resolve(); t++; }
  if (!b.over) b.over = 'lose';
  battles++; turns += t;
  const res = info.kind === 'lab' ? null : Game.finishBattle(b, info);
  if (b.over !== 'win') losses++; else { hpSum += b.allies.reduce((a, u) => a + u.hp / u.maxHp, 0) / b.allies.length; hpN++; }
  return { b, res, t };
}
function spend() {
  const s = Game.s;
  // 편성: 레벨 높은 순
  const own = Game.ownedList().sort((a, b) => s.chars[b].lvl - s.chars[a].lvl);
  Game.setParty(own.slice(0, s.slots));
  for (const cid of s.party) { while (Game.canAscend(cid)) Game.ascend(cid); }
  const capped = s.party.filter(c => s.chars[c].lvl >= Game.cap(c) && s.chars[c].asc < 4);
  const reserve = capped.reduce((a, c) => a + Game.ascCost(c).sh, 0);
  let progress = true;
  while (progress) {
    progress = false;
    for (const cid of s.party) for (let i = 0; i < 4; i++) {
      const c = Game.mastCost(cid, i);
      if (c != null && s.shards >= c + 200 + reserve && s.chars[cid].m[i] < 5) { Game.upgradeMastery(cid, i); progress = true; }
    }
  }
}
const log = [];
for (const ch of CHAPTERS) {
  const startB = battles, startT = turns; hpSum = 0; hpN = 0;
  for (const st of chapterStages(ch)) {
    let tries = 0;
    while (!Game.stageCleared(ch.id, st.k, false)) {
      spend();
      const cfg = Game.stageBattle(ch.id, st.k, false);
      const r = fight(cfg, cfg);
      tries++;
      if (r.b.over !== 'win') {
        // 그라인드: 이전에 깬 스테이지 중 가장 높은 것 반복
        for (let g = 0; g < 4; g++) {
          // 이전 장 잔향체(파편·결정) 와 직전 스테이지(경험치)를 번갈아
          const useBoss = g % 2 === 1 && ch.id > 1;
          const k = useBoss ? 6 : (st.k > 1 ? st.k - 1 : 5), c2 = useBoss ? ch.id - 1 : (st.k > 1 ? ch.id : ch.id - 1);
          if (c2 < 1) break;
          spend(); const cf = Game.stageBattle(c2, k, false); fight(cf, cf);
        }
      }
      if (tries > 60) { console.log('STUCK', ch.id, st.k, JSON.stringify(Game.s.party.map(c => Game.s.chars[c]))); process.exit(1); }
    }
  }
  const s = Game.s;
  const lv = s.party.map(c => s.chars[c].lvl + (s.chars[c].asc ? 'A' + s.chars[c].asc : '')).join(',');
  const hours = (turns * SEC_PER_TURN / 3600).toFixed(1);
  log.push(`ch${ch.id} 전투 ${battles - startB} 턴 ${turns - startT} | 누적 ${battles}전 ${hours}h | 패배 ${losses} | 남은HP ${(hpSum / Math.max(1, hpN) * 100).toFixed(0)}% | 파티 ${lv} | 파편 ${s.shards} 결정 ${s.crystals}`);
  console.log(log[log.length - 1]);
}
