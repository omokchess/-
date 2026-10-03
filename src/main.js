'use strict';
/* ===== 잔향선 · 시작 ===== */
(function boot() {
  const hot = window.claude && window.claude.hot;
  const start = data => {
    if (data && data.save) { Game.s = Game.migrate(data.save); Game.save(); }
    else Game.load();
    if (hot && hot.snapshot) hot.snapshot(() => ({ save: Game.s }));
    UI.init();
    if (data && data.save) { UI.screen = 'hub'; UI.render(); }
    Cloud.init(remote => {
      const localAt = Game.s ? (Game.s.savedAt || 0) : -1;
      if (UI.screen !== 'title' || !(remote.at > localAt)) return;
      try { Game.s = Game.migrate(JSON.parse(remote.json)); localStorage.setItem(SAVE_KEY, remote.json); } catch (e) { /* 저장소를 쓸 수 없어도 메모리 저장으로 계속한다 */ }
      UI.render(); UI.toast('계정에 저장된 진행을 불러왔습니다.');
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Cloud.push(); });
  };
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
})();
