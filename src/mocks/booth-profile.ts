/**
 * Booth 역할 사용자의 "내 부스" mock + Super/Master 가 보는 전체 부스 풀.
 * 백엔드 붙으면 features/booths/api.ts 의 real 구현이 대체.
 *
 * id 1, 2, 3 은 인증 mock (booth1, booth2 + reservation 데모) 와 묶여 있어 형태 유지.
 *  - 1: 작성 완료 (운영 활성)
 *  - 2: 빈 부스 (작성 전 플로우)
 *  - 3: 작성 완료 (picker 전환 QA 용)
 * 그 외 4-30 은 실제 운영 시뮬레이션을 위한 풍부한 시드.
 */

import type { BoothImage, BoothMenuItem, BoothProfile } from '@/features/booths/types';

// ---- helpers ----------------------------------------------------------------

const FOOD_PHOTO = (seed: string) =>
  `https://images.unsplash.com/${seed}?w=400&q=80`;

const thumb = (id: number, url: string, isMain = false): BoothImage => ({ id, url, isMain });

const menu = (
  id: number,
  order: number,
  name: string,
  description: string,
  price: string,
  soldOut = false,
): BoothMenuItem => ({ id, order, name, description, price, image: null, soldOut });

// ---- 부스들 -----------------------------------------------------------------

const filledBooth: BoothProfile = {
  id: 1,
  name: '문헌정보학과 부스',
  organizationName: '연세대학교 문헌정보학과',
  description: '문헌정보학과에서 준비한 맛있는 음식과 즐거운 체험을 즐겨보세요!',
  signatureMenu: '후라이드 치킨',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '테이블 이용 시 메인 메뉴를 하나 이상 주문해주셔야 합니다.',
  thumbnails: [
    thumb(1, FOOD_PHOTO('photo-1555939594-58d7cb561ad1'), true),
    thumb(2, FOOD_PHOTO('photo-1513104890138-7c749659a591')),
  ],
  menuItems: [
    menu(1, 1, '후라이드 치킨', '바삭한 한 마리', '15,000원'),
    menu(2, 2, '양념 치킨', '달콤매콤 한 마리', '16,000원'),
    menu(3, 3, '감자튀김', '겉바속촉', '5,000원'),
    menu(4, 4, '콜라', '500ml', '2,000원', true),
  ],
};

const emptyBooth: BoothProfile = {
  id: 2,
  name: '',
  organizationName: '',
  description: '',
  signatureMenu: '',
  operatingHours: '',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [],
  menuItems: [],
};

const secondFilledBooth: BoothProfile = {
  id: 3,
  name: '경영학과 푸드트럭',
  organizationName: '연세대학교 경영학과',
  description: '경영학과 학생회가 운영하는 푸드트럭. 햄버거와 감자튀김을 맛보세요.',
  signatureMenu: '치즈버거',
  operatingHours: '11:00 - 19:00',
  reservationEnabled: true,
  orderNotice: '테이블 이용 시 메뉴 주문 필수.',
  thumbnails: [thumb(10, FOOD_PHOTO('photo-1550547660-d9450f859349'), true)],
  menuItems: [
    menu(10, 1, '치즈버거', '더블 치즈버거', '8,000원'),
    menu(11, 2, '베이컨버거', '두툼한 베이컨', '9,000원'),
    menu(12, 3, '감자튀김', '케이준 양념', '4,000원'),
    menu(13, 4, '콜라', '500ml', '2,000원'),
  ],
};

// 음식 부스들 ----
const computerScience: BoothProfile = {
  id: 4,
  name: '컴공이 만드는 핫도그',
  organizationName: '컴퓨터과학과 학생회',
  description: '컴공인의 정성을 담은 미국식 핫도그. 출출할 때 한 입.',
  signatureMenu: '치즈 핫도그',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '머스타드 / 케첩 추가 가능합니다.',
  thumbnails: [thumb(40, FOOD_PHOTO('photo-1612392061787-2d078b3e573b'), true)],
  menuItems: [
    menu(40, 1, '오리지널 핫도그', '소시지 + 양파', '4,000원'),
    menu(41, 2, '치즈 핫도그', '체다 치즈 듬뿍', '5,000원'),
    menu(42, 3, '칠리 핫도그', '매콤 칠리소스', '5,500원'),
  ],
};

