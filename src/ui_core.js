'use strict';
/* ===== 잔향선 · 화면 공용 도구 ===== */

const UI = { screen: 'title', tab: 'story', nm: false, sub: null };

/* 정지 초상: 캔버스에 리그를 한 장 그린다. o.bust → 상반신 확대 */
function paintPortrait(cv, look, o = {}) {
  if (!cv || !look) return;
  const w = +cv.dataset.w || cv.clientWidth || 80, h = +cv.dataset.h || cv.clientHeight || 100, dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const human = look.human || !look.draw;
  const boxH = human ? (o.bust ? 52 : 86) : (look.box ? look.box[1] : 90) * (o.bust ? 0.62 : 1);
  const boxW = human ? 46 : (look.box ? look.box[0] : 60) * (o.bust ? 0.8 : 1);
  const sc = Math.min((h - 8) / boxH, (w - 6) / boxW) * (o.sc || 1);
  const a = RIG.make({ kind: human && !look.boss ? 'hero' : 'foe', look, x: w * (o.x || 0.5), y: o.bust ? h + (human ? 34 : boxH * 0.38) * sc : h - 4, face: o.face || 1, sc, gim: o.gim || {} });
  const q = RIG.pose(a, 1000 + (o.t || 0)); if (o.pose) Object.assign(q, o.pose);
  try { RIG.draw(c, a, q, 1000 + (o.t || 0), dpr); } catch (e) { /* 그리기 실패는 빈 초상 */ }
}
function paintAll(root = document) {
  for (const cv of root.querySelectorAll('canvas[data-look]')) {
    const L = lookById(cv.dataset.look); if (!L) continue;
    paintPortrait(cv, L, { bust: cv.dataset.bust === '1', face: +cv.dataset.face || 1, sc: +cv.dataset.sc || 1 });
  }
}
/* 'h:hemoblade', 'f:butcher', 'n:harang' */
const NPC_LOOK = {
  harang: ['bell', { hair: '#2b2d31', eye: '#fcc419', top: '#5c3d2e', skirt: '#3b2a1c' }], serin: ['hemoblade', { hair: '#c92a2a', hair2: '#a61e1e', streak: null, eye: '#ffa8a8', top: '#343a40', coatC: '#2b2d31', sleeve: '#2b2d31' }],
  yeon: ['poet', { hair: '#adb5bd', hair2: '#868e96', eye: '#4c6ef5' }], viola: ['puppeteer', { hair: '#212529', hair2: '#1a1b1e', eye: '#f783ac', top: '#5c3d2e', skirt: '#a68a64' }],
  doyun: ['ember', { hair: '#f1f3f5', hair2: '#dee2e6', eye: '#ffd43b' }], kai: ['gunner', { hair: '#212529', eye: '#74c0fc', top: '#495057', coatC: '#343a40', sleeve: '#343a40' }],
  roa: ['gambler', { hair: '#343a40', eye: '#ff8787', top: '#5f3dc4' }], mujin: ['bulwark', { tabard: '#c92a2a', plume: '#c92a2a' }],
  eve: ['duelist', { hair: '#f8f9fa', eye: '#74c0fc', sashC: '#1864ab' }], sion: ['clock', { hair: '#f1f3f5', eye: '#74c0fc' }],
};
function lookById(id) {
  if (!id) return null;
  const [k, v] = id.split(':');
  if (k === 'h') return Object.assign({ seed: 3 }, HERO_LOOK[v]);
  if (k === 'f') return FOE_LOOK[v] || null;
  if (k === 'n') { const N = NPC_LOOK[v]; if (!N) return null; return Object.assign({ seed: 11 }, HERO_LOOK[N[0]], N[1]); }
  if (k === 'm') return mirrorLook();
  return null;
}
function mirrorLook() { const s = Game.s; return Object.assign(darkLook(HERO_LOOK[s ? s.cls : 'duelist']), { id: 'mirror', boss: 1, sc: 1.65, box: [40, 90], human: 1 }); }
function foeLook(id, B) {
  if (id === 'mirror') return mirrorLook();
  if (id === 'otherpax' && B && B.f && B.f.gim.copy) return Object.assign(darkLook(HERO_LOOK[B.f.gim.copy], { el: '#d0ebff' }), { id: 'otherpax', sc: 1.6, box: [34, 78], human: 1 });
  return FOE_LOOK[id];
}

