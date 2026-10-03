'use strict';
/* ===== 잔향선 · 미궁 (로그라이트) ===== */

const NODE_INFO = {
  battle: { n: '전투', i: '⚔', d: '잔향 하나(또는 둘)와 싸운다. 토큰, 가끔 유물' },
  elite: { n: '정예', i: '☠', d: '정예 잔향. 이기면 유물 셋 중 하나를 고른다' },
  event: { n: '사건', i: '❓', d: '무슨 일이 일어날지 모른다' },
  rest: { n: '휴식', i: '🛏', d: '체력 30% 회복 또는 단련(이번 미궁 공격력 +6%)' },
  shop: { n: '상점', i: '🛒', d: '토큰으로 유물·소모품을 산다' },
  boss: { n: '잔향체', i: '👁', d: '다섯 층마다 기다리는 잔향체. 이기면 희귀 유물' },
};

Screens.t_lab = function () {
  const s = Game.s, r = s.lab.run;
  if (!r) {
    $('#tabc').innerHTML = `<div class="labintro"><h3>끝없는 미궁</h3><p>잔향선 아래 선로가 미궁처럼 얽혀 있다. 층마다 길을 골라 내려가며 유물을 모은다. 체력은 이어지고, 쓰러지면 그 층까지의 보상을 받는다.</p>
      <ul><li>5층마다 잔향체가 기다린다. 15층을 넘어도 끝없이 이어진다.</li><li>유물은 이번 미궁에서만 유효하다. 장비·레벨·특성·유품은 그대로 쓴다.</li><li>보상: 잔향 조각, 기억 결정, 장비 (깊을수록 많이)</li></ul>
      <div class="labbest">최고 기록 <b>${s.lab.best}층</b> · 도전 ${s.lab.runs}번</div><button class="btn" id="labGo">미궁에 들어간다</button></div>`;
    $('#labGo').onclick = () => { Game.labStart(); this.render(); };
    return;
  }
  const relics = r.relics.map(k => `<span class="relic r${RELICS[k].r}" data-tip="${tipAttr(`<b>${RELICS[k].i} ${RELICS[k].n}</b><br>${RELICS[k].d}`)}">${RELICS[k].i}</span>`).join('');
  const items = ITEM_ORDER.filter(k => r.items[k] > 0).map(k => `${ITEMS[k].i}×${r.items[k]}`).join(' ');
  $('#tabc').innerHTML = `<div class="labrun"><div class="lhead"><div class="ldepth"><small>지하</small><b>${r.depth}</b><small>층</small></div>
      <div class="lst">${bar(r.hp, r.mhp, 'php', `${fmt(r.hp)} / ${fmt(r.mhp)}`)}<div class="ltok">🪙 토큰 ${r.tok} · ${items || '소모품 없음'}${r.atkB ? ` · 공격 +${Math.round(r.atkB * 100)}%` : ''}${r.critB ? ` · 치명 +${r.critB}%` : ''}</div></div></div>
    <div class="relics">${relics || '<small class="mut">유물 없음</small>'}</div>
    <div class="sec">갈림길</div><div class="nodes">${r.nodes.map((n, i) => `<button class="node n-${n.t}" data-node="${i}"><b>${NODE_INFO[n.t].i}</b><span>${NODE_INFO[n.t].n}</span><small>${NODE_INFO[n.t].d}</small></button>`).join('')}</div>
    <button class="ghost sm" id="labQuit">여기서 돌아간다 (보상 받기)</button></div>`;
  $$('[data-node]').forEach(b => b.onclick = () => Lab.enter(r, r.nodes[+b.dataset.node]));
  $('#labQuit').onclick = () => modal('미궁을 나가 지금까지의 보상을 받을까요?', { title: '귀환', btns: [['돌아간다', () => { Lab.finish(r, true); return false; }], ['계속', null]] });
};

