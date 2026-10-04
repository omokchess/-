'use strict';
/* ===== 잔향선 · 전투 화면 =====
 * 엔진이 남긴 사건을 하나씩 재생한다: 인물 동작 · 기술 연출 · 숫자 · 체력 막대. */

const TYPE_COL = { slash: '#e9ecef', pierce: '#a5d8ff', blunt: '#ffd8a8' };
const KIND_COL = { bleed: '#ff6b6b', burn: '#ff922b', tremor: '#fcc419', rupture: '#20c997', sinking: '#748ffc', blood: '#c92a2a', blast: '#ff922b', reflect: '#e599f7', thorns: '#69db7c', stitch: '#f783ac', redirect: '#f783ac' };

const QTE = {
  run(q, width) {
    return new Promise(res => {
      const ar = $('#arena'); if (!ar) return res('none');
      const w = clamp(width, 0.06, 0.5);
      const z0 = 0.4 + Math.random() * (0.5 - w), pz = [z0 + w * 0.34, z0 + w * 0.66];
      const d = h('div', { class: 'qte' + (q.ult ? ' big' : '') });
      d.innerHTML = `<div class="lbl">${q.ult ? '⚠ ' : ''}${esc(q.n)} — 눌러서 방어!</div><div class="track"><div class="zone" style="left:${z0 * 100}%;width:${w * 100}%"></div><div class="pz" style="left:${pz[0] * 100}%;width:${(pz[1] - pz[0]) * 100}%"></div><div class="cur"></div></div><div class="hint">화면을 누르거나 스페이스</div>`;
      ar.appendChild(d);
      const cur = d.querySelector('.cur'); const dur = 1150 / Math.sqrt(FX.speed || 1); const t0 = performance.now(); let done = false, pos = 0, raf;
      const fin = v => {
        if (done) return; done = true; cancelAnimationFrame(raf); document.removeEventListener('pointerdown', tap, true); document.removeEventListener('keydown', key, true);
        const lbl = d.querySelector('.lbl'); lbl.textContent = v === 'perfect' ? '✨ 완벽 방어!' : v === 'block' ? '🛡 방어!' : '💥 실패'; d.classList.add(v);
        d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 220 }).onfinish = () => d.remove(); res(v);
      };
      const judge = () => pos >= pz[0] && pos <= pz[1] ? 'perfect' : pos >= z0 && pos <= z0 + w ? 'block' : 'none';
      const tap = e => { if (e.target.closest && e.target.closest('.btop')) return; e.preventDefault(); e.stopPropagation(); fin(judge()); };
      const key = e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fin(judge()); } };
      document.addEventListener('pointerdown', tap, true); document.addEventListener('keydown', key, true);
      const loop = t => { pos = Math.min(1, (t - t0) / dur); cur.style.left = pos * 100 + '%'; if (pos >= 1) return fin('none'); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      if (window.__autoQTE) setTimeout(() => fin(window.__autoQTE === 'perfect' ? 'perfect' : Math.random() < 0.5 ? 'block' : 'none'), 60);
    });
  },
};