const designArts: BoothProfile = {
  id: 5,
  name: '디자인학부 와플 카페',
  organizationName: '디자인예술학부 학생회',
  description: '예쁘게 굽고 정성껏 토핑한 미니 와플.',
  signatureMenu: '아이스크림 와플',
  operatingHours: '12:00 - 22:00',
  reservationEnabled: true,
  orderNotice: '아이스크림 와플은 매시간 30개 한정.',
  thumbnails: [thumb(50, FOOD_PHOTO('photo-1562376552-0d160a2f238d'), true)],
  menuItems: [
    menu(50, 1, '플레인 와플', '버터 + 메이플 시럽', '3,500원'),
    menu(51, 2, '아이스크림 와플', '바닐라 아이스 1스쿱', '5,500원'),
    menu(52, 3, '누텔라 와플', '누텔라 듬뿍', '5,000원'),
  ],
};

const stat: BoothProfile = {
  id: 6,
  name: '응통 떡볶이',
  organizationName: '응용통계학과',
  description: '데이터로 검증된 황금비 떡볶이.',
  signatureMenu: '국물 떡볶이',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '매운맛 단계 1-3 선택 가능.',
  thumbnails: [thumb(60, FOOD_PHOTO('photo-1635363638580-c2809d049eee'), true)],
  menuItems: [
    menu(60, 1, '국물 떡볶이', '1인분', '4,500원'),
    menu(61, 2, '치즈 떡볶이', '모짜렐라 추가', '6,000원'),
    menu(62, 3, '튀김 모듬', '오징어/김말이/만두', '5,000원'),
    menu(63, 4, '컵라면', '신라면', '2,000원', true),
  ],
};

const socialWelfare: BoothProfile = {
  id: 7,
  name: '사복과 닭강정',
  organizationName: '사회복지학과',
  description: '겉바속촉 닭강정과 시원한 음료.',
  signatureMenu: '간장 닭강정',
  operatingHours: '13:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '테이블 이용 시 닭강정 1개 이상 주문 부탁드립니다.',
  thumbnails: [thumb(70, FOOD_PHOTO('photo-1626645738196-c2a7c87a8f58'), true)],
  menuItems: [
    menu(70, 1, '간장 닭강정', '1인분', '7,000원'),
    menu(71, 2, '매운 닭강정', '청양 베이스', '7,500원'),
    menu(72, 3, '레몬에이드', '500ml', '3,000원'),
  ],
};

const psych: BoothProfile = {
  id: 8,
  name: '심리학과 카페',
  organizationName: '심리학과 학생회',
  description: '여유 한 잔. 학생회가 직접 내리는 핸드드립과 시그니처 음료.',
  signatureMenu: '심리상담 라떼',
  operatingHours: '11:00 - 20:00',
  reservationEnabled: true,
  orderNotice: '음료 1인 1잔 권장.',
  thumbnails: [thumb(80, FOOD_PHOTO('photo-1495474472287-4d71bcdd2085'), true)],
  menuItems: [
    menu(80, 1, '아메리카노', 'ICE/HOT', '3,000원'),
    menu(81, 2, '심리상담 라떼', '바닐라 라떼', '4,500원'),
    menu(82, 3, '자몽 에이드', '상큼한 자몽', '4,000원'),
  ],
};

const english: BoothProfile = {
  id: 9,
  name: '영문과 타코야끼',
  organizationName: '영어영문학과 학생회',
  description: '오사카에서 실습하고 온 학생회가 직접 굽는 타코야끼.',
  signatureMenu: '문어 타코야끼',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '주문 후 7-10분 정도 소요.',
  thumbnails: [thumb(90, FOOD_PHOTO('photo-1639024471283-03518883512d'), true)],
  menuItems: [
    menu(90, 1, '문어 타코야끼', '6개 / 1인분', '5,000원'),
    menu(91, 2, '치즈 타코야끼', '모짜렐라 듬뿍', '6,000원'),
    menu(92, 3, '아이스 우롱차', '500ml', '2,500원'),
  ],
};

const polisci: BoothProfile = {
  id: 10,
  name: '정외 추로스',
  organizationName: '정치외교학과',
  description: '바삭하고 길쭉한 추로스. 시나몬 슈가 듬뿍.',
  signatureMenu: '오리지널 추로스',
  operatingHours: '13:00 - 21:30',
  reservationEnabled: true,
  orderNotice: '딥소스 1종 무료 추가.',
  thumbnails: [thumb(100, FOOD_PHOTO('photo-1624371414361-e670edf4898d'), true)],
  menuItems: [
    menu(100, 1, '오리지널 추로스', '시나몬 슈가', '3,500원'),
    menu(101, 2, '초코 추로스', '초코 디핑', '4,500원'),
    menu(102, 3, '레몬 에이드', '500ml', '3,000원'),
  ],
};

