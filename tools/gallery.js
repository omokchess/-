// 모든 SVG 아트를 한 페이지에 늘어놓고 스크린샷을 찍는다
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
(async () => {
  const code = ['core.js', 'engine.js', 'chars.js', 'enemies.js', 'art.js'].map(src).join('\n;\n');
  const html = `<html><body style="background:#10171b;margin:0;font:11px sans-serif;color:#ccc"><div id="g" style="display:grid;grid-template-columns:repeat(10,120px);gap:6px;padding:8px"></div><script>${code}
  const g = document.getElementById('g');
  const add = (n, s, w) => { const d = document.createElement('div'); d.style.cssText = 'background:#1b252b;border-radius:6px;padding:4px;text-align:center;' + (w ? 'grid-column:span 2' : ''); d.innerHTML = '<div style="height:110px">' + s.replace('<svg ', '<svg style="height:110px" ') + '</div>' + n; g.appendChild(d); };
  for (const c of CHAR_ORDER) add(c, ART.char(c));
  for (const id of Object.keys(ENEMIES)) add(id, ART.enemy(id, { copy: 'serin' }), ART.isBoss(id));
  add('dummy', ART.dummy()); add('voice', ART.voice());
  for (const c of CHAR_ORDER.slice(0, 5)) add('bust ' + c, ART.bust(ART.char(c)));
  add('bust butcher', ART.bust(ART.enemy('butcher'), true));
  window.done = true;
  </script></body></html>`;
  const out = path.join(process.env.SHOT_DIR, 'gallery.html');
  fs.writeFileSync(out, html);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + out);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(process.env.SHOT_DIR, 'gallery.png'), fullPage: true });
  console.log('errors', errs.length ? errs : 'none');
  await browser.close();
})();