const Lab = {
  enter(r, n) {
    if (n.t === 'battle' || n.t === 'elite' || n.t === 'boss') return this.fight(r, n.t);
    if (n.t === 'rest') return modal('<p>모닥불 옆에 잠깐 앉았다.</p>', { title: '휴식', btns: [['쉰다 (체력 30%)', () => { r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.3); Game.labAdvance(r); Screens.render(); }], ['단련한다 (공격 +6%)', () => { r.atkB = (r.atkB || 0) + 0.06; Game.labAdvance(r); Screens.render(); }]] });
    if (n.t === 'shop') return this.shop(r);
    if (n.t === 'event') return this.event(r);
  },
  fight(r, t, after) {
    const L = Game.labBattle(r, t);
    if (r.nextEn) { L.cfg.hero.relics = L.cfg.hero.relics.concat([]); L.cfg.mods = {}; }
    const startEn = r.nextEn || 0; r.nextEn = 0;
    const curse = r.curse || 0; r.curse = 0;
    const buff = r.nextBuff; r.nextBuff = null;
    BUI.start(L.cfg, { kind: 'lab', theme: L.theme, title: `미궁 ${r.depth}층 · ${NODE_INFO[t].n}`, onEnd: (B, retreat) => this.after(r, t, B, retreat, after) });
    const B = BUI.B; if (startEn) B.energy(startEn); if (curse) B.sp(-20 * curse); if (buff) B.bf(B.p, buff, 1, 3);
  },
  after(r, t, B, retreat, after) {
    UI.screen = 'hub'; UI.tab = 'lab';
    if (B.r._phoenix) r.relics = r.relics.filter(k => k !== 'phoenix');
    if (retreat || !B.result.win) { if (!retreat) r.hp = 0; return this.finish(r, false, B); }
    const res = Game.labAfterBattle(r, B, t);
    if (after) { Screens.render(); return after(); }
    Screens.render();
    let html = `<div class="result win"><h2>돌파</h2><div class="rrow"><span>🪙 +${res.tok}</span><span>체력 12% 회복</span></div>${res.relicMsg ? `<p>${esc(res.relicMsg)}</p>` : ''}</div>`;
    if (res.relicPick && res.relicPick.length) {
      html += `<div class="sec">유물 선택</div><div class="rpick">${res.relicPick.map(k => `<button class="rp r${RELICS[k].r}" data-rk="${k}"><b>${RELICS[k].i} ${RELICS[k].n}</b><small>${RELICS[k].d}</small></button>`).join('')}</div>`;
      const m = modal(html, { title: '', btns: [['건너뛴다', () => Screens.render()]], lock: true });
      m.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { Game.labTakeRelic(r, b.dataset.rk); closeModal(); Screens.render(); toast(`${RELICS[b.dataset.rk].n} 획득`, 'good'); });
    } else modal(html, { title: '' });
  },
  shop(r) {
    const sh = Game.labShop(r);
    const draw = () => {
      const html = `<div class="ltok">🪙 토큰 ${r.tok}</div><div class="rpick">${sh.relics.map((x, i) => `<button class="rp r${RELICS[x.k].r} ${sh.bought[i] ? 'sold' : ''}" data-i="${i}" ${sh.bought[i] || r.tok < x.price ? 'disabled' : ''}><b>${RELICS[x.k].i} ${RELICS[x.k].n}</b><small>${RELICS[x.k].d}</small><span>🪙${x.price}</span></button>`).join('')}</div>
        <div class="rpick">${[['potion', 12], ['tonic', 12], ['ether', 15]].map(([k, p]) => `<button class="rp" data-it="${k}" data-p="${p}" ${r.tok < p ? 'disabled' : ''}><b>${ITEMS[k].i} ${ITEMS[k].n}</b><small>${ITEMS[k].d}</small><span>🪙${p}</span></button>`).join('')}</div>`;
      const m = modal(html, { title: '선로 상점', btns: [['떠난다', () => { r.shop = null; Game.labAdvance(r); Screens.render(); }]], lock: true });
      m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const x = sh.relics[+b.dataset.i]; if (r.tok < x.price) return; r.tok -= x.price; sh.bought[+b.dataset.i] = 1; Game.labTakeRelic(r, x.k); draw(); });
      m.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { const p = +b.dataset.p; if (r.tok < p) return; r.tok -= p; r.items[b.dataset.it] = (r.items[b.dataset.it] || 0) + 1; Game.save(); draw(); });
    };
    draw();
  },
  event(r) {
    const E = pick(LAB_EVENTS);
    const m = modal(`<p class="ev">${esc(E.t)}</p><div class="evo">${E.o.map((o, i) => `<button class="btn ghost" data-o="${i}" ${o.need && !o.need(r) ? 'disabled' : ''}>${esc(o.t)}</button>`).join('')}</div>`, { title: E.n, btns: [], lock: true });
    m.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      const o = E.o[+b.dataset.o]; closeModal();
      if (o.fight) { this.fight(r, 'battle', () => { const msg = Game.labRelic(r, 0); modal(`<p>${esc(msg)}</p>`, { title: E.n }); }); return; }
      const msg = o.f(r, Game); Game.labAdvance(r); Screens.render();
      modal(`<p>${esc(msg || '')}</p>`, { title: E.n });
    });
  },
  finish(r, alive, B) {
    const out = Game.labEnd(r, alive);
    UI.screen = 'hub'; UI.tab = 'lab'; Screens.render();
    const drops = out.drops.map(g => gearCard(g)).join('');
    modal(`<div class="result ${alive ? 'win' : 'lose'}"><h2>${alive ? '귀환' : '쓰러졌다'} — ${out.depth}층</h2><div class="rrow"><span>💠 +${out.shards}</span>${out.crystals ? `<span>🔷 +${out.crystals}</span>` : ''}<span>✨ +${fmt(out.xp)}</span>${out.levels ? `<span class="lvup">레벨 업! Lv ${Game.s.lvl}</span>` : ''}</div>${drops ? `<div class="drops">${drops}</div>` : ''}${out.ach && out.ach.length ? `<div class="achs">${out.ach.map(a => `<span>🏅 ${a.n}</span>`).join('')}</div>` : ''}</div>`, { title: '미궁 결과', cls: 'wide' });
  },
};