const anthro: BoothProfile = {
  id: 11,
  name: '문화인류학과 만두',
  organizationName: '문화인류학과 학생회',
  description: '세계 각국 만두를 한 자리에. 김치/고기/채식.',
  signatureMenu: '김치 만두',
  operatingHours: '12:00 - 20:00',
  reservationEnabled: true,
  orderNotice: '채식 만두는 한정 수량.',
  thumbnails: [thumb(110, FOOD_PHOTO('photo-1496116218417-1a781b1c416c'), true)],
  menuItems: [
    menu(110, 1, '김치 만두', '6개', '5,000원'),
    menu(111, 2, '고기 만두', '6개', '5,500원'),
    menu(112, 3, '채식 만두', '6개', '6,000원', true),
  ],
};

const history: BoothProfile = {
  id: 12,
  name: '사학과 호떡',
  organizationName: '사학과',
  description: '전통의 맛 호떡. 흑설탕 + 견과류.',
  signatureMenu: '흑설탕 호떡',
  operatingHours: '13:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '뜨거우니 잡으실 때 주의해 주세요.',
  thumbnails: [thumb(120, FOOD_PHOTO('photo-1612874741407-2c6e0f1c9091'), true)],
  menuItems: [
    menu(120, 1, '흑설탕 호떡', '1개', '2,500원'),
    menu(121, 2, '씨앗 호떡', '견과류 가득', '3,000원'),
    menu(122, 3, '치즈 호떡', '모짜렐라', '3,500원'),
  ],
};

const chem: BoothProfile = {
  id: 13,
  name: '화학과 아이스크림',
  organizationName: '화학과',
  description: '액화질소로 만드는 즉석 아이스크림.',
  signatureMenu: '딸기 아이스크림',
  operatingHours: '13:00 - 22:00',
  reservationEnabled: true,
  orderNotice: '안전을 위해 아이스크림은 받자마자 드세요.',
  thumbnails: [thumb(130, FOOD_PHOTO('photo-1501443762994-82bd5dace89a'), true)],
  menuItems: [
    menu(130, 1, '바닐라', '한 컵', '4,500원'),
    menu(131, 2, '딸기', '한 컵', '5,000원'),
    menu(132, 3, '초코', '한 컵', '5,000원'),
  ],
};

const bio: BoothProfile = {
  id: 14,
  name: '생명과학부 솜사탕',
  organizationName: '생명과학부 학생회',
  description: '직접 만들어주는 무지개 솜사탕.',
  signatureMenu: '무지개 솜사탕',
  operatingHours: '13:00 - 21:00',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [thumb(140, FOOD_PHOTO('photo-1581798459219-318e76aecc7b'), true)],
  menuItems: [
    menu(140, 1, '오리지널 솜사탕', '대형', '3,000원'),
    menu(141, 2, '무지개 솜사탕', '여러 색상', '5,000원'),
  ],
};

const astro: BoothProfile = {
  id: 15,
  name: '별빛 카페',
  organizationName: '천문우주학과',
  description: '밤하늘처럼 푸른 음료들.',
  signatureMenu: '은하수 라떼',
  operatingHours: '14:00 - 22:00',
  reservationEnabled: true,
  orderNotice: '얼음은 별 모양으로 제공.',
  thumbnails: [thumb(150, FOOD_PHOTO('photo-1559496417-e7f25cb247f3'), true)],
  menuItems: [
    menu(150, 1, '은하수 라떼', '버터플라이피 + 우유', '5,000원'),
    menu(151, 2, '북극성 모카', '에스프레소 + 초코', '5,500원'),
    menu(152, 3, '별꽃차', '단호박 + 우유', '4,500원'),
  ],
};

// 체험/굿즈 부스 ----
const likelion: BoothProfile = {
  id: 16,
  name: '멋사 굿즈샵',
  organizationName: '멋쟁이사자처럼 연세대',
  description: '개발자 굿즈 + 폴라로이드 인증샷.',
  signatureMenu: '미니 사자 인형',
  operatingHours: '12:00 - 20:00',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [thumb(160, FOOD_PHOTO('photo-1607082348824-0a96f2a4b9da'), true)],
  menuItems: [
    menu(160, 1, '미니 사자 인형', '키링', '8,000원'),
    menu(161, 2, '스티커 팩', '7종 1세트', '3,000원'),
    menu(162, 3, '폴라로이드 즉석 인증', '1장', '2,000원'),
  ],
};

