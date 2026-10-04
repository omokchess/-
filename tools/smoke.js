// 실제 화면을 눌러 보는 연기 시험.  node tools/smoke.js [outdir]
const path = require('path'), fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.argv[2] || '/tmp/smoke'; fs.mkdirSync(out, { recursive: true });
const W = +process.env.W || 420, H = +process.env.H || 860;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push('PAGE ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|net::/.test(m.text())) errs.push('CON ' + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await pg.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await pg.waitForTimeout(900);
  const shot = async n => { await pg.screenshot({ path: path.join(out, n + '.png') }); console.log('shot', n); };
  await shot('01_title');
  await pg.click('[data-new="0"]'); await pg.waitForTimeout(700);
  await shot('02_pick');
  await pg.click('[data-k="gambler"]'); await pg.waitForTimeout(500);
  await pg.click('[data-k="hemoblade"]'); await pg.waitForTimeout(800);
  await shot('03_pick_hemo');
  await pg.click('#pGo'); await pg.waitForTimeout(600);
  await shot('04_hub');
  await pg.click('#goNext'); await pg.waitForTimeout(500);
  await shot('05_stageinfo');
  await pg.click('.mbtns button[data-i="0"]'); await pg.waitForTimeout(800);
  await shot('06_story');
  for (let i = 0; i < 30; i++) { const s = await pg.$('.story'); if (!s) break; await pg.mouse.click(W / 2, H - 80); await pg.waitForTimeout(120); }
  await pg.waitForTimeout(1500);
  await shot('07_battle');
  await pg.evaluate(() => { window.__autoQTE = 'mix'; });
  // 직접 몇 번 눌러 본다
  for (let k = 0; k < 3; k++) {
    await pg.waitForFunction(() => !BUI.busy || BUI.ended, null, { timeout: 30000 }).catch(() => {});
    const btn = await pg.$('.skg .sk:not([disabled])');
    if (!btn) break;
    await btn.click(); await pg.waitForTimeout(700);
    if (k === 0) await shot('08_attack');
  }
  await pg.evaluate(() => { Game.set.auto = true; if (!BUI.busy) BUI.loop(); });
  await pg.waitForFunction(() => !!document.querySelector('#modal .result') , null, { timeout: 120000 }).catch(() => errs.push('NO RESULT'));
  await pg.waitForTimeout(400);
  await shot('09_result');
  console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
  await b.close();
})();
