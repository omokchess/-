// 원하는 직업 vs 적 전투를 바로 열고 연속 촬영.  node tools/bshot.js cls foe lv [n] [ms] [outdir]
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [cls, foe, lv, n, ms, out] = [process.argv[2] || 'hemoblade', process.argv[3] || 'clockwarden', +process.argv[4] || 5, +process.argv[5] || 6, +process.argv[6] || 1200, process.argv[7] || '/tmp/bshot'];
fs.mkdirSync(out, { recursive: true });
const W = +process.env.W || 420, H = +process.env.H || 860;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +process.env.DSF || 1 });
  const errs = []; pg.on('pageerror', e => errs.push('PAGE ' + e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|net::/.test(m.text())) errs.push('CON ' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pg.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await pg.waitForTimeout(500);
  await pg.evaluate(([cls, foe, lv]) => {
    Game.createSlot(0, cls); const s = Game.s; s.lvl = lv; s.gear.weapon = rollGear('weapon', lv, 1); s.gear.armor = rollGear('armor', lv, 1);
    const ch = FOES[foe.split(',')[0]].ch, C = CH_BY_ID[ch];
    window.__autoQTE = 'mix'; Game.set.auto = true; Game.set.qte = false;
    BUI.start({ seed: 7, hero: Game.battleHero(), foes: foe.split(',').map(id => ({ id, lv })) }, { kind: 'test', theme: C.theme, title: 'TEST ' + foe, onEnd: () => { window.__done = 1; } });
  }, [cls, foe, lv]);
  for (let i = 0; i < n; i++) { await pg.waitForTimeout(ms); await pg.screenshot({ path: path.join(out, `${cls}_${foe.replace(/,/g, '+')}_${i}.png`), clip: { x: 0, y: 0, width: W, height: Math.min(H, 760) } }); if (await pg.evaluate(() => window.__done)) break; }
  console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
  await b.close();
})();
