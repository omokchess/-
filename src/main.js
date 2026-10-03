'use strict';
/* ===== 잔향선 · 시작 ===== */
(function boot() {
  const start = () => {
    Game.load();
    Tip.init();
    FX.init();
    if (Game.root.cur != null && Game.s) { UI.screen = 'title'; }
    Screens.render();
    Cloud.init(remote => {
      const localAt = Game.root ? (Game.root.savedAt || 0) : -1;
      if (UI.screen !== 'title' || !(remote.at > localAt)) return;
      try { Game.root = Game.migrate(JSON.parse(remote.json)); localStorage.setItem(SAVE_KEY, remote.json); } catch (e) { /* 저장소를 쓸 수 없어도 메모리 저장으로 계속한다 */ }
      Screens.render(); toast('계정에 저장된 진행을 불러왔습니다.');
    });
    let last = Date.now();
    setInterval(() => { const n = Date.now(); if (document.visibilityState === 'visible') Game.tick(Math.round((n - last) / 1000)); last = n; if (Game.s && UI.screen !== 'battle') Game.save(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { Game.save(); Cloud.push(); } });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
