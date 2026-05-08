/**
 * 분실물 mock. lost-found.tsx 에서 사용.
 * description 은 lost-found 에서만 보여주므로 optional.
 */

export interface LostItem {
  id: number;
  name: string;
  location: string;
  date: string;
  hasImage: boolean;
  description?: string;
}

export const mockLostItems: LostItem[] = [
  {
    id: 1,
    name: '검은색 가죽 지갑',
    location: '동문광장 앞',
    date: '2026-05-28',
    hasImage: true,
    description: '현대카드와 학생증이 들어있습니다. 카드 명의: 김지우',
  },
  {
    id: 2,
    name: 'iPhone 14 Pro',
    location: '한글탑 부스 #3 근처',
    date: '2026-05-28',
    hasImage: false,
    description: '검은색 케이스, 케이스 안쪽에 사진 1장',
  },
  {
    id: 3,
    name: '갤럭시 S22',
    location: '송도 워터슬라이드 입구',
    date: '2026-05-27',
    hasImage: true,
    description: '보라색, 잠금화면 강아지 사진',
  },
  {
    id: 4,
    name: '학생증 (연세대)',
    location: '동문광장 후미',
    date: '2026-05-28',
    hasImage: true,
    description: '국제학부 24학번',
  },
  {
    id: 5,
    name: '검정 우산',
    location: '한글탑 부스 #5',
    date: '2026-05-28',
    hasImage: false,
    description: '3단 자동 우산, 손잡이 검정',
  },
  {
    id: 6,
    name: '에어팟 프로 (케이스만)',
    location: '경영학과 푸드트럭 옆',
    date: '2026-05-29',
    hasImage: true,
    description: '본체 없이 케이스만, 흰색',
  },
  {
    id: 7,
    name: '키링 + 차키',
    location: '백양로 입구',
    date: '2026-05-28',
    hasImage: true,
    description: '카카오 라이언 키링 + 기아 차키 1개',
  },
  {
    id: 8,
    name: '검정 백팩 (Eastpak)',
    location: '안전 부스',
    date: '2026-05-28',
    hasImage: true,
    description: '내부에 노트, 펜케이스, 무선 이어폰. 학생증 없음.',
  },
  {
    id: 9,
    name: '검정 모자 (뉴에라)',
    location: '동문광장',
    date: '2026-05-29',
    hasImage: false,
    description: 'NY 로고, 사이즈 M/L',
  },
  {
    id: 10,
    name: '돗자리',
    location: '한글탑 입구',
    date: '2026-05-29',
    hasImage: false,
    description: '체크무늬 빨간색, 4-5인용',
  },
  {
    id: 11,
    name: '안경 (블루라이트 차단)',
    location: '언기도 앞',
    date: '2026-05-27',
    hasImage: true,
    description: '검정 뿔테, 케이스는 없음',
  },
  {
    id: 12,
    name: '텀블러 (스타벅스)',
    location: '경영학과 푸드트럭',
    date: '2026-05-29',
    hasImage: false,
    description: '스타벅스 23 한정판, 핑크',
  },
  {
    id: 13,
    name: '에코백 (서점 굿즈)',
    location: '한글탑 부스 #4',
    date: '2026-05-28',
    hasImage: true,
    description: '연세 책방 로고. 안에 책 2권',
  },
  {
    id: 14,
    name: '아이패드 펜슬',
    location: 'VR 체험존',
    date: '2026-05-28',
    hasImage: false,
    description: '2세대, 흰색',
  },
  {
    id: 15,
    name: '명찰 (운영팀)',
    location: '동문광장 후미',
    date: '2026-05-29',
    hasImage: true,
    description: '운영팀 김지민 명찰. 본인 발견 즉시 운영팀 채널로 회수 부탁드립니다.',
  },
];
