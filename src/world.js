'use strict';
/* ===== 잔향선 · 세계: 노선(이야기), 유물, 미궁, 장비, 업적 ===== */

const SPEAKER = {
  voice: { n: '기관실의 목소리', c: '#c9b98f' },
  me: { n: '나', c: '#e8dcc0' },
  harang: { n: '하람', c: '#fcc419' }, serin: { n: '세린', c: '#e03131' }, yeon: { n: '연', c: '#3bc9db' }, viola: { n: '비올라', c: '#e599f7' },
  doyun: { n: '도윤', c: '#ff922b' }, kai: { n: '카이', c: '#ffa94d' }, roa: { n: '로아', c: '#ffd43b' }, mujin: { n: '무진', c: '#74c0fc' },
  eve: { n: '이브', c: '#e9ecef' }, sion: { n: '시온', c: '#ffd43b' }, shadow: { n: '거울 속의 나', c: '#e599f7' },
};

/* 직업별 첫 장면 한 줄 */
const CLASS_INTRO = {
  hemoblade: '손바닥에 오래된 칼자국이 있다. 피를 흘릴 때마다 칼이 가벼워졌던 것만은 기억난다.',
  ember: '품 안의 향로가 아직 따뜻하다. 무엇을 위해 기도했는지는 잊었지만, 불씨는 꺼지지 않았다.',
  bell: '손에 쥔 종이 저절로 한 번 울린다. 박자를 세는 버릇만은 몸에 남아 있었다.',
  duelist: '허리의 칼집이 낯설지 않다. 누군가와 마주 섰던 감각이 손목에 남아 있다.',
  bulwark: '갑옷이 무겁다. 그 무게만큼 무언가를 지켰던 것 같다.',
  gambler: '주머니 속 동전이 따뜻하다. 마지막으로 무엇을 걸었는지는 기억나지 않는다.',
  poet: '젖은 원고가 품에 있다. 글자는 번졌지만 운율은 아직 들린다.',
  gunner: '어깨의 포신이 묵직하다. 마지막 한 발을 쏘지 못한 기억이 손가락에 걸려 있다.',
  puppeteer: '손끝에 실이 감겨 있고, 실 끝에서 인형 하나가 고개를 든다. 「마리」라는 이름만은 또렷하다.',
  clock: '회중시계의 바늘이 거꾸로 돈다. 고치는 법은 손이 기억한다.',
};

