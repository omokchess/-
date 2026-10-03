const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const D = process.env.SHOT_DIR;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/index.html');
  // 중반 저장 데이터 주입
  await page.evaluate(() => {
    const s = newSave();
    for (const c of CHAR_ORDER) s.chars[c] = { lvl: 32, xp: 0, asc: 2, m: [3, 3, 3, 3] };
    for (let i = 1; i <= 6; i++) { s.story.boss[i] = true; for (let k = 1; k <= 6; k++) s.story.stage[i + '-' + k] = true; s.story.seen['i' + i] = s.story.seen['m' + i] = s.story.seen['b' + i] = s.story.seen['o' + i] = 1; }
    s.slots = 5; s.party = ['serin', 'haram', 'roa', 'viola', 'sion']; s.shards = 5000; s.crystals = 40;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  });
  await page.reload();
  await page.click('[data-a=cont]');
  await page.click('[data-a=selCh][data-ch="6"]');
  await page.click('[data-a=stage][data-ch="6"][data-k="6"]');
  await page.waitForTimeout(400);
  // 속도 1x
  while ((await page.textContent('[data-a=speed]')).trim() !== '1×') await page.click('[data-a=speed]');
  await page.click('[data-a=autoPlan]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + '/20-boss-plan.png' });
  await page.click('[data-a=go]');
  let shotClash = false, shotHit = false;
  for (let i = 0; i < 80 && (!shotClash || !shotHit); i++) {
    await page.waitForTimeout(120);
    if (!shotClash && await page.$('.cv-side.win')) { await page.screenshot({ path: D + '/21-clash.png' }); shotClash = true; }
    if (!shotHit && await page.$('.float')) { await page.screenshot({ path: D + '/22-hit.png' }); shotHit = true; }
  }
  await page.click('[data-a=skip]').catch(() => {});
  await page.waitForTimeout(800);
  // 모바일 전투
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + '/23-mobile-battle.png', fullPage: true });
  const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('mobile battle overflow', ow);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click('[data-a=retreatAsk]'); await page.click('[data-a=retreat]');
  await page.waitForTimeout(300);
  await page.click('[data-a=resultOk]');
  await page.click('[data-a=tab][data-t=lab]');
  await page.screenshot({ path: D + '/24-lab-select.png' });
  await page.click('[data-a=labStart]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + '/24b-lab-gift.png' });
  await page.click('#modal .relic-card >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: D + '/25-lab-map.png' });
  // 이벤트/상점/휴식 노드가 있으면 하나 열어 본다
  const nodes = await page.$$eval('.node', ns => ns.map(n => n.className));
  console.log('nodes', nodes);
  const idx = nodes.findIndex(c => /event|shop|rest/.test(c));
  if (idx >= 0) { await page.click(`.node >> nth=${idx}`); await page.waitForTimeout(300); await page.screenshot({ path: D + '/26-lab-modal.png' }); }
  console.log('errors', errors.length ? errors : 'none');
  await browser.close();
})();
