// 실제 진행 규칙(경험치·장비·보상)으로 캠페인을 자동 진행.  node tools/campaign.js [cls] [maxAttempts]
const path = require('path');
const load = require('./load');
const X = load(['core.js', 'data_cls.js', 'data_foes.js', 'battle.js', 'world.js', 'game.js']);
// 브라우저 저장소 대용
const vm = require('vm');
const { CLASS_ORDER, Battle, CHAPTERS } = X;
const G = X.Game;
const stageList = X.stageList;
global.localStorage = { getItem: () => null, setItem: () => {} };
function playStage(st) {
  const cfg = G.battleConfig(st); cfg.seed = Math.floor(Math.random() * 1e6);
  const B = new Battle(cfg); B.start(); let g = 0;
  while (!B.result && g++ < 600) { if (B.phase === 'p') B.act(B.autoChoice()); else { const q = B.peek(); B.step(B.autoDef(q && q.kind === 'attack' ? q : null)); } }
  return { B, out: G.finish(st, B) };
}
function autoGear() { const s = G.s; for (const k of ['weapon', 'armor', 'charm']) { const best = s.bag.filter(g => g.slot === k).sort((a, b) => (b.L * (1 + b.rar * 0.15) + b.plus) - (a.L * (1 + a.rar * 0.15) + a.plus))[0]; const cur = s.gear[k]; if (best && (!cur || best.L * (1 + best.rar * 0.15) > cur.L * (1 + cur.rar * 0.15) + cur.plus * 0.8)) G.equip(best.id); } G.sellCommon(); for (const k of ['weapon', 'armor', 'charm']) { const g = s.gear[k]; while (g && g.plus < 10 && s.shards > G.enhCost(g) * 2 && G.enhance(g.id)); } for (const it of ['potion', 'potion', 'tonic']) if ((s.items[it] || 0) < 3 && s.shards > 200) G.buyItem(it); }
function autoTal() { const s = G.s, C = X.CLASSES[s.cls]; for (let t = 0; t < 3; t++) if (G.talOpen(t) && !s.tal[t]) G.chooseTal(t, C.tal[t][0].id); for (const sk of C.skills) while (G.rankUp(sk.id)); }
const clsList = process.argv[2] ? [process.argv[2]] : CLASS_ORDER;
for (const cls of clsList) {
  G.root = { v: 2, cur: 0, slots: [null, null, null], settings: {}, savedAt: 0 };
  G.createSlot(0, cls);
  let battles = 0, losses = 0, grind = 0; const log = [], lost = {};
  for (const C of CHAPTERS) {
    for (const st of stageList(C.id, false)) {
      let tries = 0;
      while (true) {
        autoTal(); autoGear();
        const { B, out } = playStage(st); battles++;
        if (out.win) break;
        losses++; tries++; lost[st.id] = (lost[st.id] || 0) + 1;
        // 막히면 이전 스테이지를 돌며 성장
        for (let k = 0; k < 2; k++) { const prev = stageList(C.id, false)[Math.max(0, st.k - 2)]; playStage(prev); battles++; grind++; }
        if (tries > 25) { log.push(`STUCK ${st.id} lv${G.s.lvl}`); break; }
      }
      if (tries > 25) break;
    }
    log.push(`ch${C.id} lv${G.s.lvl} pow${G.power()} 💠${G.s.shards} 전투${battles} 패배${losses}`);
    if (log[log.length - 2] && log[log.length - 2].startsWith('STUCK')) break;
  }
  console.log(cls.padEnd(10), `총 ${battles}전 (패배 ${losses}, 반복 ${grind})`, Object.entries(lost).map(([k, v]) => k + '×' + v).join(' '));
  console.log('   ' + log.filter((l, i) => i % 3 === 2 || l.startsWith('STUCK')).join('\n   '));
}