const CHAPTERS = [
  {
    id: 1, title: '잿빛 승강장', sub: '멈춘 시계탑', theme: 'ash', color: '#c8b04f', boss: 'clockwarden', set: ['vagrant', 'clockrat', 'luggage'], elite: 'inspector', npc: 'harang',
    intro: [
      ['', '눈을 떴을 때, 열차는 이미 달리고 있었다. 창밖으로 물에 잠긴 회색 도시가 흘러간다. 객차에는 아무도 없다.'],
      ['voice', '일어났군요, 차장. 잔향선이 출발했습니다.'],
      ['me', '…차장? 나는 아무것도 기억나지 않는데.'],
      ['voice', '그래서 이 열차에 탄 겁니다. 이 도시에선 사람들이 놓지 못한 감정이 가라앉지 않고 떠올라 형체를 얻어요. 우리는 그것을 잔향이라 부릅니다.'],
      ['voice', '역마다 잔향체가 있습니다. 그것을 거두어야 열차는 다음 역으로 갑니다. 그리고 당신이 잃어버린 것은 종착역에 있어요.'],
      ['', '{CLASS_INTRO}'],
      ['voice', '혼자라고 겁먹지 마세요. 원래 이 노선은 한 사람만 태웁니다.'],
    ],
    mid: [['voice', '검표원이 남아 있군요. 이 역은 아직도 표를 검사합니다. 같은 표를 두 번 내밀지 마세요.']],
    bossIntro: [
      ['', '시계탑 꼭대기. 녹슨 바늘을 얼굴로 단 수위가 시계 속에서 몸을 일으킨다.'],
      ['?', '…열한 시 오십구 분. 아직, 아직이야. 자정이 오면 모두 끝나.'],
      ['voice', '자정에 닿으면 종이 울립니다. 흐트러뜨리거나 완벽하게 받아 내면 바늘이 뒤로 갑니다.'],
    ],
    outro: [
      ['', '바늘이 멈추자, 탑 안쪽에서 종소리가 울렸다. 종 아래에 한 여자가 쓰러져 있었다.'],
      ['harang', '…몇 시죠? 종을 쳐야 하는데. 마을 사람들이 기다려요.'],
      ['me', '마을은 없어. 이 도시엔 물밖에 남지 않았어.'],
      ['harang', '그래도 칠래요. 박자를 놓치면, 다신 못 찾으니까. …열차에 종 하나쯤은 있어도 되겠죠?'],
      ['', '하람이 잔향선에 올랐다. 그녀는 객차 끝에서 출발 종을 맡기로 했다.'],
    ],
  },
  {
    id: 2, title: '녹슨 정육시장', sub: '배고픈 칼', theme: 'market', color: '#c4473a', boss: 'butcher', set: ['cleaver', 'hookhound', 'bloodmerchant'], elite: 'freezer', npc: 'serin',
    intro: [
      ['', '두 번째 역. 녹슨 갈고리마다 무언가가 걸려 있다. 고기인지 아닌지 구분하지 않기로 했다.'],
      ['voice', '이 시장은 굶주림이 만든 역입니다. 도시가 가라앉던 해, 이곳은 마지막까지 사람들을 먹였죠.'],
      ['', '좌판 사이에서 핏자국을 따라 걷는 사람이 보인다. 붉은 머리끈의 여자다.'],
      ['serin', '따라오지 마. …아니, 같이 가. 혼자서는 저 안까지 못 들어가.'],
    ],
    mid: [['serin', '냉동고가 열려 있어. 얼어붙은 것들은 녹으면 더 사나워져. 불로 녹여.']],
    bossIntro: [
      ['?', '배고파. 배고파. 다 먹었는데도 배고파.'],
      ['serin', '그 앞치마… 우리 언니가 일하던 가게 거야.'],
      ['voice', '고기 걸이가 남아 있으면 먹고 회복합니다. 걸이를 먼저 부수세요.'],
    ],
    outro: [
      ['', '정육업자가 무너지자 앞치마 주머니에서 낡은 배급표 뭉치가 쏟아졌다. 맨 위에 이름 하나가 적혀 있다.'],
      ['serin', '…언니 이름이야. 언니는 여기서 끝까지 사람들한테 고기를 나눠 줬구나.'],
      ['serin', '피는 여기서 멈췄어. 이제 어디로 흘러가는지 보고 싶어. 다음 역까지 데려가 줄래?'],
      ['', '세린이 잔향선에 올랐다. 그녀는 객차 한쪽에 작은 응급실을 차렸다.'],
    ],
  },
  {
    id: 3, title: '침수 도서관', sub: '젖은 문장', theme: 'library', color: '#4f87cc', boss: 'librarian', set: ['soakedpage', 'inkjelly', 'shelf'], elite: 'reader', npc: 'yeon',
    intro: [
      ['', '세 번째 역은 물속에 있었다. 열차가 멈추자 창밖으로 책장들이 해초처럼 흔들린다.'],
      ['voice', '이 도서관은 가라앉은 문장으로 가득합니다. 오래 읽으면 당신도 가라앉아요. 정신력을 지키세요.'],
      ['', '계단 끝에 젖은 원고 뭉치를 끌어안은 남자가 앉아 있다.'],
      ['yeon', '제 시를 여기 두고 왔어요. 아니, 버리고 왔죠. 가라앉은 문장은 맑거든요.'],
    ],
    mid: [['yeon', '낭독자가 마지막 장을 읽기 시작하면 끊어야 해요. 그 장을 끝까지 들은 사람은 돌아오지 못했어요.']],
    bossIntro: [
      ['', '도서관 가장 깊은 곳. 책을 얼굴에 쓴 사서가 물속에서 떠오른다.'],
      ['?', '반납 기한이 지났습니다. 모두. 모두. 모두.'],
      ['voice', '수위가 오를수록 불리해집니다. 배수구를 부수면 물이 빠져요. 그리고 사서는 당신의 기술을 금서로 봉인합니다.'],
    ],
    outro: [
      ['', '사서가 흩어지자 물 위로 책 한 권이 떠올랐다. 젖지 않은 유일한 책이다.'],
      ['yeon', '…제 시집이에요. 사서가 끝까지 지켜 줬네요. 버린 줄 알았는데.'],
      ['yeon', '열차에서 다시 써 볼게요. 이번엔 가라앉지 않는 문장으로.'],
      ['', '연이 잔향선에 올랐다. 그는 역마다 만난 잔향들을 기록하기로 했다.'],
    ],
  },
  {
    id: 4, title: '불타는 극장', sub: '마지막 공연', theme: 'theater', color: '#e07b2c', boss: 'diva', set: ['extra', 'dancer', 'stagerig'], elite: 'prompter', npc: 'viola',
    intro: [
      ['', '네 번째 역은 불타고 있었다. 불길은 백 년째 같은 높이로 타오르고, 객석에는 재가 된 관객들이 앉아 있다.'],
      ['voice', '이 극장은 공연을 끝내지 못했습니다. 막이 내리지 않으면 불도 꺼지지 않아요.'],
      ['viola', '쉿. 공연 중이에요. 무대 뒤로 와요. 인형들이 길을 알려 줄 거예요.'],
      ['', '실에 매달린 인형들이 무대 뒤 통로를 가리킨다. 실을 쥔 사람은 그을린 앞치마의 무대 담당이다.'],
    ],
    mid: [['viola', '프롬프터는 대사를 일러 줘요. 따라 하면 그가 약해지고, 어기면… 무대에서 쫓겨나죠.']],
    bossIntro: [
      ['', '조명이 한 사람을 비춘다. 불꽃 드레스의 디바가 마이크를 든다.'],
      ['?', '관객이 한 명이라도 남아 있는 한, 노래는 끝나지 않아요.'],
      ['voice', '조명이 디바를 비추면 독무대입니다. 그동안 충분히 피해를 주면 조명이 떨어져요. 못 하면 앙코르가 옵니다.'],
    ],
    outro: [
      ['', '디바가 마지막 음을 내려놓자, 백 년 만에 막이 내렸다. 불길이 숨을 고르듯 잦아든다.'],
      ['viola', '…박수 칠게요. 아무도 안 쳐 주면 끝난 줄 모르니까.'],
      ['', '빈 객석에 박수 소리가 하나 울렸다. 디바는 고개를 숙이고 재가 되었다.'],
      ['viola', '다음 공연장은 열차로 할래요. 관객이 한 명이면 충분하잖아요.'],
      ['', '비올라가 잔향선에 올랐다. 그녀의 인형들은 객차마다 등불을 들고 섰다.'],
    ],
  },
  {
    id: 5, title: '가면 공방', sub: '얼굴 없는 손', theme: 'workshop', color: '#9468c9', boss: 'masque', set: ['apprentice', 'blankface', 'pressarm'], elite: 'foreman', npc: 'doyun',
    intro: [
      ['', '다섯 번째 역은 가면을 찍어 내던 공장이다. 벽마다 웃는 얼굴, 우는 얼굴, 화난 얼굴이 걸려 있다.'],
      ['voice', '이곳 사람들은 표정을 사서 썼습니다. 표정이 팔리지 않던 날, 공장은 사람의 얼굴을 찍기 시작했죠.'],
      ['', '공방 구석에서 향로를 든 남자가 가면 하나를 오래 들여다보고 있다.'],
      ['doyun', '경건한 얼굴이라는 가면이에요. 제가 평생 쓰고 있던 거죠. 벗는 법을 잊었어요.'],
    ],
    mid: [['doyun', '조립 팔이 하나라도 움직이면 공장장은 지치지 않아요. 팔부터 멈춰요.']],
    bossIntro: [
      ['', '공장 한가운데, 세 개의 가면을 번갈아 쓰는 광대가 인사한다.'],
      ['?', '어느 얼굴이 마음에 드세요? 전부 드릴게요. 대신 당신 얼굴을 주세요.'],
      ['voice', '가면마다 약점과 내성이 다릅니다. 약점으로 세 번 치면 가면이 깨져요. 모두 깨면 맨얼굴이 드러납니다.'],
    ],
    outro: [
      ['', '마지막 가면이 깨지자 그 아래엔 아무것도 없었다. 광대는 빈 얼굴로 웃는 법을 연습하다 사라졌다.'],
      ['doyun', '가면이 없어도 얼굴은 있더군요. 조금 낯설 뿐이지.'],
      ['doyun', '열차에서 기도할게요. 이번엔 경건한 척 말고, 진짜로.'],
      ['', '도윤이 잔향선에 올랐다. 그의 향로는 객차를 따뜻하게 데웠다.'],
    ],
  },
  {
    id: 6, title: '유령 선로', sub: '놓친 열차', theme: 'tracks', color: '#38b2a0', boss: 'express', set: ['trackwraith', 'signalman', 'freight'], elite: 'stationmaster', npc: 'kai',
    intro: [
      ['', '여섯 번째 역에는 승강장이 없다. 선로만 끝없이 이어지고, 그 위로 희미한 사람들이 달린다.'],
      ['voice', '마지막 열차를 놓친 사람들입니다. 아직도 그 열차를 따라 달리고 있어요.'],
      ['', '선로 옆에서 포신을 멘 남자가 신호등을 고치고 있다.'],
      ['kai', '집에 가는 막차였어. 한 발만 더 쏘고 타려고 했는데, 그 한 발 때문에 놓쳤지.'],
    ],
    mid: [['kai', '역무원장은 정시에만 움직여. 세 번째 종이 울리면 두 번 움직이니까 그때를 조심해.']],
    bossIntro: [
      ['', '선로 끝에서 불빛이 다가온다. 종착역이 없는 열차가 기적을 울린다.'],
      ['?', '뿌우우우— 정차하지 않습니다. 정차하지 않습니다.'],
      ['voice', '턴마다 속도가 오르고, 속도 5에서 탈선합니다. 타격 기술로 제동을 걸거나 흐트러뜨려 멈추세요.'],
    ],
    outro: [
      ['', '유령열차가 멈추자, 선로 위를 달리던 사람들이 하나둘 열차에 올라탔다. 그리고 안개처럼 흩어졌다.'],
      ['kai', '저 사람들, 드디어 탔네. 나도… 이번엔 놓치지 않을래.'],
      ['', '카이가 잔향선에 올랐다. 그는 열차 지붕에서 망을 보기로 했다.'],
    ],
  },
  {
    id: 7, title: '웃는 축제', sub: '꿰매 붙인 웃음', theme: 'festival', color: '#dca23a', boss: 'grin', set: ['citizen', 'clown', 'megaphone'], elite: 'mc', npc: 'roa',
    intro: [
      ['', '일곱 번째 역은 축제 중이다. 모두가 웃고 있다. 웃음을 꿰매 붙인 얼굴로.'],
      ['voice', '이 축제에선 웃지 않으면 안 됩니다. 정신력이 바닥나면 당신도 웃게 될 거예요. 조심하세요.'],
      ['', '노름판 앞에서 한 남자가 동전을 튕긴다. 그만 웃지 않고 있다.'],
      ['roa', '내 웃음을 걸었다가 잃었어. 그래서 안 웃는 게 아니라 못 웃는 거야. 다시 따러 갈 건데, 같이 갈래?'],
    ],
    mid: [['roa', '사회자는 박수를 먹고 커져. 세 번 모이기 전에 흐트러뜨려.']],
    bossIntro: [
      ['', '하늘에 거대한 얼굴이 떠오른다. 풍선과 리본을 매단 웃는 얼굴이다.'],
      ['?', '웃어. 웃어. 웃어. 웃으면 아무것도 안 아파.'],
      ['voice', '막지 못한 공격마다 웃음이 쌓이고, 다섯이면 폭소가 터집니다. 풍선을 터뜨리면 정신이 맑아져요.'],
    ],
    outro: [
      ['', '웃는 얼굴이 터지자 색종이가 비처럼 내렸다. 사람들의 꿰맨 웃음이 하나씩 풀린다.'],
      ['roa', '…하하. 진짜 웃음은 이런 소리였구나. 잊고 있었네.'],
      ['', '로아가 잔향선에 올랐다. 그는 객차에서 작은 노름판을 열었다. 판돈은 이야기 한 토막이다.'],
    ],
  },
  {
    id: 8, title: '무너진 채석장', sub: '무게', theme: 'quarry', color: '#a0723a', boss: 'colossus', set: ['mason', 'tortoise', 'tremorworm'], elite: 'demolition', npc: 'mujin',
    intro: [
      ['', '여덟 번째 역. 도시를 쌓은 돌이 모두 이곳에서 나왔다. 깎여 나간 빈자리가 어둡게 입을 벌리고 있다.'],
      ['voice', '이 채석장은 일한 사람들의 무게로 만들어졌습니다. 그 무게가 모여 무언가가 일어섰어요.'],
      ['', '무너진 비계 아래에서 갑옷을 입은 사내가 돌을 하나씩 옮기고 있다.'],
      ['mujin', '내가 지키지 못한 사람들의 수만큼 돌을 옮기는 중이다. 아직 반도 못 했지.'],
    ],
    mid: [['mujin', '폭파 기술자가 다이너마이트를 심었다. 부수지 못하면 다 같이 묻힌다.']],
    bossIntro: [
      ['', '채석장 바닥이 갈라지며 거인이 일어선다. 양팔은 산을 깎던 바위다.'],
      ['?', '…무겁다. 무겁다. 내려놓을 곳이 없다.'],
      ['voice', '양팔이 있는 동안 몸은 바위처럼 단단합니다. 팔을 부수면 핵이 드러나요.'],
    ],
    outro: [
      ['', '거인이 무릎을 꿇자 돌들이 제자리로 굴러가 쌓였다. 무덤처럼, 혹은 쉼터처럼.'],
      ['mujin', '돌을 옮기는 건 여기까지 하지. 이제는 사람을 지키러 가겠다.'],
      ['', '무진이 잔향선에 올랐다. 그는 객차 문 앞을 지키기로 했다.'],
    ],
  },
  {
    id: 9, title: '재봉실', sub: '운명의 바늘땀', theme: 'sewing', color: '#d36b9e', boss: 'seamstress', set: ['sewdoll', 'spoolspider', 'cutter'], elite: 'mender', npc: 'eve',
    intro: [
      ['', '아홉 번째 역은 거대한 재봉실이다. 천장에서 실이 비처럼 늘어져 있고, 실마다 이름이 꿰매져 있다.'],
      ['voice', '이곳에선 사람들의 운명을 꿰맸다고 합니다. 한 번 꿰매진 운명은 풀리지 않았죠.'],
      ['', '실 사이에서 흰 결투복의 여자가 칼로 실을 끊고 있다. 끊어도 실은 다시 이어진다.'],
      ['eve', '내 운명은 결투에서 지는 거라고 꿰매져 있었어. 그래서 이 실을 끊으러 왔지.'],
    ],
    mid: [['eve', '수선공은 스스로를 꿰매. 파열을 걸면 바늘이 멈추지.']],
    bossIntro: [
      ['', '실이 모이는 곳, 여섯 개의 바늘 다리를 가진 재봉사가 고개를 든다.'],
      ['?', '당신의 다음 수는 이미 꿰매져 있어요. 보여 드릴까요?'],
      ['voice', '바늘땀이 쌓이면 당신이 준 피해가 당신에게도 돌아옵니다. 셋이면 다음 기술이 강제돼요. 참격으로 끊으세요.'],
    ],
    outro: [
      ['', '재봉사가 쓰러지자 천장의 실이 모두 끊어져 내려앉았다. 이름들이 바닥에 흩어진다.'],
      ['eve', '내 이름이야. 이제 아무 실에도 꿰매져 있지 않아.'],
      ['', '이브가 잔향선에 올랐다. 그녀는 객차 사이 통로에서 칼을 닦으며 다음 결투를 기다린다.'],
    ],
  },
  {
    id: 10, title: '달의 정원', sub: '은월과 흑월', theme: 'garden', color: '#7b84d6', boss: 'moons', set: ['gardener', 'moth', 'golem'], elite: 'sundial', npc: 'sion',
    intro: [
      ['', '열 번째 역은 하늘에 달이 둘 떠 있는 정원이다. 하나는 은빛, 하나는 검다.'],
      ['voice', '이 정원의 주인은 낮과 밤을 둘로 나눠 살았습니다. 낮의 그와 밤의 그는 서로를 몰랐죠.'],
      ['', '해시계 옆에서 태엽 장치를 고치는 노인이 있다. 시계 바늘이 둘씩 달린 시계들이다.'],
      ['sion', '하루를 둘로 나누면 두 배로 살 수 있을 줄 알았지. 반씩 두 번 살았을 뿐이더군.'],
    ],
    mid: [['sion', '수도사는 낮엔 기도하고 밤엔 저주해. 밤이 오기 전에 몰아붙여.']],
    bossIntro: [
      ['', '두 달이 정원 위로 내려온다. 은월은 웃고, 흑월은 운다.'],
      ['?', '하나가 지면, 남은 하나가 다시 띄운다. 언제나 그래 왔어.'],
      ['voice', '하나를 쓰러뜨리면 3턴 안에 나머지도 쓰러뜨려야 합니다. 떠 있지 않은 달은 단단해요.'],
    ],
    outro: [
      ['', '두 달이 함께 지자 정원에 처음으로 새벽이 왔다. 낮도 밤도 아닌 시간이다.'],
      ['sion', '반쪽짜리 시계들을 하나로 맞춰 봐야겠군. 열차에선 시간이 많으니까.'],
      ['', '시온이 잔향선에 올랐다. 그는 열차의 모든 시계를 맞추기 시작했다.'],
    ],
  },
  {
    id: 11, title: '거울의 방', sub: '한 박자 늦은 나', theme: 'mirror', color: '#a58ad6', boss: 'mirror', set: ['reflection', 'warped', 'mirrorarmor'], elite: 'otherpax', npc: 'shadow',
    intro: [
      ['', '열한 번째 역. 열차 창문이 모두 거울로 바뀌었다. 거울 속의 내가 한 박자 늦게 움직인다.'],
      ['voice', '…이 역은 당신을 위한 역입니다. 차장, 당신이 잊은 것이 이곳에 비칩니다.'],
      ['me', '내가 잊은 것?'],
      ['voice', '당신은 처음부터 차장이 아니었어요. 이 열차의 승객이었죠. 그리고 스스로 잊기를 선택했습니다.'],
    ],
    mid: [['voice', '저기, 다른 길을 걸은 당신이 있습니다. 다른 직업을 골랐다면 저렇게 되었겠죠.']],
    bossIntro: [
      ['', '방 한가운데 커다란 거울이 있다. 거울 속의 내가 밖으로 걸어 나온다.'],
      ['shadow', '왜 돌아왔어? 잊는 편이 편했잖아. 우린 그렇게 정했잖아.'],
      ['voice', '그는 당신이 직전에 쓴 기술을 그대로 되돌립니다. 완벽하게 받아 내면 거울 조각이 깨져요.'],
    ],
    outro: [
      ['', '거울이 산산이 부서지자 조각마다 기억이 비쳤다. 가라앉는 도시, 떠나는 열차, 놓아 버린 손.'],
      ['shadow', '…그래도 기억할 거야? 아플 텐데.'],
      ['me', '아파도. 내 거니까.'],
      ['', '거울 속의 나는 고개를 끄덕이고 조각 속으로 사라졌다. 열차가 종착역을 향해 마지막 기적을 울린다.'],
    ],
  },
  {
    id: 12, title: '망각의 강', sub: '종착역', theme: 'lethe', color: '#c5d3e0', boss: 'lethe', set: ['shade', 'memeater', 'attendant'], elite: 'gatekeeper', npc: null,
    intro: [
      ['', '종착역. 하얀 강이 흐른다. 강을 건너는 사람은 모두 무언가를 두고 간다.'],
      ['voice', '여기까지 왔군요. 이 강 너머에 당신이 놓고 온 것이 있습니다.'],
      ['', '객차에 하람의 종소리가 울린다. 세린, 연, 비올라, 도윤, 카이, 로아, 무진, 이브, 시온. 모두 창가에 서 있다.'],
      ['voice', '그들은 싸울 수 없어요. 이 노선은 한 사람만 싸우니까. 하지만 기다릴 수는 있죠.'],
    ],
    mid: [['voice', '문지기의 자물쇠는 셋입니다. 모두 풀기 전엔 문이 열리지 않아요.']],
    bossIntro: [
      ['', '강이 일어선다. 베일을 쓴 거대한 형체가 당신을 내려다본다.'],
      ['?', '두고 가. 모두 두고 가. 가벼워져야 건널 수 있어.'],
      ['voice', '망각은 세 막으로 이루어집니다. 마지막 막에서는 시간이 없어요. 망설이지 마세요.'],
    ],
    outro: [
      ['', '강이 잦아들었다. 물 아래에서 작은 기차표 하나가 떠오른다. 내 이름이 적혀 있다.'],
      ['voice', '그게 당신이 두고 온 거예요. 이 열차에 처음 탔을 때의 표. 돌아갈 곳이 적힌 표죠.'],
      ['me', '…돌아갈 곳이 아니라, 계속 갈 곳이 적혀 있네.'],
      ['voice', '그럼 계속 가죠, 차장. 이 도시엔 아직 잔향이 많아요. 이번엔 악몽 노선입니다.'],
      ['', '잔향선이 다시 출발한다. 객차엔 종소리와 향 냄새와 웃음소리가 가득하다. 처음으로, 혼자가 아니다.'],
    ],
  },
];
const CH_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const chLv = ch => 1 + (ch - 1) * 5;
const NM_ADD = 12;
const LV_CAP = 70;

