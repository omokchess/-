const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = process.env.SHOT_DIR;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/index.html');
  await page.evaluate(() => {
    const s = newSave();
    for (const c of CHAR_ORDER) s.chars[c] = { lvl: 12, xp: 0, asc: 0, m: [2, 2, 2, 2] };
    for (let i = 1; i <= 2; i++) { s.story.boss[i] = true; for (let k = 1; k <= 6; k++) s.story.stage[i + '-' + k] = true; s.story.seen['i' + i] = s.story.seen['m' + i] = s.story.seen['b' + i] = s.story.seen['o' + i] = 1; }
    s.party = ['serin', 'mujin', 'eve', 'haram']; s.settings.speed = 1;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  });
  await page.reload();
  await page.click('[data-a=cont]');
  await page.click('[data-a=selCh][data-ch="1"]');
  await page.click('[data-a=stage][data-ch="1"][data-k="6"]');
  await page.waitForTimeout(400);
  // 모든 승객: 첫 기술, 자신을 노리는 의도가 있으면 합
  const n = await page.$$eval('.ucard.ally', x => x.length);
  for (let i = 0; i < n; i++) {
    await page.click(`.ucard.ally >> nth=${i}`);
    await page.click('.opt >> nth=0');
    const cand = await page.$('.intent .win.hi, .intent .win.mid');
    if (cand) { const btn = await cand.evaluateHandle(e => e.closest('.intent')); await btn.click(); } else await page.click('.ucard.enemy >> nth=0');
  }
  await page.screenshot({ path: D + '/30-manual-plan.png' });
  await page.click('[data-a=go]');
  let got = 0;
  for (let i = 0; i < 120 && got < 2; i++) {
    await page.waitForTimeout(100);
    if (got === 0 && await page.$('.clashview .cv-pow') && (await page.$$eval('.clashview .coin.h, .clashview .coin.t', x => x.length)) > 1) { await page.screenshot({ path: D + '/31-clash-round.png' }); got = 1; }
    else if (got === 1 && await page.$('.cv-side.win')) { await page.screenshot({ path: D + '/32-clash-end.png' }); got = 2; }
  }
  console.log('clash shots', got, 'errors', errors.length ? errors : 'none');
  await browser.close();
})();
