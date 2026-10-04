// 브라우저 없이 게임 로직을 불러온다 (vm). 반환: 전역 객체
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(files) {
  const root = path.join(__dirname, '..', 'src');
  const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout, performance: { now: () => Date.now() } };
  vm.createContext(ctx);
  const list = files || ['core.js', 'data_cls.js', 'data_foes.js', 'battle.js'];
  const code = list.filter(f => fs.existsSync(path.join(root, f))).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n')
    + '\n;this.__x={CLASSES,CLASS_ORDER,SKILL,FOES,FOE_IDS,Battle,ITEMS,lvG,ST,BF,' + (list.includes('world.js') ? 'CHAPTERS,RELICS,stageList,rollGear,LAB_EVENTS,' : '') + (list.includes('game.js') ? 'Game,heroStats,' : '') + '}';
  vm.runInContext(code, ctx, { filename: 'game.js' });
  return ctx.__x;
};