/* 장의 스테이지: 1 단독 · 2 연전 · 3 단독 · 4 정예 · 5 연전 · 6 잔향체 */
function stageList(ch, nm) {
  const C = CH_BY_ID[ch], b = chLv(ch) + (nm ? NM_ADD : 0), [a, bb, c] = C.set;
  const L = v => Math.min(LV_CAP, v);
  return [
    { k: 1, n: '진입', foes: [a], lv: L(b) },
    { k: 2, n: '연전', foes: [bb, c], lv: L(b + 1) },
    { k: 3, n: '잔향의 길', foes: [c], lv: L(b + 1) },
    { k: 4, n: '정예', foes: [C.elite], lv: L(b + 2), elite: 1, story: 'mid' },
    { k: 5, n: '삼연전', foes: [a, bb, c], lv: L(b + 3) },
    { k: 6, n: C.boss ? FOES[C.boss].n : '잔향체', foes: [C.boss], lv: L(b + 4), boss: 1, story: 'bossIntro' },
  ].map(s => Object.assign(s, { ch, nm: !!nm, id: `${nm ? 'n' : 's'}${ch}-${s.k}` }));
}

/* ===== 유물 (미궁 전용) =====
 * 훅 이름은 전투 엔진의 relHook과 같다. 숫자를 돌려주면 합산된다. */