const yonphoto: BoothProfile = {
  id: 17,
  name: '연포토 즉석사진',
  organizationName: '사진동아리 YONPHOTO',
  description: '필름 카메라로 찍어드리는 추억 사진.',
  signatureMenu: '필름 폴라로이드',
  operatingHours: '13:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '사진 출력까지 5분 소요.',
  thumbnails: [thumb(170, FOOD_PHOTO('photo-1469474968028-56623f02e42e'), true)],
  menuItems: [
    menu(170, 1, '필름 폴라로이드', '1장', '4,000원'),
    menu(171, 2, '4컷 사진', '커플/우정', '6,000원'),
  ],
};

const mediaArt: BoothProfile = {
  id: 18,
  name: 'VR 체험존',
  organizationName: '미디어아트학과',
  description: '5분 VR 체험. 우주/롤러코스터/언더워터.',
  signatureMenu: 'VR 5분 체험',
  operatingHours: '13:00 - 20:00',
  reservationEnabled: true,
  orderNotice: '13세 이상 권장. 멀미 주의.',
  thumbnails: [thumb(180, FOOD_PHOTO('photo-1593508512255-86ab42a8e620'), true)],
  menuItems: [
    menu(180, 1, 'VR 5분 체험', '코스 1개', '3,000원'),
    menu(181, 2, 'VR 10분 체험', '코스 2개', '5,000원'),
  ],
};

const koreanMusic: BoothProfile = {
  id: 19,
  name: '국악 체험 부스',
  organizationName: '한국음악과',
  description: '장구/가야금 체험과 미니 공연.',
  signatureMenu: '장구 5분 레슨',
  operatingHours: '13:00 - 19:00',
  reservationEnabled: true,
  orderNotice: '체험은 매시 정각마다 진행.',
  thumbnails: [],
  menuItems: [
    menu(190, 1, '장구 체험', '5분', '무료'),
    menu(191, 2, '한국 전통 차 시음', '한 잔', '2,000원'),
  ],
};

const fashionDesign: BoothProfile = {
  id: 20,
  name: '의류환경학과 페이스페인팅',
  organizationName: '의류환경학과',
  description: '예쁜 페이스페인팅으로 축제 분위기 업!',
  signatureMenu: '캐릭터 페인팅',
  operatingHours: '13:00 - 20:00',
  reservationEnabled: true,
  orderNotice: '피부 자극 우려 시 사전 알려주세요.',
  thumbnails: [thumb(200, FOOD_PHOTO('photo-1532635241-17e820acc59f'), true)],
  menuItems: [
    menu(200, 1, '간단 페인팅', '꽃 / 별 등', '3,000원'),
    menu(201, 2, '캐릭터 페인팅', '5-10분 소요', '6,000원'),
  ],
};

const education: BoothProfile = {
  id: 21,
  name: '교육 보드게임',
  organizationName: '교육학과',
  description: '캐치마인드/마피아 등 즉석 보드게임.',
  signatureMenu: '캐치마인드 한 판',
  operatingHours: '14:00 - 21:00',
  reservationEnabled: true,
  orderNotice: '4-8인용. 그룹으로 와주세요.',
  thumbnails: [],
  menuItems: [
    menu(210, 1, '캐치마인드 한 판', '15분', '2,000원'),
    menu(211, 2, '마피아 한 판', '20분', '3,000원'),
  ],
};

const admin: BoothProfile = {
  id: 22,
  name: '떡 만들기 체험',
  organizationName: '행정학과',
  description: '말랑한 떡을 직접 만들어 가져가요.',
  signatureMenu: '꿀떡 만들기',
  operatingHours: '13:00 - 18:00',
  reservationEnabled: true,
  orderNotice: '체험은 매 30분 6명 진행.',
  thumbnails: [thumb(220, FOOD_PHOTO('photo-1574484184081-afea8a62f9ab'), true)],
  menuItems: [
    menu(220, 1, '꿀떡 만들기 체험', '6개 포장', '4,000원'),
    menu(221, 2, '백설기 만들기', '1조각', '3,500원'),
  ],
};

const arch: BoothProfile = {
  id: 23,
  name: '미니어처 워크샵',
  organizationName: '건축학과',
  description: '연세대 건물 미니어처를 만들어 가져가는 워크샵.',
  signatureMenu: '본관 미니어처',
  operatingHours: '14:00 - 19:00',
  reservationEnabled: true,
  orderNotice: '한 워크샵 1시간 진행.',
  thumbnails: [],
  menuItems: [
    menu(230, 1, '본관 미니어처 키트', '1세트', '8,000원'),
    menu(231, 2, '백양관 미니어처 키트', '1세트', '8,000원'),
  ],
};

