'use strict';
/* ===== 잔향선 · 핵심 상수와 유틸 ===== */

const EMO_KEYS = ['fury', 'elation', 'sorrow', 'dread', 'obsession', 'void'];
const EMO = {
  fury:      { n: '분노', c: '#d9533f' },
  elation:   { n: '환희', c: '#dca23a' },
  sorrow:    { n: '비애', c: '#4f87cc' },
  dread:     { n: '공포', c: '#9468c9' },
  obsession: { n: '집착', c: '#46a274' },
  void:      { n: '공허', c: '#9da3b0' },
};

const DT = {
  slash:  { n: '참격', s: '참' },
  pierce: { n: '관통', s: '관' },
  blunt:  { n: '타격', s: '타' },
};

/* 잠재 상태(위력·횟수) */
const ST = {
  bleed:   { n: '출혈', s: '혈', c: '#c4473a', d: '공격 코인을 쓸 때마다 위력만큼 피해를 받고 횟수가 1 줄어듭니다.' },
  burn:    { n: '화상', s: '화', c: '#e07b2c', d: '턴이 끝날 때 위력만큼 피해를 받고 횟수가 1 줄어듭니다.' },
  tremor:  { n: '진동', s: '진', c: '#c8b04f', d: '진동 폭발이 일어나면 다음 흐트러짐 문턱이 최대 체력의 (위력)%만큼 올라갑니다. 턴 종료 시 횟수 1 감소.' },
  rupture: { n: '파열', s: '파', c: '#38b2a0', d: '피격될 때마다 위력만큼 추가 피해를 받고 횟수가 1 줄어듭니다.' },
  sinking: { n: '침잠', s: '침', c: '#4e6fd0', d: '피격될 때마다 정신력이 위력만큼 줄어듭니다. 정신력이 없거나 바닥이면 대신 피해를 받습니다. 횟수 1 감소.' },
  poise:   { n: '호흡', s: '호', c: '#86cde3', d: '공격이 적중할 때 (위력×5)% 확률로 치명타(피해 +20%). 치명타가 나면 횟수 1 감소.' },
  thread:  { n: '실', s: '실', c: '#d39be6', d: '비올라가 엮은 실. 실을 소모하는 기술이 있습니다. 줄어들지 않습니다.' },
};

/* 턴 단위 버프/디버프 (부여되면 다음 턴에 적용) */
const BF = {
  pwrUp:    { n: '위력 증가', s: '力', good: true, d: '합·공격의 기본 위력 +X' },
  pwrDown:  { n: '위력 감소', s: '弱', d: '합·공격의 기본 위력 −X' },
  cpUp:     { n: '코인 강화', s: '錢', good: true, d: '코인 위력 +X' },
  cpDown:   { n: '코인 약화', s: '鈍', d: '코인 위력 −X' },
  dmgUp:    { n: '공격 강화', s: '銳', good: true, d: '주는 피해 +10%×X' },
  fragile:  { n: '취약', s: '脆', d: '받는 피해 +10%×X' },
  protect:  { n: '보호', s: '護', good: true, d: '받는 피해 −10%×X' },
  haste:    { n: '신속', s: '迅', good: true, d: '속도 +X' },
  bind:     { n: '속박', s: '縛', d: '속도 −X' },
  paralyze: { n: '마비', s: '痲', d: '앞쪽 코인 X개의 코인 위력이 0' },
};

const RES_TIERS = [
  [2.0, '치명'], [1.5, '취약'], [1.01, '약함'], [0.99, '보통'], [0.74, '견딤'], [0.49, '저항'], [0, '무효'],
];
function resLabel(v) {
  for (const [t, n] of RES_TIERS) if (v >= t) return n;
  return '무효';
}
function resClass(v) {
  return v >= 1.5 ? 'r-weak' : v > 1.01 ? 'r-soft' : v >= 0.99 ? 'r-norm' : v >= 0.74 ? 'r-end' : 'r-res';
}

const G = L => 1 + 0.06 * (L - 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ri = (a, b, rng = Math.random) => a + Math.floor(rng() * (b - a + 1));
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
  for (const x of arr) tot += wf(x);
  let r = rng() * tot;
  for (const x of arr) { r -= wf(x); if (r <= 0) return x; }
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
function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${EMO[k].n} ${v}`).join(' · ');
}