const RELICS = {
  cog: { n: '녹슨 톱니', i: '⚙', r: 0, d: '주는 피해 +8%', outMul: () => 0.08 },
  redthread: { n: '붉은 실', i: '🧶', r: 0, d: '내가 거는 출혈 위력 +1', stPot: (B, k) => k === 'bleed' ? 1 : 0 },
  matches: { n: '성냥갑', i: '🔥', r: 0, d: '내가 거는 화상 위력 +1', stPot: (B, k) => k === 'burn' ? 1 : 0 },
  fork: { n: '소리굽쇠', i: '🎐', r: 0, d: '진동 폭발 흐트러짐 +30%', burstMul: () => 0.3 },
  wetquill: { n: '젖은 깃펜', i: '🪶', r: 0, d: '내가 거는 침잠 위력 +1', stPot: (B, k) => k === 'sinking' ? 1 : 0 },
  lens: { n: '금 간 렌즈', i: '🔍', r: 0, d: '파열 추가 피해 +40%', ruptureMul: () => 0.4 },
  pinwheel: { n: '바람개비', i: '🎡', r: 0, d: '전투 시작 시 에너지 +2', start: B => B.energy(2) },
  pocketwatch: { n: '회중시계', i: '⏱', r: 0, d: '집중할 때 에너지 +1', focusEn: () => 1 },
  candy: { n: '사탕 봉지', i: '🍬', r: 0, d: '받는 회복 +20%', healMul: () => 0.2 },
  oldshield: { n: '낡은 방패', i: '🛡', r: 0, d: '방어 경감 +10%', blockRed: () => 0.1 },
  catbell: { n: '고양이 방울', i: '🔔', r: 0, d: '방어 판정 폭 +20%', qte: () => 0.2 },
  luckycoin: { n: '행운의 동전', i: '🪙', r: 0, d: '치명타 확률 +6%', critAdd: () => 6 },
  whetstone: { n: '숫돌', i: '🪨', r: 0, d: '치명타 피해 +25%', critDmg: () => 0.25 },
  firstaid: { n: '응급 상자', i: '🩹', r: 0, d: '전투 시작 시 체력 10% 회복', start: B => B.heal(B.p, B.p.mhp * 0.1) },
  rosary: { n: '묵주', i: '📿', r: 0, d: '약화 면역', immune: (B, k) => k === 'weak' ? 1 : 0 },
  earplug: { n: '귀마개', i: '🎧', r: 0, d: '속박 면역', immune: (B, k) => k === 'bind' ? 1 : 0 },
  apple: { n: '녹색 사과', i: '🍏', r: 0, d: '턴 시작 시 체력 2% 회복', turnStart: B => B.heal(B.p, B.p.mhp * 0.02, 1) },
  pearl: { n: '진주', i: '⚪', r: 0, d: '전투 시작 시 최대 체력 12% 보호막', start: B => B.shield(B.p, B.p.mhp * 0.12) },
  incense: { n: '향초', i: '🕯', r: 0, d: '화상 면역', immune: (B, k) => k === 'burn' ? 1 : 0 },
  turtle: { n: '거북 껍질', i: '🐢', r: 0, d: '받는 피해 −10%', inRed: () => 0.1 },
  ironglove: { n: '철제 장갑', i: '🥊', r: 0, d: '흐트러짐 피해 +25%', stgMul: () => 0.25 },
  crane: { n: '종이학', i: '🕊', r: 0, d: '방어에 성공하면 호흡 2·1', onBlock: B => B.st(B.p, 'poise', 2, 1) },
  phoenix: { n: '불사조 깃털', i: '🪶', r: 2, d: '한 번 쓰러져도 체력 30%로 되살아난다 (미궁당 한 번)' },
  hourglass: { n: '모래시계', i: '⏳', r: 1, d: '전투 시작 시 신속 1(2턴). 망각의 마지막 막 +2턴', start: B => B.bf(B.p, 'haste', 1, 2) },
  belt: { n: '물약 벨트', i: '🎒', r: 1, d: '한 턴에 소모품 두 개' },
  thorns: { n: '가시 갑옷', i: '🌵', r: 1, d: '전투 내내 가시 4', start: B => B.bf(B.p, 'thorns', 4, 99) },
  bloodbag: { n: '혈액 주머니', i: '🩸', r: 1, d: '적중할 때 피해의 5% 회복', onHit: (B, c, h) => { if (h.dmg > 0) B.heal(B.p, h.dmg * 0.05, 1); } },
  crown: { n: '깨진 왕관', i: '👑', r: 1, d: '주는 피해 +25%, 받는 피해 +15%', outMul: () => 0.25, inRed: () => -0.15 },
  fang: { n: '독사의 이빨', i: '🐍', r: 1, d: '적중할 때 25% 확률로 파열 1·1', onHit: B => { if (B.f && B.f.hp > 0 && B.rng() < 0.25) B.st(B.f, 'rupture', 1, 1); } },
  shellneck: { n: '탄피 목걸이', i: '📿', r: 1, d: '치명타가 나면 에너지 +1 (턴당 한 번)', onHit: (B, c, h) => { if (h.crit && B.r._shell !== B.turn) { B.r._shell = B.turn; B.energy(1); } } },
  prayer: { n: '기도서', i: '📖', r: 1, d: '완벽 방어 시 체력 6% 회복', onPerfect: B => B.heal(B.p, B.p.mhp * 0.06) },
  lantern: { n: '등불', i: '🏮', r: 1, d: '흐트러진 적에게 주는 피해 +30%', outMul: B => B.f && B.f.staggered ? 0.3 : 0 },
  sundial2: { n: '작은 해시계', i: '☀', r: 1, d: '턴 시작 시 체력 70% 이상이면 공격 강화 1', turnStart: B => { if (B.p.hp >= B.p.mhp * 0.7) B.bf(B.p, 'str', 1, 1); } },
  shard: { n: '거울 조각', i: '🪞', r: 1, d: '받은 피해의 12%를 되돌린다', hurt: (B, d) => { if (d > 0 && B.f && B.f.hp > 0) B.trueDmg(B.f, d * 0.12, 'reflect'); } },
  chain: { n: '쇠사슬', i: '⛓', r: 1, d: '적을 흐트러뜨리면 취약 2(2턴)', onStagger: B => B.bf(B.f, 'vuln', 2, 2) },
  silverkey: { n: '은빛 열쇠', i: '🗝', r: 1, d: '부위에 주는 피해 +35%', outMul: (B, c) => B.tgt >= 0 ? 0.35 : 0 },
  drum: { n: '작은 북', i: '🥁', r: 1, d: '네 번째 턴마다 에너지 +3', turnStart: B => { if (B.turn % 4 === 0) B.energy(3); } },
  mask: { n: '광대 가면', i: '🎭', r: 1, d: '전투의 첫 공격은 치명타', critAdd: B => B.stats.crits === 0 && B.stats.dealt === 0 ? 999 : 0 },
  butterfly: { n: '박제 나비', i: '🦋', r: 2, d: '내가 거는 모든 잠재 상태 횟수 +1', stCnt: () => 1 },
  star: { n: '별 조각', i: '⭐', r: 2, d: '각성기 피해 +35%', outMul: (B, c) => c && c.sk && c.sk.ult ? 0.35 : 0 },
  heart: { n: '두 번째 심장', i: '💗', r: 2, d: '최대 체력 +20% (미궁 시작 체력 포함)', maxHp: 0.2 },
  engine: { n: '기관실 부품', i: '🔩', r: 2, d: '턴마다 에너지 +1', turnStart: B => B.energy(1) },
  compass: { n: '고장 난 나침반', i: '🧭', r: 0, d: '전투마다 무작위 강화 하나 (공격 강화·보호·신속·집중 2턴)', start: B => { const k = pick(['str', 'guard', 'haste', 'focus'], B.rng); B.bf(B.p, k, 1, 2); } },
  ticket: { n: '왕복표', i: '🎫', r: 2, d: '받는 피해 −15%, 주는 피해 +10%', inRed: () => 0.15, outMul: () => 0.1 },
};
const RELIC_IDS = Object.keys(RELICS);

