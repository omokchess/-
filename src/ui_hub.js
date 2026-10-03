'use strict';
/* ===== 잔향선 · 타이틀 · 직업 선택 · 객차(허브) · 이야기 ===== */

const Screens = {
  render() {
    Tip.hide(); closeModal();
    const key = UI.screen + '/' + UI.tab;
    if (key !== this._lastKey) { window.scrollTo(0, 0); this._lastKey = key; }
    if (UI.screen !== 'battle' && Stage.cv) Stage.unmount();
    const f = this[UI.screen] || this.title; f.call(this);
    paintAll($('#app'));
  },

  /* ---------- 타이틀 ---------- */
  title() {
    const R = Game.root;
    const slots = R.slots.map((s, i) => {
      if (!s) return `<button class="slot empty" data-new="${i}"><b>빈 슬롯 ${i + 1}</b><small>새 여정을 시작한다</small></button>`;
      const C = CLASSES[s.cls]; const prog = Object.keys(s.story.boss).length;
      return `<div class="slot" style="--c:${C.c}"><canvas data-look="h:${s.cls}" data-bust="1" data-w="64" data-h="64"></canvas><div class="sb"><b>${C.i} ${C.n}</b><small>Lv ${s.lvl} · ${prog}/12장 · 미궁 ${s.lab.best}층 · ${fmtTime(s.playtime)}</small></div>
        <div class="sbt"><button class="btn sm" data-go="${i}">이어하기</button><button class="ghost sm" data-del="${i}">삭제</button></div></div>`;
    }).join('');
    $('#app').innerHTML = `<div class="title"><div class="tarena" id="tarena"></div>
      <div class="tlogo"><h1>잔향선</h1><div class="tsub">ECHO LINE · 혼자 타는 밤의 열차</div></div>
      <div class="tbody"><p class="tag">가라앉은 도시를 달리는 열차. 역마다 놓지 못한 감정이 형체를 얻어 기다린다.<br>직업 하나를 골라 끝까지 혼자 싸우는 일대일 턴제 RPG.</p>
      <div class="slots">${slots}</div><div class="cloud">${Cloud.state === 'on' ? '☁ 계정에 저장 중' : '💾 이 브라우저에 저장'}</div></div></div>`;
    const last = R.cur != null && R.slots[R.cur] ? R.slots[R.cur].cls : pick(CLASS_ORDER);
    Stage.mount($('#tarena'), 'ash', Object.assign({ seed: 1 }, HERO_LOOK[last]), FOE_LOOK.clockwarden);
    Stage.fps = Game.set.fps;
    $$('[data-new]').forEach(b => b.onclick = () => { UI.newSlot = +b.dataset.new; UI.screen = 'pick'; UI.pick = UI.pick || 'hemoblade'; this.render(); });
    $$('[data-go]').forEach(b => b.onclick = () => { Game.useSlot(+b.dataset.go); UI.screen = 'hub'; UI.tab = 'story'; this.render(); });
    $$('[data-del]').forEach(b => b.onclick = () => modal('이 슬롯의 모든 진행이 사라집니다. 되돌릴 수 없어요.', { title: '슬롯 삭제', btns: [['삭제', () => { Game.deleteSlot(+b.dataset.del); this.render(); }], ['취소', null]] }));
  },

  /* ---------- 직업 선택 ---------- */
  pick() {
    const id = UI.pick, C = CLASSES[id];
    const stat = (n, v) => `<div class="statb"><span>${n}</span><div class="sbar"><i style="width:${clamp((v - 0.8) / 0.5 * 100, 8, 100)}%"></i></div></div>`;
    $('#app').innerHTML = `<div class="pickscr">
      <div class="top"><button class="ghost sm" id="pBack">← 돌아가기</button><h2>직업 선택</h2><span></span></div>
      <div class="pgrid">${CLASS_ORDER.map(k => `<button class="pc ${k === id ? 'on' : ''}" data-k="${k}" style="--c:${CLASSES[k].c}"><canvas data-look="h:${k}" data-bust="1" data-w="72" data-h="72"></canvas><b>${CLASSES[k].n}</b></button>`).join('')}</div>
      <div class="pdet" style="--c:${C.c}">
        <div class="pprev" id="pprev"></div>
        <div class="pinfo"><h2>${C.i} ${C.n} <small>${C.en}</small></h2><div class="ptag">${C.tag}</div>
          <div class="pgim"><b>고유 기믹</b><p>${esc(C.gim)}</p></div><div class="pgim"><b>패시브</b><p>${esc(C.passive)}</p></div>
          <div class="pstats">${stat('체력', C.stat.hp)}${stat('공격', C.stat.atk)}${stat('방어', C.stat.def)}${stat('속도', C.stat.spd)}</div>
          <div class="pskills">${C.skills.map(s => `<div class="psk ${s.ult ? 'ult' : ''}" data-tip="${tipAttr(s.d)}"><b>${esc(s.n)}</b><small>${s.hpCost ? `🩸${Math.round(s.hpCost * 100)}%` : `⚡${s.cost}`} · Lv${s.unlock}</small><p>${esc(s.d)}</p></div>`).join('')}</div>
          <button class="btn" id="pGo">${C.n}(으)로 여정을 시작한다</button></div></div></div>`;
    $('#pBack').onclick = () => { UI.screen = 'title'; this.render(); };
    $$('.pc').forEach(b => b.onclick = () => { UI.pick = b.dataset.k; this.render(); });
    $('#pGo').onclick = () => { Game.createSlot(UI.newSlot, id); UI.screen = 'hub'; UI.tab = 'story'; this.render(); };
    this.preview($('#pprev'), id, true);
  },
  /* 작은 무대: 영웅이 기술 동작을 차례로 보여준다 */
  preview(host, cls, cycle) {
    Stage.mount(host, 'cabin', Object.assign({ seed: 2 }, HERO_LOOK[cls]), null, { preview: true });
    Stage.me.x = Stage.W * 0.5; Stage.me.sc = Math.min(2.4, Stage.H / 120);
    if (!cycle) return;
    const C = CLASSES[cls]; let i = 0;
    clearInterval(UI.pvT);
    UI.pvT = setInterval(() => { if (!Stage.me || !host.isConnected) { clearInterval(UI.pvT); return; } const s = C.skills[i++ % C.skills.length]; RIG.play(Stage.me, s.anim === 'puppet' || s.anim === 'dashSlash' ? 'slashA' : s.anim || 'cast'); }, 1500);
  },

  /* ---------- 객차 (허브) ---------- */
  hub() {
    const s = Game.s; if (!s) { UI.screen = 'title'; return this.title(); }
    const C = CLASSES[s.cls];
    const tabs = [['story', '노선'], ['lab', '미궁'], ['char', '캐릭터'], ['shop', '매점'], ['rec', '기록'], ['set', '설정']];
    $('#app').innerHTML = `<div class="hub"><div class="hhead" style="--c:${C.c}"><canvas data-look="h:${s.cls}" data-bust="1" data-w="56" data-h="56"></canvas>
      <div class="hh"><b>${C.i} ${C.n}</b> <span class="lv">Lv ${s.lvl}</span>${bar(s.xp, xpNeed(s.lvl), 'xp', s.lvl >= LV_CAP ? 'MAX' : `${fmt(s.xp)} / ${fmt(xpNeed(s.lvl))}`)}</div>
      <div class="cur"><span data-tip="잔향 조각: 장비 강화·구매">💠 ${fmt(s.shards)}</span><span data-tip="기억 결정: 기술 단계·특성 초기화">🔷 ${fmt(s.crystals)}</span></div></div>
      <div class="tabs">${tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="tabc" id="tabc"></div></div>`;
    $$('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; this.render(); });
    this['t_' + UI.tab]();
  },
  t_story() {
    const s = Game.s, nm = UI.nm && !!s.story.boss.lethe;
    const nx = Game.nextStage();
    let o = `<div class="sec">${nm ? '악몽 노선' : '잔향선 노선'} ${s.story.boss.lethe ? `<button class="ghost sm" id="nmT">${nm ? '일반 노선 보기' : '😈 악몽 노선'}</button>` : '<small>12장을 끝내면 악몽 노선이 열린다</small>'}</div>`;
    if (nx) o += `<button class="btn next" id="goNext">▶ 이어서: ${nx.ch}-${nx.k} ${esc(nx.n)} <small>Lv${nx.lv}</small></button>`;
    o += `<div class="chlist">${CHAPTERS.map(C => {
      const open = Game.chapterOpen(C.id, nm), cl = Game.cleared(C.id, nm);
      return `<div class="ch ${open ? '' : 'lock'} ${UI.openCh === C.id ? 'open' : ''}" style="--c:${C.color}"><button class="chh" data-ch="${C.id}" ${open ? '' : 'disabled'}>
        <canvas data-look="f:${C.boss}" data-bust="1" data-w="54" data-h="54" data-face="-1"></canvas><div><b>${C.id}장 ${esc(C.title)}</b><small>${esc(C.sub)} · Lv${chLv(C.id) + (nm ? NM_ADD : 0)}~</small></div>
        <span class="pips6">${Array.from({ length: 6 }, (_, i) => `<i class="${i < cl ? 'on' : ''}"></i>`).join('')}</span></button>
        ${UI.openCh === C.id && open ? `<div class="stages">${stageList(C.id, nm).map(st => { const ok = Game.stageOpen(st), done = cl >= st.k; return `<button class="stg ${done ? 'done' : ''} ${st.boss ? 'boss' : st.elite ? 'elite' : ''}" data-st="${st.id}" ${ok ? '' : 'disabled'}><b>${C.id}-${st.k}</b><span>${esc(st.n)}</span><small>Lv${st.lv} · ${st.foes.map(f => FOES[f].n).join(', ')}</small>${done ? '<i>✓</i>' : ''}</button>`; }).join('')}</div>` : ''}</div>`;
    }).join('')}</div>`;
    $('#tabc').innerHTML = o;
    const nmT = $('#nmT'); if (nmT) nmT.onclick = () => { UI.nm = !UI.nm; this.render(); };
    if (nx) $('#goNext').onclick = () => this.stageInfo(nx);
    $$('[data-ch]').forEach(b => b.onclick = () => { UI.openCh = UI.openCh === +b.dataset.ch ? null : +b.dataset.ch; this.render(); });
    $$('[data-st]').forEach(b => b.onclick = () => { const [p, k] = b.dataset.st.slice(1).split('-'); const st = stageList(+p, b.dataset.st[0] === 'n')[+k - 1]; this.stageInfo(st); });
  },
  stageInfo(st) {
    const s = Game.s, C = CH_BY_ID[st.ch];
    const uniq = [...new Set(st.foes)];
    const foes = uniq.map(id => { const D = FOES[id]; return `<div class="sfoe"><canvas data-look="f:${id}" data-w="70" data-h="80" data-face="-1"></canvas><div><b>${D.boss ? '<span class="tag boss">잔향체</span>' : D.elite ? '<span class="tag elite">정예</span>' : ''}${esc(D.n)}</b><div class="resrow">${resIcons(D.res || {})}</div><small>${esc(D.d)}</small>${GIM_HELP[id] ? `<small class="gim">기믹: ${esc(GIM_HELP[id])}</small>` : ''}</div></div>`; }).join('');
    const diff = st.lv - s.lvl;
    modal(`<div class="sinfo" style="--c:${C.color}"><div class="sh">${st.nm ? '😈 악몽 · ' : ''}${C.id}장 ${esc(C.title)} — ${st.k}. ${esc(st.n)}</div>
      <div class="sl">권장 Lv${st.lv} · 나 Lv${s.lvl} <b class="${diff > 3 ? 'bad' : diff > 0 ? 'warn' : 'good'}">${diff > 3 ? '위험' : diff > 0 ? '조금 높음' : '적정'}</b>${st.foes.length > 1 ? ` · ${st.foes.length}연전 (체력이 이어진다)` : ''}</div>
      <div class="sfoes">${foes}</div></div>`, { title: '출발 준비', btns: [['출발', () => { closeModal(); this.runStage(st); return false; }], ['닫기', null]] });
  },
  async runStage(st) {
    const s = Game.s, C = CH_BY_ID[st.ch];
    const key = (st.nm ? 'n' : 's') + st.ch;
    if (!st.nm) {
      if (st.k === 1 && !s.story.read[key + 'intro']) { await Story.play(C.intro, C); s.story.read[key + 'intro'] = 1; Game.save(); }
      if (st.story === 'mid' && !s.story.read[key + 'mid']) { await Story.play(C.mid, C); s.story.read[key + 'mid'] = 1; Game.save(); }
      if (st.story === 'bossIntro' && !s.story.read[key + 'boss']) { await Story.play(C.bossIntro, C); s.story.read[key + 'boss'] = 1; Game.save(); }
    }
    const cfg = Game.battleConfig(st);
    BUI.start(cfg, { kind: 'story', stage: st, theme: C.theme, title: `${st.nm ? '😈 ' : ''}${st.ch}-${st.k} ${st.n}`, onEnd: (B, retreat) => this.afterStage(st, B, retreat) });
  },
  async afterStage(st, B, retreat) {
    const s = Game.s, C = CH_BY_ID[st.ch];
    const out = retreat ? { win: false, xp: 0, retreat: 1, drops: [] } : Game.finish(st, B);
    if (retreat) { for (const k in s.items) s.items[k] = B.items[k] != null ? B.items[k] : s.items[k]; Game.save(); }
    if (out.win && st.boss && out.first && !st.nm) { UI.screen = 'hub'; Screens.render(); await Story.play(C.outro, C); }
    this.result(st, out, B);
  },
  result(st, out, B) {
    UI.screen = 'hub'; this.render();
    const s = Game.s;
    const drops = (out.drops || []).map(g => gearCard(g, { right: g.sold ? '<b class="sold">가방이 가득 차 판매됨</b>' : '' })).join('');
    const tr = out.trophy ? TROPHIES[out.trophy] : null;
    const nx = out.win ? Game.nextStage() : null;
    const html = `<div class="result ${out.win ? 'win' : 'lose'}"><h2>${out.win ? '승리' : out.retreat ? '퇴각' : '패배'}</h2>
      ${B ? `<div class="rstat">${B.turn}턴 · 준 피해 ${fmt(B.stats.dealt)} · 받은 피해 ${fmt(B.stats.taken)} · 완벽 방어 ${B.stats.perfect} · 흐트러짐 ${B.stats.staggers}</div>` : ''}
      <div class="rrow">${out.xp ? `<span>✨ 경험치 +${fmt(out.xp)}</span>` : ''}${out.levels ? `<span class="lvup">레벨 업! Lv ${s.lvl}</span>` : ''}${out.shards ? `<span>💠 +${out.shards}</span>` : ''}${out.crystals ? `<span>🔷 +${out.crystals}</span>` : ''}${out.item ? `<span>${ITEMS[out.item].i} ${ITEMS[out.item].n}</span>` : ''}</div>
      ${tr ? `<div class="trophy">🏆 잔향체의 유품 <b>${tr.i} ${tr.n}</b><small>${tr.d}</small></div>` : ''}
      ${drops ? `<div class="drops">${drops}</div>` : ''}
      ${out.ach && out.ach.length ? `<div class="achs">${out.ach.map(a => `<span>🏅 ${a.n}</span>`).join('')}</div>` : ''}
      ${!out.win && !out.retreat ? '<p class="mut">팁: 레벨을 올리거나, 장비를 강화하거나, 적의 기믹 안내(전투 화면 아래 줄)를 따라가 보세요.</p>' : ''}</div>`;
    const btns = [];
    if (nx && out.win) btns.push([`다음: ${nx.ch}-${nx.k} ${nx.n}`, () => { closeModal(); this.stageInfo(nx); return false; }]);
    if (!out.win && st) btns.push(['다시 도전', () => { closeModal(); this.runStage(st); return false; }]);
    btns.push(['객차로', null]);
    modal(html, { title: '', btns, cls: 'wide' });
    if (out.levels) for (let t = 0; t < 3; t++) if (Game.talOpen(t) && !s.tal[t]) { toast(`새 특성을 고를 수 있다 (캐릭터 탭)`, 'good'); break; }
  },

  /* ---------- 캐릭터 ---------- */
  t_char() {
    const s = Game.s, C = CLASSES[s.cls], st = Game.stats();
    const slot = k => { const g = s.gear[k]; return g ? gearCard(g, { right: `<div class="gbt"><button class="ghost sm" data-enh="${g.id}">강화 💠${Game.enhCost(g)}</button><button class="ghost sm" data-un="${k}">해제</button></div>` }) : `<div class="gear empty">${SLOTS[k].i} ${SLOTS[k].n} 없음</div>`; };
    const sort = (UI.bagSort || 'rar');
    const bag = s.bag.slice().sort((a, b) => sort === 'rar' ? b.rar - a.rar || b.L - a.L : sort === 'lv' ? b.L - a.L : a.slot.localeCompare(b.slot));
    const trophies = Object.keys(s.story.boss).filter(k => TROPHIES[k]);
    const skills = C.skills.map(k => { const r = s.ranks[k.id] || 1, lock = k.unlock > s.lvl, cost = Game.rankCost(k.id); return `<div class="skrow ${lock ? 'lock' : ''}"><div><b>${esc(k.n)}</b> <small>${lock ? `Lv${k.unlock}에 해금` : `${r}단계 (피해 +${(r - 1) * 10}%)`}</small><p>${esc(k.d)}</p></div>${!lock && cost ? `<button class="ghost sm" data-rank="${k.id}" ${s.crystals >= cost.cr && s.lvl >= cost.lv ? '' : 'disabled'}>🔷${cost.cr}${s.lvl < cost.lv ? ` (Lv${cost.lv})` : ''}</button>` : !lock ? '<small>최대</small>' : ''}</div>`; }).join('');
    const tal = C.tal.map((tier, t) => `<div class="tal ${Game.talOpen(t) ? '' : 'lock'}"><div class="tl">Lv${TAL_LV[t]}</div>${tier.map(x => `<button class="tbtn ${s.tal[t] === x.id ? 'on' : ''}" data-tal="${t}:${x.id}" ${Game.talOpen(t) && !s.tal[t] ? '' : 'disabled'}><b>${esc(x.n)}</b><small>${esc(x.d)}</small></button>`).join('')}</div>`).join('');
    $('#tabc').innerHTML = `<div class="charscr"><div class="cprev" id="cprev"></div>
      <div class="cst"><div class="sec">능력치 <small>전투력 ${fmt(Game.power())}</small></div><div class="stt">
        <span>체력 <b>${fmt(st.mhp)}</b></span><span>공격 <b>${st.atk}</b></span><span>방어 <b>${st.def}</b></span><span>속도 <b>${st.spd}</b></span><span>치명 <b>${st.crit}%</b></span><span>치명 피해 <b>${Math.round(st.critDmg * 100)}%</b></span></div>
        <div class="pgim"><b>${C.i} 기믹</b><p>${esc(C.gim)}</p></div><div class="pgim"><b>패시브</b><p>${esc(C.passive)}</p></div></div>
      <div class="sec">장비</div><div class="gslots">${slot('weapon')}${slot('armor')}${slot('charm')}
        <div class="gear trophy-slot">🏆 유품: ${s.trophy ? `<b>${TROPHIES[s.trophy].i} ${TROPHIES[s.trophy].n}</b> <small>${TROPHIES[s.trophy].d}</small>` : '<small>잔향체를 쓰러뜨리면 얻는다</small>'}${trophies.length > 1 ? `<select id="trSel">${trophies.map(k => `<option value="${k}" ${s.trophy === k ? 'selected' : ''}>${TROPHIES[k].n}</option>`).join('')}</select>` : ''}</div></div>
      <div class="sec">가방 <small>${s.bag.length}/${BAG_MAX}</small><span><button class="ghost sm" id="bs">${sort === 'rar' ? '등급순' : sort === 'lv' ? '레벨순' : '부위순'}</button> <button class="ghost sm" id="sellC">일반 모두 판매</button></span></div>
      <div class="bag">${bag.map(g => { return gearCard(g, { right: `<div class="gbt"><button class="btn sm" data-eq="${g.id}">장착</button><button class="ghost sm" data-enh="${g.id}">+</button><button class="ghost sm" data-sell="${g.id}">💠${SELL(g)}</button></div>` }); }).join('') || '<div class="empty">비어 있다</div>'}</div>
      <div class="sec">기술 <small>기억 결정으로 단계를 올린다</small></div><div class="skills">${skills}</div>
      <div class="sec">특성 <small>단계마다 하나</small>${s.tal.some(Boolean) ? '<button class="ghost sm" id="talR">초기화 🔷5</button>' : ''}</div><div class="tals">${tal}</div></div>`;
    this.preview($('#cprev'), s.cls, true);
    $$('[data-eq]').forEach(b => b.onclick = () => { Game.equip(b.dataset.eq); this.render(); });
    $$('[data-un]').forEach(b => b.onclick = () => { Game.unequip(b.dataset.un); this.render(); });
    $$('[data-sell]').forEach(b => b.onclick = () => { const v = Game.sell(b.dataset.sell); toast(`💠 +${v}`); this.render(); });
    $$('[data-enh]').forEach(b => b.onclick = () => { if (Game.enhance(b.dataset.enh)) toast('강화 성공!', 'good'); else toast('잔향 조각이 부족하거나 최대 강화', 'bad'); this.render(); });
    $$('[data-rank]').forEach(b => b.onclick = () => { if (Game.rankUp(b.dataset.rank)) toast('기술 단계 상승!', 'good'); this.render(); });
    $$('[data-tal]').forEach(b => b.onclick = () => { const [t, id] = b.dataset.tal.split(':'); Game.chooseTal(+t, id); this.render(); });
    const tr = $('#trSel'); if (tr) tr.onchange = () => { Game.setTrophy(tr.value); this.render(); };
    const bs = $('#bs'); if (bs) bs.onclick = () => { UI.bagSort = { rar: 'lv', lv: 'slot', slot: 'rar' }[sort]; this.render(); };
    const sc = $('#sellC'); if (sc) sc.onclick = () => { const v = Game.sellCommon(); toast(`💠 +${v}`); this.render(); };
    const tR = $('#talR'); if (tR) tR.onclick = () => { if (Game.resetTal()) toast('특성을 초기화했다'); else toast('기억 결정이 부족하다', 'bad'); this.render(); };
  },

  /* ---------- 매점 ---------- */
  t_shop() {
    const s = Game.s;
    $('#tabc').innerHTML = `<div class="sec">세린의 응급실 <small>소모품 (전투당 한 턴에 하나)</small></div>
      <div class="shop">${ITEM_ORDER.map(k => `<div class="sitem"><b>${ITEMS[k].i} ${ITEMS[k].n}</b><small>${ITEMS[k].d}</small><span>보유 ${s.items[k] || 0}</span><button class="btn sm" data-buy="${k}" ${s.shards >= ITEM_PRICE[k] ? '' : 'disabled'}>💠${ITEM_PRICE[k]}</button></div>`).join('')}</div>
      <div class="sec">시온의 공방 <small>장비 상자 (내 레벨 기준)</small></div>
      <div class="shop"><div class="sitem"><b>📦 장비 상자</b><small>무작위 부위·등급 장비 하나 (희귀 이상 확률 상승)</small><button class="btn sm" id="box" ${s.shards >= Game.gearBoxCost() ? '' : 'disabled'}>💠${Game.gearBoxCost()}</button></div></div>
      <p class="mut">강화는 캐릭터 탭의 장비 카드에서. 잔향 조각은 전투·미궁·판매로 모은다.</p>`;
    $$('[data-buy]').forEach(b => b.onclick = () => { if (Game.buyItem(b.dataset.buy)) toast('구매했다'); this.render(); });
    $('#box').onclick = () => { const g = Game.buyGearBox(); if (g) modal(gearCard(g), { title: '장비 상자', btns: [['장착', () => { Game.equip(g.id); this.render(); }], ['가방에 넣기', () => this.render()]] }); };
  },

  /* ---------- 기록 ---------- */
  t_rec() {
    const s = Game.s, sub = UI.rec || 'ach';
    let body = '';
    if (sub === 'ach') body = `<div class="achl">${ACHS.map(a => `<div class="ach ${s.ach[a.id] ? 'on' : ''}"><b>${s.ach[a.id] ? '🏅' : '🔒'} ${esc(a.n)}</b><small>${esc(a.d)}</small></div>`).join('')}</div>`;
    if (sub === 'best') body = `<div class="bestl">${FOE_IDS.map(id => { const seen = s.seen[id]; const D = FOES[id]; return `<button class="bst ${seen ? '' : 'unk'}" data-foe="${seen ? id : ''}">${seen ? `<canvas data-look="f:${id}" data-w="64" data-h="72" data-face="-1"></canvas>` : '<div class="q">?</div>'}<b>${seen ? esc(D.n) : '???'}</b><small>${D.ch}장${D.boss ? ' · 잔향체' : D.elite ? ' · 정예' : ''}</small></button>`; }).join('')}</div>`;
    if (sub === 'stat') body = `<div class="stt">${[['플레이 시간', fmtTime(s.playtime)], ['승리', s.stats.wins], ['패배', s.stats.losses], ['격파', s.stats.kills], ['완벽 방어', s.stats.perfect], ['흐트러뜨림', s.stats.staggers], ['최대 피해', fmt(s.stats.maxHit)], ['미궁 최고', s.lab.best + '층'], ['미궁 도전', s.lab.runs], ['잭팟', s.stats.jackpots]].map(([a, b]) => `<span>${a} <b>${b}</b></span>`).join('')}</div>`;
    if (sub === 'pax') body = `<div class="paxl">${CHAPTERS.filter(C => C.npc && C.npc !== 'shadow').map(C => { const on = s.story.boss[C.boss]; return `<div class="pax ${on ? '' : 'unk'}">${on ? `<canvas data-look="n:${C.npc}" data-bust="1" data-w="60" data-h="60"></canvas>` : '<div class="q">?</div>'}<div><b>${on ? SPEAKER[C.npc].n : '???'}</b><small>${on ? C.outro[C.outro.length - 1][1] : `${C.id}장을 끝내면 만날 수 있다`}</small></div></div>`; }).join('')}</div>`;
    $('#tabc').innerHTML = `<div class="subtabs">${[['ach', '업적'], ['best', '잔향 도감'], ['pax', '승객'], ['stat', '통계']].map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-rec="${k}">${n}</button>`).join('')}</div>${body}`;
    $$('[data-rec]').forEach(b => b.onclick = () => { UI.rec = b.dataset.rec; this.render(); });
    $$('[data-foe]').forEach(b => b.onclick = () => { const id = b.dataset.foe; if (!id) return; const D = FOES[id]; modal(`<div class="bdet"><canvas data-look="f:${id}" data-w="160" data-h="180" data-face="-1"></canvas><div><b>${esc(D.n)}</b><div class="resrow">${resIcons(D.res || {})}</div><p>${esc(D.d)}</p><div class="sks">${D.sk.map(k => `<small>· ${esc(k.n)}${k.ub ? ' (방어 불가)' : ''}${k.charge ? ' (준비)' : ''}</small>`).join('')}</div><small class="mut">만난 횟수 ${s.seen[id]}</small></div></div>`, { title: '잔향 도감' }); });
  },

  /* ---------- 설정 ---------- */
  t_set() {
    const S = Game.set;
    const row = (k, n, opts, d) => `<div class="setr"><div><b>${n}</b><small>${d}</small></div><div class="opts">${opts.map(([v, t]) => `<button class="${S[k] === v ? 'on' : ''}" data-set="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
    $('#tabc').innerHTML = `<div class="sets">
      ${row('qte', '방어 입력', [[true, '직접 (타이밍)'], [false, '자동']], '적이 공격할 때 막대가 지나가는 순간 눌러 방어·완벽 방어')}
      ${row('speed', '연출 속도', [[1, '×1'], [1.5, '×1.5'], [2, '×2'], [3, '×3']], '전투 화면의 속도')}
      ${row('fps', '인물 동작', [[24, '애니풍'], [60, '부드럽게']], '애니풍은 초당 24장으로 끊어 그린다')}
      ${row('shake', '화면 흔들림', [[true, '켜기'], [false, '줄이기']], '')}
      <div class="setr"><div><b>저장</b><small>${Cloud.state === 'on' ? '계정에 자동 저장 중 (다른 기기에서도 이어짐)' : '이 브라우저에만 저장'}</small></div><div class="opts"><button id="exp">내보내기</button><button id="imp">가져오기</button></div></div>
      <div class="setr"><div><b>슬롯</b><small>다른 직업으로 새 여정을 시작하거나 바꾼다</small></div><div class="opts"><button id="toTitle">타이틀로</button></div></div></div>`;
    $$('[data-set]').forEach(b => b.onclick = () => { const k = b.dataset.set; let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : +v; Game.set[k] = v; Game.save(); this.render(); });
    $('#toTitle').onclick = () => { UI.screen = 'title'; this.render(); };
    $('#exp').onclick = () => { const code = btoa(unescape(encodeURIComponent(JSON.stringify(Game.root)))); modal(`<textarea class="code" readonly>${code}</textarea><p class="mut">이 문자열을 복사해 두면 가져오기로 되살릴 수 있다.</p>`, { title: '내보내기' }); };
    $('#imp').onclick = () => { const m = modal(`<textarea class="code" id="impc" placeholder="내보내기 문자열"></textarea>`, { title: '가져오기', btns: [['가져오기', () => { try { const r = JSON.parse(decodeURIComponent(escape(atob($('#impc').value.trim())))); Game.root = Game.migrate(r); Game.save(); toast('가져왔다', 'good'); UI.screen = 'title'; Screens.render(); } catch (e) { toast('문자열이 올바르지 않다', 'bad'); return false; } }], ['취소', null]] }); void m; };
  },
};
const GIM_HELP = {
  inspector: '같은 기술을 연달아 쓰면 벌금(방어 불가 강타)', freezer: '냉기 갑옷으로 받는 피해 −40%. 화상을 걸면 녹는다', reader: '「낭독」을 준비하면 흐트러뜨려 끊어라', prompter: '매 턴 쓸 기술을 지시한다. 따르면 그가 약해지고, 어기면 내가 취약해진다',
  foreman: '보조 조립 팔이 움직이는 동안 공격 +30%. 팔을 부숴라', stationmaster: '세 턴마다 두 번 행동한다', mc: '박수가 셋 모이면 크게 강해진다. 흐트러뜨리면 초기화', demolition: '다이너마이트가 3턴 뒤 폭발한다. 부숴서 막아라',
  mender: '턴마다 체력을 회복한다. 파열이 걸려 있으면 못 한다', sundial: '낮에는 보호와 회복, 밤에는 공격 강화', otherpax: '다른 직업의 기술을 쓴다', gatekeeper: '자물쇠가 남아 있는 동안 본체 피해가 크게 준다',
  mirrorarmor: '받은 피해의 15%를 되돌린다',
  clockwarden: '시계가 12시가 되면 방어 불가 「자정의 종」. 흐트러뜨리면 −2시간, 완벽 방어 −1시간', butcher: '고기 걸이를 먹고 회복한다. 걸이(부위)를 먼저 부숴라', librarian: '수위가 차오르면 침잠·속박. 배수구(부위)를 부수면 물이 빠진다. 기술을 봉인한다',
  diva: '독무대 동안 정해진 피해를 주면 조명이 떨어져 기절. 못 하면 앙코르', masque: '가면마다 약점·내성이 바뀐다. 약점으로 세 번 치면 가면이 깨진다', express: '턴마다 가속, 속도 5에서 방어 불가 탈선. 타격 기술로 제동',
  grin: '막지 못한 공격마다 웃음이 쌓여 폭소. 정신력이 낮으면 더 아프다. 풍선을 터뜨려라', colossus: '양팔이 있는 동안 본체 피해 −55%. 팔을 부수면 기절', seamstress: '바늘땀이 쌓이면 내 피해가 나에게도 돌아오고, 셋이면 기술이 강제된다. 참격으로 끊는다',
  moons: '두 달을 모두 쓰러뜨려야 한다. 하나만 지면 3턴 뒤 되살아난다', mirror: '내가 직전에 쓴 기술을 되돌린다. 완벽 방어로 거울 조각을 깬다', lethe: '세 막. 1막은 기술을 잊게 하고, 2막은 두 번 움직이고, 3막은 9턴 제한',
};

/* ===== 이야기 재생 ===== */
const Story = {
  play(lines, C) {
    return new Promise(res => {
      if (!lines || !lines.length) return res();
      const s = Game.s;
      const ov = h('div', { class: 'story' }); document.body.appendChild(ov);
      const bg = document.createElement('canvas'); bg.className = 'sbg'; ov.appendChild(bg);
      const dpr = Math.min(2, window.devicePixelRatio || 1); bg.width = innerWidth * dpr; bg.height = innerHeight * dpr; bg.style.width = '100%'; bg.style.height = '100%';
      const bc = bg.getContext('2d'); bc.setTransform(dpr, 0, 0, dpr, 0, 0); drawBG(bc, C ? C.theme : 'cabin', innerWidth, innerHeight, dpr);
      ov.insertAdjacentHTML('beforeend', `<div class="sport"><canvas id="spc" data-w="220" data-h="260"></canvas></div><div class="sbox"><div class="sname"></div><div class="stext"></div><div class="snext">▼</div></div><button class="ghost sm sskip">건너뛰기</button>`);
      let i = -1, typing = 0, full = '';
      const nextLine = () => {
        i++; if (i >= lines.length) { ov.classList.add('out'); setTimeout(() => ov.remove(), 300); return res(); }
        const [who, txt0] = lines[i]; const txt = txt0.replace('{CLASS_INTRO}', CLASS_INTRO[s.cls] || '');
        const sp = who === 'me' ? { n: '나', c: CLASSES[s.cls].c } : who === '?' ? { n: '???', c: '#ff8787' } : SPEAKER[who] || null;
        ov.querySelector('.sname').innerHTML = sp ? `<b style="color:${sp.c}">${sp.n}</b>` : '';
        const pc = $('#spc');
        let look = null;
        if (who === 'me') look = Game.look(); else if (who === '?' && C) look = C.boss === 'mirror' ? mirrorLook() : FOE_LOOK[C.boss]; else if (who === 'shadow') look = mirrorLook(); else if (NPC_LOOK[who]) look = lookById('n:' + who);
        ov.querySelector('.sport').classList.toggle('on', !!look);
        ov.querySelector('.sport').classList.toggle('foe', who === '?' || who === 'shadow');
        if (look) paintPortrait(pc, look, { bust: !(who === '?' && !look.human), face: (who === '?' || who === 'shadow') ? -1 : 1, sc: who === '?' && !look.human ? 0.85 : 1 });
        if (who === 'voice') ov.querySelector('.sport').classList.add('on', 'voice');
        else ov.querySelector('.sport').classList.remove('voice');
        full = txt; const el = ov.querySelector('.stext'); el.textContent = ''; let k = 0; clearInterval(typing);
        el.classList.toggle('narr', !who);
        typing = setInterval(() => { k += 2; el.textContent = full.slice(0, k); if (k >= full.length) clearInterval(typing); }, 22);
      };
      ov.addEventListener('click', e => { if (e.target.closest('.sskip')) { clearInterval(typing); i = lines.length; nextLine(); return; } const el = ov.querySelector('.stext'); if (el.textContent.length < full.length) { clearInterval(typing); el.textContent = full; return; } nextLine(); });
      nextLine();
    });
  },
};