const BUI = {
  B: null, ctx: null, busy: false, preShown: null, dashed: false, lastSnap: null, logLines: [],
  W(ms) { return sleep(ms / (FX.speed || 1)); },
  /* ctx: { kind: 'story'|'lab'|'train', stage, theme, title, onEnd(B) } */
  async start(cfg, ctx) {
    this.ctx = ctx; this.B = new Battle(cfg); this.busy = true; this.finished = false; this.logLines = []; this.preShown = null; this.dashed = false; this.ended = false;
    UI.screen = 'battle';
    const app = $('#app');
    app.innerHTML = `<div class="battle">
      <div class="btop"><button class="ghost sm" id="bOut" data-tip="${ctx.kind === 'lab' ? '미궁을 끝내고 보상을 받는다' : '전투를 포기한다'}">⏏</button><div class="bstage">${esc(ctx.title || '')}</div><div class="bturn" id="bTurn">턴 1</div>
        <button class="ghost sm" id="bSpd" data-tip="연출 속도">×${Game.set.speed}</button><button class="ghost sm ${Game.set.auto ? 'on' : ''}" id="bAuto" data-tip="자동 전투: 직업 판단으로 기술을 고르고 방어도 자동">자동</button></div>
      <div class="arena" id="arena"><div class="flash"></div>
        <div class="fhud" id="fhud"></div><div class="intent" id="intent"></div><div class="gaunt" id="gaunt"></div></div>
      <div class="phud" id="phud"></div>
      <div class="gimline" id="gimline"></div>
      <div class="acts" id="acts"></div>
      <div class="blog" id="blog"></div></div>`;
    const ar = $('#arena');
    FX.init(); FX.setHost(ar); FX.speed = Game.set.speed; RIG.speed = Game.set.speed; FX.shakeOn = Game.set.shake;
    Stage.fps = Game.set.fps;
    const first = this.B.foeQ[0].id;
    Stage.mount(ar, ctx.theme || 'ash', Game.look(), foeLook(first, this.B));
    $('#bOut').onclick = () => this.retreat();
    $('#bSpd').onclick = () => { const L = [1, 1.5, 2, 3]; Game.set.speed = L[(L.indexOf(Game.set.speed) + 1) % L.length]; FX.speed = RIG.speed = Game.set.speed; $('#bSpd').textContent = '×' + Game.set.speed; Game.save(); };
    $('#bAuto').onclick = () => { Game.set.auto = !Game.set.auto; $('#bAuto').classList.toggle('on', Game.set.auto); Game.save(); if (Game.set.auto && !this.busy && this.B.phase === 'p') this.loop(); };
    const ev = this.B.start();
    if (Stage.foe && this.B.f) Stage.foe.gim = this.B.f.gim;
    if (first === 'otherpax' && this.B.f) Stage.setFoe(foeLook('otherpax', this.B));
    this.hud(ev[ev.length - 1].snap);
    RIG.play(Stage.me, 'enter'); RIG.play(Stage.foe, 'enter');
    await this.W(600);
    await this.play(ev);
    this.loop();
  },
  async loop() {
    const B = this.B;
    while (!this.ended) {
      if (B.result) return this.end();
      if (B.phase === 'p') {
        if (Game.set.auto) { this.busy = true; this.renderActs(); await this.W(220); if (!Game.set.auto) continue; await this.doAct(B.autoChoice(), true); continue; }
        this.busy = false; this.renderActs(); return;
      }
      if (B.phase === 'f') {
        this.busy = true; this.renderActs();
        const q = B.peek();
        let def = 'none';
        if (q && (q.kind === 'attack' || q.kind === 'util')) {
          await this.preFoe(q);
          if (q.kind === 'attack' && !q.ub) def = Game.set.qte && !Game.set.auto ? await QTE.run(q, B.qteWidth()) : B.autoDef(q);
        }
        await this.play(B.step(def));
        continue;
      }
      return;
    }
  },
  async doAct(choice, auto) {
    if (this.busy && !auto) return;
    this.busy = true; this.renderActs();
    const ev = this.B.act(choice);
    await this.play(ev);
    if (!auto) this.loop();
  },
  /* 적이 휘두르기 전: 이름 띠 + 준비 동작 (빠른 반응 입력 전에 보여준다) */
  async preFoe(q) {
    const f = this.B.f; this.preShown = q.id;
    FX.banner(q.n, q.ult ? '#ff6b6b' : '#e03131', true, q.ub ? '방어 불가' : q.hits > 1 ? `${q.hits}연타` : '');
    const ff = FOEFX[q.id]; if (ff && ff.pre) await ff.pre();
    if (q.kind === 'attack') {
      if (q.melee) { RIG.play(Stage.foe, 'battack', { dist: Stage.dist(Stage.foe, Stage.me), hits: q.hits }); await this.W(260); }
      else { RIG.play(Stage.foe, 'bcast'); await this.W(300); }
    } else { RIG.play(Stage.foe, 'bcast'); await this.W(250); }
  },
  /* ---------- 사건 재생 ---------- */
  async play(ev) {
    const B = this.B;
    let actC = null;
    for (const e of ev) {
      switch (e.type) {
        case 'act': {
          if (e.who === 'p') {
            const sk = SKILL[e.id];
            actC = { e, n: e.hits, allHeads: false, crit: false };
            if (e.focus) { RIG.play(Stage.me, 'focus'); FX.banner('집중', '#74c0fc', false); await SKFX.focus.pre(actC); break; }
            const col = CLASSES[B.clsId].c;
            if (e.ult) { await FX.cutIn(Game.look(), e.n, col, false); }
            FX.banner(e.n, col, false, e.great ? '대종!' : e.jackpot ? '잭팟!' : e.spent ? `소모 ${e.spent}` : '');
            const fx = SKFX[e.fx] || {};
            if (fx.pre) await fx.pre(actC);
            if (e.melee) { this.dashed = true; await RIG.play(Stage.me, 'dashIn', { dist: Stage.dist(Stage.me, Stage.foe) }); }
            if (e.hits) { if (e.anim === 'puppet') { RIG.play(Stage.me, 'cast'); this.puppetDash(); } else RIG.play(Stage.me, e.anim || 'slashA'); await this.W(e.melee ? 120 : 200); }
            else { RIG.play(Stage.me, e.anim || 'buff'); await this.W(280); }
          } else {
            actC = { e, n: e.hits };
            if (this.preShown !== e.id) { FX.banner(e.n, '#e03131', true); if (e.melee) RIG.play(Stage.foe, 'battack', { dist: Stage.dist(Stage.foe, Stage.me), hits: e.hits }); else RIG.play(Stage.foe, 'bcast'); await this.W(300); }
            this.preShown = null;
            if (e.ult) FX.shake(6, 300);
            if (e.fx && SKFX[e.fx] && SKFX[e.fx].pre && !FOEFX[e.id]) { /* 거울: 내 기술 연출을 뒤집어 쓴다 */ }
          }
          break;
        }
        case 'hit': {
          this.hud(e.snap);
          if (e.who === 'p') {
            const fx = actC && SKFX[actC.e.fx] || {};
            if (e.counter) { RIG.play(Stage.me, 'parry'); await this.W(80); }
            else if (fx.hit) await fx.hit(actC, e, e.i);
            else if (e.i > 0 && actC && actC.e.melee) { RIG.play(Stage.me, e.i % 2 ? 'slashB' : 'slashA'); await this.W(110); }
            const tp = e.part >= 0 ? this.partPt(e.part) : Stage.pt(Stage.foe);
            const counterFx = e.counter && SKFX[this.counterFx] ? SKFX[this.counterFx] : null;
            if (counterFx && counterFx.land) counterFx.land({}, e); else if (fx.land && !e.counter) fx.land(actC, e); else impactFx(e.type, tp, e.crit || e.dmg > B.f.mhp * 0.08);
            if (e.crit) { FX.sparkle(tp.x + FX.rnd(-20, 20), tp.y - 20, 30, '#fff3bf', 500); }
            this.num(tp, e.dmg, e.crit ? '#ffe066' : '#ffffff', e.crit ? 34 : 26, e.crit ? '치명!' : '', e.res);
            for (const [k, v] of e.extra) this.num({ x: tp.x + 26, y: tp.y + 10 }, v, KIND_COL[k] || '#fff', 18);
            Stage.foe.flashT = RIG.now() + 70; Stage.foe.hurtT = RIG.now() + 300;
            if (!B.f || !B.f.staggered) RIG.play(Stage.foe, 'bhit');
            await this.W(Math.max(70, 170 - (e.n || 1) * 14));
          } else {
            const m = Stage.pt(Stage.me);
            const ff = actC && FOEFX[actC.e.id];
            if (actC && actC.e.fx && SKFX[actC.e.fx] && SKFX[actC.e.fx].hit && !ff) { /* 거울 반영: 투사체만 반대로 */ }
            if (!actC || !actC.e.melee) { if (!ff) await this.foeProj(actC ? actC.e : {}, e.i); }
            if (ff && ff.land && e.i === (e.n - 1)) ff.land();
            if (e.def === 'perfect') { RIG.play(Stage.me, 'parry'); FX.sparkle(m.x, m.y - 10, 34, '#ffffff', 420); FX.ring(m.x, m.y, '#ffffff', 60, 300, 5); if (e.i === 0) FX.text(m.x, m.y - 70, '완벽!', '#ffffff', 28); }
            else if (e.def === 'block') { RIG.play(Stage.me, 'guard'); this.hexFlash(m); impactFx(e.type, m, false, '#74c0fc'); this.num(m, e.dmg, '#a5d8ff', 22, e.i === 0 ? '방어' : ''); }
            else { impactFx(e.type, m, e.dmg > B.p.mhp * 0.2, '#ff8787'); this.num(m, e.dmg, '#ff8787', e.dmg > B.p.mhp * 0.2 ? 34 : 26); Stage.me.flashT = RIG.now() + 70; Stage.me.hurtT = RIG.now() + 360; RIG.play(Stage.me, e.dmg > B.p.mhp * 0.2 ? 'bigHit' : 'hit'); if (e.dmg > B.p.mhp * 0.2) FX.flash('#ff0000', 0.18, 220); }
            for (const [k, v] of e.extra) this.num({ x: m.x - 26, y: m.y + 10 }, v, KIND_COL[k] || '#fff', 18);
            if (e.ab) FX.text(m.x + 30, m.y - 40, `보호막 -${e.ab}`, '#74c0fc', 14);
            await this.W(Math.max(80, 200 - (e.n || 1) * 18));
          }
          break;
        }
        case 'actEnd': {
          if (e.who === 'p') {
            const fx = actC && SKFX[actC.e.fx] || {};
            if (fx.post) fx.post(Object.assign(actC || {}, { allHeads: false }), e);
            if (this.dashed) { this.dashed = false; await this.W(120); await RIG.play(Stage.me, 'dashOut'); }
            if (e.total > 0) this.log(`▶ ${actC && actC.e.n || ''} — 총 ${fmt(e.total)} 피해${e.crits ? ` (치명 ${e.crits})` : ''}`, 'me');
          } else { if (e.total > 0) this.log(`◀ ${actC && actC.e.n || ''} — ${fmt(e.total)} 피해`, 'foe'); await this.W(160); }
          actC = null; this.hud(e.snap);
          break;
        }
        case 'counter': this.counterFx = e.fx; break;
        case 'coin': { const m = Stage.pt(Stage.me, 'top'); FX.text(m.x + 20, m.y - 10, e.heads ? '● 앞' : '○ 뒤', e.heads ? '#ffd43b' : '#adb5bd', 16, { life: 700 }); if (actC) { if (!e.heads) actC.anyTails = 1; actC.allHeads = !actC.anyTails; } break; }
        case 'miss': { const pt = e.who === 'p' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); FX.text(pt.x, pt.y - 40, '빗나감', '#adb5bd', 22); if (e.who === 'f') RIG.play(Stage.me, 'parry'); await this.W(200); break; }
        case 'st': { this.hud(e.snap); if (e.clear) break; if (e.p > 0 || e.c > 0) { const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); statusFx(e.k, pt); FX.text(pt.x + (e.who === 'f' ? -30 : 30), pt.y - 10 + FX.rnd(-10, 10), `${ST[e.k].i}${e.p ? '+' + e.p : ''}${e.c ? '/' + e.c : ''}`, ST[e.k].c, 15, { life: 800 }); } break; }
        case 'bf': { this.hud(e.snap); const pt = e.who === 'f' ? Stage.pt(Stage.foe, 'top') : Stage.pt(Stage.me, 'top'); const D = BF[e.k]; FX.text(pt.x, pt.y - 6 + FX.rnd(-8, 8), `${D.i} ${D.n}`, D.good ? '#8ce99a' : '#ff8787', 14, { life: 800 }); break; }
        case 'dot': { this.hud(e.snap); const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); if (e.kind === 'tremor') FX.ring(pt.x, pt.y, '#fcc419', 70, 400, 6); this.num({ x: pt.x + FX.rnd(-20, 20), y: pt.y + 16 }, e.v, KIND_COL[e.kind] || '#ffa8a8', 20); if (e.who === 'p' && e.v > 0) Stage.me.flashT = RIG.now() + 50; await this.W(110); break; }
        case 'heal': { this.hud(e.snap); if (e.quiet && e.v < 3) break; const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); FX.text(pt.x, pt.y - 30, '+' + e.v, '#8ce99a', e.quiet ? 15 : 22); if (!e.quiet) for (let i = 0; i < 8; i++) FX.add({ x: pt.x + FX.rnd(-20, 20), y: pt.y + FX.rnd(-10, 30), vy: FX.rnd(-2, -0.8), size: 3, life: 700, color: '#8ce99a' }); break; }
        case 'shield': { this.hud(e.snap); const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); this.hexFlash(pt); FX.text(pt.x, pt.y - 50, `🛡 ${e.v}`, '#74c0fc', 18); break; }
        case 'energy': { this.hud(e.snap); if (e.d > 0 && !(actC && actC.e && actC.e.focus)) { const el = $('#phud .en'); if (el) el.animate([{ filter: 'brightness(2)' }, { filter: 'none' }], { duration: 400 }); } break; }
        case 'sp': this.hud(e.snap); break;
        case 'res': { this.hud(e.snap); const el = $(`#phud [data-res="${e.k}"]`); if (el && e.d) el.animate([{ transform: 'scale(1.25)', filter: 'brightness(1.8)' }, { transform: 'none', filter: 'none' }], { duration: 380 }); break; }
        case 'burst': { this.hud(e.snap); const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); for (let i = 0; i < 3; i++) FX.ring(pt.x, pt.y, '#fcc419', 70 + i * 30, 500, 6, 10, { delay: i * 60 }); FX.text(pt.x, pt.y - 70, '진동 폭발', '#fcc419', 20); FX.shake(8, 220); await this.W(220); break; }
        case 'stagger': { this.hud(e.snap); const pt = Stage.pt(Stage.foe); FX.bigText('흐트러짐!', '#ffd43b', 1100); FX.burst(pt.x, pt.y, 40, ['#ffd43b', '#fff3bf', '#ffffff'], 13, 5); for (let i = 0; i < 14; i++) { const a = FX.rnd(0, 6.28); FX.add({ type: 'shard', x: pt.x, y: pt.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9 - 2, g: 0.2, drag: 0.95, size: 5, life: 800, color: '#ffe066' }); } FX.shake(14, 400); RIG.play(Stage.foe, 'bstagger'); Stage.foe.stun = true; await this.W(600); this.log('💫 흐트러짐!', 'good'); break; }
        case 'recover': Stage.foe.stun = false; RIG.play(Stage.foe, 'brecover'); this.hud(e.snap); break;
        case 'skip': { const pt = e.who === 'f' ? Stage.pt(Stage.foe, 'top') : Stage.pt(Stage.me, 'top'); FX.text(pt.x, pt.y - 10, e.why === 'frozen' ? '⏸ 정지' : e.why === 'stagger' ? '💫 흐트러짐' : '✦ 기절', '#ffd43b', 22); await this.W(500); break; }
        case 'charge': { this.hud(e.snap); const pt = Stage.pt(Stage.foe); RIG.play(Stage.foe, 'bcharge'); for (let i = 0; i < 26; i++) { const a = FX.rnd(0, 6.28), r = FX.rnd(70, 110); FX.add({ x: pt.x + Math.cos(a) * r, y: pt.y + Math.sin(a) * r, vx: -Math.cos(a) * 4, vy: -Math.sin(a) * 4, drag: 0.95, size: FX.rnd(2, 5), life: 520, color: pick(['#ff6b6b', '#ffa8a8', '#ffd43b']) }); } FX.banner(`${e.n} 준비`, '#ff6b6b', true, `${e.left}턴 뒤`); await this.W(700); break; }
        case 'phase': { this.hud(e.snap); if (Stage.foe && e.snap.f) Stage.foe.gim = e.snap.f.gim; FX.flash('#ffffff', 0.5, 400); FX.shake(16, 600); RIG.play(Stage.foe, 'bphase'); FX.bigText(e.txt ? e.txt.replace(/^[^\s]+\s/, '') : '페이즈 전환', '#ff8787', 1600); await this.W(1200); break; }
        case 'partBreak': { this.hud(e.snap); const pt = this.partPt(e.i); FX.burst(pt.x, pt.y, 30, ['#ffffff', '#ffd43b', '#adb5bd'], 12, 5, { g: 0.2 }); FX.text(pt.x, pt.y - 40, e.eaten ? '먹어 치움' : e.exploded ? '폭발!' : '파괴!', e.eaten ? '#ff8787' : '#ffd43b', 22); FX.shake(10, 300); await this.W(300); break; }
        case 'partRevive': this.hud(e.snap); break;
        case 'kill': { this.hud(e.snap); const pt = Stage.pt(Stage.foe); const cols = ['#ffd43b', '#ff922b', '#fa5252', '#74c0fc', '#fff', (Stage.foe.look.el || '#fff')];
          const big = e.boss; for (let w = 0; w < (big ? 4 : 1); w++) { FX.burst(pt.x + FX.rnd(-30, 30), pt.y + FX.rnd(-30, 30), big ? 40 : 26, cols, 12, 6, { g: 0.08, life: FX.rnd(700, 1100) }); FX.ring(pt.x, pt.y, pick(cols), 120 + w * 30, 700, 10); if (big) { FX.shake(14, 300); FX.flash('#fff', 0.3, 160); } await this.W(big ? 170 : 80); }
          RIG.play(Stage.foe, 'bdie'); this.log(`✔ ${e.name} 격파`, 'good'); await this.W(big ? 700 : 450); break; }
        case 'enter': { if (e.first) break; this.hud(e.snap); Stage.setFoe(foeLook(e.id, B)); if (B.f) Stage.foe.gim = B.f.gim; RIG.play(Stage.foe, 'enter'); FX.banner(`${e.name} 등장`, '#ff8787', true, `${e.idx + 1}/${e.total}`); await this.W(700); break; }
        case 'win': { RIG.play(Stage.me, 'victory'); FX.bigText(B.foeQ.some(f => FOES[f.id].boss) ? '잔향 정화!' : '승리!', '#ffd43b', 1500); await this.W(1300); break; }
        case 'lose': { RIG.play(Stage.me, 'die'); FX.bigText(e.why === 'lethe' ? '망각…' : '쓰러졌다', '#ff8787', 1500); await this.W(1300); break; }
        case 'panic': { const pt = Stage.pt(Stage.me, 'top'); FX.text(pt.x, pt.y - 10, '😱 공황', '#ff8787', 24); break; }
        case 'cheat': { const pt = Stage.pt(Stage.me); FX.text(pt.x, pt.y - 60, e.kind === 'hemoblade' ? '불괴!' : e.kind === 'bulwark' ? '맹세!' : '부활!', '#ffd43b', 28); FX.ring(pt.x, pt.y, '#ffd43b', 90, 600, 8); await this.W(300); break; }
        case 'immune': { const pt = e.who === 'f' ? Stage.pt(Stage.foe, 'top') : Stage.pt(Stage.me, 'top'); FX.text(pt.x, pt.y, '면역', '#adb5bd', 16); break; }
        case 'redirect': { const t = Stage.pt(Stage.foe), m = Stage.pt(Stage.me); for (let i = 0; i < 5; i++) FX.add({ type: 'line', x: m.x, y: m.y - 30, x2: t.x + FX.rnd(-30, 30), y2: t.y + FX.rnd(-40, 40), w: 2, color: '#f783ac', life: 600 }); FX.text(t.x, t.y - 80, '꼭두각시 춤!', '#f783ac', 24); RIG.play(Stage.foe, 'bhit'); await this.W(400); break; }
        case 'item': { RIG.play(Stage.me, 'item'); const I = ITEMS[e.id]; FX.banner(I.n, '#8ce99a', false); await this.W(300); break; }
        case 'target': this.hud(e.snap); break;
        case 'intent': this.intent(e.plan); break;
        case 'pturn': { this.hud(e.snap); $('#bTurn').textContent = `턴 ${e.turn}`; break; }
        case 'tick': this.hud(e.snap); break;
        case 'cleanse': { this.hud(e.snap); const pt = e.who === 'f' ? Stage.pt(Stage.foe) : Stage.pt(Stage.me); FX.text(pt.x, pt.y - 50, '정화', '#e3fafc', 16); FX.ring(pt.x, pt.y, '#e3fafc', 60, 400, 4); break; }
        case 'log': this.log(e.txt, e.cls); break;
        case 'fx': await this.custom(e.key, e.data || {}, e.snap); break;
        default: if (e.snap) this.hud(e.snap);
      }
    }
    if (ev.length) this.hud(ev[ev.length - 1].snap);
  },
  async custom(key, d, snap) {
    const m = Stage.pt(Stage.me), t = Stage.pt(Stage.foe);
    const big = (txt, col) => FX.text(m.x, m.y - 90, txt, col, 26, { life: 1100, vy: -0.6 });
    switch (key) {
      case 'unbreak': big('불괴', '#ff6b6b'); FX.engulf(() => Stage.pt(Stage.me), ['#e03131', '#ff8787', '#a61e3a'], 1000, 5); FX.ring(m.x, m.y, '#e03131', 110, 600, 10); Stage.me.rimC = '#ff6b6b'; break;
      case 'overheat': big('폭주!', '#ff922b'); FX.pillar(Stage.pt(Stage.me, 'feet').x, Stage.pt(Stage.me, 'feet').y, 70, ['#ff922b', '#ffd43b'], 700, { fire: 1, top: m.y - 120 }); FX.flash('#ffd8a8', 0.4, 300); FX.shake(14, 400); await this.W(400); break;
      case 'greatbell': big('대종', '#fcc419'); FX.ring(t.x, t.y, '#fcc419', 160, 700, 10); break;
      case 'chord': for (let i = 0; i < 3; i++) FX.text(m.x - 30 + i * 30, m.y - 70, ['저', '중', '고'][i], '#ffe066', 20, { delay: i * 100 }); FX.ring(m.x, m.y, '#ffe066', 90, 500, 6); break;
      case 'jackpotReady': big('🍀 행운 7', '#ffd43b'); break;
      case 'jackpot': big('잭팟!', '#ffd43b'); FX.burst(m.x, m.y - 40, 50, ['#ffd43b', '#fff3bf', '#69db7c'], 12, 5, { g: 0.15 }); FX.flash('#fff3bf', 0.35, 260); break;
      case 'flips': break;
      case 'abyss': big('심연', '#3bc9db'); FX.darkFlash(0.6, 800); for (let i = 0; i < 20; i++) FX.add({ type: 'bubble', x: m.x + FX.rnd(-50, 50), y: m.y + FX.rnd(0, 40), vy: FX.rnd(-2, -0.6), size: FX.rnd(3, 8), life: 1000, color: '#3bc9db' }); await this.W(300); break;
      case 'dollBreak': FX.burst(m.x + 40, m.y, 24, ['#e599f7', '#f783ac', '#fff'], 9, 4, { g: 0.2 }); FX.text(m.x + 40, m.y - 50, '마리!', '#f783ac', 20); break;
      case 'seal': FX.text(m.x, m.y - 80, `🔒 ${SKILL[d.id] ? SKILL[d.id].n : ''}`, '#bac8ff', 18, { life: 1200 }); FX.ring(m.x, m.y, '#4c6ef5', 80, 500, 6); break;
      case 'fate': FX.text(m.x, m.y - 80, `🧶 ${SKILL[d.id] ? SKILL[d.id].n : ''}만`, '#f783ac', 18, { life: 1200 }); break;
      case 'spotlight': FX.flash('#fff9db', 0.3, 400); FX.text(t.x, t.y - 120, '🎤 독무대', '#fff3bf', 24); break;
      case 'spotFall': FX.burst(t.x, t.y - 60, 30, ['#fff9db', '#ffe066', '#adb5bd'], 12, 5, { g: 0.3 }); FX.shake(14, 400); break;
      case 'maskBreak': FX.burst(t.x, t.y - 60, 30, ['#f8f9fa', '#74c0fc', '#ff6b6b'], 12, 5, { g: 0.25 }); FX.text(t.x, t.y - 110, '가면 파괴!', '#ffd43b', 24); FX.shake(12, 350); break;
      case 'maskSwap': FX.ring(t.x, t.y - 60, '#e599f7', 60, 400, 5); break;
      case 'melt': FX.text(t.x, t.y - 80, '갑옷이 녹는다', '#ffa94d', 18); FX.burst(t.x, t.y, 20, ['#d0ebff', '#a5d8ff', '#fff'], 8, 4); break;
      case 'explode': FX.flash('#ffd8a8', 0.6, 400); FX.burst(m.x, m.y, 60, ['#ffd43b', '#ff922b', '#fa5252', '#495057'], 15, 7, { g: 0.1 }); FX.shake(22, 600); await this.W(300); break;
      case 'moonSwap': FX.ring(t.x, t.y - 60, d.a === 'silver' ? '#e9ecef' : '#e64980', 120, 600, 6); break;
      case 'shard': FX.burst(t.x, t.y - 40, 20, ['#e5dbff', '#ffffff', '#b197fc'], 10, 4, { g: 0.2 }); break;
    }
    if (snap) this.hud(snap);
  },
  puppetDash() { const a = Stage.me; const d = Stage.dist(Stage.me, Stage.foe) / a.sc; a.anim = null; RIG.play(a, 'cast'); const hold = a.hold; a.hold = Object.assign({}, hold || {}); const t0 = RIG.now(); const step = () => { const k = (RIG.now() - t0) / 500; if (k >= 1) { a.hold = hold; return; } a.hold.pupX = Math.sin(k * Math.PI) * d * 0.9; a.hold.pupY = -Math.sin(k * Math.PI) * 10; requestAnimationFrame(step); }; requestAnimationFrame(step); },
  async foeProj(e, i) {
    const f = Stage.pt(Stage.foe, 'tip'), m = Stage.pt(Stage.me);
    const col = TYPE_COL[e.type] || '#ff8787';
    const to = { x: m.x + FX.rnd(-10, 10), y: m.y + FX.rnd(-14, 14) };
    if (e.type === 'pierce') { await FX.fly({ from: f, to, dur: 200, trail: 8, ease: k => k * k, draw(c, x, y, a, k, p) { FX.trail(c, p.tr, 4, col); c.translate(x, y); c.rotate(a); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -4); c.lineTo(-6, 4); c.fill(); } }); }
    else if (e.type === 'slash') { await FX.fly({ from: f, to, dur: 230, arc: (i % 2 ? 1 : -1) * 40, comp: 'source-over', draw(c, x, y, a) { c.translate(x, y); c.rotate(a); FX.crescent(c, 22, 8, 'rgba(255,135,135,.9)', '#fff'); } }); }
    else { await FX.fly({ from: f, to, dur: 260, arc: -50, trail: 5, draw(c, x, y, a, k, p) { FX.trail(c, p.tr, 6, 'rgba(255,169,77,.6)'); FX.glow(c, x, y, 18, '#ffa94d', 0.9); FX.glow(c, x, y, 7, '#fff', 1); } }); }
  },
  partPt(i) {
    const t = Stage.pt(Stage.foe); const f = this.B.f; const n = f && f.parts ? f.parts.length : 1;
    const id = f && f.parts && f.parts[i] ? f.parts[i].id : '';
    if (id === 'armL') return { x: t.x + t.w * 0.45, y: t.y, w: 30, h: 30 };
    if (id === 'armR') return { x: t.x - t.w * 0.45, y: t.y, w: 30, h: 30 };
    if (id === 'silver') return { x: t.x + 50, y: t.y - 30, w: 40, h: 40 };
    if (id === 'black') return { x: t.x - 50, y: t.y - 30, w: 40, h: 40 };
    return { x: t.x + (i - (n - 1) / 2) * 40, y: t.y - t.h * 0.55, w: 24, h: 24 };
  },
  hexFlash(pt) { FX.fn({ life: 420, draw(c, k) { c.translate(pt.x + 18, pt.y); c.globalAlpha = 1 - k; c.strokeStyle = '#74c0fc'; c.fillStyle = 'rgba(116,192,252,.18)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.save(); c.translate(0, -36 + i * 18); FX.hexPath(c, 10 + k * 3, 0); c.fill(); c.stroke(); c.restore(); } } }); },
  num(pt, v, col, size, label, res) {
    FX.text(pt.x + FX.rnd(-18, 18), pt.y - 26 + FX.rnd(-8, 8), String(v), col, size, { vy: -1.3, life: 950 });
    if (label) FX.text(pt.x, pt.y - 56, label, col, 15, { vy: -0.9, life: 800 });
    if (res && res >= 1.5 && Math.random() < 0.6) FX.text(pt.x + 30, pt.y - 44, '약점', '#ffa94d', 13, { life: 700 });
    if (res && res < 0.5) FX.text(pt.x + 30, pt.y - 44, '저항', '#868e96', 13, { life: 700 });
  },
  log(txt, cls = 'sys') {
    this.logLines.unshift({ txt, cls }); if (this.logLines.length > 40) this.logLines.pop();
    const el = $('#blog'); if (el) el.innerHTML = this.logLines.slice(0, 6).map(l => `<div class="${l.cls}">${esc(l.txt)}</div>`).join('');
  },
  /* ---------- 머리 위 정보 ---------- */
  hud(s) {
    if (!s) return; this.lastSnap = s; const B = this.B;
    const f = s.f, p = s.p;
    if (Stage.foe && f) Stage.foe.gim = f.gim;
    if (f) {
      const D = FOES[f.id];
      const sh = f.sh ? `<div class="shf" style="width:${clamp(f.sh / f.mhp * 100, 0, 100)}%"></div>` : '';
      let parts = '';
      if (f.parts && f.parts.length) {
        const core = D.parts.some(q => q.core);
        parts = `<div class="parts">${core ? '' : `<button class="part ${B.tgt === -1 ? 'on' : ''}" data-t="-1">본체</button>`}${f.parts.map((q, i) => `<button class="part ${B.tgt === i ? 'on' : ''} ${q.alive ? '' : 'dead'}" data-t="${i}" ${q.alive ? '' : 'disabled'}>${esc(q.n)}<i style="width:${clamp(q.hp / q.mhp * 100, 0, 100)}%"></i></button>`).join('')}</div>`;
      }
      $('#fhud').innerHTML = `<div class="fname">${D.boss ? '<b class="tag boss">잔향체</b>' : D.elite ? '<b class="tag elite">정예</b>' : ''}${esc(D.n)} <small>Lv${B.f ? B.f.lv : ''}</small></div>
        ${bar(f.hp, f.mhp, 'ehp', `${fmt(f.hp)} / ${fmt(f.mhp)}`, sh)}
        <div class="stgrow">${bar(f.stg, f.stgMax, 'stg' + (f.staggered ? ' on' : ''), f.staggered ? '💫 흐트러짐' : `흐트러짐 ${Math.round(f.stg / Math.max(1, f.stgMax) * 100)}%`)}<span class="resrow">${resIcons(B.f ? B.f.res : D.res || {})}</span></div>
        <div class="chips">${chips(f.st, f.bf, 'f')}</div>${parts}`;
      $$('#fhud .part').forEach(b => b.onclick = () => { if (this.busy || B.phase !== 'p') return; const ev = B.act({ k: 'target', i: +b.dataset.t }); this.hud(ev[ev.length - 1] && ev[ev.length - 1].snap); });
      const gt = D.gimText ? D.gimText(Object.assign({}, B.f || {}, { gim: f.gim, parts: f.parts })) : '';
      $('#gimline').innerHTML = gt ? `<span>${esc(gt)}</span>` : '';
      $('#gimline').style.display = gt ? '' : 'none';
      const n = B.foeQ.length; $('#gaunt').innerHTML = n > 1 ? B.foeQ.map((q, i) => `<i class="${i < B.foeIdx ? 'done' : i === B.foeIdx ? 'cur' : ''}"></i>`).join('') : '';
    }
    // 플레이어
    const C = CLASSES[B.clsId];
    const sp = p.sp, spPct = Math.abs(sp) / 45 * 50;
    const shP = p.sh ? `<div class="shf" style="width:${clamp(p.sh / p.mhp * 100, 0, 100)}%"></div>` : '';
    const res = C.res.map(R => {
      const v = s.r[R.k] || 0; let max = R.max; if (R.k === 'wind' && B.tal('ck_t3b')) max = 7;
      if (R.pips) return `<div class="res-g" data-res="${R.k}" style="--c:${R.c}" data-tip="${esc(R.n)} ${v}/${max}">${R.i}<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span></div>`;
      return `<div class="res-g wide" data-res="${R.k}" style="--c:${R.c}" data-tip="${esc(R.n)} ${v}/${max}">${R.i}<div class="rbar"><div class="fill" style="width:${clamp(v / max * 100, 0, 100)}%"></div>${R.line ? `<i class="line" style="left:${R.line / max * 100}%"></i>` : ''}<span>${R.n} ${v}</span></div></div>`;
    }).join('');
    $('#phud').innerHTML = `<div class="prow1"><div class="pname">${C.i} ${C.n} <small>Lv${B.p.lv}</small></div>
      ${bar(p.hp, p.mhp, 'php', `${fmt(p.hp)} / ${fmt(p.mhp)}`, shP)}</div>
      <div class="prow2"><div class="sprow" data-tip="정신력 ${Math.round(sp)} (−45~45)<br>높으면 피해·치명타가 오르고, −45가 되면 공황"><span>정신</span><div class="spbar"><div class="spf ${sp < 0 ? 'neg' : 'pos'}" style="${sp < 0 ? `right:50%;width:${spPct}%` : `left:50%;width:${spPct}%`}"></div><i></i></div><b>${Math.round(sp)}</b></div>
      <div class="en" data-tip="에너지 ${p.en}/10 — 턴마다 +2, 기본 공격 +1, 집중 +3"><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < p.en ? 'on' : ''}"></i>`).join('')}</span><b>⚡${p.en}</b></div></div>
      <div class="prow3"><div class="resline">${res}</div><div class="chips">${chips(p.st, p.bf, 'p')}</div></div>`;
    if (!this.busy) this.renderActs();
  },
  intent(plan) {
    const B = this.B; const el = $('#intent'); if (!el || !plan) return;
    const one = (acts, small) => acts.map(a => {
      if (a.stagger) return `<div class="ia stag">💫 흐트러짐 — 행동 불가</div>`;
      const flags = [a.ub ? '<b class="ub">방어 불가</b>' : '', a.ch > 1 ? `<b class="ch">준비 ${a.ch - 1}턴</b>` : '', a.pw < 1 ? `<b class="wk">위력 ${Math.round(a.pw * 100)}%</b>` : ''].join('');
      const ic = a.util ? '✦' : (DT[a.type] ? DT[a.type].i : '⚔');
      const st = (a.st || []).map(k => ST[k] ? ST[k].i : '').join('');
      return `<div class="ia ${a.ult ? 'ult' : ''} ${small ? 'sm' : ''}" data-tip="${tipAttr((a.d || a.n) + (a.est ? `\n예상 피해 ≈ ${a.est}` : ''))}">${ic} <span>${esc(a.n)}</span>${a.hits > 1 ? `<i>×${a.hits}</i>` : ''}${a.est ? `<em>≈${a.est}</em>` : ''}${st}${flags}</div>`;
    }).join('');
    el.innerHTML = `<div class="ih">다음 행동</div>${one(plan[0] || [])}${B.p.foresight && plan[1] ? `<div class="ih">그다음</div>${one(plan[1], 1)}` : ''}`;
    el.classList.toggle('danger', !!(plan[0] || []).find(a => a.ub || a.ult));
  },
  /* ---------- 행동 버튼 ---------- */
  renderActs() {
    const B = this.B, el = $('#acts'); if (!el) return;
    if (B.result) { el.innerHTML = ''; return; }
    const us = B.usable();
    const dis = this.busy || B.phase !== 'p';
    const tone = ['', '저', '중', '고'];
    const btn = u => {
      const s = u.sk, rank = B.ranks[u.id] || 1;
      const cost = s.hpCost ? `<b class="hp">🩸${Math.round(s.hpCost * 100)}%</b>` : `<b>⚡${u.cost}</b>`;
      const pw = (s.hits || []).length ? `위력 ${s.hits.map(v => Math.round(v * (1 + (rank - 1) * 0.1))).join('+')}` : '보조';
      const forced = B.f && B.f.gim.forced === u.id;
      const tip = `<b>${esc(s.n)}</b> ${s.type ? DT[s.type].n : ''} · ${pw}${s.cd ? ` · 재사용 ${s.cd}턴` : ''}${rank > 1 ? ` · ${rank}단계` : ''}<br>${esc(s.d)}${u.ok ? '' : `<br><span class="bad">사용 불가: ${esc(u.why)}</span>`}`;
      return `<button class="sk ${s.ult ? 'ult' : ''} ${s.basic ? 'basic' : ''} ${u.ok ? '' : 'off'} ${forced ? 'forced' : ''}" data-id="${u.id}" ${dis || !u.ok ? 'disabled' : ''} data-tip="${tipAttr(tip)}" style="--c:${CLASSES[B.clsId].c}">
        <span class="skn">${s.tone ? `<i class="tone t${s.tone}">${tone[s.tone]}</i>` : ''}${esc(s.n)}</span><span class="skm">${s.type ? DT[s.type].i : '✦'} ${cost}</span>${!u.ok && B.cds[u.id] > 0 ? `<span class="cdv">${B.cds[u.id]}</span>` : ''}</button>`;
    };
    const items = ITEM_ORDER.filter(k => B.items[k] > 0);
    el.innerHTML = `<div class="skg">${us.map(btn).join('')}</div>
      <div class="actr"><button class="sk focus" id="aFocus" ${dis ? 'disabled' : ''} data-tip="집중: 에너지 +3, 체력 6% 회복, 정신력 +10, 보호 2(적 차례)"><span class="skn">집중</span><span class="skm">⚡+3</span></button>
      <button class="sk item" id="aItem" ${dis || !items.length || B.itemUsed >= (B.rel('belt') ? 2 : 1) ? 'disabled' : ''} data-tip="소모품 (턴을 쓰지 않는다)"><span class="skn">소모품</span><span class="skm">🎒${items.reduce((a, k) => a + B.items[k], 0)}</span></button></div>`;
    el.querySelectorAll('.skg .sk').forEach(b => b.onclick = () => { Tip.hide(); this.doAct({ k: 'skill', id: b.dataset.id }); });
    const fb = $('#aFocus'); if (fb) fb.onclick = () => { Tip.hide(); this.doAct({ k: 'focus' }); };
    const ib = $('#aItem'); if (ib) ib.onclick = () => this.itemMenu();
  },
  itemMenu() {
    const B = this.B; const items = ITEM_ORDER.filter(k => B.items[k] > 0);
    const m = modal(`<div class="itemlist">${items.map(k => `<button class="item" data-k="${k}"><b>${ITEMS[k].i} ${ITEMS[k].n}</b> ×${B.items[k]}<small>${ITEMS[k].d}</small></button>`).join('')}</div>`, { title: '소모품' });
    m.querySelectorAll('.item').forEach(b => b.onclick = async () => { closeModal(); this.busy = true; this.renderActs(); const ev = B.act({ k: 'item', id: b.dataset.k }); await this.play(ev); this.busy = false; if (B.result) this.end(); else this.renderActs(); });
  },
  retreat() {
    if (this.ended) return;
    modal(this.ctx.kind === 'lab' ? '미궁 탐색을 여기서 끝낼까요? 지금까지의 보상을 받습니다.' : '전투를 포기할까요? 보상은 없습니다.', { title: '퇴각', btns: [['퇴각', () => { this.ended = true; this.B.finish(false, 'retreat'); this.end(true); }], ['계속 싸운다', null]] });
  },
  async end(retreat) {
    if (this.finished) return; this.finished = true; this.ended = true;
    const B = this.B, ctx = this.ctx;
    await this.W(retreat ? 0 : 300);
    Stage.unmount(); FX.clear();
    if (ctx.onEnd) ctx.onEnd(B, !!retreat);
  },
};