/* ===== 잔향체의 유품 (영구 장신구, 각 보스 첫 격파 보상) ===== */
const TROPHIES = {
  clockwarden: { n: '멈춘 회중시계', i: '⏱', d: '집중할 때 에너지 +1, 방어 판정 폭 +10%', eff: { focusEn: () => 1, qte: () => 0.1 } },
  butcher: { n: '정육업자의 앞치마', i: '🔪', d: '적중할 때 피해의 4% 회복', eff: { onHit: (B, c, h) => { if (h.dmg > 0) B.heal(B.p, h.dmg * 0.04, 1); } } },
  librarian: { n: '젖지 않은 책', i: '📘', d: '봉인 면역, 침잠 위력 +1', eff: { immune: (B, k) => k === 'seal' ? 1 : 0, stPot: (B, k) => k === 'sinking' ? 1 : 0 } },
  diva: { n: '불꽃 마이크', i: '🎤', d: '화상 위력 +1, 각성기 피해 +15%', eff: { stPot: (B, k) => k === 'burn' ? 1 : 0, outMul: (B, c) => c && c.sk && c.sk.ult ? 0.15 : 0 } },
  masque: { n: '깨진 가면', i: '🎭', d: '적의 약점 공격 피해 +15%', eff: { outMul: (B, c) => { const t = c && (c.type || 'blunt'); return B.f && t && B.resOf(t) > 1.01 ? 0.15 : 0; } } },
  express: { n: '기관사의 장갑', i: '🧤', d: '전투 시작 시 에너지 +2, 신속 1(1턴)', eff: { start: B => { B.energy(2); B.bf(B.p, 'haste', 1, 1); } } },
  grin: { n: '터진 풍선', i: '🎈', d: '공황 면역은 아니지만 정신력이 −30 이하일 때 피해 +15%', eff: { outMul: B => B.p.sp <= -30 ? 0.15 : 0 } },
  colossus: { n: '거인의 핵', i: '🔶', d: '흐트러짐 피해 +20%, 받는 피해 −5%', eff: { stgMul: () => 0.2, inRed: () => 0.05 } },
  seamstress: { n: '은바늘', i: '🪡', d: '내가 거는 파열·출혈 위력 +1', eff: { stPot: (B, k) => k === 'rupture' || k === 'bleed' ? 1 : 0 } },
  moons: { n: '반쪽 달', i: '🌗', d: '턴 시작 시 체력 1.5% 회복, 치명타 +4%', eff: { turnStart: B => B.heal(B.p, B.p.mhp * 0.015, 1), critAdd: () => 4 } },
  mirror: { n: '거울 파편', i: '🪞', d: '받은 피해의 10%를 되돌린다', eff: { hurt: (B, d) => { if (d > 0 && B.f && B.f.hp > 0) B.trueDmg(B.f, d * 0.1, 'reflect'); } } },
  lethe: { n: '돌아갈 표', i: '🎫', d: '주는 피해 +10%, 받는 피해 −10%', eff: { outMul: () => 0.1, inRed: () => 0.1 } },
};
for (const k in TROPHIES) RELICS['t_' + k] = Object.assign({ r: 3, trophy: 1 }, TROPHIES[k], TROPHIES[k].eff);

