// 소스 파일을 하나의 컨텍스트로 읽어 들인다 (DOM 없는 엔진 테스트용)
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function load(files) {
  const dir = path.join(__dirname, '..', 'src');
  const code = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n');
  const ctx = { console, Math, JSON, Object, Array, Set, Map, Date, Error, String, Number, Boolean, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(code + '\n;globalThis.__x = { CHARS, ENEMIES, Battle, makeAlly, makeEnemy, G, EMO_KEYS, CHAR_ORDER, skBase, skCp };' , ctx, { filename: 'bundle.js' });
  return ctx.__x;
};
