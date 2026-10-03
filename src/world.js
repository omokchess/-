'use strict';
/* ===== 잔향선 · 세계: 노선(이야기), 유물, 미궁 사건, 업적 ===== */

const SPEAKER = {
  voice: { n: '기관실의 목소리', c: '#c9b98f' },
  me: { n: '차장', c: '#e8dcc0' },
};

/* 장 구성: 노멀 6개 전투 (마지막은 잔향체). 레벨 = base + off */
const CHAPTERS = [
  {
    id: 1, title: '잿빛 승강장', sub: '멈춘 시계탑', color: '#c8b04f', boss: 'clockwarden', recruit: 'haram',
    set: ['vagrant', 'clockrat', 'luggage'], elite: 'inspector',
    intro: [
      ['', '눈을 떴을 때, 열차는 이미 달리고 있었다. 창밖으로 물에 잠긴 회색 도시가 지나간다.'],
      ['voice', '일어나요, 차장. 잔향선이 출발했습니다.'],
      ['serin', '새 차장이야? 이번엔 오래 버티면 좋겠네.'],
      ['mujin', '인사는 나중에. 승강장에 뭔가 있다.'],
      ['', '백 년째 가라앉는 도시. 사람들이 놓지 못한 감정은 가라앉지 않고 떠올라 형체를 얻는다. 승객들은 그것을 잔향이라 불렀다.'],
      ['voice', '역마다 잔향체가 있습니다. 그것을 거두어야 열차는 다음 역으로 갈 수 있어요. 그리고 차장, 당신이 잃어버린 것은 종착역에 있습니다.'],
    ],
    mid: [
      ['doyun', '검표원이군. 이 역은 아직도 표를 검사하는 모양이야.'],
      ['eve', '표가 없으면? 상관없어. 나는 길을 뚫는 쪽이 편하니까.'],
    ],
    bossIntro: [
      ['', '시계탑 꼭대기. 바늘이 녹슨 얼굴을 가진 수위가 시계 속에서 몸을 일으킨다.'],
      ['?', '…열한 시 오십 분. 아직, 아직이야. 자정이 오면 모두 끝나.'],
      ['voice', '차장, 합에서 이기면 바늘이 뒤로 갑니다. 자정에 닿기 전에 끝내세요.'],
    ],
    outro: [
      ['', '시계가 멈추자, 탑 안쪽에서 종소리가 울렸다. 종 아래에 한 여자가 쓰러져 있었다.'],
      ['haram', '…몇 시죠? 종을 쳐야 하는데. 마을 사람들이 기다려요.'],
      ['mujin', '마을은 없다. 이 도시엔 물밖에 남지 않았어.'],
      ['haram', '그래도 칠래요. 박자를 놓치면, 다신 못 찾으니까.'],
      ['', '하람이 잔향선에 올랐다.'],
    ],
  },
  {
    id: 2, title: '녹슨 정육시장', sub: '배고픈 칼', color: '#c4473a', boss: 'butcher', recruit: 'yeon',
    set: ['cleaver', 'hookhound', 'bloodmerchant'], elite: 'freezer',
    intro: [
      ['', '두 번째 역. 녹슨 갈고리마다 무언가가 걸려 있다. 고기인지 사람인지 구분하지 않기로 했다.'],
      ['serin', '…여기야. 언니가 마지막으로 일하던 곳.'],
      ['eve', '복수하러 온 거라면 말리지 않아. 다만 칼끝은 앞을 향하게 해.'],
      ['serin', '복수? 아니. 확인하러 온 거야. 피가 어디로 흘러갔는지.'],
    ],
    mid: [
      ['doyun', '냉동고가 열려 있군. 얼어붙은 것들은 녹으면 더 사나워지지.'],
    ],
    bossIntro: [
      ['?', '배고파. 배고파. 다 먹었는데도 배고파.'],
      ['serin', '그 앞치마… 언니 거야.'],
      ['voice', '고기 걸이를 먹게 두면 회복합니다. 먼저 걸이를 부수세요.'],
    ],
    outro: [
      ['serin', '이제 됐어. 피는… 여기서 멈췄어.'],
      ['', '시장 끝, 물이 차오르는 계단에서 젖은 원고 뭉치를 끌어안은 남자가 앉아 있었다.'],
      ['yeon', '다음 역이 도서관이라면서요. 제 시를 거기 두고 왔어요. 아니, 버리고 왔죠.'],
      ['yeon', '가라앉은 문장은 맑아요. 같이 가도 될까요?'],
      ['', '연이 잔향선에 올랐다.'],
    ],
  },
  {
    id: 3, title: '침수된 도서관', sub: '반납되지 않은 책', color: '#4e6fd0', boss: 'librarian', recruit: 'roa',
    set: ['soakedpage', 'inkjelly', 'shelf'], elite: 'reader',
    intro: [
      ['', '서가 사이로 물이 흐른다. 책장마다 젖은 글자가 떠다닌다.'],
      ['yeon', '저기, 세 번째 서가. 제 시집이 있어요. 아무도 빌려 가지 않았네요.'],
      ['haram', '물이 계속 차올라요. 박자가… 물소리에 묻혀요.'],
      ['voice', '수위가 높아지면 몸이 무거워지고 마음이 가라앉습니다. 배수구를 찾으세요.'],
    ],
    mid: [
      ['yeon', '낭독자군요. 저 목소리를 오래 들으면 안 돼요. 정신이 잠겨요.'],
    ],
    bossIntro: [
      ['?', '연체입니다. 백 년 연체. 모두 반납하세요. 기억도, 이름도.'],
      ['yeon', '저 사람… 제 시집을 마지막으로 정리한 사서예요.'],
    ],
    outro: [
      ['yeon', '젖은 원고는 다시 쓸 수 없지만, 다시 읽을 수는 있어요.'],
      ['', '열람실의 마지막 책상에서 누군가 동전을 굴리고 있었다. 가면 없는 얼굴에 표정이 없었다.'],
      ['roa', '얼굴을 걸었다가 잃었어. 가면 공장에 가면 찾을 수 있다던데.'],
      ['roa', '확률은 공평하잖아? 나한테도 한 번쯤은 앞면이 나오겠지.'],
      ['', '로아가 잔향선에 올랐다.'],
    ],
  },
  {
    id: 4, title: '불타는 극장', sub: '끝나지 않는 커튼콜', color: '#e07b2c', boss: 'diva', recruit: 'kai',
    set: ['extra', 'dancer', 'stagerig'], elite: 'prompter',
    intro: [
      ['', '극장은 백 년째 불타고 있다. 객석은 재가 되었지만 박수 소리는 그치지 않는다.'],
      ['doyun', '이 노래… 성가대에 있던 아이의 목소리다.'],
      ['doyun', '성당이 불탈 때, 나는 그 아이의 손을 놓쳤어.'],
      ['voice', '관객은 같은 공연을 싫어합니다. 매번 다른 기술로 무대를 꾸미세요.'],
    ],
    mid: [
      ['eve', '프롬프터가 대사를 정해 주네. 따를지 말지는 우리가 정하지.'],
    ],
    bossIntro: [
      ['?', '오늘 밤도 매진이에요. 신부님, 보러 와 주셨네요.'],
      ['doyun', '…노래를 멈춰도 돼. 이제 아무도 너를 탓하지 않아.'],
      ['voice', '조명을 받은 사람만 디바에게 닿습니다. 관객이 많으면 앙코르가 시작됩니다.'],
    ],
    outro: [
      ['doyun', '막이 내렸다. 이번엔 손을 놓지 않았어.'],
      ['', '불 꺼진 무대 뒤, 탄피를 줍던 군인이 고개를 들었다.'],
      ['kai', '광장에서 쏜 총알을 세고 있어. 서른일곱 발. 하나가 모자라.'],
      ['kai', '그 하나를 찾을 때까지 어디든 가지. 탄창은 거짓말을 안 하니까.'],
      ['', '카이가 잔향선에 올랐다.'],
    ],
  },
  {
    id: 5, title: '가면 공장', sub: '천 개의 얼굴', color: '#9468c9', boss: 'masque', recruit: 'viola',
    set: ['apprentice', 'blankface', 'pressarm'], elite: 'foreman',
    intro: [
      ['', '컨베이어 위로 얼굴들이 지나간다. 웃는 얼굴, 우는 얼굴, 아무 표정 없는 얼굴.'],
      ['roa', '내 얼굴도 저 어딘가에 있을까. 찾으면… 다시 써도 될까?'],
      ['mujin', '가면은 내성이 바뀐다. 무엇이 통하는지 매 턴 확인해.'],
    ],
    mid: [
      ['kai', '공장장이 계속 일꾼을 불러. 생산 라인을 끊어야겠군.'],
    ],
    bossIntro: [
      ['?', '어떤 얼굴이 마음에 드세요? 전부 당신 거예요. 전부 내 거고.'],
      ['roa', '그 가면… 내 웃음이야.'],
      ['voice', '다음 가면이 미리 보입니다. 약점 속성으로 다섯 번 치면 가면이 깨집니다.'],
    ],
    outro: [
      ['roa', '돌려받았어. 근데 이상하네. 웃는 법을 잊었어.'],
      ['', '공장 지하, 실이 엉킨 작업대에서 한 소녀가 인형의 팔을 꿰매고 있었다.'],
      ['viola', '엄마가 재봉실에 있어요. 실을 끊지 못해서, 아직도 거기 있어요.'],
      ['viola', '저를 데려가 주시면, 실을 빌려 드릴게요. 줄을 쥔 쪽이 이야기를 정하니까요.'],
      ['', '비올라가 잔향선에 올랐다.'],
    ],
  },
  {
    id: 6, title: '끝없는 선로', sub: '멈추지 않는 열차', color: '#7aa0b8', boss: 'express', recruit: 'sion',
    set: ['trackwraith', 'signalman', 'freight'], elite: 'stationmaster',
    intro: [
      ['', '선로 위에 또 다른 선로가 겹쳐 있다. 어딘가에서 기적 소리가 계속 다가온다.'],
      ['eve', '저 소리. 내 마지막 결투 상대가 저 기차에 치였어. 결투는 끝나지 않았지.'],
      ['voice', '이 구간의 열차는 갈수록 빨라집니다. 속박으로 제동을 거세요.'],
    ],
    mid: [
      ['haram', '역무원장은 시간표를 지켜요. 그보다 빠르면 틈이 보일 거예요.'],
    ],
    bossIntro: [
      ['', '선로 끝에서 헤드라이트가 켜진다. 기관사석은 비어 있다.'],
      ['eve', '이번엔 내가 먼저야. 결투를 신청한다.'],
    ],
    outro: [
      ['eve', '끝났어. 이긴 건지, 그냥 멈춘 건지는 모르겠지만.'],
      ['', '신호소 안, 멈춘 시계를 고치던 소년이 고개를 들었다.'],
      ['sion', '시계탑지기 선생님이 멈춘 걸 알아요. 그럼 제가 이어서 감아야죠.'],
      ['sion', '늦었다고요? 그럼 되감으면 돼요.'],
      ['', '시온이 잔향선에 올랐다. 객차가 하나 늘어, 이제 다섯 명이 함께 싸울 수 있다.'],
    ],
  },
  {
    id: 7, title: '웃는 광장', sub: '같은 표정의 군중', color: '#dca23a', boss: 'grin',
    set: ['citizen', 'clown', 'megaphone'], elite: 'mc',
    intro: [
      ['', '광장의 모든 얼굴이 웃고 있다. 입꼬리가 귀까지 찢어진 채로.'],
      ['kai', '여기야. 그날 발포 명령이 떨어진 곳.'],
      ['kai', '사람들이 웃고 있었어. 그래서 더 무서웠지.'],
      ['voice', '정신력이 무너지면 군중에 동화됩니다. 마음을 붙드세요.'],
    ],
    mid: [['yeon', '사회자가 분위기를 띄워요. 합에서 꺾어야 해요.']],
    bossIntro: [
      ['?', '웃어요. 다들 웃잖아요. 당신만 안 웃네요.'],
      ['kai', '서른여덟 번째 탄환. 여기 있었군.'],
    ],
    outro: [
      ['kai', '마지막 한 발은 쏘지 않기로 했어. 서른여덟. 이제 세는 걸 그만둘래.'],
      ['', '광장의 얼굴들이 하나둘 표정을 되찾았다. 대부분은 울고 있었다.'],
    ],
  },
  {
    id: 8, title: '채석장 협곡', sub: '무너지는 거인', color: '#a08f74', boss: 'colossus',
    set: ['mason', 'tortoise', 'tremorworm'], elite: 'demolition',
    intro: [
      ['', '협곡 전체가 숨을 쉰다. 돌이 떨어지고, 다시 쌓인다.'],
      ['haram', '우리 마을 종탑 돌이에요. 채석장에서 캐 온 돌.'],
      ['haram', '종탑이 무너진 날, 저는 박자를 놓쳤어요.'],
      ['voice', '거인은 흐트러질 때만 제대로 다칩니다. 진동으로 문턱을 끌어올리세요.'],
    ],
    mid: [['mujin', '폭약이다. 설치된 사람은 기술자와 합을 겨뤄 해체해.']],
    bossIntro: [
      ['', '협곡의 바위가 일어선다. 그 가슴에 금 간 종이 박혀 있다.'],
      ['haram', '이번엔 놓치지 않아요. 한 박자씩.'],
    ],
    outro: [
      ['haram', '종이 울렸어요. 늦었지만, 울렸어요.'],
      ['', '거인이 무너진 자리에 작은 종 하나가 남았다. 하람은 그것을 품에 안았다.'],
    ],
  },
  {
    id: 9, title: '재봉실', sub: '끊어지지 않는 실', color: '#d39be6', boss: 'seamstress',
    set: ['sewdoll', 'spoolspider', 'cutter'], elite: 'mender',
    intro: [
      ['', '천장에서 수만 가닥의 실이 늘어져 있다. 실 끝마다 무언가가 묶여 있다.'],
      ['viola', '엄마는 끊어진 걸 못 견뎌요. 그래서 전부 꿰매요. 사람도, 운명도.'],
      ['voice', '꿰매진 두 사람은 같은 적을 노려야 합니다. 그렇지 않으면 실이 살을 파고듭니다.'],
    ],
    mid: [['roa', '수선공이 다른 놈들을 고쳐 줘. 코인 세 개 이상 박아 넣으면 손이 멈춰.']],
    bossIntro: [
      ['?', '비올라, 왜 실을 끊고 다니니. 끊어진 건 아파.'],
      ['viola', '엄마. 끊어야 다시 엮을 수 있어요.'],
    ],
    outro: [
      ['viola', '실을 끊었어요. 이제 엄마는 쉴 수 있어요.'],
      ['', '실이 풀리자 재봉실의 인형들이 하나둘 쓰러졌다. 모두 편안한 얼굴이었다.'],
    ],
  },
  {
    id: 10, title: '달의 정원', sub: '두 개의 달', color: '#c9d2e0', boss: 'moon_silver',
    set: ['gardener', 'moth', 'golem'], elite: 'sundial',
    intro: [
      ['', '하늘에 달이 둘 떠 있다. 하나가 지면 다른 하나가 뜬다.'],
      ['mujin', '이 정원… 내가 지키던 성벽 안쪽이다. 쌍둥이 아이들이 뛰놀던 곳.'],
      ['mujin', '성벽이 무너진 밤, 나는 둘 중 하나만 구할 수 있었다.'],
      ['voice', '한쪽 달만 쓰러뜨리면 다시 떠오릅니다. 둘을 함께 보내야 합니다.'],
    ],
    mid: [['sion', '해시계 수도사는 낮엔 싸우고 밤엔 쉬어요. 낮에 몰아붙여요.']],
    bossIntro: [
      ['?', '아저씨, 왜 하나만 데려갔어요?', ],
      ['?', '우린 둘이었는데.'],
      ['mujin', '…이번엔 둘 다다. 아무도 남겨 두지 않는다.'],
    ],
    outro: [
      ['mujin', '함께 갔다. 이번엔 함께.'],
      ['', '두 달이 동시에 졌다. 정원에 처음으로 별이 떴다.'],
    ],
  },
  {
    id: 11, title: '거울의 객차', sub: '또 다른 차장', color: '#b9c4cf', boss: 'mirror',
    set: ['reflection', 'warped', 'mirrorarmor'], elite: 'otherpax',
    intro: [
      ['', '열차 안. 잔향선의 마지막 객차는 거울로 되어 있다.'],
      ['serin', '차장. 거울 속에 당신이 있어. 근데… 웃고 있어.'],
      ['voice', '이 객차는 당신을 비춥니다. 같은 수를 두 번 두지 마세요.'],
    ],
    mid: [['eve', '또 다른 우리야. 흉내는 잘 내도, 마음까지 베끼진 못해.']],
    bossIntro: [
      ['?', '오랜만이야, 차장. 아니, 나라고 불러야 하나.'],
      ['?', '네가 버리고 싶었던 기억이 나야. 종착역에 가면, 다시 하나가 되겠지.'],
    ],
    outro: [
      ['', '거울이 깨지자 객차 너머로 마지막 역의 불빛이 보였다.'],
      ['voice', '차장. 이제 아시겠죠. 당신이 잃어버린 게 아니라, 버리러 가는 길이었다는 걸.'],
      ['doyun', '버리든 되찾든, 끝까지 함께 간다. 그게 이 열차의 규칙이니까.'],
    ],
  },
  {
    id: 12, title: '종착역', sub: '망각', color: '#e6e1d3', boss: 'lethe',
    set: ['shade', 'memeater', 'attendant'], elite: 'gatekeeper',
    intro: [
      ['', '종착역. 승강장에는 지금까지 지나온 모든 역의 이름이 지워진 채 걸려 있다.'],
      ['voice', '여기서 내리면, 모든 걸 잊을 수 있습니다. 슬픔도, 후회도, 이름도.'],
      ['haram', '그럼 박자도 잊겠죠. 그건 싫어요.'],
      ['yeon', '잊는 건 가라앉는 것과 달라요. 가라앉은 건 언젠가 떠오르니까.'],
    ],
    mid: [['mujin', '문지기다. 합에서 이긴 자만 지나갈 수 있어.']],
    bossIntro: [
      ['', '역의 끝. 하얀 안개가 사람의 형상을 이룬다. 그 얼굴은 비어 있다.'],
      ['?', '어서 오세요. 이곳에선 아무것도 아프지 않아요.'],
      ['me', '…아니. 아파도 기억하겠다.'],
      ['voice', '세 막입니다, 차장. 마지막 막에서는 시간이 없습니다.'],
    ],
    outro: [
      ['', '안개가 걷혔다. 종착역의 이름판에 글자가 다시 새겨진다.'],
      ['voice', '축하합니다, 차장. 당신은 잊지 않기로 했군요.'],
      ['serin', '그래서, 이제 어디로 가?'],
      ['me', '돌아간다. 처음 역부터. 이번엔 놓친 것들을 하나씩 주우면서.'],
      ['', '잔향선이 다시 출발했다. 악몽의 노선과 끝없는 미궁이 열렸다.'],
    ],
  },
];