/* ===== 장비 ===== */
const RARITY = [{ n: '일반', c: '#a9a6ba', m: 1.0, ax: 0 }, { n: '희귀', c: '#5aa9ff', m: 1.12, ax: 1 }, { n: '영웅', c: '#c084fc', m: 1.25, ax: 2 }, { n: '전설', c: '#ffa94d', m: 1.4, ax: 3 }];
const SLOTS = { weapon: { n: '무기', i: '⚔' }, armor: { n: '방어구', i: '🛡' }, charm: { n: '장신구', i: '💠' } };
const AFFIX = {
  atkP: { n: '공격력', f: v => `+${v}%`, roll: L => 4 + Math.round(L / 10), slots: ['weapon', 'charm'] },
  hpP: { n: '최대 체력', f: v => `+${v}%`, roll: L => 5 + Math.round(L / 9), slots: ['armor', 'charm'] },
  defP: { n: '방어력', f: v => `+${v}%`, roll: L => 6 + Math.round(L / 8), slots: ['armor'] },
  crit: { n: '치명타 확률', f: v => `+${v}%`, roll: L => 2 + Math.round(L / 20), slots: ['weapon', 'charm'] },
  critDmg: { n: '치명타 피해', f: v => `+${v}%`, roll: L => 8 + Math.round(L / 6), slots: ['weapon', 'charm'] },
  spd: { n: '속도', f: v => `+${v}`, roll: L => 3 + Math.round(L / 8), slots: ['armor', 'charm'] },
  enStart: { n: '시작 에너지', f: v => `+${v}`, roll: () => 1, slots: ['charm'] },
  qte: { n: '방어 판정 폭', f: v => `+${v}%`, roll: L => 6 + Math.round(L / 12), slots: ['armor', 'charm'] },
  stg: { n: '흐트러짐 피해', f: v => `+${v}%`, roll: L => 8 + Math.round(L / 8), slots: ['weapon'] },
  heal: { n: '받는 회복', f: v => `+${v}%`, roll: L => 8 + Math.round(L / 8), slots: ['armor', 'charm'] },
  stPot: { n: '잠재 상태 위력', f: v => `+${v}`, roll: () => 1, slots: ['weapon', 'charm'] },
};
const GEAR_NAMES = {
  weapon: { adj: ['녹슨', '단단한', '날 선', '가라앉은', '타오르는', '울리는', '은빛', '검은', '잔향의', '종착의'], base: ['칼', '창', '망치', '향로', '총신', '바늘', '깃펜', '렌치', '단검', '지팡이'] },
  armor: { adj: ['낡은', '기운', '두꺼운', '젖은', '그을린', '조용한', '은빛', '검은', '잔향의', '종착의'], base: ['외투', '흉갑', '로브', '망토', '조끼', '제복', '갑주', '코트'] },
  charm: { adj: ['작은', '빛바랜', '따뜻한', '차가운', '반짝이는', '울리는', '은빛', '검은', '잔향의', '종착의'], base: ['반지', '목걸이', '부적', '단추', '표', '열쇠', '방울', '훈장'] },
};
function rollGear(slot, L, rar, rng = Math.random) {
  const R = RARITY[rar], N = GEAR_NAMES[slot];
  const tier = Math.min(9, Math.floor(L / 7));
  const g = { id: 'g' + Math.floor(rng() * 1e9).toString(36) + Date.now().toString(36).slice(-3), slot, L, rar, plus: 0, ax: [] };
  g.n = `${N.adj[Math.min(N.adj.length - 1, Math.max(0, tier - 1 + Math.floor(rng() * 3)))]} ${pick(N.base, rng)}`;
  const pool = Object.keys(AFFIX).filter(k => AFFIX[k].slots.includes(slot));
  const used = new Set();
  for (let i = 0; i < R.ax && pool.length; i++) {
    let k; let tries = 0; do { k = pick(pool, rng); } while (used.has(k) && tries++ < 10);
    used.add(k); g.ax.push([k, AFFIX[k].roll(L)]);
  }
  return g;
}
function gearMain(g) {
  const R = RARITY[g.rar], gl = lvG(g.L) * R.m * (1 + g.plus * 0.06);
  if (g.slot === 'weapon') return { atk: Math.round(4 * gl * 10) / 10 };
  if (g.slot === 'armor') return { hp: Math.round(40 * gl), def: Math.round(3 * gl * 10) / 10 };
  return { hp: Math.round(14 * gl), atk: Math.round(1.4 * gl * 10) / 10 };
}
const ENH_COST = p => Math.round(30 * Math.pow(1.45, p));
const SELL = g => Math.round((8 + g.L) * (1 + g.rar * 1.2) * (1 + g.plus * 0.3));

