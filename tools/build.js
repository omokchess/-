// src/* 를 하나의 HTML 로 묶는다. index.html (독립 실행) + dist/artifact.html (아티팩트 게시용, 문서 뼈대 없음)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const order = ['core.js', 'rig.js', 'rig_foes.js', 'stage.js', 'data_cls.js', 'data_foes.js', 'battle.js', 'world.js', 'game.js', 'fx.js', 'fx_skills.js', 'ui_core.js', 'ui_battle.js', 'ui_hub.js', 'ui_lab.js', 'main.js'];
const js = order.map(f => `/* ---- ${f} ---- */\n` + src(f)).join('\n');
const css = src('style.css');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Noto+Sans+KR:wght@400;500;700;800&display=swap">';
const title = '<title>잔향선</title>';
const body = `<div id="app"></div>\n<script>\n${js.replace(/<\/script/g, '<\\/script')}\n</script>`;
const page = `${title}\n<meta name="description" content="직업 하나로 끝까지 혼자 싸우는 일대일 턴제 RPG. 로우폴리 벡터 인물, 열 가지 직업 기믹, 열두 잔향체.">\n${fonts}\n<style>\n${css}\n</style>\n${body}\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), page);
const full = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${page.replace(body, '')}</head>\n<body>\n${body}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(root, 'index.html'), full);
console.log('built', (full.length / 1024).toFixed(0) + 'KB');