/* ---------- 작은 도구 ---------- */
function h(tag, attrs, ...kids) { const el = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') el.className = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] != null) el.setAttribute(k, attrs[k]); } for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c)); return el; }
function toast(msg, cls = '') {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts' }); document.body.appendChild(box); }
  const t = h('div', { class: 'toast ' + cls }, msg); box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
}
function modal(html, o = {}) {
  closeModal();
  const m = h('div', { id: 'modal', class: o.cls || '' });
  m.innerHTML = `<div class="in">${o.title ? `<h3>${o.title}</h3>` : ''}${html}<div class="mbtns">${(o.btns || [['닫기', null]]).map((b, i) => `<button class="btn ${i ? 'ghost' : ''}" data-i="${i}">${b[0]}</button>`).join('')}</div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m && !o.lock) closeModal(); });
  m.querySelectorAll('.mbtns button').forEach(b => b.onclick = () => { const f = (o.btns || [['닫기', null]])[+b.dataset.i][1]; if (f && f() === false) return; closeModal(); });
  paintAll(m);
  return m;
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
/* 말풍선 설명: data-tip 속성을 가진 요소 */
const Tip = {
  el: null,
  init() {
    this.el = h('div', { id: 'tip' }); document.body.appendChild(this.el);
    const show = (t, x, y) => { this.el.innerHTML = t; this.el.style.display = 'block'; const r = this.el.getBoundingClientRect(); this.el.style.left = clamp(x - r.width / 2, 6, innerWidth - r.width - 6) + 'px'; this.el.style.top = (y - r.height - 12 < 6 ? y + 18 : y - r.height - 12) + 'px'; };
    document.addEventListener('mouseover', e => { const t = e.target.closest('[data-tip]'); if (!t) { this.hide(); return; } const r = t.getBoundingClientRect(); show(t.dataset.tip, r.left + r.width / 2, r.top); });
    let lp = 0;
    document.addEventListener('touchstart', e => { const t = e.target.closest('[data-tip]'); clearTimeout(lp); if (!t) { this.hide(); return; } lp = setTimeout(() => { const r = t.getBoundingClientRect(); show(t.dataset.tip, r.left + r.width / 2, r.top); t.dataset.tipShown = '1'; }, 380); }, { passive: true });
    document.addEventListener('touchend', () => clearTimeout(lp), { passive: true });
    document.addEventListener('click', () => this.hide(), true);
  },
  hide() { if (this.el) this.el.style.display = 'none'; },
};
function tipAttr(t) { return esc(t).replace(/\n/g, '<br>'); }
function stTip(k, s) { const D = ST[k]; return `<b style="color:${D.c}">${D.i} ${D.n}</b> 위력 ${s.p} · 횟수 ${s.c}<br>${D.d}`; }
function bfTip(k, b) { const D = BF[k]; return `<b>${D.i} ${D.n} ${b.v}</b> · ${b.t}턴<br>${D.d.replace('수치', b.v)}`; }
function chips(st, bf, who) {
  let o = '';
  for (const k in st) { const s = st[k], D = ST[k]; o += `<span class="chip st" style="--c:${D.c}" data-tip="${tipAttr(stTip(k, s))}">${D.i}<b>${s.p}</b><i>${s.c}</i></span>`; }
  for (const k in bf) { const b = bf[k], D = BF[k]; o += `<span class="chip bf ${D.good ? 'good' : 'bad'}" data-tip="${tipAttr(bfTip(k, b))}">${D.i}<b>${b.v}</b><i>${b.t}</i></span>`; }
  return o;
}
function bar(v, max, cls, label, extra = '') { const p = max ? clamp(v / max * 100, 0, 100) : 0; return `<div class="bar ${cls}"><div class="fill" style="width:${p}%"></div>${extra}<span>${label}</span></div>`; }
function fmtTime(sec) { const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60); return hh ? `${hh}시간 ${mm}분` : `${mm}분`; }
function gearLine(g) {
  const R = RARITY[g.rar], m = gearMain(g);
  const main = [m.atk ? `공격 +${m.atk}` : '', m.hp ? `체력 +${m.hp}` : '', m.def ? `방어 +${m.def}` : ''].filter(Boolean).join(' · ');
  const ax = g.ax.map(([k, v]) => `${AFFIX[k].n} ${AFFIX[k].f(v)}`).join(' · ');
  return { R, main, ax };
}
function gearCard(g, o = {}) {
  const { R, main, ax } = gearLine(g);
  return `<div class="gear r${g.rar} ${o.cls || ''}" data-id="${g.id}"><div class="gi">${SLOTS[g.slot].i}</div><div class="gb"><div class="gn" style="color:${R.c}">${esc(g.n)}${g.plus ? ` +${g.plus}` : ''} <small>Lv${g.L} ${R.n}</small></div><div class="gm">${main}</div>${ax ? `<div class="ga">${ax}</div>` : ''}</div>${o.right || ''}</div>`;
}
function resIcons(res) {
  return Object.keys(DT).map(k => { const v = res[k] == null ? 1 : res[k]; return `<span class="res ${resClass(v)}" data-tip="${DT[k].n} 받는 피해 ×${v}">${DT[k].i}${resLabel(v)}</span>`; }).join('');
}