/* ===== 미궁 사건 ===== */
const LAB_EVENTS = [
  { id: 'well', n: '바람 우물', t: '마른 우물에서 바람이 올라온다. 동전을 던지면 소원을 들어준다고 적혀 있다.', o: [
    { t: '토큰 15를 던진다', need: r => r.tok >= 15, f: (r, G) => { r.tok -= 15; return G.labRelic(r, 1); } },
    { t: '우물 물을 마신다 (체력 25% 회복)', f: r => { r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.25); return '목이 시원해졌다.'; } },
    { t: '그냥 지나간다', f: () => '바람 소리만 들렸다.' }] },
  { id: 'altar', n: '피의 제단', t: '붉게 젖은 제단. 피를 바치면 무언가를 준다.', o: [
    { t: '체력 20%를 바친다 → 유물', f: (r, G) => { r.hp = Math.max(1, r.hp - r.mhp * 0.2); return G.labRelic(r, 0); } },
    { t: '거절한다', f: () => '제단이 아쉬운 듯 식어 갔다.' }] },
  { id: 'peddler', n: '떠돌이 행상', t: '「싸게 드리죠. 진짜로.」', o: [
    { t: '회복약 2개 (토큰 10)', need: r => r.tok >= 10, f: r => { r.tok -= 10; r.items.potion = (r.items.potion || 0) + 2; return '회복약 2개를 샀다.'; } },
    { t: '에너지 앰플 2개 (토큰 10)', need: r => r.tok >= 10, f: r => { r.tok -= 10; r.items.ether = (r.items.ether || 0) + 2; return '에너지 앰플 2개를 샀다.'; } },
    { t: '구경만 한다', f: () => '행상은 어깨를 으쓱했다.' }] },
  { id: 'mirror', n: '흐린 거울', t: '거울 속의 내가 손을 내민다.', o: [
    { t: '손을 잡는다 (유물 하나를 무작위 유물로 바꾼다)', need: r => r.relics.length > 0, f: (r, G) => { const i = Math.floor(Math.random() * r.relics.length); const old = r.relics.splice(i, 1)[0]; return `${RELICS[old].n}을(를) 내주고… ` + G.labRelic(r, 1); } },
    { t: '거울을 깬다 (토큰 +12)', f: r => { r.tok += 12; return '조각 사이에서 토큰이 쏟아졌다.'; } }] },
  { id: 'bench', n: '빈 벤치', t: '승강장 벤치. 잠깐 앉아도 될 것 같다.', o: [
    { t: '눈을 감는다 (체력 35% 회복)', f: r => { r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.35); return '잠깐 꿈을 꿨다. 기억나지 않는 꿈이다.'; } },
    { t: '일어선다 (다음 전투 에너지 +3)', f: r => { r.nextEn = (r.nextEn || 0) + 3; return '몸이 가볍다.'; } }] },
  { id: 'gambler', n: '노름판', t: '「앞면이면 두 배, 뒷면이면 꽝.」', o: [
    { t: '토큰 10을 건다', need: r => r.tok >= 10, f: r => { if (Math.random() < 0.5) { r.tok += 10; return '앞면! 토큰 +10'; } r.tok -= 10; return '뒷면… 토큰 −10'; } },
    { t: '체력 15%를 건다', f: (r, G) => { if (Math.random() < 0.5) return G.labRelic(r, 0); r.hp = Math.max(1, r.hp - r.mhp * 0.15); return '뒷면… 체력을 잃었다.'; } },
    { t: '거절한다', f: () => '「겁쟁이.」' }] },
  { id: 'lost', n: '잃어버린 짐', t: '주인 없는 가방이 하나 놓여 있다.', o: [
    { t: '연다', f: (r, G) => { const x = Math.random(); if (x < 0.4) { r.tok += 15; return '토큰 15를 찾았다.'; } if (x < 0.75) { r.items.potion = (r.items.potion || 0) + 1; r.items.tonic = (r.items.tonic || 0) + 1; return '회복약과 안정제를 찾았다.'; } r.hp = Math.max(1, r.hp - r.mhp * 0.12); return '가방이 이빨을 드러냈다! 체력 −12%'; } },
    { t: '두고 간다', f: () => '누군가 찾으러 오겠지.' }] },
  { id: 'chapel', n: '작은 예배당', t: '촛불 하나가 아직 타고 있다.', o: [
    { t: '기도한다 (해로운 유물 제거, 체력 15% 회복)', f: r => { r.hp = Math.min(r.mhp, r.hp + r.mhp * 0.15); r.curse = 0; return '마음이 가라앉는다.'; } },
    { t: '촛불을 가져간다 (다음 전투 화상 면역 + 공격 강화)', f: r => { r.nextBuff = 'str'; return '촛불이 손에서 따뜻하다.'; } }] },
  { id: 'echo', n: '떠도는 잔향', t: '작은 잔향이 길을 잃고 울고 있다.', o: [
    { t: '거둔다 (전투, 이기면 유물)', fight: 1, f: () => '잔향이 덤벼든다!' },
    { t: '달래 준다 (정신력 회복, 토큰 +5)', f: r => { r.tok += 5; r.sp = 0; return '잔향이 고개를 숙이고 사라졌다.'; } }] },
  { id: 'smith', n: '선로 대장장이', t: '「장비를 손봐 줄까? 공짜는 아니고.」', o: [
    { t: '토큰 20 → 공격력 +8% (이번 미궁)', need: r => r.tok >= 20, f: r => { r.tok -= 20; r.atkB = (r.atkB || 0) + 0.08; return '무기가 날카로워졌다.'; } },
    { t: '토큰 20 → 최대 체력 +10% (이번 미궁)', need: r => r.tok >= 20, f: r => { r.tok -= 20; r.hpB = (r.hpB || 0) + 0.1; const add = r.mhp * 0.1; r.mhp += add; r.hp += add; return '갑옷이 단단해졌다.'; } },
    { t: '됐어', f: () => '대장장이가 다시 망치를 들었다.' }] },
  { id: 'clock', n: '거꾸로 도는 시계', t: '시계 바늘이 거꾸로 돈다. 만지면 시간이 되감길 것 같다.', o: [
    { t: '만진다 (체력 가득, 토큰 절반)', f: r => { r.hp = r.mhp; r.tok = Math.floor(r.tok / 2); return '몸이 처음처럼 돌아왔다. 주머니는 가벼워졌다.'; } },
    { t: '바늘을 뽑는다 (유물: 회중시계)', f: (r, G) => { if (!r.relics.includes('pocketwatch')) { r.relics.push('pocketwatch'); return '회중시계를 얻었다.'; } r.tok += 10; return '이미 있다. 토큰 +10'; } }] },
  { id: 'river', n: '검은 물웅덩이', t: '물속에 무언가 반짝인다.', o: [
    { t: '손을 넣는다 (50%: 희귀 유물 / 50%: 침잠 저주)', f: (r, G) => { if (Math.random() < 0.5) return G.labRelic(r, 1); r.curse = (r.curse || 0) + 1; return '차가운 손이 손목을 잡았다. (다음 전투 정신력 −20)'; } },
    { t: '지나간다', f: () => '물결이 잔잔해졌다.' }] },
  { id: 'trainer', n: '허수아비', t: '누군가 세워 둔 허수아비. 연습하기 좋아 보인다.', o: [
    { t: '연습한다 (이번 미궁 치명타 +5%)', f: r => { r.critB = (r.critB || 0) + 5; return '감이 잡혔다.'; } },
    { t: '부순다 (토큰 +8)', f: r => { r.tok += 8; return '안에서 토큰이 나왔다.'; } }] },
  { id: 'passenger', n: '낯선 승객', t: '「표를 잃어버렸어요. 하나만 나눠 주실래요?」', o: [
    { t: '토큰 10을 준다', need: r => r.tok >= 10, f: (r, G) => { r.tok -= 10; if (Math.random() < 0.6) return '승객이 고맙다며 무언가를 쥐여 준다. ' + G.labRelic(r, 0); return '승객은 고개를 숙이고 안개 속으로 사라졌다.'; } },
    { t: '모른 척한다', f: () => '승객의 시선이 등에 오래 머물렀다.' }] },
];