const mech: BoothProfile = {
  id: 24,
  name: '솜사탕 자판기',
  organizationName: '기계공학과 학생회',
  description: '학생들이 직접 만든 자동 솜사탕 기계.',
  signatureMenu: '오토 솜사탕',
  operatingHours: '13:00 - 20:00',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [thumb(240, FOOD_PHOTO('photo-1505250469679-203ad9ced0cb'), true)],
  menuItems: [
    menu(240, 1, '솜사탕', '핑크 / 블루', '3,000원'),
  ],
};

const ee: BoothProfile = {
  id: 25,
  name: '럭키 드로우',
  organizationName: '전기전자공학과',
  description: '한정 굿즈가 들어있는 즉석 추첨 부스.',
  signatureMenu: '럭키 드로우 1회',
  operatingHours: '12:00 - 21:00',
  reservationEnabled: false,
  orderNotice: '꽝 없는 추첨!',
  thumbnails: [],
  menuItems: [
    menu(250, 1, '럭키 드로우 1회', '꽝 없음', '2,000원'),
    menu(251, 2, '럭키 드로우 5회', '5회권', '8,000원'),
  ],
};

const theology: BoothProfile = {
  id: 26,
  name: '나눔 베이커리',
  organizationName: '신학과',
  description: '수익금 전액 사회복지단체에 기부되는 베이커리.',
  signatureMenu: '나눔 머핀',
  operatingHours: '13:00 - 19:00',
  reservationEnabled: true,
  orderNotice: '수익금은 인근 보육원에 기부됩니다.',
  thumbnails: [thumb(260, FOOD_PHOTO('photo-1486427944299-d1955d23e34d'), true)],
  menuItems: [
    menu(260, 1, '나눔 머핀', '블루베리', '3,500원'),
    menu(261, 2, '치즈 스콘', '체다 듬뿍', '4,000원'),
    menu(262, 3, '아메리카노', 'ICE', '2,500원'),
  ],
};

const informatics: BoothProfile = {
  id: 27,
  name: '코드 디버깅 카페',
  organizationName: '정보대학원',
  description: '5분 동안 즉석 코드 디버깅 + 음료 한 잔.',
  signatureMenu: '디버깅 + 라떼',
  operatingHours: '14:00 - 20:00',
  reservationEnabled: true,
  orderNotice: '코드는 100줄 이내 권장.',
  thumbnails: [],
  menuItems: [
    menu(270, 1, '디버깅 + 라떼', '5분 디버깅', '5,000원'),
    menu(271, 2, '단순 음료', '아메리카노 / 라떼', '3,000원'),
  ],
};

const studentWelfare: BoothProfile = {
  id: 28,
  name: '학생복지 안전 부스',
  organizationName: '학생복지위원회',
  description: '무료 생수 + 응급 처치 + 분실물 접수.',
  signatureMenu: '무료 생수',
  operatingHours: '11:00 - 22:00',
  reservationEnabled: false,
  orderNotice: '응급 상황 시 가장 먼저 찾아주세요.',
  thumbnails: [],
  menuItems: [
    menu(280, 1, '생수', '500ml', '무료'),
    menu(281, 2, '응급처치 키트', '간이', '무료'),
  ],
};

const aerospaceEmpty: BoothProfile = {
  id: 29,
  name: '',
  organizationName: '',
  description: '',
  signatureMenu: '',
  operatingHours: '',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [],
  menuItems: [],
};

const lastYearInactive: BoothProfile = {
  id: 30,
  name: '체대 솜사탕',
  organizationName: '체육교육학과',
  description: '작년 운영 정보. 올해는 운영하지 않습니다.',
  signatureMenu: '솜사탕',
  operatingHours: '13:00 - 19:00',
  reservationEnabled: false,
  orderNotice: '',
  thumbnails: [],
  menuItems: [
    menu(300, 1, '솜사탕', '대형', '3,000원'),
  ],
};

// ---- export -----------------------------------------------------------------

const ALL_BOOTHS: BoothProfile[] = [
  filledBooth, emptyBooth, secondFilledBooth,
  computerScience, designArts, stat, socialWelfare, psych, english, polisci,
  anthro, history, chem, bio, astro,
  likelion, yonphoto, mediaArt, koreanMusic, fashionDesign,
  education, admin, arch, mech, ee, theology, informatics, studentWelfare,
  aerospaceEmpty, lastYearInactive,
];

export const mockBoothsById: Record<number, BoothProfile> = Object.fromEntries(
  ALL_BOOTHS.map((b) => [b.id, b]),
);
