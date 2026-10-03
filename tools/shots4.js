const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = process.env.SHOT_DIR;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/index.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: D + '/40-title.png' });
  await page.evaluate(() => {
    const s = newSave();
    for (const c of CHAR_ORDER) s.chars[c] = { lvl: 26, xp: 0, asc: 2, m: [3, 3, 3, 3] };
    for (let i = 1; i <= 4; i++) { s.story.boss[i] = true; for (let k = 1; k <= 6; k++) s.story.stage[i + '-' + k] = true; s.story.seen['i' + i] = s.story.seen['m' + i] = s.story.seen['o' + i] = 1; }
    s.seen = { vagrant: 3, clockrat: 2, clockwarden: 1, butcher: 1, cleaver: 4, inkjelly: 1 };
    s.slots = 5; s.party = ['serin', 'doyun', 'haram', 'yeon', 'kai']; s.settings.speed = 1;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  });
  await page.reload();
  await page.click('[data-a=cont]');
  await page.click('[data-a=selCh][data-ch="4"]');
  await page.click('[data-a=stage][data-ch="4"][data-k="6"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: D + '/41-story-por.png' });
  await page.click('.story [data-s=skip]');
  await page.waitForTimeout(600);
  await page.click('[data-a=autoPlan]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: D + '/42-battle-plan.png' });
  await page.click('[data-a=go]');
  const shots = { hit: 0, clash: 0, cut: 0 };
  for (let i = 0; i < 160 && (shots.hit < 2 || !shots.clash); i++) {
    await page.waitForTimeout(90);
    if (!shots.cut && await page.$('.cutin')) { await page.screenshot({ path: D + '/45-cutin.png' }); shots.cut = 1; }
    if (!shots.clash && await page.$('.ucard.moving') && await page.$('.clashview .cv-bust')) { await page.screenshot({ path: D + '/43-clash-motion.png' }); shots.clash = 1; }
    if (shots.hit < 2 && await page.$('.float') && await page.$('.ucard.moving')) { await page.screenshot({ path: D + `/44-hit-${shots.hit}.png` }); shots.hit++; await page.waitForTimeout(300); }
  }
  console.log('shots', shots);
  await page.click('[data-a=retreatAsk]'); await page.click('[data-a=retreat]'); await page.waitForTimeout(300); await page.click('[data-a=resultOk]');
  await page.click('[data-a=tab][data-t=chars]');
  await page.click('[data-a=selChar][data-c="kai"]');
  await page.click('[data-a=pv][data-m="s3"]');
  await page.waitForTimeout(650);
  await page.screenshot({ path: D + '/46-preview.png' });
  await page.click('[data-a=pv][data-m="imp"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: D + '/47-preview-imp.png' });
  await page.waitForTimeout(1500);
  await page.click('[data-a=tab][data-t=records]');
  await page.waitForTimeout(200);
  const el = await page.$('.bestiary');
  if (el) await el.screenshot({ path: D + '/48-bestiary.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-a=tab][data-t=route]');
  await page.click('[data-a=stage][data-ch="4"][data-k="6"]');
  await page.waitForTimeout(700);
  await page.click('.story [data-s=skip]').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: D + '/49-mobile-battle.png', fullPage: true });
  console.log('overflow', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  console.log('errors', errors.length ? errors : 'none');
  await browser.close();
})();