/* ===== 업적 ===== */
const ACHS = [
  { id: 'ch1', n: '첫 기적', d: '1장을 끝냈다', f: s => s.story.boss.clockwarden },
  { id: 'ch3', n: '젖은 문장', d: '3장을 끝냈다', f: s => s.story.boss.librarian },
  { id: 'ch6', n: '막차', d: '6장을 끝냈다', f: s => s.story.boss.express },
  { id: 'ch9', n: '끊어진 실', d: '9장을 끝냈다', f: s => s.story.boss.seamstress },
  { id: 'ch12', n: '종착역', d: '12장을 끝냈다', f: s => s.story.boss.lethe },
  { id: 'nm3', n: '악몽의 시작', d: '악몽 3장을 끝냈다', f: s => s.story.nmBoss.librarian },
  { id: 'nm12', n: '악몽의 끝', d: '악몽 12장을 끝냈다', f: s => s.story.nmBoss.lethe },
  { id: 'lv20', n: '단련', d: '20레벨에 도달했다', f: s => s.lvl >= 20 },
  { id: 'lv40', n: '숙련', d: '40레벨에 도달했다', f: s => s.lvl >= 40 },
  { id: 'lv60', n: '달인', d: '60레벨에 도달했다', f: s => s.lvl >= 60 },
  { id: 'lv70', n: '잔향선의 차장', d: '70레벨에 도달했다', f: s => s.lvl >= 70 },
  { id: 'lab5', n: '미궁 탐색', d: '미궁 5층에 도달했다', f: s => s.lab.best >= 5 },
  { id: 'lab10', n: '미궁 심층', d: '미궁 10층에 도달했다', f: s => s.lab.best >= 10 },
  { id: 'lab15', n: '미궁 정복', d: '미궁 15층을 돌파했다', f: s => s.lab.best >= 16 },
  { id: 'lab25', n: '끝없는 미궁', d: '미궁 25층에 도달했다', f: s => s.lab.best >= 25 },
  { id: 'win100', n: '백 번의 승리', d: '전투 100번 승리', f: s => s.stats.wins >= 100 },
  { id: 'win500', n: '오백 번의 승리', d: '전투 500번 승리', f: s => s.stats.wins >= 500 },
  { id: 'perfect50', n: '완벽한 반응', d: '완벽 방어 50번', f: s => s.stats.perfect >= 50 },
  { id: 'perfect500', n: '눈을 감고도', d: '완벽 방어 500번', f: s => s.stats.perfect >= 500 },
  { id: 'stagger50', n: '흔들리는 적', d: '적을 50번 흐트러뜨렸다', f: s => s.stats.staggers >= 50 },
  { id: 'stagger300', n: '흔들리는 세계', d: '적을 300번 흐트러뜨렸다', f: s => s.stats.staggers >= 300 },
  { id: 'hit500', n: '한 방', d: '한 번에 500 피해', f: s => s.stats.maxHit >= 500 },
  { id: 'hit3000', n: '거대한 한 방', d: '한 번에 3000 피해', f: s => s.stats.maxHit >= 3000 },
  { id: 'legend', n: '전설의 장비', d: '전설 장비를 얻었다', f: s => s.stats.legend >= 1 },
  { id: 'plus10', n: '최대 강화', d: '장비를 +10까지 강화했다', f: s => s.stats.maxPlus >= 10 },
  { id: 'trophy6', n: '유품 수집가', d: '잔향체 유품 6개', f: s => Object.keys(s.story.boss).length >= 6 },
  { id: 'trophy12', n: '모든 유품', d: '잔향체 유품 12개', f: s => Object.keys(s.story.boss).length >= 12 },
  { id: 'bestiary30', n: '잔향 도감 30', d: '서로 다른 잔향 30종을 만났다', f: s => Object.keys(s.seen).length >= 30 },
  { id: 'bestiary60', n: '잔향 도감 완성', d: '잔향 60종을 모두 만났다', f: s => Object.keys(s.seen).length >= 60 },
  { id: 'talent3', n: '특성 완성', d: '특성 세 개를 모두 골랐다', f: s => (s.tal || []).filter(Boolean).length >= 3 },
  { id: 'rank5', n: '기술 연마', d: '기술 하나를 5단계까지 올렸다', f: s => Object.values(s.ranks || {}).some(v => v >= 5) },
  { id: 'jackpot', n: '잭팟', d: '도박사로 잭팟을 터뜨렸다', f: s => s.stats.jackpots >= 1 },
  { id: 'flawless', n: '무결', d: '잔향체를 체력 100%로 쓰러뜨렸다', f: s => s.stats.flawless >= 1 },
  { id: 'fast', n: '전광석화', d: '잔향체를 6턴 안에 쓰러뜨렸다', f: s => s.stats.fastBoss >= 1 },
  { id: 'relic10', n: '유물 수집', d: '한 미궁에서 유물 10개', f: s => s.stats.maxRelics >= 10 },
  { id: 'hours10', n: '긴 여행', d: '10시간 플레이', f: s => s.playtime >= 36000 },
];
