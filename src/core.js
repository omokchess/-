'use strict';
/* ===== 잔향선 · 핵심 상수와 유틸 ===== */

const DT = {
  slash:  { n: '참격', i: '🗡', c: '#e9ecef' },
  pierce: { n: '관통', i: '➶', c: '#a5d8ff' },
  blunt:  { n: '타격', i: '⬢', c: '#ffd8a8' },
};

/* 잠재 상태: 위력(pot)·횟수(cnt) */
const ST = {
  bleed:   { n: '출혈', i: '🩸', c: '#e03131', bad: 1, d: '행동할 때마다 위력만큼 피해를 받고 횟수가 1 줄어듭니다.' },
  burn:    { n: '화상', i: '🔥', c: '#ff922b', bad: 1, d: '턴이 끝날 때 위력만큼 피해를 받고 횟수가 1 줄어듭니다.' },
  tremor:  { n: '진동', i: '〰', c: '#fcc419', bad: 1, d: '진동 폭발이 일어나면 위력만큼 흐트러짐 게이지가 차오릅니다. 턴 종료 시 횟수 1 감소.' },
  rupture: { n: '파열', i: '✷', c: '#20c997', bad: 1, d: '피격될 때마다 위력만큼 추가 피해를 받고 횟수가 1 줄어듭니다.' },
  sinking: { n: '침잠', i: '🌊', c: '#4c6ef5', bad: 1, d: '피격될 때마다 정신력이 위력만큼 줄어듭니다. 정신력이 바닥이면 대신 피해를 받습니다.' },
  poise:   { n: '호흡', i: '❋', c: '#99e9f2', d: '공격할 때 (위력×5)% 확률로 치명타. 치명타가 나면 횟수 1 감소.' },
  charge:  { n: '충전', i: '⚡', c: '#74c0fc', d: '충전을 소모하는 기술의 위력이 오릅니다. 턴 종료 시 횟수 1 감소.' },
};
const ST_KEYS = Object.keys(ST);

/* 턴 단위 효과 (값 v, 남은 턴 t) */
const BF = {
  str:     { n: '공격 강화', i: '⚔', good: 1, d: '주는 피해 +10%×수치' },
  weak:    { n: '약화', i: '↘', d: '주는 피해 −10%×수치' },
  guard:   { n: '보호', i: '🛡', good: 1, d: '받는 피해 −10%×수치' },
  vuln:    { n: '취약', i: '◎', d: '받는 피해 +10%×수치' },
  haste:   { n: '신속', i: '»', good: 1, d: '방어 판정이 넓어지고 에너지 회복 확률이 오릅니다' },
  bind:    { n: '속박', i: '⛓', d: '방어 판정이 좁아집니다' },
  stun:    { n: '기절', i: '✦', d: '행동할 수 없습니다' },
  seal:    { n: '봉인', i: '🔒', d: '기술(기본 공격 제외)을 쓸 수 없습니다' },
  regen:   { n: '재생', i: '✚', good: 1, d: '턴 시작 시 최대 체력의 수치%만큼 회복' },
  thorns:  { n: '가시', i: '✹', good: 1, d: '근접 공격을 받으면 수치만큼 되돌려줍니다' },
  focus:   { n: '집중', i: '◉', good: 1, d: '치명타 확률 +5%×수치' },
};

const EL_COL = { slash: '#e9ecef', pierce: '#a5d8ff', blunt: '#ffd8a8' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ri = (a, b, rng = Math.random) => a + Math.floor(rng() * (b - a + 1));
const rf = (a, b, rng = Math.random) => a + rng() * (b - a);
const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
function shuffle(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function wpick(arr, wf, rng = Math.random) {
  let tot = 0;
  for (const x of arr) tot += Math.max(0, wf(x));
  let r = rng() * tot;
  for (const x of arr) { r -= Math.max(0, wf(x)); if (r <= 0) return x; }
  return arr[arr.length - 1];
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function resLabel(v) { return v >= 1.5 ? '취약' : v > 1.01 ? '약함' : v >= 0.99 ? '보통' : v >= 0.74 ? '견딤' : v > 0 ? '저항' : '무효'; }
function resClass(v) { return v >= 1.5 ? 'r-weak' : v > 1.01 ? 'r-soft' : v >= 0.99 ? 'r-norm' : v >= 0.74 ? 'r-end' : 'r-res'; }