/* 장의 6개 전투 구성 */
function chapterStages(ch) {
  const base = 5 * (ch.id - 1) + 1;
  const [a, b, c] = ch.set;
  const prev = CHAPTERS[ch.id - 2];
  const p = prev ? prev.set : ch.set;
  const n = ch.id, add = (cond, x) => (cond ? [x] : []);
  return [
    { k: 1, name: '진입', lvl: base, waves: [[a, b, c, ...add(n >= 5, a)]] },
    { k: 2, name: '수색', lvl: base + 1, waves: [[a, a, b], [c, p[1], ...add(n >= 3, b)]] },
    { k: 3, name: '심층', lvl: base + 2, waves: [[b, c, p[0]], [a, b, c, ...add(n >= 6, p[2])]] },
    { k: 4, name: '정예', lvl: base + 3, waves: [[a, c, ...add(n >= 3, p[1])], [ch.elite, b, ...add(n >= 7, c)]], elite: true },
    { k: 5, name: '잔향의 문턱', lvl: base + 3, waves: [[a, b, c, ...add(n >= 4, p[0])], [c, a, b, p[2]]] },
    { k: 6, name: '잔향체', lvl: base + 4, waves: [[ch.boss]], boss: true },
  ];
}

/* =========================== 유물 =========================== */
const allyOf = u => u && u.side === 'A';
const RELICS = [
  { id: 'scalpel', n: '녹슨 메스', tag: 'bleed', t: 1, d: '아군이 부여하는 출혈 위력 +1', h: { inflict(r) { if (allyOf(r.src) && r.key === 'bleed' && r.p > 0) r.p += 1; } } },
  { id: 'hanky', n: '피 묻은 손수건', tag: 'bleed', t: 1, d: '적이 출혈 피해를 받을 때마다 체력이 가장 낮은 아군 체력 1% 회복', h: { statusDmg(r, _, b) { if (r.key === 'bleed' && r.u.side === 'E') { const t = b.livingAllies().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (t) b.heal(t, t.maxHp * 0.01); } } } },
  { id: 'redthread', n: '붉은 실', tag: 'bleed', t: 2, d: '출혈 상태의 적에게 주는 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u) && c.t.st.bleed) c.mult *= 1.1; } } },
  { id: 'bloodscale', n: '혈액 저울', tag: 'bleed', t: 3, d: '출혈 횟수 5 이상인 적을 공격하면 첫 코인에 출혈이 한 번 더 터진다', h: { hit(c, _, b) { if (allyOf(c.u) && c.i === 0 && !c.preview && c.t.alive && c.t.st.bleed && c.t.st.bleed.c >= 5) b.statusDmg(c.t, 'bleed'); } } },

  { id: 'matches', n: '성냥갑', tag: 'burn', t: 1, d: '아군이 부여하는 화상 위력 +1', h: { inflict(r) { if (allyOf(r.src) && r.key === 'burn' && r.p > 0 && r.t.side === 'E') r.p += 1; } } },
  { id: 'scorchbible', n: '그을린 성서', tag: 'burn', t: 2, d: '턴 종료 시 화상 상태의 적 하나당 아군 전체 정신력 +1', h: { turnEnd(r, _, b) { const n = b.livingEnemies().filter(e => e.st.burn).length; if (n) for (const a of b.livingAllies()) b.addSp(a, n, true); } } },
  { id: 'ashcrown', n: '재의 왕관', tag: 'burn', t: 3, d: '적이 받는 화상 피해 1.5배', h: { statusDmgMod(r) { if (r.key === 'burn' && r.u.side === 'E') r.dmg = Math.round(r.dmg * 1.5); } } },

  { id: 'fork', n: '소리굽쇠', tag: 'tremor', t: 1, d: '아군이 부여하는 진동 위력 +1', h: { inflict(r) { if (allyOf(r.src) && r.key === 'tremor' && r.p > 0) r.p += 1; } } },
  { id: 'clapper', n: '금 간 종추', tag: 'tremor', t: 2, d: '진동 폭발 시 대상에게 진동 위력만큼 피해', h: { burst(r, _, b) { if (allyOf(r.src) && r.t.alive) dmgFx(b, r.t, 4 * G(r.src.lvl), '종추', r.src); } } },
  { id: 'seismo', n: '지진계', tag: 'tremor', t: 3, d: '아군의 진동 폭발이 진동 횟수를 줄이지 않는다', h: { burst(r) { if (allyOf(r.src) && r.t.st.tremor) r.t.st.tremor.c++; } } },

  { id: 'pincush', n: '바늘쌈지', tag: 'rupture', t: 1, d: '아군이 부여하는 파열 위력 +1', h: { inflict(r) { if (allyOf(r.src) && r.key === 'rupture' && r.p > 0) r.p += 1; } } },
  { id: 'tornfab', n: '찢어진 옷감', tag: 'rupture', t: 2, d: '파열 상태의 적에게 주는 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u) && c.t.st.rupture) c.mult *= 1.1; } } },
  { id: 'shears', n: '재단 가위', tag: 'rupture', t: 3, d: '적에게 파열 피해가 나면 그 50%를 무작위 다른 적에게', h: { statusDmg(r, _, b) { if (r.key !== 'rupture' || r.u.side !== 'E' || r.dmg <= 0) return; const o = b.livingEnemies().filter(e => e !== r.u); if (o.length) dmgFx(b, pick(o, b.rng), r.dmg * 0.5, '재단'); } } },

  { id: 'wetletter', n: '젖은 편지', tag: 'sinking', t: 1, d: '아군이 부여하는 침잠 위력 +1', h: { inflict(r) { if (allyOf(r.src) && r.key === 'sinking' && r.p > 0) r.p += 1; } } },
  { id: 'drownring', n: '익사자의 반지', tag: 'sinking', t: 2, d: '침잠으로 적이 받는 피해 2배', h: { statusDmgMod(r) { if (r.key === 'sinking' && r.u.side === 'E') r.dmg *= 2; } } },
  { id: 'abysslamp', n: '심해의 등불', tag: 'sinking', t: 3, d: '아군이 침잠을 부여할 때마다 그 아군 정신력 +1', h: { inflict(r, _, b) { if (allyOf(r.src) && r.key === 'sinking') b.addSp(r.src, 1, true); } } },

  { id: 'whetstone', n: '숫돌', tag: 'poise', t: 1, d: '전투 시작 시 아군 전체 호흡 2·2', h: { battleStart(r, _, b) { for (const a of b.allies) if (a.alive) b.inflict(a, a, 'poise', 2, 2); } } },
  { id: 'duelglove', n: '결투 장갑', tag: 'poise', t: 2, d: '아군 치명타 피해 +20%', h: { dmgMod(c) { if (allyOf(c.u) && c.crit) c.mult *= 1.2; } } },
  { id: 'clearmirror', n: '명경', tag: 'poise', t: 3, d: '아군이 치명타를 내면 호흡 횟수가 줄지 않는다', h: { hit(c) { if (allyOf(c.u) && c.crit && !c.act.v.allCrit) { if (c.u.st.poise) c.u.st.poise.c++; else c.u.st.poise = { p: 1, c: 1, lv: c.u.lvl }; } } } },

  { id: 'luckycoin', n: '행운의 동전', tag: 'coin', t: 1, d: '아군 코인 앞면 확률 +5%', h: { heads(r) { return allyOf(r.u) ? 5 : 0; } } },
  { id: 'ironfist', n: '쇠 장갑', tag: 'coin', t: 1, d: '체력 50% 이하 아군의 합 위력 +1', h: { clashPower(c) { return allyOf(c.u) && c.u.hp <= c.u.maxHp / 2 ? 1 : 0; } } },
  { id: 'weight', n: '무게추', tag: 'coin', t: 2, d: '아군이 합에서 이기면 다음 턴 위력 증가 1', h: { clashEnd(r, _, b) { if (allyOf(r.w)) b.buff(r.w, 'pwrUp', 1); } } },
  { id: 'twincoin', n: '이중 코인', tag: 'coin', t: 3, d: '합을 3판 이상 겨룬 뒤의 공격 피해 +30%', h: { dmgMod(c) { if (allyOf(c.u) && c.n >= 3) c.mult *= 1.3; } } },

  { id: 'oldshield', n: '낡은 방패', tag: 'guard', t: 1, d: '아군 방어·회피·반격 기본 위력 +2', h: { basePower(c) { return allyOf(c.u) && c.s.kind !== 'atk' ? 2 : 0; } } },
  { id: 'medkit', n: '응급 상자', tag: 'guard', t: 1, d: '미궁에서 전투에 이길 때마다 아군 체력 8% 회복', win: true },
  { id: 'turtle', n: '거북 등딱지', tag: 'guard', t: 2, d: '턴 시작 시 체력 비율이 가장 낮은 아군에게 보호막(최대 체력 8%)', h: { turnStart(r, _, b) { const t = b.livingAllies().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (t) b.addShield(t, t.maxHp * 0.08, b.turn); } } },
  { id: 'amulet', n: '수호 부적', tag: 'guard', t: 3, d: '전투마다 한 번, 처음 쓰러지는 아군이 체력 30%로 버틴다', h: { battleStart(r, _, b) { b.vars.amulet = 0; }, death(r, _, b) { if (r.u.side === 'A' && !b.vars.amulet && r.u.hp <= 0) { b.vars.amulet = 1; r.u.hp = Math.round(r.u.maxHp * 0.3); b.msg(`수호 부적이 ${r.u.name}을(를) 붙든다.`, 'gold'); return true; } } } },

  { id: 'musicbox', n: '오르골', tag: 'mind', t: 1, d: '턴 종료 시 아군 전체 정신력 +2', h: { turnEnd(r, _, b) { for (const a of b.livingAllies()) b.addSp(a, 2, true); } } },
  { id: 'smileshard', n: '웃는 가면 조각', tag: 'mind', t: 2, d: '적을 쓰러뜨리면 아군 전체 정신력 +5', h: { kill(r, _, b) { if (r.u.side === 'E') for (const a of b.livingAllies()) b.addSp(a, 5, true); } } },
  { id: 'sedative', n: '진정제', tag: 'mind', t: 2, d: '전투마다 한 번, 아군의 공황을 막고 정신력을 0으로', h: { battleStart(r, _, b) { b.vars.sed = 0; }, panic(r, _, b) { if (r.u.side === 'A' && !b.vars.sed && !(r.u.cid === 'yeon')) { b.vars.sed = 1; r.u.sp = 0; b.msg(`진정제: ${r.u.name}이(가) 평정을 되찾는다.`, 'gold'); return true; } } } },
  { id: 'madnib', n: '광기의 펜촉', tag: 'mind', t: 3, d: '정신력 −20 이하인 아군의 코인 위력 +1', h: { coinPower(c) { return allyOf(c.u) && c.u.sp <= -20 ? 1 : 0; } } },

  { id: 'pocketwatch', n: '회중시계', tag: 'speed', t: 1, d: '아군 속도 +1', h: { turnStart(r, _, b) { for (const a of b.livingAllies()) a.spdVals = a.spdVals.map(v => v + 1); } } },
  { id: 'whistle', n: '기적 소리', tag: 'speed', t: 2, d: '첫 턴 아군 신속 3', h: { battleStart(r, _, b) { for (const a of b.allies) a.bufNext.haste = (a.bufNext.haste || 0) + 3; } } },
  { id: 'railnail', n: '선로 못', tag: 'speed', t: 3, d: '대상보다 빠른 아군이 주는 피해 +15%', h: { dmgMod(c) { if (allyOf(c.u) && c.t.spdVals.length && (c.act.spd || 0) > Math.max(...c.t.spdVals)) c.mult *= 1.15; } } },

  { id: 'emocrystal', n: '감정 결정', tag: 'emo', t: 1, d: '전투 시작 시 무작위 감정 자원 4', h: { battleStart(r, _, b) { for (let i = 0; i < 4; i++) b.emo[pick(EMO_KEYS, b.rng)]++; } } },
  { id: 'tuner', n: '공명 조율기', tag: 'emo', t: 2, d: '공명 위력 보너스 상한 +1', h: { battleStart(r, _, b) { b.mods = Object.assign({}, b.mods, { resoMax: (b.mods.resoMax || 0) + 1 }); } } },
  { id: 'impcharm', n: '각인 부적', tag: 'emo', t: 2, d: '각인을 쓸 때 정신력 소모의 절반을 돌려받는다', h: { skillUse(r, _, b) { if (allyOf(r.u) && r.s.imp && r.s.spc && r.u.cid !== 'yeon') b.addSp(r.u, Math.floor(r.s.spc / 2), true); } } },
  { id: 'amplifier', n: '잔향 증폭기', tag: 'emo', t: 3, d: '아군 각인 피해 +30%', h: { dmgMod(c) { if (allyOf(c.u) && c.s.imp) c.mult *= 1.3; } } },
  { id: 'driverhat', n: '기관사의 모자', tag: 'emo', t: 2, d: '매 턴 시작 시 무작위 감정 자원 1', h: { turnStart(r, _, b) { b.emo[pick(EMO_KEYS, b.rng)]++; } } },

  { id: 'dagger', n: '녹슨 단도', tag: 'arms', t: 1, d: '아군 참격 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u) && c.s.dt === 'slash') c.mult *= 1.1; } } },
  { id: 'awl', n: '쇠 송곳', tag: 'arms', t: 1, d: '아군 관통 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u) && c.s.dt === 'pierce') c.mult *= 1.1; } } },
  { id: 'hammer', n: '쇠망치', tag: 'arms', t: 1, d: '아군 타격 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u) && c.s.dt === 'blunt') c.mult *= 1.1; } } },
  { id: 'huntmark', n: '사냥꾼의 표식', tag: 'arms', t: 2, d: '흐트러진 적에게 주는 피해 +25%', h: { dmgMod(c) { if (allyOf(c.u) && c.t.stag) c.mult *= 1.25; } } },
  { id: 'execaxe', n: '처형인의 도끼', tag: 'arms', t: 3, d: '체력 30% 이하인 적에게 주는 피해 +30%', h: { dmgMod(c) { if (allyOf(c.u) && c.t.hp <= c.t.maxHp * 0.3) c.mult *= 1.3; } } },
  { id: 'bloodpact', n: '피의 계약서', tag: 'arms', t: 3, d: '아군이 주는 피해 +20%, 받는 피해 +10%', h: { dmgMod(c) { if (allyOf(c.u)) c.mult *= 1.2; else if (allyOf(c.t)) c.mult *= 1.1; } } },
];
const RELIC = Object.fromEntries(RELICS.map(r => [r.id, r]));
const RELIC_TAGS = {
  bleed: { n: '출혈', key: 'bleed' }, burn: { n: '화상', key: 'burn' }, tremor: { n: '진동', key: 'tremor' }, rupture: { n: '파열', key: 'rupture' },
  sinking: { n: '침잠', key: 'sinking' }, poise: { n: '호흡', key: 'poise' }, coin: { n: '코인' }, guard: { n: '수비' }, mind: { n: '정신' },
  speed: { n: '속도' }, emo: { n: '감정' }, arms: { n: '무기' },
};
/* 같은 꾸러미 유물 3개: 세트 효과 */
function relicSetHooks(ids) {
  const cnt = {};
  for (const id of ids) { const r = RELIC[id]; if (r) cnt[r.tag] = (cnt[r.tag] || 0) + 1; }
  const out = [];
  for (const [tag, n] of Object.entries(cnt)) {
    if (n < 3) continue;
    const key = RELIC_TAGS[tag].key;
    if (key && key !== 'poise') out.push({ id: 'set_' + tag, n: `${RELIC_TAGS[tag].n} 세트`, h: { inflict(r) { if (allyOf(r.src) && r.key === key && r.p > 0) r.p += 1; } } });
    else if (key === 'poise') out.push({ id: 'set_poise', n: '호흡 세트', h: { dmgMod(c) { if (allyOf(c.u) && c.crit) c.mult *= 1.15; } } });
    else if (tag === 'coin') out.push({ id: 'set_coin', n: '코인 세트', h: { heads(r) { return allyOf(r.u) ? 5 : 0; } } });
    else if (tag === 'guard') out.push({ id: 'set_guard', n: '수비 세트', h: { dmgMod(c) { if (allyOf(c.t)) c.mult *= 0.9; } } });
    else if (tag === 'mind') out.push({ id: 'set_mind', n: '정신 세트', h: { battleStart(r, _, b) { for (const a of b.allies) b.addSp(a, 15, true); } } });
    else if (tag === 'speed') out.push({ id: 'set_speed', n: '속도 세트', h: { clashPower(c, _, b) { return allyOf(c.u) && c.opp && (c.act.spd || 0) > Math.max(...(c.opp.spdVals.length ? c.opp.spdVals : [0])) ? 1 : 0; } } });
    else if (tag === 'emo') out.push({ id: 'set_emo', n: '감정 세트', h: { battleStart(r, _, b) { for (const k of EMO_KEYS) b.emo[k] += 1; } } });
    else if (tag === 'arms') out.push({ id: 'set_arms', n: '무기 세트', h: { dmgMod(c) { if (allyOf(c.u)) c.mult *= 1.1; } } });
  }
  return out;
}
const SET_DESC = {
  bleed: '출혈 위력 +1', burn: '화상 위력 +1', tremor: '진동 위력 +1', rupture: '파열 위력 +1', sinking: '침잠 위력 +1', poise: '치명타 피해 +15%',
  coin: '앞면 확률 +5%', guard: '받는 피해 −10%', mind: '전투 시작 정신력 +15', speed: '대상보다 빠르면 합 위력 +1', emo: '전투 시작 시 모든 감정 자원 +1', arms: '주는 피해 +10%',
};

/* ======================= 미궁 심도 규칙 ======================= */
const DEPTHS = [
  null,
  { d: '기본 규칙' },
  { d: '적 체력 +10%', m: { eHpMul: 0.10 } },
  { d: '전투 후 회복 20% → 10%, 휴식 회복 40% → 30%', m: { rest: -0.10, post: -0.10 } },
  { d: '적 합 위력 +1', m: { ePow: 1 } },
  { d: '잔향체 행동 +1', m: { bossSlots: 1 } },
  { d: '상점 가격 +25%', m: { price: 0.25 } },
  { d: '적이 부여하는 상태 위력 +1', m: { eInfl: 1 } },
  { d: '아군 전투 시작 정신력 −10', m: { allySp: -10 } },
  { d: '적 체력 +20% (누적 30%)', m: { eHpMul: 0.20 } },
  { d: '유물 선택지 3 → 2', m: { choices: -1 } },
  { d: '정예·수문장·잔향체 체력 +30%', m: { eliteHp: 0.3 } },
  { d: '아군 최대 체력 −10%', m: { allyHp: -0.10 } },
  { d: '적 속도 +1', m: { eSpd: 1 } },
  { d: '적이 첫 턴에 위력 증가 2', m: { eFirst: 2 } },
  { d: '종착의 잔향: 마지막 잔향체 레벨 +6', m: { finalLv: 6 } },
];
function depthMods(depth) {
  const m = { eHpMul: 1, rest: 0.4, post: 0.2, price: 1, choices: 3, allyHp: 1, finalLv: 0 };
  for (let i = 2; i <= depth; i++) {
    const x = DEPTHS[i].m;
    for (const [k, v] of Object.entries(x)) {
      if (k === 'eHpMul') m.eHpMul += v; else if (k === 'rest') m.rest += v; else if (k === 'post') m.post += v; else if (k === 'price') m.price += v;
      else if (k === 'choices') m.choices += v; else if (k === 'allyHp') m.allyHp += v; else m[k] = (m[k] || 0) + v;
    }
  }
  return m;
}

/* ======================= 미궁 사건 ======================= */
/* 각 선택지 fx(run, api) 는 결과 문장을 돌려준다 */
const LAB_EVENTS = [
  { id: 'kiosk', n: '버려진 매점', text: '셔터가 반쯤 내려간 매점. 계산대 아래에 철제 상자가 보인다.',
    ch: [
      { t: '상자를 연다 (금화 +40)', fx: (r, A) => { r.gold += 40; return '녹슨 금화가 쏟아졌다.'; } },
      { t: '매점을 샅샅이 뒤진다 (50%: 유물 / 50%: 아군 체력 −10%)', fx: (r, A) => { if (Math.random() < 0.5) { A.relicChoice(1); return '선반 뒤에서 무언가를 찾았다.'; } A.hurtAll(0.1); return '선반이 무너졌다.'; } },
    ] },
  { id: 'child', n: '우는 아이의 잔향', text: '승강장 끝에서 아이가 운다. 다가가도 얼굴이 보이지 않는다.',
    ch: [
      { t: '달래 준다 (아군 체력 10% 회복, 다음 전투 정신력 +15)', fx: (r, A) => { A.healAll(0.1); r.nextSp = (r.nextSp || 0) + 15; return '울음소리가 잦아들었다. 아이는 고맙다고 말하고 사라졌다.'; } },
      { t: '지나친다 (금화 +25)', fx: r => { r.gold += 25; return '아이가 있던 자리에 동전이 떨어져 있었다.'; } },
    ] },
  { id: 'altar', n: '피의 제단', text: '붉게 물든 제단. "바쳐라, 그러면 주리라."',
    ch: [
      { t: '체력 20%를 바친다 (2등급 유물)', fx: (r, A) => { A.hurtAll(0.2); A.relicChoice(2); return '제단이 피를 마시고 답례했다.'; } },
      { t: '떠난다', fx: () => '제단은 아무 말도 하지 않았다.' },
    ] },
  { id: 'mirror', n: '금 간 거울', text: '거울 속 당신이 무언가를 내민다. 당신이 가진 것과 똑같은 물건이다.',
    ch: [
      { t: '받는다 (가진 유물 하나를 복제, 아군 체력 −15%)', fx: (r, A) => { if (!r.relics.length) return '거울 속 손이 비어 있었다.'; const id = pick(r.relics); r.relics.push(id); A.hurtAll(0.15); return `「${RELIC[id].n}」이(가) 하나 더 생겼다.`; } },
      { t: '거울을 깬다 (금화 +50)', fx: r => { r.gold += 50; return '조각 사이에 금화가 끼어 있었다.'; } },
    ] },
  { id: 'gamble', n: '도박꾼의 테이블', text: '"한 판 어때? 금화 50. 이기면 두 배."',
    ch: [
      { t: '건다 (금화 50 → 50%로 100)', fx: r => { if (r.gold < 50) return '판돈이 모자랐다.'; r.gold -= 50; if (Math.random() < 0.5) { r.gold += 100; return '앞면! 금화 100을 땄다.'; } return '뒷면. 판돈을 잃었다.'; } },
      { t: '사양한다', fx: () => '"재미없는 사람이군."' },
    ] },
  { id: 'chapel', n: '물에 잠긴 기도실', text: '무릎까지 물이 찬 기도실. 촛불 하나가 아직 꺼지지 않았다.',
    ch: [
      { t: '기도한다 (아군 체력 25% 회복)', fx: (r, A) => { A.healAll(0.25); return '따뜻한 무언가가 상처를 덮었다.'; } },
      { t: '헌금함을 턴다 (금화 +60, 다음 전투 정신력 −15)', fx: r => { r.gold += 60; r.nextSp = (r.nextSp || 0) - 15; return '뒤통수가 따갑다.'; } },
    ] },
  { id: 'merchant', n: '수상한 상인', text: '"돈은 필요 없어. 피 조금이면 돼."',
    ch: [
      { t: '거래한다 (아군 체력 −15%, 유물 선택)', fx: (r, A) => { A.hurtAll(0.15); A.relicChoice(1); return '상인이 만족스럽게 웃었다.'; } },
      { t: '거절한다', fx: () => '상인은 어둠 속으로 사라졌다.' },
    ] },
  { id: 'rails', n: '무너진 선로', text: '앞쪽 선로가 내려앉았다. 우회로는 길고, 돌파는 위험하다.',
    ch: [
      { t: '우회한다 (다음 전투 적 레벨 −3)', fx: r => { r.nextLv = (r.nextLv || 0) - 3; return '먼 길을 돌아 지친 적들의 뒤를 잡았다.'; } },
      { t: '돌파한다 (아군 체력 −10%, 금화 +70)', fx: (r, A) => { A.hurtAll(0.1); r.gold += 70; return '잔해 속에서 금화를 주웠다.'; } },
    ] },
  { id: 'well', n: '잔향의 우물', text: '들여다보면 지나온 역들이 비친다.',
    ch: [
      { t: '동전을 던진다 (금화 −20, 1등급 유물)', fx: (r, A) => { if (r.gold < 20) return '던질 동전이 없었다.'; r.gold -= 20; A.relicChoice(1); return '우물 바닥에서 무언가가 떠올랐다.'; } },
      { t: '물을 마신다 (아군 체력 40% 회복, 다음 전투 정신력 −20)', fx: (r, A) => { A.healAll(0.4); r.nextSp = (r.nextSp || 0) - 20; return '차갑고, 조금 슬픈 맛이 났다.'; } },
    ] },
  { id: 'voice', n: '기관실의 목소리', text: '"차장, 무엇을 원합니까?"',
    ch: [
      { t: '힘 (다음 3전투 아군 위력 +1)', fx: r => { r.powTurns = (r.powTurns || 0) + 3; return '"좋습니다. 잠시 빌려 드리죠."'; } },
      { t: '안식 (아군 체력 모두 회복)', fx: (r, A) => { A.healAll(1); return '"푹 쉬세요."'; } },
      { t: '기억 (기억 파편 +200)', fx: (r, A) => { A.metaShards(200); return '"잊지 마세요. 그게 전부입니다."'; } },
    ] },
  { id: 'fire', n: '불타는 객차', text: '옆 선로의 객차가 불타고 있다. 안에서 무언가가 반짝인다.',
    ch: [
      { t: '뛰어든다 (아군 체력 −15%, 2등급 유물)', fx: (r, A) => { A.hurtAll(0.15); A.relicChoice(2); return '그을린 손에 유물이 쥐어져 있었다.'; } },
      { t: '지켜본다', fx: () => '불은 오래도록 꺼지지 않았다.' },
    ] },
  { id: 'exchange', n: '잔향 거래소', text: '"금화를 결정으로 바꿔 드립니다. 바깥에서도 쓸 수 있죠."',
    ch: [
      { t: '금화 100 → 잔향 결정 3', fx: (r, A) => { if (r.gold < 100) return '금화가 모자랐다.'; r.gold -= 100; A.metaCrystals(3); return '결정이 손안에서 차갑게 빛난다.'; } },
      { t: '구경만 한다', fx: () => '"다음에 또 오세요."' },
    ] },
  { id: 'bell', n: '홀로 울리는 종', text: '누가 치지도 않았는데 종이 울린다. 박자가 정확하다.',
    ch: [
      { t: '박자에 맞춰 걷는다 (남은 미궁 동안 전투 시작 정신력 +5)', fx: r => { r.spBonus = (r.spBonus || 0) + 5; return '발걸음이 가벼워졌다.'; } },
      { t: '종을 멈춘다 (금화 +30)', fx: r => { r.gold += 30; return '종 안쪽에 동전이 붙어 있었다.'; } },
    ] },
  { id: 'lost', n: '길 잃은 승객', text: '표를 잃어버린 승객이 길을 묻는다.',
    ch: [
      { t: '길을 알려 준다 (이번 층 경험치 +30%)', fx: r => { r.xpBoost = 1.3; return '승객이 꾸벅 인사했다. 무언가를 배운 기분이다.'; } },
      { t: '표를 판다 (금화 +45)', fx: r => { r.gold += 45; return '승객은 고맙다며 금화를 건넸다.'; } },
    ] },
];

/* ======================= 업적 ======================= */
const ACHS = [
  { id: 'first', n: '첫 승차', d: '첫 전투에서 승리', r: 100, c: s => s.stats.wins >= 1 },
  { id: 'ch1', n: '자정 전에', d: '1장 클리어', r: 200, c: s => !!s.story.boss[1] },
  { id: 'ch3', n: '반납 완료', d: '3장 클리어', r: 400, c: s => !!s.story.boss[3] },
  { id: 'ch6', n: '제동', d: '6장 클리어', r: 800, c: s => !!s.story.boss[6] },
  { id: 'ch9', n: '실을 끊다', d: '9장 클리어', r: 1200, c: s => !!s.story.boss[9] },
  { id: 'ch12', n: '잊지 않기로', d: '12장 클리어 (엔딩)', r: 3000, c: s => !!s.story.boss[12] },
  { id: 'nm1', n: '악몽의 노선', d: '악몽 잔향체 1체 처치', r: 600, c: s => Object.keys(s.story.nmBoss).length >= 1 },
  { id: 'nm6', n: '반쯤 깨어난 꿈', d: '악몽 잔향체 6체 처치', r: 2000, c: s => Object.keys(s.story.nmBoss).length >= 6 },
  { id: 'nm12', n: '악몽의 끝', d: '악몽 잔향체 12체 모두 처치', r: 6000, c: s => Object.keys(s.story.nmBoss).length >= 12 },
  { id: 'lab1', n: '미궁 입문', d: '잔향 미궁 심도 1 돌파', r: 300, c: s => s.lab.best >= 1 },
  { id: 'lab5', n: '깊은 곳으로', d: '잔향 미궁 심도 5 돌파', r: 1200, c: s => s.lab.best >= 5 },
  { id: 'lab10', n: '심연의 승객', d: '잔향 미궁 심도 10 돌파', r: 3000, c: s => s.lab.best >= 10 },
  { id: 'lab15', n: '바닥 없는 곳', d: '잔향 미궁 심도 15 돌파', r: 8000, c: s => s.lab.best >= 15 },
  { id: 'clash10', n: '물러서지 않는다', d: '한 번의 합에서 10판 이상 겨루기', r: 300, c: s => s.stats.maxClash >= 10 },
  { id: 'hit300', n: '일격', d: '한 번의 적중으로 300 이상 피해', r: 300, c: s => s.stats.maxHit >= 300 },
  { id: 'hit1500', n: '절단', d: '한 번의 적중으로 1500 이상 피해', r: 1500, c: s => s.stats.maxHit >= 1500 },
  { id: 'wins100', n: '단골 승객', d: '전투 100회 승리', r: 1000, c: s => s.stats.wins >= 100 },
  { id: 'wins500', n: '잔향선의 터줏대감', d: '전투 500회 승리', r: 4000, c: s => s.stats.wins >= 500 },
  { id: 'clashw500', n: '합의 달인', d: '합 누적 500회 승리', r: 1000, c: s => s.stats.clashWin >= 500 },
  { id: 'bleed500', n: '붉은 강', d: '출혈 누적 500 부여', r: 500, c: s => (s.stats.infl.bleed || 0) >= 500 },
  { id: 'burn500', n: '잿더미', d: '화상 누적 500 부여', r: 500, c: s => (s.stats.infl.burn || 0) >= 500 },
  { id: 'tremor500', n: '여진', d: '진동 누적 500 부여', r: 500, c: s => (s.stats.infl.tremor || 0) >= 500 },
  { id: 'rupture500', n: '해진 옷감', d: '파열 누적 500 부여', r: 500, c: s => (s.stats.infl.rupture || 0) >= 500 },
  { id: 'sinking500', n: '깊은 물', d: '침잠 누적 500 부여', r: 500, c: s => (s.stats.infl.sinking || 0) >= 500 },
  { id: 'jackpot', n: '잭팟', d: '로아로 잭팟 10회', r: 500, c: s => s.stats.jackpots >= 10 },
  { id: 'imp50', n: '잔향을 다루는 자', d: '각인 50회 사용', r: 800, c: s => s.stats.imps >= 50 },
  { id: 'stag100', n: '흐트러뜨려라', d: '적 흐트러뜨리기 100회', r: 800, c: s => s.stats.staggers >= 100 },
  { id: 'lvl30', n: '숙련 승객', d: '승객 하나를 레벨 30으로', r: 600, c: s => Object.values(s.chars).some(c => c.lvl >= 30) },
  { id: 'lvl60', n: '전설의 승객', d: '승객 하나를 레벨 60으로', r: 3000, c: s => Object.values(s.chars).some(c => c.lvl >= 60) },
  { id: 'all60', n: '만원 열차', d: '승객 10명 모두 레벨 60', r: 15000, c: s => CHAR_ORDER.every(k => s.chars[k] && s.chars[k].lvl >= 60) },
  { id: 'asc4', n: '완전한 각성', d: '승객 하나를 4단계까지 돌파', r: 2000, c: s => Object.values(s.chars).some(c => c.asc >= 4) },
  { id: 'mast', n: '기술의 정점', d: '승객 하나의 기술 넷을 모두 숙련 5로', r: 1500, c: s => Object.values(s.chars).some(c => c.m && c.m.every(x => x >= 5)) },
  { id: 'relic30', n: '수집가', d: '유물 30종 발견', r: 1500, c: s => Object.keys(s.relicSeen).length >= 30 },
  { id: 'relicall', n: '잔향 박물관', d: '유물 전종 발견', r: 5000, c: s => Object.keys(s.relicSeen).length >= RELICS.length },
  { id: 'hours10', n: '긴 여정', d: '플레이 10시간', r: 1000, c: s => s.playtime >= 36000 },
  { id: 'hours50', n: '돌아오지 않는 열차', d: '플레이 50시간', r: 5000, c: s => s.playtime >= 180000 },
];
