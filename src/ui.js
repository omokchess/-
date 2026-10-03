'use strict';
/* ===== 잔향선 · 화면 ===== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SPEED_LABEL = { 1: '1×', 2: '2×', 4: '4×', 0: '즉시' };
const NODE_INFO = {
  battle: { n: '전투', d: '잔향과 맞선다. 승리하면 금화, 가끔 유물.' },
  elite: { n: '정예', d: '강한 적. 반드시 유물을 하나 고른다.' },
  event: { n: '사건', d: '무슨 일이 기다리는지 모른다.' },
  shop: { n: '상점', d: '금화로 유물과 치료를 산다.' },
  rest: { n: '휴식', d: '숨을 고른다. 회복하거나 결의를 다진다.' },
  boss: { n: '층의 끝', d: '이 층을 지키는 잔향. 이기면 다음 층으로.' },
};

function charColor(cid) { return CHARS[cid] ? CHARS[cid].color : '#888'; }
function ava(name, color, cls = '', attrs = '') { return `<div class="mono-ava ${cls}" style="--c:${color}" ${attrs}>${esc(name[0])}</div>`; }
function unitColor(u) { return u.color || (u.side === 'A' ? charColor(u.cid) : '#8f8270'); }
function skillNums(s) {
  const coins = typeof s.coins === 'function' ? '?' : s.coins;
  const cp = skCp(s);
  return `${skBase(s)} ${s.neg ? '−' : '+'}${cp}×${coins}`;
}
function kindLabel(s) { return { atk: DT[s.dt].n, guard: '방어', evade: '회피', counter: '반격' }[s.kind]; }
function tgtLabel(s) { return s.tgt === 'all' ? ' · 전체' : s.tgt > 1 ? ` · ${s.tgt}명` : ''; }

const UI = {
  app: null, screen: 'title', tab: 'route', selCh: 1, nm: false, selChar: 'serin', labDepth: 1,
  bt: null, tipEl: null, guideOpen: false,

  init() {
    this.app = document.getElementById('app');
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('keydown', e => this.onKey(e));
    document.addEventListener('mouseover', e => this.onTip(e));
    document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('[data-tip]')) this.hideTip(); });
    window.addEventListener('resize', () => { if (this.screen === 'battle') this.drawLines(); });
    setInterval(() => {
      if (!Game.s || document.visibilityState !== 'visible') return;
      Game.s.playtime += 10;
      if (Game.s.playtime % 60 === 0) Game.save();
    }, 10000);
    this.render();
  },

  /* ---------- 공통 ---------- */
  toast(t, ms = 2200) {
    $$('.toast').forEach(x => x.remove());
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  },
  modal(html, cls = '') {
    this.closeModal();
    const bg = document.createElement('div');
    bg.className = 'modal-bg'; bg.id = 'modal';
    bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bg);
    const f = bg.querySelector('button'); if (f) f.focus({ preventScroll: true });
    return bg;
  },
  closeModal() { const m = $('#modal'); if (m) m.remove(); },
  onTip(e) {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) return;
    this.hideTip();
    const t = document.createElement('div'); t.className = 'tip'; t.innerHTML = el.dataset.tip;
    document.body.appendChild(t);
    const r = el.getBoundingClientRect();
    const tw = t.offsetWidth, th = t.offsetHeight;
    let x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
    let y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    this.tipEl = t;
  },
  hideTip() { if (this.tipEl) { this.tipEl.remove(); this.tipEl = null; } },
  onKey(e) {
    if (e.key === 'Escape') {
      if ($('#modal') && !$('#modal').dataset.lock) { this.closeModal(); return; }
      if (this.bt && this.bt.pending) { this.bt.pending = null; this.renderBattle(); }
    }
    if (this.screen === 'battle' && this.bt && !this.bt.playing && !$('#modal') && !$('.story')) {
      if (e.key === 'Enter') { e.preventDefault(); this.commit(); }
      if (e.key === ' ') { e.preventDefault(); this.bt.b.autoAll(); this.renderBattle(); }
    }
  },

  /* ---------- 이야기 ---------- */
  story(lines, head) {
    return new Promise(res => {
      let i = 0;
      const el = document.createElement('div');
      el.className = 'story';
      if (head && head.color) el.style.setProperty('--ch', head.color);
      document.body.appendChild(el);
      const draw = () => {
        const [who, txt] = lines[i];
        const sp = CHARS[who] ? { n: CHARS[who].name, c: CHARS[who].color } : SPEAKER[who] || (who === '?' ? { n: '???', c: '#d8cfc0' } : null);
        el.innerHTML = `<div class="story-box">
          ${head ? `<div class="chap">${esc(head.eyebrow)}<b>${esc(head.title)}</b></div>` : ''}
          <div class="line">${sp ? `<div class="who" style="color:${sp.c}">${esc(sp.n)}</div>` : ''}<div class="txt ${sp ? '' : 'narr'}">${esc(txt)}</div></div>
          <div class="row-btns"><button class="btn ghost sm" data-s="skip">건너뛰기</button><span class="faint mono">${i + 1} / ${lines.length}</span><button class="btn pri" data-s="next">${i < lines.length - 1 ? '다음' : '닫기'}</button></div>
        </div>`;
        el.querySelector('[data-s=next]').focus({ preventScroll: true });
      };
      const done = () => { el.remove(); document.removeEventListener('keydown', key); res(); };
      const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); step(); } if (e.key === 'Escape') done(); };
      const step = () => { if (++i >= lines.length) done(); else draw(); };
      el.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) { if (e.target.closest('.line')) step(); return; } if (b.dataset.s === 'skip') done(); else step(); });
      document.addEventListener('keydown', key, true);
      draw();
    });
  },

  /* ---------- 라우팅 ---------- */
  render() {
    this.hideTip();
    if (this.screen === 'title') return this.renderTitle();
    if (this.screen === 'hub') return this.renderHub();
    if (this.screen === 'battle') return this.renderBattle();
    if (this.screen === 'lab') return this.renderLab();
  },
  go(s) { this.screen = s; window.scrollTo(0, 0); this.render(); },

  onClick(e) {
    this.hideTip();
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const a = el.dataset.a, d = el.dataset;
    const h = this.actions[a];
    if (h) { e.preventDefault(); h.call(this, d, el, e); }
  },

  actions: {
    newgame() { if (Game.hasSave()) { this.modal(`<h2>새로 시작</h2><p class="muted">지금 있는 저장 데이터를 지우고 처음부터 시작합니다.</p><div class="row-btns"><button class="btn danger" data-a="newgameYes">지우고 시작</button><button class="btn" data-a="close">취소</button></div>`); return; } this.actions.newgameYes.call(this); },
    async newgameYes() { this.closeModal(); Game.reset(); this.screen = 'hub'; this.tab = 'route'; this.render(); },
    cont() { if (Game.s || Game.load()) { this.screen = 'hub'; this.render(); } else this.toast('저장 데이터를 찾지 못했습니다.'); },
    importOpen() { this.modal(`<h2>저장 코드 불러오기</h2><p class="muted">설정 탭에서 복사해 둔 저장 코드를 붙여 넣으세요.</p><textarea class="code" id="impcode" aria-label="저장 코드"></textarea><div class="row-btns"><button class="btn pri" data-a="importDo">불러오기</button><button class="btn" data-a="close">취소</button></div>`); },
    importDo() { const v = $('#impcode').value; try { Game.importCode(v); this.closeModal(); this.toast('불러왔습니다.'); this.screen = 'hub'; this.render(); } catch (err) { this.toast('코드를 읽지 못했습니다. 전체를 빠짐없이 붙여 넣었는지 확인하세요.'); } },
    close() { this.closeModal(); },
    tab(d) { this.tab = d.t; this.render(); },
    title() { Game.save(); this.go('title'); },
    selCh(d) { this.selCh = +d.ch; this.render(); },
    nm(d) { this.nm = d.v === '1'; this.render(); },
    async stage(d) { await this.launchStage(+d.ch, +d.k, this.nm); },
    async replay(d) { const ch = CHAPTERS[+d.ch - 1]; const lines = [...ch.intro, ...ch.mid, ...ch.bossIntro, ...(Game.s.story.boss[ch.id] ? ch.outro : [])]; await this.story(lines, { eyebrow: `${ch.id}장`, title: ch.title, color: ch.color }); },
    selChar(d) { this.selChar = d.c; this.render(); },
    mast(d) { if (Game.upgradeMastery(this.selChar, +d.i)) this.toast('숙련도가 올랐습니다.'); else this.toast('기억 파편이 모자랍니다.'); this.render(); },
    asc() { if (Game.ascend(this.selChar)) this.toast('돌파했습니다. 레벨 상한이 올랐습니다.'); this.render(); },
    partyToggle(d) {
      const p = Game.s.party.slice(); const i = p.indexOf(d.c);
      if (i >= 0) { if (p.length <= 1) return this.toast('최소 한 명은 타야 합니다.'); p.splice(i, 1); }
      else { if (p.length >= Game.s.slots) return this.toast(`편성은 ${Game.s.slots}명까지입니다.`); p.push(d.c); }
      Game.setParty(p); this.render();
    },
    setSpeed(d) { Game.s.settings.speed = +d.v; Game.save(); this.render(); },
    setLines(d) { Game.s.settings.lines = d.v === '1'; Game.save(); this.render(); },
    copyCode() { const ta = $('#expcode'); const v = ta.value; if (navigator.clipboard) navigator.clipboard.writeText(v).then(() => this.toast('복사했습니다.'), () => { ta.select(); this.toast('자동 복사가 막혀 있어 코드를 선택해 두었습니다.'); }); else { ta.select(); this.toast('코드를 선택해 두었습니다.'); } },
    resetAsk() { this.modal(`<h2>진행 초기화</h2><p class="muted">모든 진행이 사라집니다. 되돌릴 수 없습니다.</p><div class="row-btns"><button class="btn danger" data-a="resetYes">초기화</button><button class="btn" data-a="close">취소</button></div>`); },
    resetYes() { this.closeModal(); Game.reset(); this.tab = 'route'; this.render(); this.toast('초기화했습니다.'); },
    labDepth(d) { this.labDepth = +d.v; this.render(); },
    labStart() { if (!Game.labOpen()) return; Game.startRun(this.labDepth); this.go('lab'); },
    labCont() { this.go('lab'); },
    labAbandonAsk() { this.modal(`<h2>미궁 포기</h2><p class="muted">지금까지 진행한 만큼만 보상을 받고 미궁을 나갑니다.</p><div class="row-btns"><button class="btn danger" data-a="labAbandon">포기</button><button class="btn" data-a="close">계속하기</button></div>`); },
    labAbandon() { this.closeModal(); const r = Game.s.lab.run; if (!r) return; const out = Game.labEnd(r, false); this.labSummary(r, out); },
    labNode(d) { this.labNode(+d.i); },
    labHub() { this.go('hub'); },

    /* 전투 */
    sel(d) { const bt = this.bt; if (!bt || bt.playing) return; const u = bt.b.byUid(+d.uid); if (!u || !bt.b.canAct(u) || (u.flags.charmed >= bt.b.turn)) return; bt.sel = u.uid; bt.pending = null; this.renderBattle(); },
    opt(d) {
      const bt = this.bt; if (!bt || bt.playing) return;
      const b = bt.b, u = b.byUid(bt.sel); if (!u) return;
      const s = b.optSkill(u, d.opt); if (!s) return;
      if (bt.pending && bt.pending.opt === d.opt) { bt.pending = null; this.renderBattle(); return; }
      if (s.kind !== 'atk') { b.setPlan(u, d.opt); bt.pending = null; this.advanceSel(); this.renderBattle(); return; }
      bt.pending = { uid: u.uid, opt: d.opt };
      this.renderBattle();
    },
    tact(d) {
      const bt = this.bt; if (!bt || bt.playing) return;
      if (!bt.pending) { this.toast('승객과 공격 기술을 먼저 고르세요.'); return; }
      const b = bt.b, e = b.eActs.find(x => x.id === d.act); if (!e) return;
      const u = b.byUid(bt.pending.uid);
      b.setPlan(u, bt.pending.opt, e.u.uid, e.id);
      bt.pending = null; this.advanceSel(); this.renderBattle();
    },
    tunit(d) {
      const bt = this.bt; if (!bt) return;
      const b = bt.b, t = b.byUid(+d.uid);
      if (!bt.pending || bt.playing) { if (t) this.inspect(t); return; }
      if (!t || !t.alive) return;
      const u = b.byUid(bt.pending.uid);
      const e = b.eActs.find(x => x.u === t && x.target === u && x.s.kind === 'atk' && !b.livingAllies().some(o => o !== u && o.plan && o.plan.tAct === x.id));
      b.setPlan(u, bt.pending.opt, t.uid, e ? e.id : null);
      bt.pending = null; this.advanceSel(); this.renderBattle();
    },
    inspect(d) { const t = this.bt && this.bt.b.byUid(+d.uid); if (t) this.inspect(t); },
    unplan() { const bt = this.bt; const u = bt && bt.b.byUid(bt.sel); if (u) { u.plan = null; bt.pending = null; this.renderBattle(); } },
    clearPlans() { const bt = this.bt; if (!bt || bt.playing) return; bt.b.livingAllies().forEach(u => { u.plan = null; }); bt.pending = null; this.renderBattle(); },
    autoPlan() { const bt = this.bt; if (!bt || bt.playing) return; bt.b.livingAllies().forEach(u => { u.plan = null; }); bt.b.autoAll(); bt.pending = null; this.renderBattle(); },
    go() { this.commit(); },
    auto() { const bt = this.bt; bt.auto = !bt.auto; Game.s.settings.auto = bt.auto; Game.save(); this.renderBattle(); if (bt.auto && !bt.playing) { bt.b.autoAll(); this.commit(); } },
    speed() { const bt = this.bt; const order = [1, 2, 4, 0]; bt.speed = order[(order.indexOf(bt.speed) + 1) % order.length]; Game.s.settings.speed = bt.speed; Game.save(); this.renderHead(); },
    skip() { if (this.bt && this.bt.playing) this.bt.skip = true; },
    lines() { Game.s.settings.lines = !Game.s.settings.lines; Game.save(); this.renderBattle(); },
    log() { this.bt.showLog = !this.bt.showLog; this.renderBattle(); },
    retreatAsk() { this.modal(`<h2>후퇴</h2><p class="muted">후퇴하면 이번 전투는 패배로 처리됩니다.</p><div class="row-btns"><button class="btn danger" data-a="retreat">후퇴</button><button class="btn" data-a="close">계속 싸운다</button></div>`); },
    retreat() { this.closeModal(); const bt = this.bt; if (!bt) return; bt.b.over = 'lose'; bt.playing = false; bt.skip = true; this.endBattle(); },
    resultOk() { this.closeModal(); if (this._afterResult) { const f = this._afterResult; this._afterResult = null; f(); } },
  },

  /* =========================== 타이틀 =========================== */
  renderTitle() {
    const has = Game.hasSave();
    this.app.innerHTML = `<div class="title-screen"><canvas id="rain" aria-hidden="true"></canvas>
      <div class="title-card">
        <div class="eyebrow">NIGHT LINE · 회색 도시 순환선</div>
        <h1>잔향선<small>ECHO&nbsp;LINE</small></h1>
        <p>놓지 못한 감정이 형체를 얻는 도시. 열 명의 승객과 함께 열두 개의 역을 지나, 종착역에서 잃어버린 것을 되찾으세요.</p>
        <div class="row-btns">
          ${has ? '<button class="btn pri" data-a="cont">이어하기</button>' : ''}
          <button class="btn ${has ? '' : 'pri'}" data-a="newgame">새로 시작</button>
          <button class="btn ghost" data-a="importOpen">저장 코드 불러오기</button>
        </div>
        <div class="ticket-stub"><span>12개 역</span><span>잔향체 12</span><span>승객 10</span></div>
      </div></div>`;
    this.rain();
  },
  rain() {
    const cv = $('#rain'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const fit = () => { cv.width = cv.clientWidth * devicePixelRatio; cv.height = cv.clientHeight * devicePixelRatio; };
    fit();
    const W = () => cv.width, H = () => cv.height;
    const lights = Array.from({ length: 40 }, () => ({ x: Math.random(), y: 0.35 + Math.random() * 0.5, l: 0.04 + Math.random() * 0.12, v: 0.002 + Math.random() * 0.006, c: Math.random() < 0.7 ? '201,164,92' : '127,182,217' }));
    const drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.01 }));
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = () => {
      if (!document.body.contains(cv)) return;
      if (cv.width !== cv.clientWidth * devicePixelRatio) fit();
      ctx.clearRect(0, 0, W(), H());
      for (const p of lights) {
        const g = ctx.createLinearGradient(p.x * W(), 0, (p.x + p.l) * W(), 0);
        g.addColorStop(0, `rgba(${p.c},0)`); g.addColorStop(1, `rgba(${p.c},.7)`);
        ctx.strokeStyle = g; ctx.lineWidth = 2 * devicePixelRatio;
        ctx.beginPath(); ctx.moveTo(p.x * W(), p.y * H()); ctx.lineTo((p.x + p.l) * W(), p.y * H()); ctx.stroke();
        if (!reduce) { p.x -= p.v; if (p.x + p.l < 0) { p.x = 1; p.y = 0.35 + Math.random() * 0.5; } }
      }
      ctx.strokeStyle = 'rgba(200,210,215,.18)'; ctx.lineWidth = 1 * devicePixelRatio;
      for (const d of drops) {
        ctx.beginPath(); ctx.moveTo(d.x * W(), d.y * H()); ctx.lineTo(d.x * W() - 6, d.y * H() + 14 * devicePixelRatio); ctx.stroke();
        if (!reduce) { d.y += d.v; d.x -= d.v * 0.3; if (d.y > 1) { d.y = -0.05; d.x = Math.random() * 1.1; } }
      }
      if (!reduce) requestAnimationFrame(frame);
    };
    frame();
  },

  /* =========================== 허브 =========================== */
  renderHub() {
    const s = Game.s;
    const tabs = [['route', '노선'], ['chars', '승객'], ['party', '편성'], ['lab', '잔향 미궁'], ['records', '기록'], ['guide', '안내'], ['settings', '설정']];
    const hours = Math.floor(s.playtime / 3600), mins = Math.floor(s.playtime % 3600 / 60);
    let body = '';
    if (this.tab === 'route') body = this.hubRoute();
    else if (this.tab === 'chars') body = this.hubChars();
    else if (this.tab === 'party') body = this.hubParty();
    else if (this.tab === 'lab') body = this.hubLab();
    else if (this.tab === 'records') body = this.hubRecords();
    else if (this.tab === 'guide') body = this.hubGuide();
    else body = this.hubSettings();
    this.app.innerHTML = `<div class="wrap">
      <div class="hub-head">
        <div class="hub-bar">
          <button class="logo btn ghost" style="border:none;padding:0" data-a="title">잔향선<span>ECHO LINE</span></button>
          <div class="wallet"><span class="shard" data-tip="<b>기억 파편</b><br>숙련도와 돌파에 쓰입니다.">기억 파편 <b>${fmt(s.shards)}</b></span><span class="crys" data-tip="<b>잔향 결정</b><br>돌파에 쓰입니다. 잔향체와 정예, 미궁에서 얻습니다.">잔향 결정 <b>${fmt(s.crystals)}</b></span><span class="muted">플레이 <b class="num">${hours}:${String(mins).padStart(2, '0')}</b></span></div>
        </div>
        <nav class="tabs" role="tablist">${tabs.map(([k, n]) => `<button class="tab ${this.tab === k ? 'on' : ''}" role="tab" aria-selected="${this.tab === k}" data-a="tab" data-t="${k}">${n}</button>`).join('')}</nav>
      </div>
      ${body}
    </div>`;
  },

  hubRoute() {
    const s = Game.s;
    if (!Game.chapterOpen(this.selCh, false)) this.selCh = 1;
    const list = CHAPTERS.map(ch => {
      const open = Game.chapterOpen(ch.id, false), clear = !!s.story.boss[ch.id];
      const done = chapterStages(ch).filter(st => Game.stageCleared(ch.id, st.k, false)).length;
      return `<button class="station ${open ? 'open' : ''} ${clear ? 'clear' : ''} ${this.selCh === ch.id ? 'sel' : ''}" style="--st-c:${ch.color}" data-a="selCh" data-ch="${ch.id}" ${open ? '' : 'disabled'}>
        <span class="dot"></span>
        <span class="nm"><b>${ch.id}. ${open ? ch.title : '???'}</b><small>${open ? ch.sub : '이전 역의 잔향체를 거두면 열립니다'}</small></span>
        <span class="tag ${s.story.nmBoss[ch.id] ? 'nm-done' : ''}">${open ? (s.story.nmBoss[ch.id] ? '악몽 완료' : `${done}/6`) : ''}</span>
      </button>`;
    }).join('');
    const ch = CHAPTERS[this.selCh - 1];
    const nmOpen = Game.chapterOpen(ch.id, true);
    if (!nmOpen) this.nm = false;
    const stages = chapterStages(ch).map(st => {
      const open = Game.stageOpen(ch.id, st.k, this.nm), cl = Game.stageCleared(ch.id, st.k, this.nm);
      const lv = this.nm ? Math.min(62, st.lvl + 6) : st.lvl;
      const foes = [...new Set(st.waves.flat())].map(id => ENEMIES[id].name);
      return `<div class="stage-ticket ${open ? '' : 'locked'} ${st.boss ? 'boss' : ''} ${this.nm ? 'nm' : ''}">
        <div class="no">${ch.id}-${st.k}</div>
        <div class="info"><b>${st.boss ? ENEMIES[ch.boss].name : st.name}</b>${st.elite ? ' <span class="badge elite">정예</span>' : ''}${st.boss ? ' <span class="badge boss">잔향체</span>' : ''}
          <small>권장 Lv ${lv} · ${st.waves.length > 1 ? `${st.waves.length}웨이브 · ` : ''}${esc(foes.slice(0, 3).join(', '))}${foes.length > 3 ? ' 외' : ''}</small></div>
        <div>${cl ? '<span class="stamp">통과</span> ' : ''}${open ? `<button class="btn sm" data-a="stage" data-ch="${ch.id}" data-k="${st.k}">${cl ? '다시' : '출발'}</button>` : ''}</div>
      </div>`;
    }).join('');
    const boss = ENEMIES[ch.boss];
    const party = Game.s.party.map(c => `${CHARS[c].name} Lv${Game.s.chars[c].lvl}`).join(' · ');
    return `<div class="split">
      <div class="panel"><div class="cap" style="margin-bottom:10px">회색 도시 순환선</div><div class="route">${list}</div></div>
      <div class="panel" style="display:grid;gap:16px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div><div class="cap" style="color:${ch.color}">${ch.id}장 · ${ch.sub}</div><h2 style="font-size:30px">${ch.title}</h2></div>
          <div class="row-btns" style="align-items:center">
            <div class="mode-switch" role="group" aria-label="난이도"><button class="${this.nm ? '' : 'on'}" data-a="nm" data-v="0">일반</button><button class="${this.nm ? 'on nm' : ''}" data-a="nm" data-v="1" ${nmOpen ? '' : 'disabled title="이 장의 잔향체를 거두면 열립니다"'}>악몽</button></div>
            <button class="btn sm ghost" data-a="replay" data-ch="${ch.id}">이야기 다시 보기</button>
          </div>
        </div>
        ${this.nm ? '<p class="muted" style="margin:0">악몽: 적 레벨 +6(최대 62), 체력 +10%, 정예·잔향체 위력 +1, 잔향체 기믹 강화. 보상 1.6배와 잔향 결정.</p>' : ''}
        <div class="stages">${stages}</div>
        <div><div class="cap">잔향체 · ${esc(boss.name)}</div><p class="muted" style="margin:6px 0 8px">${esc(boss.desc || '')}</p><div class="mech-list">${(boss.mech || []).map(m => `<div class="mech"><b>${esc(m.n)}</b><p>${esc(m.d)}</p></div>`).join('')}</div></div>
        <div class="faint" style="font-size:12px">탑승 중: ${esc(party)}</div>
      </div>
    </div>`;
  },

  hubChars() {
    const s = Game.s;
    if (!Game.owned(this.selChar)) this.selChar = Game.ownedList()[0];
    const joinAt = {}; CHAPTERS.forEach(ch => { if (ch.recruit) joinAt[ch.recruit] = ch.id; });
    const grid = CHAR_ORDER.map(cid => {
      const d = CHARS[cid], own = Game.owned(cid);
      if (!own) return `<div class="char-tile locked">${ava('?', '#333', 'q')}<div><b>???</b><small>${joinAt[cid]}장 이후 합류</small></div></div>`;
      const p = s.chars[cid];
      return `<button class="char-tile ${this.selChar === cid ? 'sel' : ''}" data-a="selChar" data-c="${cid}">${ava(d.name, d.color)}<div><b>${d.name}</b><small>${d.cls} · Lv ${p.lvl}${p.asc ? ` · ${'◆'.repeat(p.asc)}` : ''}</small></div></button>`;
    }).join('');
    return `<div class="split"><div class="panel"><div class="char-grid">${grid}</div></div><div class="panel">${this.charDetail(this.selChar)}</div></div>`;
  },
  charDetail(cid) {
    const s = Game.s, d = CHARS[cid], p = s.chars[cid];
    const u = makeAlly(cid, Game.progFor(cid));
    const cap = Game.cap(cid), need = xpNeed(p.lvl);
    const ac = Game.ascCost(cid);
    const res = Object.entries(u.res).map(([k, v]) => `<span class="res-chip ${resClass(v)}" data-tip="<b>${DT[k].n}</b> 받는 피해 ×${v}">${DT[k].s} ${resLabel(v)}</span>`).join('');
    const skills = ['s1', 's2', 's3', 'def'].map((k, i) => {
      const sk = u.sk[k], mc = Game.mastCost(cid, i);
      return `<div class="skill-line" style="--emo:${EMO[sk.emo].c}">
        <div class="slot">${SKILL_LABEL[k]}<b>${skillNums(sk)}</b></div>
        <div><h4>${esc(sk.name)} <span class="meta"><span class="emo-dot" style="--c:${EMO[sk.emo].c}"></span> ${EMO[sk.emo].n} · ${kindLabel(sk)}${tgtLabel(sk)}${sk.unbreak ? ' · 불괴' : ''}</span></h4><p>${esc(sk.d)}</p>
          <div class="meta" style="margin-top:4px">숙련 <span class="pips">${[1, 2, 3, 4, 5].map(x => `<i class="${x <= p.m[i] ? 'on' : ''}"></i>`).join('')}</span> ${p.m[i] >= 5 ? '· 부여 상태 위력 +1' : ''}</div></div>
        <div>${mc != null ? `<button class="btn sm" data-a="mast" data-i="${i}" ${s.shards >= mc ? '' : 'disabled'} data-tip="숙련 ${p.m[i] + 1}: ${['', '', '기본 위력 +1', '코인 위력 +1', '기본 위력 +1', '부여하는 상태 위력 +1'][p.m[i] + 1]}">숙련 ${fmt(mc)}</button>` : '<span class="faint mono">MAX</span>'}</div>
      </div>`;
    }).join('');
    const unl = Game.impUnlocked(cid);
    const imps = d.imps.map((im, i) => `<div class="skill-line" style="--emo:${EMO[im.emo].c};${unl[i] ? '' : 'opacity:.55'}">
      <div class="slot">각인<b>${skillNums(Object.assign({ m: 1 }, im))}</b></div>
      <div><h4>${esc(im.name)} <span class="meta">${EMO[im.emo].n} · ${DT[im.dt].n}${tgtLabel(im)}</span></h4><p>${esc(im.d)}</p><div class="meta" style="margin-top:4px">비용 ${costText(im.cost)} · 정신력 −${im.spc}${p.asc >= 4 ? ' · 돌파4: 비용 −1' : ''}</div></div>
      <div class="faint mono" style="font-size:11px">${unl[i] ? '해방' : `${im.boss}장 잔향체`}</div></div>`).join('');
    const tals = d.tal.map((t, i) => `<div class="tal ${p.asc >= (i === 0 ? 1 : 3) ? '' : 'locked'}"><span class="a">돌파${i === 0 ? 1 : 3}</span><div><b>${esc(t.n)}</b><div class="muted" style="font-size:13px">${esc(t.d)}</div></div></div>`).join('');
    return `<div class="cd-head">${ava(d.name, d.color, 'lg')}<div><div class="cap">${esc(d.cls)}</div><h2>${esc(d.name)}</h2><div class="quote">“${esc(d.quote)}”</div></div></div>
      <p class="muted" style="margin:12px 0 0">${esc(d.bio)}</p>
      <div class="stat-row"><span>레벨 <b>${p.lvl}</b> / ${cap}</span><span>체력 <b>${u.maxHp}</b></span><span>속도 <b>${u.spd[0]}–${u.spd[1]}</b></span><span>돌파 <b>${p.asc}</b>/4</span><span class="res-chips">${res}</span></div>
      <div class="xpbar" title="경험치"><i style="width:${p.lvl >= cap ? 100 : Math.round(p.xp / need * 100)}%"></i></div>
      <div class="faint mono" style="font-size:11px;margin-top:4px">${p.lvl >= cap ? '레벨 상한 · 돌파가 필요합니다' : `다음 레벨까지 ${fmt(need - p.xp)}`}</div>
      <div class="sec"><h3>고유 기믹 · ${esc(d.passive.n)}</h3><div class="mech"><p style="color:var(--ink)">${esc(d.passive.d)}</p></div></div>
      <div class="sec"><h3>기술 <span class="faint" style="font-size:12px">덱: S1×3 · S2×2 · S3×1, 매 턴 2장 중 선택</span></h3>${skills}</div>
      <div class="sec"><h3>각인 <span class="faint" style="font-size:12px">감정 자원을 쓰는 비장의 기술</span></h3>${imps}</div>
      <div class="sec"><h3>돌파 ${ac ? `<button class="btn sm ${Game.canAscend(cid) ? 'pri' : ''}" data-a="asc" ${Game.canAscend(cid) ? '' : 'disabled'}>돌파 ${p.asc + 1} · 결정 ${ac.cr} · 파편 ${fmt(ac.sh)}</button>` : '<span class="faint mono">완료</span>'}</h3>
        <div class="faint" style="font-size:12px">돌파할 때마다 레벨 상한 +10, 체력 +5%. 돌파2: 최고 속도 +1. 돌파4: 각인 비용 −1. ${p.lvl < cap ? `현재 레벨 상한(${cap})에 닿아야 돌파할 수 있습니다.` : ''}</div>
        ${tals}</div>`;
  },

  hubParty() {
    const s = Game.s;
    const slots = Array.from({ length: s.slots }, (_, i) => {
      const cid = s.party[i];
      if (!cid) return `<div class="slot-card"><span></span><span class="faint">빈 자리</span></div>`;
      const d = CHARS[cid];
      return `<button class="slot-card filled" data-a="partyToggle" data-c="${cid}" style="text-align:left">${ava(d.name, d.color)}<div><b style="font-family:var(--f-display)">${d.name}</b><div class="faint" style="font-size:12px">${d.cls} · Lv ${s.chars[cid].lvl} · 빼기</div></div></button>`;
    }).join('');
    const pool = Game.ownedList().map(cid => {
      const d = CHARS[cid], on = s.party.includes(cid);
      const emos = [...new Set(['s1', 's2', 's3'].map(k => d.sk[k].emo))].map(e => `<span class="emo-dot" style="--c:${EMO[e].c}" title="${EMO[e].n}"></span>`).join(' ');
      return `<button class="char-tile ${on ? 'sel' : ''}" data-a="partyToggle" data-c="${cid}">${ava(d.name, d.color)}<div><b>${d.name}</b><small>${d.cls} · ${DT[d.sk.s1.dt].n} · Lv ${s.chars[cid].lvl}</small><div>${emos}</div></div></button>`;
    }).join('');
    const cnt = {}; s.party.forEach(c => ['s1', 's2', 's3'].forEach(k => { const e = CHARS[c].sk[k].emo; cnt[e] = (cnt[e] || 0) + 1; }));
    const dts = {}; s.party.forEach(c => { const t = CHARS[c].sk.s1.dt; dts[t] = (dts[t] || 0) + 1; });
    return `<div style="display:grid;gap:16px">
      <div class="panel"><h3 style="margin-bottom:10px">탑승 편성 <span class="faint" style="font-size:13px;font-family:var(--f-body)">${s.party.length}/${s.slots}</span></h3><div class="slots">${slots}</div>
        <div class="stat-row"><span>감정 분포: ${EMO_KEYS.filter(k => cnt[k]).map(k => `<span class="emo-dot" style="--c:${EMO[k].c}"></span> ${EMO[k].n} ${cnt[k]}`).join(' · ') || '-'}</span><span>공격 속성: ${Object.entries(dts).map(([k, v]) => `${DT[k].n} ${v}`).join(' · ')}</span></div>
        <p class="faint" style="font-size:12px;margin:8px 0 0">같은 감정의 기술을 한 턴에 함께 쓰면 공명으로 위력이 오르고 감정 자원이 더 쌓입니다. 잔향체마다 통하는 속성이 다르니 섞어 두세요.</p></div>
      <div class="panel"><h3 style="margin-bottom:10px">승객 명단</h3><div class="char-grid">${pool}</div></div>
    </div>`;
  },

  hubLab() {
    const s = Game.s;
    if (!Game.labOpen()) return `<div class="panel"><h2>잔향 미궁</h2><p class="muted">2장 「녹슨 정육시장」의 잔향체를 거두면 열립니다.</p></div>`;
    const run = s.lab.run;
    if (run) return `<div class="panel" style="display:grid;gap:12px"><h2>잔향 미궁 · 심도 ${run.depth}</h2><p class="muted">${run.floor}층 진행 중 · 금화 ${run.gold} · 유물 ${run.relics.length}개</p><div class="row-btns"><button class="btn pri" data-a="labCont">이어서 들어가기</button><button class="btn danger" data-a="labAbandonAsk">포기하고 나오기</button></div></div>`;
    const maxD = Math.min(15, s.lab.best + 1);
    this.labDepth = clamp(this.labDepth, 1, maxD);
    const picks = Array.from({ length: 15 }, (_, i) => i + 1).map(d => `<button class="${this.labDepth === d ? 'on' : ''} ${d <= s.lab.best ? 'done' : ''}" data-a="labDepth" data-v="${d}" ${d > maxD ? 'disabled' : ''} aria-label="심도 ${d}">${d}</button>`).join('');
    const rules = DEPTHS.slice(1, this.labDepth + 1).map((r, i) => `<div><b>${i + 1}</b><span>${esc(r.d)}</span></div>`).join('');
    const L0 = Game.labBase(this.labDepth), L1 = L0 + 5;
    return `<div class="split">
      <div class="panel" style="display:grid;gap:14px">
        <div><div class="cap">끝없는 순환 구간</div><h2 style="font-size:28px">잔향 미궁</h2></div>
        <p class="muted" style="margin:0">5개 층을 내려가며 길을 고릅니다. 전투, 정예, 사건, 상점, 휴식. 체력은 층을 넘어 이어지고, 미궁 안에서 모은 유물이 파티를 바꿉니다. 같은 꾸러미 유물 3개를 모으면 세트 효과가 붙습니다.</p>
        <div><div class="cap" style="margin-bottom:6px">심도 선택 · 최고 기록 ${s.lab.best}</div><div class="depth-pick">${picks}</div></div>
        <div class="kv"><div><span>적 레벨</span><b>${L0}–${L1}</b></div><div><span>완주 보상</span><b>결정 ${3 + 2 * this.labDepth} · 파편 ${150 * this.labDepth + 200}</b></div></div>
        <div class="row-btns"><button class="btn pri" data-a="labStart">출발 · 현재 편성 ${s.party.length}명</button></div>
      </div>
      <div class="panel"><div class="cap" style="margin-bottom:8px">심도 ${this.labDepth} 규칙 (누적)</div><div class="depth-list">${rules}</div></div>
    </div>`;
  },

  hubRecords() {
    const s = Game.s;
    const got = ACHS.filter(a => s.ach[a.id]).length;
    const achs = ACHS.map(a => `<div class="ach ${s.ach[a.id] ? 'got' : 'no'}"><div><b>${esc(a.n)}</b><div class="muted" style="font-size:12px">${esc(a.d)}</div></div><span class="mono faint" style="font-size:12px">${s.ach[a.id] ? '달성' : '파편 ' + fmt(a.r)}</span></div>`).join('');
    const st = s.stats;
    const relics = RELICS.map(r => s.relicSeen[r.id] ? `<div class="relic-card tier${r.t}"><b>${esc(r.n)}</b><span class="rt">${RELIC_TAGS[r.tag].n} · ${'Ⅰ Ⅱ Ⅲ'.split(' ')[r.t - 1]}</span><span class="muted" style="font-size:12px">${esc(r.d)}</span></div>` : `<div class="relic-card" style="opacity:.4"><b>???</b><span class="rt">${RELIC_TAGS[r.tag].n}</span></div>`).join('');
    return `<div style="display:grid;gap:16px">
      <div class="panel"><h3 style="margin-bottom:10px">통계</h3><div class="kv">
        <div><span>승리</span><b>${fmt(st.wins)}</b></div><div><span>패배</span><b>${fmt(st.losses)}</b></div><div><span>합 승리</span><b>${fmt(st.clashWin)}</b></div>
        <div><span>최대 합 판수</span><b>${st.maxClash}</b></div><div><span>최대 적중 피해</span><b>${fmt(st.maxHit)}</b></div><div><span>흐트러뜨린 적</span><b>${fmt(st.staggers)}</b></div>
        <div><span>각인 사용</span><b>${fmt(st.imps)}</b></div><div><span>잭팟</span><b>${fmt(st.jackpots)}</b></div><div><span>미궁 최고 심도</span><b>${s.lab.best}</b></div>
        <div><span>출혈 부여</span><b>${fmt(st.infl.bleed || 0)}</b></div><div><span>화상 부여</span><b>${fmt(st.infl.burn || 0)}</b></div><div><span>진동 부여</span><b>${fmt(st.infl.tremor || 0)}</b></div>
      </div></div>
      <div class="panel"><h3 style="margin-bottom:10px">업적 <span class="faint" style="font-size:13px;font-family:var(--f-body)">${got}/${ACHS.length}</span></h3><div class="grid2">${achs}</div></div>
      <div class="panel"><h3 style="margin-bottom:10px">유물 도감 <span class="faint" style="font-size:13px;font-family:var(--f-body)">${Object.keys(s.relicSeen).length}/${RELICS.length}</span></h3><div class="grid2">${relics}</div></div>
    </div>`;
  },

  hubGuide() {
    const st = Object.entries(ST).filter(([k]) => k !== 'thread').map(([k, v]) => `<p><span class="k" style="color:${v.c}">${v.n}</span> ${esc(v.d)}</p>`).join('');
    return `<div class="panel"><div class="guide">
      <div><h3>한 턴의 흐름</h3><p>턴이 시작되면 모든 유닛이 속도를 굴리고, 적은 무엇을 누구에게 쓸지 미리 보여 줍니다. 승객마다 덱에서 뽑힌 기술 두 장과 방어, 해방된 각인 중 하나를 골라 적의 행동(의도)이나 적을 지정한 뒤 <span class="k">전투 개시</span>를 누르세요. 행동은 속도가 빠른 순서로 처리됩니다.</p></div>
      <div><h3>합</h3><p>내가 노린 적의 행동이 나를 향하고 있거나, 내 속도가 그 행동보다 빠르면 <span class="k">합</span>이 됩니다. 두 기술이 코인을 던져 위력을 비교하고(기본 위력 + 앞면마다 코인 위력), 진 쪽은 코인을 하나 잃습니다. 한쪽 코인이 바닥날 때까지 반복하고, 이긴 쪽은 남은 코인으로 공격합니다. 합을 많이 겨룰수록 이긴 쪽의 피해가 커집니다. 지정할 때 승률이 표시됩니다.</p></div>
      <div><h3>정신력</h3><p>정신력(−45~+45)이 높을수록 코인 앞면이 잘 나옵니다(50% + 정신력%). 합에서 이기거나 적을 쓰러뜨리면 오르고, 합에서 지거나 동료가 쓰러지면 내려갑니다. −45에 닿으면 다음 턴 <span class="k">공황</span>에 빠져 행동하지 못합니다.</p></div>
      <div><h3>흐트러짐</h3><p>체력 막대의 흰 눈금이 흐트러짐 문턱입니다. 체력이 문턱 아래로 떨어지면 흐트러져 이번 턴과 다음 턴에 행동하지 못하고, 모든 피해를 2배로 받습니다. 진동 폭발은 이 문턱을 끌어올립니다.</p></div>
      <div><h3>내성</h3><p>참격·관통·타격마다 받는 피해 배율이 다릅니다. 치명 2배, 취약 1.5배, 견딤 0.75배, 저항 0.5배, 무효 0.25배. 감정에도 내성이 있는 적이 있습니다.</p></div>
      <div><h3>공명과 각인</h3><p>한 턴에 같은 감정의 기술을 여럿 쓰면 공명이 일어나 그 기술들의 기본 위력이 오르고(최대 +3) 감정 자원이 더 쌓입니다. 감정 자원은 각 승객의 비장의 기술인 <span class="k">각인</span>에 씁니다. 각인은 정신력을 깎고, 쓴 뒤 정신력이 −20 이하이면 35% 확률로 잠식되어 아군까지 노리는 폭주가 일어납니다.</p></div>
      <div><h3>방어 기술</h3><p><span class="k">방어</span>는 처음 맞을 때 굴린 위력만큼 보호막을 세웁니다. <span class="k">회피</span>는 나를 노린 공격과 합을 겨뤄 이기면 피해를 받지 않고, 이번 턴 동안 계속 유지됩니다. <span class="k">반격</span>은 합에서 이기면 되받아칩니다.</p></div>
      <div><h3>상태</h3>${st}<p>위력과 횟수는 칩에 「위력·횟수」로 표시됩니다. 버프는 대부분 다음 턴에 적용됩니다.</p></div>
      <div><h3>성장</h3><p>레벨은 돌파 단계마다 상한이 있습니다(20/30/40/50/60). 기억 파편으로 기술 숙련도를, 잔향 결정과 파편으로 돌파를 올리세요. 전투에 나가지 않은 승객도 경험치 25%를 받습니다.</p></div>
      <div><h3>단축키</h3><p>Enter 전투 개시 · Space 전체 자동 지정 · Esc 지정 취소</p></div>
    </div></div>`;
  },

  hubSettings() {
    const s = Game.s;
    return `<div style="display:grid;gap:16px">
      <div class="panel" style="display:grid;gap:12px"><h3>전투</h3>
        <div class="row-btns" style="align-items:center"><span class="muted" style="min-width:110px">기본 연출 속도</span>${[1, 2, 4, 0].map(v => `<button class="btn sm ${s.settings.speed === v ? 'on' : ''}" data-a="setSpeed" data-v="${v}">${SPEED_LABEL[v]}</button>`).join('')}</div>
        <div class="row-btns" style="align-items:center"><span class="muted" style="min-width:110px">지정 연결선</span><button class="btn sm ${s.settings.lines ? 'on' : ''}" data-a="setLines" data-v="1">표시</button><button class="btn sm ${s.settings.lines ? '' : 'on'}" data-a="setLines" data-v="0">숨김</button></div>
      </div>
      <div class="panel" style="display:grid;gap:10px"><h3>저장 코드</h3><p class="muted" style="margin:0">${Cloud.state === 'on' ? '진행은 이 브라우저와 claude.ai 계정에 함께 자동 저장됩니다.' : '진행은 이 브라우저에 자동 저장됩니다.'} 다른 기기로 옮기거나 백업하려면 아래 코드를 복사해 두세요.</p>
        <textarea class="code" id="expcode" readonly aria-label="저장 코드">${Game.exportCode()}</textarea>
        <div class="row-btns"><button class="btn" data-a="copyCode">코드 복사</button><button class="btn" data-a="importOpen">코드 불러오기</button></div></div>
      <div class="panel" style="display:grid;gap:10px"><h3>초기화</h3><div><button class="btn danger" data-a="resetAsk">진행 초기화</button></div></div>
    </div>`;
  },

  /* =========================== 출발 =========================== */
  async launchStage(chId, k, nm) {
    const ch = CHAPTERS[chId - 1];
    const st = chapterStages(ch)[k - 1];
    const seen = Game.s.story.seen;
    const head = { eyebrow: `${ch.id}장`, title: ch.title, color: ch.color };
    if (!nm) {
      if (k === 1 && !seen['i' + chId]) { await this.story(ch.intro, head); seen['i' + chId] = 1; }
      if (st.elite && !seen['m' + chId]) { await this.story(ch.mid, head); seen['m' + chId] = 1; }
      if (st.boss && !seen['b' + chId]) { await this.story(ch.bossIntro, head); seen['b' + chId] = 1; }
      Game.save();
    }
    const cfg = Game.stageBattle(chId, k, nm);
    this.startBattle(cfg, cfg);
  },

  /* =========================== 전투 =========================== */
  startBattle(cfg, info) {
    const b = new Battle(cfg);
    this.bt = { b, info, sel: null, pending: null, playing: false, snap: null, gsnap: null, log: [], speed: Game.s.settings.speed, auto: Game.s.settings.auto, cv: null, av: null, ticker: '', skip: false, showLog: false };
    this.screen = 'battle';
    window.scrollTo(0, 0);
    this.renderBattle();
    this.nextTurn();
  },
  delay(ms) { const sp = this.bt.speed; return sp === 0 ? 0 : ms / sp; },
  advanceSel() {
    const bt = this.bt, b = bt.b;
    const list = b.livingAllies().filter(u => b.canAct(u) && !(u.flags.charmed >= b.turn));
    const nx = list.find(u => !u.plan);
    bt.sel = nx ? nx.uid : bt.sel;
  },
  async nextTurn() {
    const bt = this.bt, b = bt.b;
    const ev = b.startTurn();
    bt.log.push({ t: 'turn', n: b.turn });
    bt.playing = true;
    await this.play(ev);
    if (this.bt !== bt) return;
    bt.playing = false;
    if (b.over) return this.endBattle();
    bt.sel = null; this.advanceSel();
    bt.ticker = `<span class="t-main">${b.turn}턴</span> · 승객의 기술을 고르고 대상을 지정하세요.`;
    if (bt.auto) { b.autoAll(); this.renderBattle(); await sleep(this.delay(450) + 120); if (this.bt === bt && bt.auto && !bt.playing) this.commit(); return; }
    this.renderBattle();
  },
  async commit() {
    const bt = this.bt; if (!bt || bt.playing || bt.b.over) return;
    const b = bt.b;
    const missing = b.livingAllies().filter(u => b.canAct(u) && !u.plan && !(u.flags.charmed >= b.turn));
    if (missing.length && !bt.auto) this.toast(`${missing.map(u => u.name).join(', ')}: 자동 지정`);
    missing.forEach(u => b.autoPlan(u));
    bt.pending = null; bt.playing = true; bt.skip = false;
    this.renderBattle();
    const ev = b.resolve();
    await this.play(ev);
    if (this.bt !== bt) return;
    bt.playing = false;
    if (b.over) return this.endBattle();
    this.nextTurn();
  },

  async play(evs) {
    const bt = this.bt;
    for (const e of evs) {
      if (this.bt !== bt) return;
      this.logEvent(e);
      if (bt.skip || bt.speed === 0) continue;
      bt.snap = e.snap; bt.gsnap = e.gauges;
      await this.animate(e);
    }
    bt.snap = null; bt.gsnap = null; bt.cv = null; bt.av = null; bt.skip = false;
    if (this.bt === bt) this.renderBattle();
  },

  nameOf(uid) { const u = this.bt.b.byUid(uid); return u ? u.name : '?'; },
  logEvent(e) {
    const L = this.bt.log, n = uid => this.nameOf(uid);
    switch (e.type) {
      case 'msg': L.push(e.text); break;
      case 'clash': L.push(`⚔ ${n(e.a)}「${e.as}」 vs ${n(e.o)}「${e.os}」`); break;
      case 'clashEnd': if (e.w) L.push(`  → ${n(e.w)} 합 승리 (${e.n}판)`); break;
      case 'atk': L.push(`${n(e.u)}「${e.s}」 → ${e.t.map(n).join(', ')}`); break;
      case 'hit': L.push(`  ${n(e.t)} ${e.d} 피해${e.crit ? ' (치명타)' : ''} · ${e.res}`); break;
      case 'dot': L.push(`  ${n(e.t)} ${e.label || ST[e.k] ? (e.label || ST[e.k].n) : ''} ${e.sp ? '정신력 −' + e.sp : e.d}`); break;
      case 'die': L.push(`✝ ${n(e.t)} ${e.text || '쓰러짐'}`); break;
      case 'stag': L.push(`◇ ${n(e.t)} 흐트러짐`); break;
      case 'panic': L.push(`◇ ${n(e.t)} 공황`); break;
      case 'imp': L.push(`✦ ${n(e.u)} 각인 「${e.s}」`); break;
      case 'evade': L.push(`  ${n(e.t)} 회피 성공`); break;
      case 'reso': L.push('공명: ' + e.list.map(([k, c]) => `${EMO[k].n}×${c}`).join(', ')); break;
      default: break;
    }
  },

  floatAt(uid, text, cls = '') {
    const bt = $('#bt'), card = $(`.ucard[data-uid="${uid}"]`), fx = $('#fx');
    if (!bt || !card || !fx) return;
    const br = bt.getBoundingClientRect(), cr = card.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float ' + cls; el.textContent = text;
    el.style.left = (cr.left - br.left + cr.width / 2 + (Math.random() * 30 - 15)) + 'px';
    el.style.top = (cr.top - br.top + cr.height * 0.35) + 'px';
    fx.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  },
  shake(uid) { const c = $(`.ucard[data-uid="${uid}"]`); if (c) { c.classList.remove('hitshake'); void c.offsetWidth; c.classList.add('hitshake'); } },

  async animate(e) {
    const bt = this.bt;
    const D = ms => sleep(this.delay(ms));
    const sideL = uid => { const u = bt.b.byUid(uid); return u && u.side === 'A'; };
    switch (e.type) {
      case 'turn': bt.ticker = `<span class="t-main">${e.n}턴</span>`; this.renderStage(); this.renderHead(); this.renderUnits(); return D(200);
      case 'msg': bt.ticker = `<span class="${e.cls}">${esc(e.text)}</span>`; bt.cv = null; bt.av = null; this.renderStage(); this.renderUnits(); this.renderHead(); return D(e.cls ? 750 : 550);
      case 'clash': {
        const swap = !sideL(e.a) && sideL(e.o);
        bt.cv = { swap, L: swap ? e.o : e.a, R: swap ? e.a : e.o, Ls: swap ? e.os : e.as, Rs: swap ? e.as : e.os, Le: swap ? e.oe : e.ae, Re: swap ? e.ae : e.oe, Lp: '', Rp: '', Lf: [], Rf: [], Lc: 0, Rc: 0, w: null };
        bt.av = null; this.renderStage(); return D(260);
      }
      case 'round': {
        const cv = bt.cv; if (!cv) return;
        const a = cv.swap ? e.o : e.a, o = cv.swap ? e.a : e.o;
        cv.Lp = a.p; cv.Rp = o.p; cv.Lf = a.f; cv.Rf = o.f; cv.Lc = cv.swap ? e.oc : e.ac; cv.Rc = cv.swap ? e.ac : e.oc;
        cv.rw = e.w === 't' ? 't' : ((e.w === 'a') !== cv.swap ? 'L' : 'R');
        this.renderStage(true); return D(480);
      }
      case 'clashEnd': { const cv = bt.cv; if (cv) { cv.w = e.w === cv.L ? 'L' : e.w === cv.R ? 'R' : null; cv.n = e.n; this.renderStage(); } this.renderUnits(); return D(380); }
      case 'atk': bt.cv = null; bt.av = { u: e.u, s: e.s, t: e.t, f: [], p: '', e: e.e }; this.renderStage(); return D(200);
      case 'coin': if (bt.av) { bt.av.f.push(e.h ? 1 : 0); bt.av.p = e.p; bt.av.total = e.total; this.renderStage(true); } return D(150);
      case 'hit': this.renderUnits(); this.shake(e.t); if (e.d > 0 || !e.ab) this.floatAt(e.t, (e.d > 0 ? e.d : '0') + (e.live ? ' 실탄!' : ''), e.crit ? 'crit' : ''); if (e.ab) this.floatAt(e.t, `막음 ${e.ab}`, 'sp'); this.renderHead(); return D(230);
      case 'dot': this.renderUnits(); this.floatAt(e.t, `${e.label || (ST[e.k] ? ST[e.k].n : '')} ${e.sp ? '정신 −' + e.sp : e.d}`, 'st'); return D(200);
      case 'st': this.renderUnits(); return D(50);
      case 'buf': case 'sp': case 'shield': case 'calm': case 'recover': case 'redirect': this.renderUnits(); if (e.type === 'shield') this.floatAt(e.t, `보호막 ${e.d}`, 'heal'); return D(e.type === 'shield' ? 150 : 25);
      case 'heal': this.renderUnits(); this.floatAt(e.t, '+' + e.d, 'heal'); return D(150);
      case 'guard': this.renderUnits(); this.floatAt(e.t, `방어 ${e.d}`, 'heal'); return D(220);
      case 'evade': this.renderUnits(); this.floatAt(e.t, '회피', 'big'); return D(260);
      case 'burst': this.renderUnits(); this.floatAt(e.t, '진동 폭발', 'big'); return D(280);
      case 'stag': this.renderUnits(); this.floatAt(e.t, '흐트러짐', 'big'); return D(420);
      case 'panic': this.renderUnits(); this.floatAt(e.t, '공황', 'big'); return D(380);
      case 'die': this.renderUnits(); return D(380);
      case 'spawn': case 'revive': this.renderUnits(); return D(300);
      case 'imp': bt.ticker = `<span class="gold">✦ ${esc(this.nameOf(e.u))}의 각인 「${esc(e.s)}」</span>`; this.renderStage(); return D(500);
      case 'reso': bt.ticker = `<span class="gold">공명 · ${e.list.map(([k, c]) => `${EMO[k].n}×${c}`).join(' · ')}</span>`; this.renderStage(); this.renderHead(); return D(420);
      default: return;
    }
  },

  /* 표시용 상태 (재생 중이면 스냅샷) */
  view(u) {
    const s = this.bt.snap && this.bt.snap[u.uid];
    if (this.bt.snap && !s) return null;
    if (s) return s;
    return { hp: u.hp, maxHp: u.maxHp, sp: u.sp, alive: u.alive, stag: u.stag, panic: u.panic, sh: u.shields.reduce((a, x) => a + x.amt, 0), st: u.st, buf: u.buf, r: u.r, th: u.th, thIdx: u.thIdx };
  },

  renderBattle() {
    if (this.screen !== 'battle' || !this.bt) return;
    this.hideTip();
    if (!$('#bt')) {
      this.app.innerHTML = `<div class="battle" id="bt">
        <header class="bt-head" id="bthead"></header>
        <section class="units" id="enemies" aria-label="적"></section>
        <section class="stagebar" id="stage" aria-live="polite"></section>
        <section class="units" id="allies" aria-label="승객"></section>
        <section class="dock" id="dock"></section>
        <div id="logwrap"></div>
        <svg class="lines" id="lines" aria-hidden="true"></svg>
        <div class="fx" id="fx"></div>
      </div>`;
    }
    this.renderHead(); this.renderUnits(); this.renderStage(); this.renderDock(); this.renderLog();
    requestAnimationFrame(() => this.drawLines());
  },
  renderHead() {
    const bt = this.bt, b = bt.b, el = $('#bthead'); if (!el) return;
    const gs = bt.gsnap || b.gauges;
    const gauges = gs.map(g => `<span class="gauge" style="--g:${g.c || 'var(--brass)'}">${esc(g.n)} ${g.max ? `<span class="gbar"><i style="width:${Math.round(clamp(g.v / g.max, 0, 1) * 100)}%"></i></span>` : ''}<b>${esc(g.text != null ? g.text : g.v)}</b></span>`).join('');
    const emo = EMO_KEYS.map(k => `<span class="${b.emo[k] ? '' : 'zero'}" style="--c:${EMO[k].c}" title="${EMO[k].n} 자원"><i></i>${b.emo[k]}</span>`).join('');
    const info = bt.info;
    const where = info.kind === 'lab' ? `미궁 심도 ${Game.s.lab.run ? Game.s.lab.run.depth : ''}` : `${info.nm ? '악몽 ' : ''}${info.ch}-${info.k}`;
    el.innerHTML = `<div class="turn">${b.turn}턴<small>${esc(where)}${b.waves.length ? ` · 남은 웨이브 ${b.waves.length}` : ''}</small></div>
      <div class="gauges">${gauges}</div>
      <div class="emo-pool" aria-label="감정 자원">${emo}</div>
      <div class="bt-ctrl">
        <button class="btn sm ${bt.auto ? 'on' : ''}" data-a="auto" title="매 턴 자동 지정 후 바로 전투">자동 ${bt.auto ? '켬' : '끔'}</button>
        <button class="btn sm" data-a="speed" title="연출 속도">${SPEED_LABEL[bt.speed]}</button>
        ${bt.playing ? '<button class="btn sm" data-a="skip">넘기기</button>' : ''}
        <button class="btn sm ${Game.s.settings.lines ? 'on' : ''}" data-a="lines" title="지정 연결선">선</button>
        <button class="btn sm ${bt.showLog ? 'on' : ''}" data-a="log">기록</button>
        <button class="btn sm danger" data-a="retreatAsk">후퇴</button>
      </div>`;
  },
  chipsFor(v) {
    let h = '';
    for (const [k, s] of Object.entries(v.st || {})) {
      const d = ST[k]; if (!d) continue;
      h += `<span class="chip" style="--cc:${d.c}" data-tip="<b>${d.n}</b> 위력 ${s.p} · 횟수 ${s.c}<br>${esc(d.d)}"><em>${d.s}</em>${s.p}${k === 'thread' ? '' : '·' + s.c}</span>`;
    }
    for (const [k, x] of Object.entries(v.buf || {})) {
      if (!x) continue; const d = BF[k]; if (!d) continue;
      h += `<span class="chip bf ${d.good ? 'good' : 'bad'}" data-tip="<b>${d.n} ${x}</b> (이번 턴)<br>${esc(d.d.replace('X', x))}"><em>${d.s}</em>${x}</span>`;
    }
    return h;
  },
  hpBar(u, v) {
    const pct = v.maxHp ? clamp(v.hp / v.maxHp, 0, 1) * 100 : 0;
    const ticks = (v.th || []).map((t, i) => `<span class="th ${i < v.thIdx ? 'used' : ''}" style="left:${clamp(t / v.maxHp, 0, 1) * 100}%" title="흐트러짐 문턱 ${t}"></span>`).join('');
    const sh = v.sh ? `<span class="sh" style="width:${clamp(v.sh / v.maxHp, 0, 1) * 100}%"></span>` : '';
    return `<div class="bar"><span class="fill" style="width:${pct}%"></span>${ticks}${sh}</div>`;
  },
  spBar(v) {
    const sp = v.sp || 0;
    const w = Math.abs(sp) / 45 * 50;
    return `<div class="spbar" title="정신력 ${sp}"><i style="${sp >= 0 ? `left:50%;width:${w}%;background:var(--sp)` : `right:50%;width:${w}%;background:var(--sp-neg)`}"></i></div>`;
  },
  renderUnits() {
    const bt = this.bt, b = bt.b;
    const ee = $('#enemies'), ae = $('#allies'); if (!ee || !ae) return;
    const planning = !bt.playing;
    const pendU = bt.pending ? b.byUid(bt.pending.uid) : null;
    const claimed = new Set(b.livingAllies().filter(u => u.plan && u.plan.tAct).map(u => u.plan.tAct));
    // 적
    ee.innerHTML = b.enemies.map(u => {
      const v = this.view(u); if (!v) return '';
      if (!v.alive && !planning && !bt.snap) return '';
      if (!v.alive && planning) return '';
      const tags = (u.boss ? '<span class="badge boss">잔향체</span>' : u.elite ? '<span class="badge elite">정예</span>' : u.part ? '<span class="badge part">부위</span>' : '');
      const spdTxt = u.spdVals.length ? u.spdVals.join('·') : '–';
      const res = Object.entries(u.res).map(([k, r]) => `<span class="res-chip ${resClass(r)}" data-tip="<b>${DT[k].n}</b> 받는 피해 ×${r}">${DT[k].s}${r === 1 ? '' : ' ' + resLabel(r)}</span>`).join('');
      let intents = '';
      if (planning && v.alive) {
        intents = b.eActs.filter(a => a.u === u).map(a => {
          const s = a.s; const ec = EMO[s.emo].c;
          let win = '';
          if (pendU && s.kind === 'atk' && !a.noClash && !s.unclashable) {
            const save = pendU.plan; pendU.plan = { opt: bt.pending.opt, tUid: u.uid, tAct: a.id };
            const ci = b.clashInfo(pendU); pendU.plan = save;
            if (ci && ci.clash) { const w = Math.round(ci.est.win * 100); win = ` <span class="win ${w >= 60 ? 'hi' : w >= 40 ? 'mid' : 'lo'}">합 ${w}%</span>`; }
            else win = ' <span class="win" style="color:var(--ink3)">일방</span>';
          }
          const tgt = a.target ? `→ ${a.target.name}` : '';
          const desc = `<b>${esc(s.name)}</b> ${kindLabel(s)}${tgtLabel(s)} · ${skillNums(s)}${s.d ? '<br>' + esc(s.d) : ''}`;
          return `<button class="intent ${pendU ? 'tgt' : ''} ${claimed.has(a.id) ? 'claimed' : ''}" style="--ec:${ec}" data-a="tact" data-act="${a.id}" data-tip="${esc(desc)}">
            <span class="s">${a.spd}</span><span class="n"><b>${esc(s.name)}</b>${win}<small>${esc(tgt)} · ${kindLabel(s)}${tgtLabel(s)} ${skillNums(s)}</small></span></button>`;
        }).join('');
        if (!intents && (u.stag || b.isPanicked(u))) intents = `<div class="faint" style="font-size:12px">${u.stag ? '흐트러져 행동하지 못한다' : '공황'}</div>`;
      }
      const mult = pendU && planning ? b.dmgPreview(pendU, u, b.optSkill(pendU, bt.pending.opt)) : null;
      return `<div class="ucard enemy ${v.alive ? '' : 'dead'} ${v.stag ? 'stag' : ''} ${pendU && v.alive ? 'tgt' : ''}" data-uid="${u.uid}" data-a="tunit">
        <div class="uc-top">${ava(u.name, unitColor(u), '', `data-a="inspect" data-uid="${u.uid}" title="정보"`)}<div class="uc-name"><b>${esc(u.name)}${tags}</b><small>Lv ${u.lvl}${mult != null ? ` · 예상 피해 ×${mult.toFixed(2)}` : ''}</small></div><div class="spd ${u.spdVals.length > 1 ? 'multi' : ''}" title="속도">${spdTxt}</div></div>
        ${this.hpBar(u, v)}
        <div class="hp-txt"><span>${fmt(v.hp)} / ${fmt(v.maxHp)}</span><span>${u.hasSP ? `정신 ${v.sp > 0 ? '+' : ''}${v.sp}` : ''}${v.stag ? ' · 흐트러짐' : ''}${v.panic && v.panic <= b.turn ? ' · 공황' : ''}</span></div>
        ${u.hasSP ? this.spBar(v) : ''}
        <div class="chips"><span class="res-chips">${res}</span>${this.chipsFor(v)}</div>
        ${intents ? `<div class="intents">${intents}</div>` : ''}
      </div>`;
    }).join('');
    // 아군
    const cnt = planning ? b.resonance() : {};
    ae.innerHTML = b.allies.map(u => {
      const v = this.view(u); if (!v) return '';
      const d = CHARS[u.cid];
      const charmed = u.flags.charmed && u.flags.charmed >= b.turn;
      const rd = d.rdisp ? d.rdisp(Object.assign({}, u, { r: v.r, sp: v.sp, maxHp: v.maxHp })) : [];
      const rdisp = rd.map(r => r.max > 1 ? `<span class="rp" style="--c:${r.c}">${r.n} <b class="num">${r.v}</b><i style="--w:${clamp(r.v / r.max, 0, 1) * 100}%"></i>${r.tag ? ` <span class="rt" style="--c:${r.c}">${esc(r.tag)}</span>` : ''}</span>` : `<span class="rp"><span class="rt" style="--c:${r.c}">${esc(r.tag || r.n)}</span></span>`).join('');
      let plan = '';
      if (planning && v.alive) {
        if (charmed) plan = '<div class="plan-line" style="color:#f0b38c">군중에 동화됨 · 아군을 공격한다</div>';
        else if (!b.canAct(u)) plan = `<div class="plan-line faint">${u.stag ? '흐트러짐 · 행동 불가' : '공황 · 행동 불가'}</div>`;
        else if (u.plan) {
          const s = b.optSkill(u, u.plan.opt) || u.sk.s1;
          const t = u.plan.tUid ? b.byUid(u.plan.tUid) : null;
          let cl = '';
          if (s && s.kind === 'atk') { const ci = b.clashInfo(u); cl = ci ? (ci.clash ? `<span class="clash">합 ${Math.round(ci.est.win * 100)}%${ci.redirect ? ' · 가로채기' : ''}</span>` : `<span class="faint">${esc(ci.reason)}</span>`) : '<span class="faint">일방 공격</span>'; }
          const r = s ? b.resoBonus(cnt, s.emo) : 0;
          plan = `<div class="plan-line"><span class="emo-dot" style="--c:${EMO[s.emo].c}"></span><b>${esc(s.name)}</b>${t ? `→ ${esc(t.name)}` : ''} ${cl}${r ? ` <span class="gold" style="color:var(--brass)">공명+${r}</span>` : ''}</div>`;
        } else plan = '<div class="plan-line faint">미지정</div>';
      }
      return `<div class="ucard ally ${bt.sel === u.uid && planning ? 'sel' : ''} ${u.plan && planning ? 'planned' : ''} ${v.alive ? '' : 'dead'} ${v.stag ? 'stag' : ''} ${v.panic && v.panic <= b.turn ? 'panic' : ''}" data-uid="${u.uid}" data-a="sel">
        <div class="uc-top">${ava(u.name, u.color, '', `data-a="inspect" data-uid="${u.uid}" title="정보"`)}<div class="uc-name"><b>${esc(u.name)}</b><small>${esc(u.cls)} · Lv ${u.lvl}</small></div><div class="spd" title="속도">${u.spdVals[0] || '–'}</div></div>
        ${this.hpBar(u, v)}
        <div class="hp-txt"><span>${fmt(v.hp)} / ${fmt(v.maxHp)}</span><span>정신 ${v.sp > 0 ? '+' : ''}${v.sp}</span></div>
        ${this.spBar(v)}
        ${rdisp ? `<div class="rdisp">${rdisp}</div>` : ''}
        <div class="chips">${this.chipsFor(v)}</div>
        ${plan}
      </div>`;
    }).join('');
  },
  renderStage(flip) {
    const bt = this.bt, el = $('#stage'); if (!el) return;
    if (bt.cv) {
      const cv = bt.cv;
      const coins = (f, c) => { const arr = []; for (let i = 0; i < c; i++) arr.push(`<span class="coin ${f[i] === 1 ? 'h' : f[i] === 0 ? 't' : ''} ${flip ? 'flip' : ''}"></span>`); return arr.join(''); };
      const sideCls = s => cv.w ? (cv.w === s ? 'win' : 'lose') : (cv.rw === s ? 'win' : cv.rw && cv.rw !== 't' ? 'lose' : '');
      el.innerHTML = `<div class="clashview">
        <div class="cv-side ${sideCls('L')}"><span class="who" style="color:${EMO[cv.Le].c}">${esc(this.nameOf(cv.L))}</span><span class="sk">${esc(cv.Ls)}</span><div class="coins">${coins(cv.Lf, cv.Lc)}</div><span class="cv-pow">${cv.Lp === '' ? '·' : cv.Lp}</span></div>
        <div class="cv-mid">${cv.w ? `${cv.n}판<br>${cv.w === 'L' ? '◀ 승' : '승 ▶'}` : '합'}</div>
        <div class="cv-side r ${sideCls('R')}"><span class="who" style="color:${EMO[cv.Re].c}">${esc(this.nameOf(cv.R))}</span><span class="sk">${esc(cv.Rs)}</span><div class="coins">${coins(cv.Rf, cv.Rc)}</div><span class="cv-pow">${cv.Rp === '' ? '·' : cv.Rp}</span></div>
      </div>`;
    } else if (bt.av) {
      const av = bt.av;
      el.innerHTML = `<div class="clashview"><div class="cv-side"><span class="who" style="color:${EMO[av.e].c}">${esc(this.nameOf(av.u))}</span><span class="sk">${esc(av.s)} → ${esc(av.t.map(x => this.nameOf(x)).join(', '))}</span><div class="coins">${av.f.map(h => `<span class="coin ${h ? 'h' : 't'} ${flip ? 'flip' : ''}"></span>`).join('')}</div></div><div class="cv-mid">공격</div><div class="cv-side r"><span class="cv-pow">${av.p === '' ? '·' : av.p}</span></div></div>`;
    } else el.innerHTML = `<div class="ticker">${bt.ticker || ''}</div>`;
  },
  renderDock() {
    const bt = this.bt, b = bt.b, el = $('#dock'); if (!el) return;
    if (bt.playing) { el.innerHTML = `<div class="dock-head"><span class="hint">전투 진행 중…</span><button class="btn sm" data-a="skip">넘기기</button></div>`; return; }
    const u = bt.sel ? b.byUid(bt.sel) : null;
    const cnt = b.resonance();
    const reso = Object.entries(cnt).filter(([, n]) => n >= 2).map(([k, n]) => `<span class="chip" style="--cc:${EMO[k].c}">${EMO[k].n}×${n} +${b.resoBonus(cnt, k)}</span>`).join('');
    const planned = b.livingAllies().filter(x => b.canAct(x) && !(x.flags.charmed >= b.turn));
    const nPlanned = planned.filter(x => x.plan).length;
    let opts = '';
    let head = '<span class="hint">승객 카드를 눌러 기술을 고르세요.</span>';
    if (u && b.canAct(u)) {
      const list = b.allyOptions(u);
      head = `<span class="who">${esc(u.name)} <span class="faint" style="font-size:12px;font-family:var(--f-body)">속도 ${u.spdVals[0]} · 정신 ${u.sp > 0 ? '+' : ''}${u.sp} · ${bt.pending ? '<span style="color:var(--brass)">대상을 고르세요: 적의 의도를 누르면 합, 적 카드를 누르면 그 적을 공격</span>' : '기술을 고르세요'}</span></span>${u.plan ? '<button class="btn sm ghost" data-a="unplan">지정 취소</button>' : ''}`;
      opts = list.map(o => {
        const s = o.s;
        const isImp = o.src === 'imp';
        const afford = !isImp || b.canAfford(u, s);
        const dis = o.sealed || !afford;
        const label = o.src === 'hand' ? SKILL_LABEL[s.key] : o.src === 'def' ? '방어' : '각인';
        const on = (bt.pending && bt.pending.opt === o.opt) || (!bt.pending && u.plan && u.plan.opt === o.opt);
        return `<button class="opt ${on ? 'on' : ''} ${isImp ? 'imp' : ''}" style="--emo:${EMO[s.emo].c}" data-a="opt" data-opt="${o.opt}" ${dis ? 'disabled' : ''}>
          <span class="o1"><span>${label}${o.sealed ? ' · 봉인' : ''}</span><span>${EMO[s.emo].n} · ${kindLabel(s)}${tgtLabel(s)}</span></span>
          <span class="o2">${esc(s.name)}</span>
          <span class="o3">${skillNums(s)}${b.resoBonus(cnt, s.emo) && u.plan && b.optSkill(u, u.plan.opt) === s ? ` (+${b.resoBonus(cnt, s.emo)})` : ''}</span>
          ${isImp ? `<span class="cost">${costText(s.cost)} · 정신 −${s.spc}${afford ? '' : ' · 자원 부족'}</span>` : ''}
          <span class="o4">${esc(s.d || '')}</span>
        </button>`;
      }).join('');
    } else if (u) head = `<span class="hint">${esc(u.name)}은(는) 이번 턴 행동할 수 없습니다.</span>`;
    el.innerHTML = `<div class="dock-head">${head}<div class="reso">${reso}</div></div>
      ${opts ? `<div class="opts">${opts}</div>` : ''}
      <div class="dock-foot"><div class="row-btns"><button class="btn sm" data-a="autoPlan" title="Space">전체 자동 지정</button><button class="btn sm ghost" data-a="clearPlans">지정 초기화</button></div>
      <button class="btn pri go" data-a="go" title="Enter">전투 개시 <span class="mono" style="font-size:12px;opacity:.7">${nPlanned}/${planned.length}</span></button></div>`;
  },
  renderLog() {
    const bt = this.bt, el = $('#logwrap'); if (!el) return;
    if (!bt.showLog) { el.innerHTML = ''; return; }
    const lines = bt.log.slice(-160).map(x => typeof x === 'string' ? `<div>${esc(x)}</div>` : `<div class="lt">— ${x.n}턴 —</div>`).join('');
    el.innerHTML = `<div class="logbox" id="logbox">${lines}</div>`;
    const lb = $('#logbox'); lb.scrollTop = lb.scrollHeight;
  },
  drawLines() {
    const svg = $('#lines'), root = $('#bt');
    if (!svg || !root || !this.bt) return;
    const bt = this.bt, b = bt.b;
    if (!Game.s.settings.lines || bt.playing) { svg.innerHTML = ''; return; }
    const R = root.getBoundingClientRect();
    const pt = (el, where) => { const r = el.getBoundingClientRect(); return { x: r.left - R.left + r.width / 2, y: where === 'top' ? r.top - R.top : r.bottom - R.top }; };
    let h = '';
    const curve = (a, c, color, w, dash, op) => {
      const my = (a.y + c.y) / 2;
      h += `<path d="M${a.x},${a.y} C${a.x},${my} ${c.x},${my} ${c.x},${c.y}" fill="none" stroke="${color}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="${op}"/>`;
    };
    for (const a of b.eActs) {
      if (!a.u.alive || !a.target || a.s.kind !== 'atk') continue;
      const from = $(`.intent[data-act="${a.id}"]`), to = $(`.ucard[data-uid="${a.target.uid}"]`);
      if (!from || !to) continue;
      curve(pt(from, 'bottom'), pt(to, 'top'), EMO[a.s.emo].c, 1.5, '4 4', 0.55);
    }
    for (const u of b.livingAllies()) {
      if (!u.plan || !u.plan.tUid) continue;
      const from = $(`.ucard[data-uid="${u.uid}"]`);
      const to = u.plan.tAct ? $(`.intent[data-act="${u.plan.tAct}"]`) : $(`.ucard[data-uid="${u.plan.tUid}"]`);
      if (!from || !to) continue;
      const ci = b.clashInfo(u);
      curve(pt(from, 'top'), pt(to, 'bottom'), ci && ci.clash ? '#c9a45c' : '#b0aa98', ci && ci.clash ? 2.5 : 1.5, ci && ci.clash ? '' : '2 3', 0.85);
    }
    svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
    svg.innerHTML = h;
  },

  inspect(u) {
    const b = this.bt ? this.bt.b : null;
    const res = Object.entries(u.res).map(([k, r]) => `<span class="res-chip ${resClass(r)}">${DT[k].n} ×${r} ${resLabel(r)}</span>`).join(' ');
    const emoRes = Object.entries(u.emoRes || {}).map(([k, r]) => `<span class="res-chip ${resClass(r)}">${EMO[k].n} ×${r}</span>`).join(' ');
    const st = Object.entries(u.st).map(([k, s]) => ST[k] ? `<div class="mech"><b style="color:${ST[k].c}">${ST[k].n} ${s.p}·${s.c}</b><p>${esc(ST[k].d)}</p></div>` : '').join('');
    let body = '';
    if (u.side === 'E') {
      const d = u.def;
      body = `${d.desc ? `<p class="muted" style="margin:0">${esc(d.desc)}</p>` : ''}
        ${(d.mech || []).length ? `<div class="sec" style="margin-top:4px"><h3>기믹</h3><div class="mech-list">${d.mech.map(m => `<div class="mech"><b>${esc(m.n)}</b><p>${esc(m.d)}</p></div>`).join('')}</div></div>` : ''}
        <div class="sec" style="margin-top:4px"><h3>기술</h3>${u.skills.map(s => `<div class="skill-line" style="--emo:${EMO[s.emo].c};grid-template-columns:70px minmax(0,1fr)"><div class="slot">${kindLabel(s)}<b>${skillNums(s)}</b></div><div><h4>${esc(s.name)}<span class="meta">${EMO[s.emo].n}${tgtLabel(s)}</span></h4>${s.d ? `<p>${esc(s.d)}</p>` : ''}</div></div>`).join('')}</div>`;
    } else {
      const d = CHARS[u.cid];
      body = `<div class="mech"><b>${esc(d.passive.n)}</b><p>${esc(d.passive.d)}</p></div>`;
    }
    this.modal(`<div class="cd-head">${ava(u.name, unitColor(u), 'lg')}<div><div class="cap">${u.side === 'A' ? esc(u.cls) : (u.boss ? '잔향체' : u.elite ? '정예' : u.part ? '부위' : '잔향')} · Lv ${u.lvl}</div><h2>${esc(u.name)}</h2></div></div>
      <div class="stat-row"><span>체력 <b>${fmt(u.hp)}/${fmt(u.maxHp)}</b></span>${u.hasSP ? `<span>정신력 <b>${u.sp}</b></span>` : '<span class="faint">정신력 없음</span>'}<span>속도 <b>${u.spd[0]}–${u.spd[1]}</b>${u.slots > 1 ? ` · 행동 ${u.slots}회` : ''}</span><span>흐트러짐 문턱 <b>${u.th.slice(u.thIdx).map(v => fmt(v)).join(', ') || '없음'}</b></span></div>
      <div>${res} ${emoRes}</div>
      ${st ? `<div class="mech-list">${st}</div>` : ''}
      ${body}
      <div class="row-btns"><button class="btn" data-a="close">닫기</button></div>`);
    void b;
  },

  endBattle() {
    const bt = this.bt, b = bt.b, info = bt.info;
    if (bt.ended) return; bt.ended = true;
    bt.playing = false;
    this.renderBattle();
    if (info.kind === 'lab') return this.labBattleEnd(b, info.node);
    const res = Game.finishBattle(b, info);
    this.resultModal(res, async () => {
      this.bt = null;
      const ch = CHAPTERS[info.ch - 1];
      if (res.win && info.stage.boss && !info.nm && !Game.s.story.seen['o' + info.ch]) {
        await this.story(ch.outro, { eyebrow: `${ch.id}장 · 종료`, title: ch.title, color: ch.color });
        Game.s.story.seen['o' + info.ch] = 1; Game.save();
        if (info.ch < 12) this.selCh = info.ch + 1;
      }
      this.screen = 'hub'; this.tab = 'route'; this.render();
    });
  },
  resultModal(res, after, extra = '') {
    const ups = Object.entries(res.ups || {}).map(([cid, n]) => `<div><span>${CHARS[cid].name} 레벨 업</span><b>+${n} → Lv ${Game.s.chars[cid].lvl}</b></div>`).join('');
    const unl = (res.unlocks || []).map(t => `<div class="unlock">✦ ${esc(t)}</div>`).join('');
    const ach = (res.ach || []).map(a => `<div class="unlock">업적 「${esc(a.n)}」 · 파편 +${fmt(a.r)}</div>`).join('');
    this._afterResult = after;
    const m = this.modal(`<div class="big ${res.win ? '' : 'lose'}">${res.win ? '승리' : '패배'}</div>
      ${res.win ? `<div class="reward-list">
        <div><span>경험치${res.first ? ' (첫 통과 보너스)' : ''}</span><b>+${fmt(res.xp)}</b></div>
        <div><span>기억 파편</span><b>+${fmt(res.sh)}</b></div>
        ${res.cr ? `<div><span>잔향 결정</span><b>+${res.cr}</b></div>` : ''}
        ${res.gold ? `<div><span>금화</span><b>+${res.gold}</b></div>` : ''}
        ${ups}</div>` : '<p class="muted" style="margin:0">편성과 내성을 다시 살펴보세요. 레벨을 올리거나 숙련도를 높이면 합에서 이기기 쉬워집니다.</p>'}
      ${unl}${ach}${extra}
      <div class="row-btns"><button class="btn pri" data-a="resultOk">계속</button></div>`);
    m.dataset.lock = '1';
  },

  /* =========================== 미궁 =========================== */
  labApi(run) {
    const self = this;
    return {
      relicChoice(t) { run.pendingRelic = Math.max(run.pendingRelic || 0, t || 1); },
      hurtAll(f) { for (const c of run.team) run.hp[c] = Math.max(0.05, (run.hp[c] || 0) - f); },
      healAll(f) { for (const c of run.team) run.hp[c] = Math.min(1, (run.hp[c] || 0) + f); },
      metaShards(n) { Game.s.shards += n; },
      metaCrystals(n) { Game.s.crystals += n; },
      self,
    };
  },
  renderLab() {
    const s = Game.s, run = s.lab.run;
    if (!run) { this.screen = 'hub'; this.tab = 'lab'; return this.renderHub(); }
    const track = Array.from({ length: 5 }, (_, i) => `<i class="${i + 1 < run.floor ? 'done' : i + 1 === run.floor ? 'cur' : ''}"></i>`).join('');
    const team = run.team.map(cid => {
      const d = CHARS[cid], f = run.hp[cid] == null ? 1 : run.hp[cid];
      return `<div class="m">${ava(d.name, d.color)}<div><b style="font-family:var(--f-display)">${d.name}</b> <span class="faint mono" style="font-size:11px">Lv ${s.chars[cid].lvl}</span><div class="bar" style="margin-top:4px"><span class="fill" style="width:${f * 100}%;background:linear-gradient(90deg,#4f9a6f,#6bc08e)"></span></div></div></div>`;
    }).join('');
    const tagCnt = {}; run.relics.forEach(id => { const t = RELIC[id].tag; tagCnt[t] = (tagCnt[t] || 0) + 1; });
    const relics = run.relics.map(id => { const r = RELIC[id]; return `<span class="relic-tag t${r.t}" data-tip="<b>${esc(r.n)}</b> · ${RELIC_TAGS[r.tag].n}<br>${esc(r.d)}">${esc(r.n)}</span>`; }).join('') || '<span class="faint">아직 유물이 없습니다.</span>';
    const sets = Object.entries(tagCnt).map(([t, n]) => `<span class="chip ${n >= 3 ? 'res' : ''}" title="${n >= 3 ? '세트 효과: ' + SET_DESC[t] : '3개 모으면: ' + SET_DESC[t]}">${RELIC_TAGS[t].n} ${n}/3${n >= 3 ? ' ✦' : ''}</span>`).join('');
    const nodes = run.offer.map((nd, i) => {
      const ni = NODE_INFO[nd.type];
      const title = nd.type === 'boss' ? (run.floor === 5 ? '마지막 잔향체' : `${run.floor}층 수문장`) : ni.n;
      return `<button class="node ${nd.type}" data-a="labNode" data-i="${i}"><span class="nt">${run.floor}-${run.step}</span><b>${title}</b><p>${ni.d}</p>${['battle', 'elite', 'boss'].includes(nd.type) ? `<p class="mono" style="font-size:11px">적 Lv ${Game.labLevel(run, run.nextLv || 0)}${nd.type === 'boss' ? '+' : ''}</p>` : ''}</button>`;
    }).join('');
    this.app.innerHTML = `<div class="wrap">
      <div class="lab-head"><div><div class="cap">잔향 미궁 · 심도 ${run.depth}</div><h2>${run.floor}층 <span class="faint" style="font-size:16px">· ${run.step}/5</span></h2></div>
        <div class="floor-track" aria-label="층 진행">${track}</div>
        <div class="wallet"><span>금화 <b>${run.gold}</b></span><span class="faint">전투 ${run.battles}</span></div>
        <div class="row-btns"><button class="btn sm" data-a="labHub">열차로</button><button class="btn sm danger" data-a="labAbandonAsk">포기</button></div></div>
      <div style="display:grid;gap:14px">
        <div class="panel"><div class="cap" style="margin-bottom:8px">다음 갈림길 · 하나를 고르세요</div><div class="nodes">${nodes}</div></div>
        <div class="panel"><div class="cap" style="margin-bottom:8px">탑승 승객</div><div class="team-hp">${team}</div></div>
        <div class="panel"><div class="cap" style="margin-bottom:8px">유물 ${run.relics.length} ${sets ? '· ' : ''}${sets}</div><div class="relic-row">${relics}</div></div>
      </div></div>`;
    if (run.pendingGift && !$('#modal')) { run.pendingGift = false; this.relicPick(run, 1, () => this.go('lab'), '출발 선물', '미궁에 들어가기 전, 하나를 챙기세요.'); }
  },
  labNode(i) {
    const run = Game.s.lab.run; if (!run) return;
    const nd = run.offer[i]; if (!nd) return;
    if (['battle', 'elite', 'boss'].includes(nd.type)) {
      const cfg = Game.labBattleCfg(run, nd);
      if (!cfg.allies.length) { this.toast('싸울 수 있는 승객이 없습니다.'); return; }
      Game.save();
      this.startBattle(cfg, { kind: 'lab', node: nd });
      return;
    }
    if (nd.type === 'event') return this.labEvent(run);
    if (nd.type === 'shop') return this.labShop(run);
    if (nd.type === 'rest') return this.labRest(run);
  },
  labContinue(run) {
    if (run.pendingRelic) { const t = run.pendingRelic; run.pendingRelic = 0; return this.relicPick(run, t, () => this.labContinue(run)); }
    Game.labOffer(run); Game.save(); this.closeModal(); this.go('lab');
  },
  labEvent(run) {
    const ev = pick(LAB_EVENTS);
    const m = this.modal(`<div class="cap">사건</div><h2>${esc(ev.n)}</h2><p class="muted" style="margin:0">${esc(ev.text)}</p>
      <div class="relic-pick">${ev.ch.map((c, i) => `<button class="relic-card" data-ev="${i}"><b>${esc(c.t)}</b></button>`).join('')}</div>`);
    m.dataset.lock = '1';
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-ev]'); if (!b) return;
      const txt = ev.ch[+b.dataset.ev].fx(run, this.labApi(run));
      Game.save();
      const mm = this.modal(`<div class="cap">사건</div><h2>${esc(ev.n)}</h2><p style="margin:0">${esc(txt)}</p><div class="row-btns"><button class="btn pri" id="evok">계속</button></div>`);
      mm.dataset.lock = '1';
      $('#evok').addEventListener('click', () => this.labContinue(run));
    });
  },
  labShop(run) {
    const shop = Game.shopStock(run);
    const draw = () => {
      const items = shop.items.map((it, i) => { const r = RELIC[it.id]; return `<button class="relic-card tier${r.t}" data-buy="${i}" ${it.sold || run.gold < it.price ? 'disabled' : ''}><b>${esc(r.n)} ${it.sold ? '· 구매함' : ''}</b><span class="rt">${RELIC_TAGS[r.tag].n} · 금화 ${it.price}</span><span class="muted" style="font-size:12px">${esc(r.d)}</span></button>`; }).join('');
      const m = this.modal(`<div class="cap">상점</div><h2>떠돌이 매점 <span class="faint" style="font-size:15px">금화 ${run.gold}</span></h2>
        <div class="relic-pick">${items}<button class="relic-card" data-heal="1" ${shop.healed || run.gold < shop.healPrice ? 'disabled' : ''}><b>응급 치료 ${shop.healed ? '· 받음' : ''}</b><span class="rt">금화 ${shop.healPrice}</span><span class="muted" style="font-size:12px">아군 전체 체력 30% 회복</span></button></div>
        <div class="row-btns"><button class="btn pri" data-leave="1">떠난다</button></div>`);
      m.dataset.lock = '1';
      m.addEventListener('click', e => {
        const t = e.target.closest('button'); if (!t || t.disabled) return;
        if (t.dataset.buy != null) { const it = shop.items[+t.dataset.buy]; run.gold -= it.price; it.sold = true; Game.labTakeRelic(run, it.id); draw(); }
        else if (t.dataset.heal) { run.gold -= shop.healPrice; shop.healed = true; this.labApi(run).healAll(0.3); Game.save(); draw(); }
        else if (t.dataset.leave) this.labContinue(run);
      });
    };
    draw();
  },
  labRest(run) {
    const pct = Math.round(run.mods.rest * 100);
    const m = this.modal(`<div class="cap">휴식</div><h2>빈 객차</h2><p class="muted" style="margin:0">덜컹거리는 소리 사이로 잠시 숨을 고른다.</p>
      <div class="relic-pick"><button class="relic-card" data-r="heal"><b>쉰다</b><span class="muted" style="font-size:12px">아군 전체 체력 ${pct}% 회복, 쓰러진 승객도 일어난다</span></button>
      <button class="relic-card" data-r="pow"><b>결의를 다진다</b><span class="muted" style="font-size:12px">다음 2전투 동안 아군 기본 위력 +1</span></button></div>`);
    m.dataset.lock = '1';
    m.addEventListener('click', e => {
      const t = e.target.closest('[data-r]'); if (!t) return;
      if (t.dataset.r === 'heal') this.labApi(run).healAll(run.mods.rest); else run.powTurns = (run.powTurns || 0) + 2;
      Game.save(); this.labContinue(run);
    });
  },
  relicPick(run, tierMin, after, title, sub) {
    const ids = Game.labRelicChoices(run, tierMin);
    if (!ids.length) { after(); return; }
    const m = this.modal(`<div class="cap">유물</div><h2>${esc(title || '하나를 고르세요')}</h2>${sub ? `<p class="muted" style="margin:0">${esc(sub)}</p>` : ''}<div class="relic-pick">${ids.map(id => { const r = RELIC[id]; return `<button class="relic-card tier${r.t}" data-rel="${id}"><b>${esc(r.n)}</b><span class="rt">${RELIC_TAGS[r.tag].n} · ${'Ⅰ Ⅱ Ⅲ'.split(' ')[r.t - 1]}등급</span><span class="muted" style="font-size:12px">${esc(r.d)}</span></button>`; }).join('')}</div>
      <div class="row-btns"><button class="btn ghost" data-rel="">건너뛰고 금화 +20</button></div>`);
    m.dataset.lock = '1';
    m.addEventListener('click', e => {
      const t = e.target.closest('[data-rel]'); if (!t) return;
      if (t.dataset.rel) Game.labTakeRelic(run, t.dataset.rel); else { run.gold += 20; Game.save(); }
      this.closeModal(); after();
    });
  },
  labBattleEnd(b, node) {
    const run = Game.s.lab.run;
    const res = Game.labAfterBattle(run, b, node);
    this.resultModal(res, () => {
      this.bt = null;
      if (!res.win) { const out = Game.labEnd(run, false); return this.labSummary(run, out); }
      const next = () => {
        if (node.type === 'boss') {
          if (run.floor >= 5) { const out = Game.labEnd(run, true); return this.labSummary(run, out); }
          Game.labNextFloor(run); this.toast(`${run.floor}층에 도착했습니다. 승객들이 30% 회복했습니다.`); return this.go('lab');
        }
        Game.labOffer(run); Game.save(); this.go('lab');
      };
      if (node.type === 'elite') return this.relicPick(run, 1, next);
      if (node.type === 'boss') return this.relicPick(run, 2, next);
      if (Math.random() < 0.3) return this.relicPick(run, 1, next);
      next();
    });
  },
  labSummary(run, out) {
    const m = this.modal(`<div class="big ${out.cleared ? '' : 'lose'}">${out.cleared ? '미궁 돌파' : '미궁 종료'}</div>
      <p class="muted" style="margin:0">심도 ${run.depth} · ${run.floor}층까지 · 전투 ${run.battles}회 · 유물 ${run.relics.length}개</p>
      <div class="reward-list"><div><span>미궁에서 얻은 경험치</span><b>${fmt(run.earned.xp)}</b></div><div><span>미궁에서 얻은 기억 파편</span><b>${fmt(run.earned.sh)}</b></div>
      <div><span>${out.cleared ? '완주' : '종료'} 보상 · 기억 파편</span><b>+${fmt(out.sh)}</b></div>${out.cr ? `<div><span>완주 보상 · 잔향 결정</span><b>+${out.cr}</b></div>` : ''}
      ${run.earned.cr ? `<div><span>수문장 결정</span><b>${run.earned.cr}</b></div>` : ''}</div>
      ${out.cleared && run.depth < 15 && run.depth >= Game.s.lab.best ? `<div class="unlock">✦ 심도 ${run.depth + 1} 개방</div>` : ''}
      ${(out.ach || []).map(a => `<div class="unlock">업적 「${esc(a.n)}」 · 파편 +${fmt(a.r)}</div>`).join('')}
      <div class="row-btns"><button class="btn pri" id="labdone">열차로 돌아가기</button></div>`);
    m.dataset.lock = '1';
    $('#labdone').addEventListener('click', () => { this.closeModal(); this.screen = 'hub'; this.tab = 'lab'; this.render(); });
  },
};
