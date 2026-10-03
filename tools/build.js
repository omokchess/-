// src/* 를 하나의 HTML 로 묶는다. dist/index.html (독립 실행) + dist/artifact.html (아티팩트 게시용, 문서 뼈대 없음)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const order = ['core.js', 'engine.js', 'chars.js', 'enemies.js', 'world.js', 'game.js', 'art.js', 'fx.js', 'ui.js', 'main.js'];
const js = order.map(f => `/* ---- ${f} ---- */\n` + src(f)).join('\n');
const css = src('style.css');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">';
const title = '<title>잔향선</title>';
const body = `<div id="app"></div>\n<script>\n${js.replace(/<\/script/g, '<\\/script')}\n</script>`;
const page = `${title}\n<meta name="description" content="림버스식 합 전투를 바탕으로 한 턴제 RPG. 열 명의 승객, 열두 개의 역, 끝없는 미궁.">\n${fonts}\n<style>\n${css}\n</style>\n${body}\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), page);
const full = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${page.replace(body, '')}</head>\n<body>\n${body}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(root, 'index.html'), full);
console.log('built', (full.length / 1024).toFixed(0) + 'KB');
