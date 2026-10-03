const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + process.cwd() + '/index.html');
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.SHOT_DIR + '/01-title.png' });
  await page.click('[data-a=newgame]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: process.env.SHOT_DIR + '/02-hub.png' });
  // 1-1 출발
  await page.click('[data-a=stage][data-ch="1"][data-k="1"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: process.env.SHOT_DIR + '/03-story.png' });
  // skip story
  await page.click('.story [data-s=skip]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: process.env.SHOT_DIR + '/04-battle.png' });
  // pick first skill on selected ally, then target first intent
  await page.click('.opt >> nth=0');
  await page.waitForTimeout(200);
  await page.screenshot({ path: process.env.SHOT_DIR + '/05-targeting.png' });
  await page.click('.intent >> nth=0');
  await page.waitForTimeout(200);
  await page.click('[data-a=autoPlan]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.SHOT_DIR + '/06-planned.png' });
  await page.click('[data-a=go]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: process.env.SHOT_DIR + '/07-playing.png' });
  // turn auto on
  await page.click('[data-a=auto]');
  await page.click('[data-a=speed]'); await page.click('[data-a=speed]');
  for (let i = 0; i < 120; i++) { if (await page.$('#modal .big')) break; await page.waitForTimeout(250); }
  await page.screenshot({ path: process.env.SHOT_DIR + '/08-result.png' });
  const big = await page.textContent('#modal .big').catch(() => 'none');
  console.log('result:', big);
  if (errors.length) { console.log('errors:', errors); }
  await page.click('[data-a=resultOk]');
  await page.waitForTimeout(300);
  await page.click('[data-a=tab][data-t=chars]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: process.env.SHOT_DIR + '/09-chars.png', fullPage: true });
  await page.click('[data-a=tab][data-t=guide]');
  await page.click('[data-a=tab][data-t=records]');
  await page.click('[data-a=tab][data-t=settings]');
  await page.click('[data-a=tab][data-t=party]');
  await page.click('[data-a=tab][data-t=lab]');
  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('[data-a=tab][data-t=route]');
  await page.screenshot({ path: process.env.SHOT_DIR + '/10-mobile-route.png', fullPage: true });
  const ow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('mobile overflow px:', ow);
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
