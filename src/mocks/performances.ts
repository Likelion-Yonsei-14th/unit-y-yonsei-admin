/**
 * Performance 도메인 mock 시드 + in-memory mock API.
 *
 * 세 날짜(5/27 송도, 5/28·5/29 신촌) × 위치(언기도 앞 / 동문광장 / 노천극장) 에 공연 분산.
 * `api.ts` 가 `import * as mock` 로 쓰는 mock 함수 전부를 여기서 export 한다.
 * 세션 동안 살아있는 in-memory 구현 — 같은 세션 동안 수정사항이 유지된다.
 *
 * id=1 은 Performer 로그인 유저(performer1, performanceTeamId=1) 의 "내 공연".
 * id=1 은 라이브/current 데모용으로 `performanceStatus: 'ONGOING'`.
 */

import { useAuthStore } from '@/features/auth/store';
import type {
  Performance,
  PerformanceCategory,
  PerformanceImage,
  PerformanceImageCreateDTO,
  PerformanceListItem,
  PerformanceStatus,
  SetlistCreateDTO,
  SetlistItem,
  SetlistUpdateDTO,
} from '@/features/performances/types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 공연 날짜 정수: 1=5/26 블루런 · 2=5/27 송도 · 3=5/28 신촌 · 4=5/29 신촌.
const D_SONGDO = 2;
const D_SINCHON_1 = 3;
const D_SINCHON_2 = 4;

// 위치(locationId / locationName) — 기존 stage 라벨 유지.
const LOC = {
  songdo: { id: 1, name: '언기도 앞' },
  dongmoon: { id: 2, name: '동문광장' },
  nocheon: { id: 3, name: '노천극장' },
} as const;

interface PerformanceSeed extends Performance {
  /** 시드 전용 — 별도 sub-resource 로 분리되기 전 원본 데이터. */
  _images: Array<{ imageUrl: string; imageType: 'PROFILE' | 'DETAIL' }>;
  _setlist: Array<{ songTitle: string; singerName: string }>;
}

const photo = (seed: string): PerformanceSeed['_images'] => [
  { imageUrl: `https://images.unsplash.com/${seed}?w=600&q=80`, imageType: 'PROFILE' },
];

const songs = (...items: Array<[string, string]>): PerformanceSeed['_setlist'] =>
  items.map(([songTitle, singerName]) => ({ songTitle, singerName }));

interface RawPerformance {
  id: number;
  performanceName: string;
  performanceDescription: string;
  instagramUrl: string;
  youtubeUrl: string;
  performanceDate: number;
  loc: (typeof LOC)[keyof typeof LOC];
  startTime: string;
  endTime: string;
  category: PerformanceCategory;
  status: PerformanceStatus;
  images: PerformanceSeed['_images'];
  setlist: PerformanceSeed['_setlist'];
}

const RAW: RawPerformance[] = [
  // ==== 5/27 송도 ============================================================
  {
    id: 2,
    performanceName: '송도노인정양로원',
    performanceDescription:
      '송도 국제캠퍼스의 밤을 밝히는 인디 밴드. 잔잔한 발라드부터 신나는 록까지.',
    instagramUrl: 'https://instagram.com/songdo_oldfolks',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '19:00',
    endTime: '19:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: photo('photo-1470225620780-dba8ba36b745'),
    setlist: songs(['좋은 날', '아이유'], ['I Need You', '백예린']),
  },
  {
    id: 3,
    performanceName: '팔레트',
    performanceDescription: '다양한 장르를 조합해 연주하는 어쿠스틱 팀.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '17:00',
    endTime: '17:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['좋니', '윤종신'], ['그게 너야', '폴킴']),
  },
  {
    id: 4,
    performanceName: 'Occlusion',
    performanceDescription: '록 사운드 기반의 5인조 밴드. 연세대 중앙 락밴드 동아리.',
    instagramUrl: 'https://instagram.com/occlusion_band',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '21:30',
    endTime: '22:00',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1493225457124-a3eb161ffa5f'),
    setlist: songs(
      ['Beautiful Stranger', '잔나비'],
      ['주저하는 연인들을 위해', '잔나비'],
      ['빨간 목도리', 'JANNABI'],
    ),
  },
  {
    id: 11,
    performanceName: '하늘소리',
    performanceDescription: '연세대 합창단. 평화롭고 깊이 있는 무대.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '17:30',
    endTime: '18:00',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['낭만에 대하여', '최백호'], ['걱정말아요 그대', '들국화']),
  },
  {
    id: 12,
    performanceName: 'Bluemoon',
    performanceDescription: '재즈 + 블루스 4인조.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '18:00',
    endTime: '18:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: photo('photo-1511671782779-c97d3d27a1d4'),
    setlist: songs(['Autumn Leaves', 'Eva Cassidy'], ['Fly Me to the Moon', 'Frank Sinatra']),
  },
  {
    id: 13,
    performanceName: '네온하트',
    performanceDescription: '연세대 댄스 동아리. 신스팝 베이스 퍼포먼스.',
    instagramUrl: 'https://instagram.com/neonheart_yonsei',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '20:00',
    endTime: '20:30',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1493676304819-0d7a8d026dcf'),
    setlist: songs(['Sneakers', 'ITZY'], ['Cookie', 'NewJeans'], ['DDU-DU DDU-DU', 'BLACKPINK']),
  },
  {
    id: 14,
    performanceName: 'YAGV',
    performanceDescription: '연세대 어쿠스틱 보컬 그룹. 차분한 곡 위주.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '20:30',
    endTime: '21:00',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['오늘 헤어졌어요', '권진아'], ['헤어지자 말해요', '박재정']),
  },
  {
    id: 15,
    performanceName: '진영밴드',
    performanceDescription: '클래식 록 커버 5인조. 90년대 한국 록 헌정 무대.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SONGDO,
    loc: LOC.songdo,
    startTime: '21:00',
    endTime: '21:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['이등병의 편지', '김광석'], ['그날들', '김광석']),
  },

  // ==== 5/28 신촌 동문광장 ====================================================
  // id=1 은 performer1 로그인 매칭. 라이브/current 데모용 ONGOING.
  {
    id: 1,
    performanceName: '멋쟁이사자처럼 연세대',
    performanceDescription:
      '연세대학교 IT 창업 동아리. 2026년 대동제에서 열정적인 무대를 선보입니다!',
    instagramUrl: 'https://instagram.com/likelion_yonsei',
    youtubeUrl: 'https://youtube.com/likelion',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '14:00',
    endTime: '14:30',
    category: 'CLUB',
    status: 'ONGOING',
    images: photo('photo-1501386761578-eac5c94b800a'),
    setlist: songs(['Spring Day', 'BTS'], ['Next Level', 'aespa'], ['Dynamite', 'BTS']),
  },
  {
    id: 6,
    performanceName: '아침향기',
    performanceDescription: '매일 아침을 여는 어쿠스틱 밴드. 깨끗한 화성과 잔잔한 멜로디.',
    instagramUrl: 'https://instagram.com/morning_scent',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '17:00',
    endTime: '17:15',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['그대로 있어주면 돼', '폴킴']),
  },
  {
    id: 7,
    performanceName: '청불',
    performanceDescription: '청춘의 불꽃을 태우는 무대를 지향. 사이드 프로젝트 밴드.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '17:30',
    endTime: '17:45',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: photo('photo-1501612780327-45045538702b'),
    setlist: songs(['청춘', '김창완'], ['벚꽃 엔딩', '버스커버스커']),
  },
  {
    id: 16,
    performanceName: 'BTL',
    performanceDescription: '대형 메인 무대 헤드라이너. K-Pop 댄스 메들리.',
    instagramUrl: 'https://instagram.com/btl_yonsei',
    youtubeUrl: 'https://youtube.com/btl_yonsei',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '18:00',
    endTime: '18:30',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1493225457124-a3eb161ffa5f'),
    setlist: songs(
      ['Hype Boy', 'NewJeans'],
      ['LOVE DIVE', 'IVE'],
      ['ANTIFRAGILE', 'LE SSERAFIM'],
      ['CRAZY', 'LE SSERAFIM'],
    ),
  },
  {
    id: 17,
    performanceName: '우주산책',
    performanceDescription: '드림팝 4인조. 몽환적이고 따뜻한 무대.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '19:00',
    endTime: '19:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['Galaxy', 'Bolbbalgan4'], ['우주를 줄게', '볼빨간사춘기']),
  },
  {
    id: 18,
    performanceName: 'PURPLE',
    performanceDescription: '댄스 퍼포먼스 8인조. 화려한 군무.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.dongmoon,
    startTime: '20:00',
    endTime: '20:30',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['Get a Guitar', 'RIIZE'], ['I AM', 'IVE'], ['Smart', 'LE SSERAFIM']),
  },

  // ==== 5/28 신촌 노천극장 ====================================================
  {
    id: 5,
    performanceName: '재즈필',
    performanceDescription: '연세대 중앙 재즈 동아리. 정통 빅밴드 사운드.',
    instagramUrl: 'https://instagram.com/jazzfeel_yonsei',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.nocheon,
    startTime: '16:30',
    endTime: '16:45',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1511671782779-c97d3d27a1d4'),
    setlist: songs(['Take Five', 'Dave Brubeck'], ['So What', 'Miles Davis']),
  },
  {
    id: 19,
    performanceName: '한울림',
    performanceDescription: '국악 + 사물놀이 융합 팀. 전통과 현대의 조화.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.nocheon,
    startTime: '17:00',
    endTime: '17:15',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['아리랑 변주', '국악원'], ['신모듬', '김대환']),
  },
  {
    id: 20,
    performanceName: '마음소리',
    performanceDescription: 'A cappella 6인조. 사람 목소리만으로 만드는 풍성한 화성.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.nocheon,
    startTime: '17:30',
    endTime: '17:45',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['Lemon Tree', 'Fools Garden'], ['하루', 'BIBI']),
  },
  {
    id: 21,
    performanceName: 'Lyrical',
    performanceDescription: '발라드 위주 보컬 트리오.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_1,
    loc: LOC.nocheon,
    startTime: '18:00',
    endTime: '18:15',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['눈사람', '솔지'], ['이젠 안녕', '박효신']),
  },

  // ==== 5/29 신촌 동문광장 ====================================================
  {
    id: 10,
    performanceName: '페르세우스',
    performanceDescription: '정통 록 밴드 6인조. 창립 25년 연세대 락밴드 동아리.',
    instagramUrl: 'https://instagram.com/perseus_yonsei',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.dongmoon,
    startTime: '15:15',
    endTime: '15:30',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1471478331149-c72f17e33c73'),
    setlist: songs(['일어나', '김광석'], ['벼랑 끝에 서서', '머쉬베놈']),
  },
  {
    id: 22,
    performanceName: 'Echo',
    performanceDescription: '신예 4인조 밴드. 시티팝 + 인디록.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.dongmoon,
    startTime: '16:00',
    endTime: '16:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['시티팝', 'Yukika'], ['Plastic Love', 'Mariya Takeuchi']),
  },
  {
    id: 23,
    performanceName: 'KOMI Squad',
    performanceDescription: 'K-Pop 댄스 동아리. 9인조 군무.',
    instagramUrl: 'https://instagram.com/komi_squad',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.dongmoon,
    startTime: '18:00',
    endTime: '18:30',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1485178575877-1a13bf489dfe'),
    setlist: songs(['DRAMA', 'aespa'], ['UNFORGIVEN', 'LE SSERAFIM'], ['Magnetic', 'ILLIT']),
  },
  {
    id: 24,
    performanceName: '연세 인디 콜라보',
    performanceDescription: '연세대 출신 인디뮤지션 다수가 모여 만든 일회성 무대.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.dongmoon,
    startTime: '19:30',
    endTime: '20:30',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(
      ['Antifreeze', '검정치마'],
      ['이게 사랑일까', '브로콜리너마저'],
      ['뜨거운 안녕', '쟈 니브로'],
    ),
  },

  // ==== 5/29 신촌 노천극장 ====================================================
  {
    id: 8,
    performanceName: 'SoWhat',
    performanceDescription: '실용음악과 학생 연합 프로젝트 팀.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.nocheon,
    startTime: '16:00',
    endTime: '16:15',
    category: 'ARTIST',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(['So What', '루카스 그라함']),
  },
  {
    id: 9,
    performanceName: 'FEVER',
    performanceDescription: '댄스 팀. 90년대 K-Pop 헌정.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.nocheon,
    startTime: '16:30',
    endTime: '16:45',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: photo('photo-1485178575877-1a13bf489dfe'),
    setlist: songs(['CANDY', 'H.O.T'], ['Spotlight', 'JJ Lin']),
  },
  {
    id: 25,
    performanceName: '오즈',
    performanceDescription: '연세 윈드 앙상블 일부 멤버. 가벼운 클래식 연주.',
    instagramUrl: '',
    youtubeUrl: '',
    performanceDate: D_SINCHON_2,
    loc: LOC.nocheon,
    startTime: '17:00',
    endTime: '17:15',
    category: 'CLUB',
    status: 'SCHEDULED',
    images: [],
    setlist: songs(
      ['Pirates of the Caribbean', 'Hans Zimmer'],
      ["How Far I'll Go", "Auli'i Cravalho"],
    ),
  },
];

// ---- in-memory 스토어 ----
// RAW 를 펼쳐 공연 본문 / 이미지 / 셋리스트 세 테이블로 분리해 보관.

const performances: Performance[] = RAW.map((r) => ({
  id: r.id,
  performanceName: r.performanceName,
  lineupName: r.performanceName,
  performanceDescription: r.performanceDescription,
  performanceDate: r.performanceDate,
  startTime: r.startTime,
  endTime: r.endTime,
  performanceCategory: r.category,
  performanceStatus: r.status,
  locationId: r.loc.id,
  locationName: r.loc.name,
  instagramUrl: r.instagramUrl,
  youtubeUrl: r.youtubeUrl,
}));

// 이미지/셋리스트 id 시퀀스 — 시드 전부 펼친 뒤 다음 값에서 이어 발급.
let nextImageId = 1;
let nextSetlistId = 1;

const images: PerformanceImage[] = RAW.flatMap((r) =>
  r.images.map((img, i) => ({
    id: nextImageId++,
    performanceId: r.id,
    imageUrl: img.imageUrl,
    imageOrder: i + 1,
    imageType: img.imageType,
  })),
);

const setlists: SetlistItem[] = RAW.flatMap((r) =>
  r.setlist.map((s, i) => ({
    id: nextSetlistId++,
    performanceId: r.id,
    songTitle: s.songTitle,
    singerName: s.singerName,
    songOrder: i + 1,
    note: '',
  })),
);

/** 로그인 유저의 본인 공연 id. Performer 가 아니면 null. */
function myPerformanceId(): number | null {
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Performer' || user.performanceTeamId == null) return null;
  return user.performanceTeamId;
}

const toListItem = (p: Performance): PerformanceListItem => ({
  id: p.id,
  performanceName: p.performanceName,
  lineupName: p.lineupName,
  performanceDate: p.performanceDate,
  startTime: p.startTime,
  endTime: p.endTime,
  performanceCategory: p.performanceCategory,
  performanceStatus: p.performanceStatus,
  locationId: p.locationId,
  locationName: p.locationName,
});

// ---- 공연 본문 mock ----

export async function listPerformancesMock(): Promise<PerformanceListItem[]> {
  await delay(200);
  return performances.map(toListItem);
}

export async function getPerformanceMock(id: number): Promise<Performance | null> {
  await delay(150);
  return performances.find((p) => p.id === id) ?? null;
}

export async function getMyPerformanceMock(): Promise<Performance | null> {
  await delay(150);
  const id = myPerformanceId();
  if (id == null) return null;
  return performances.find((p) => p.id === id) ?? null;
}

export async function updateMyPerformanceMock(patch: Partial<Performance>): Promise<Performance> {
  await delay(200);
  const id = myPerformanceId();
  if (id == null) throw new Error('mock: 본인 공연이 없습니다');
  const idx = performances.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`mock: performance ${id} not found`);
  const next = { ...performances[idx], ...patch, id };
  performances[idx] = next;
  return next;
}

// ---- 이미지 mock ----

export async function getPerformanceImagesMock(performanceId: number): Promise<PerformanceImage[]> {
  await delay(120);
  return images
    .filter((img) => img.performanceId === performanceId)
    .sort((a, b) => a.imageOrder - b.imageOrder);
}

export async function addPerformanceImageMock(
  input: PerformanceImageCreateDTO,
): Promise<PerformanceImage> {
  await delay(150);
  const id = myPerformanceId();
  if (id == null) throw new Error('mock: 본인 공연이 없습니다');
  const created: PerformanceImage = {
    id: nextImageId++,
    performanceId: id,
    imageUrl: input.imageUrl,
    imageOrder: input.imageOrder,
    imageType: input.imageType,
  };
  images.push(created);
  return created;
}

export async function deletePerformanceImageMock(imageId: number): Promise<void> {
  await delay(120);
  const idx = images.findIndex((img) => img.id === imageId);
  if (idx >= 0) images.splice(idx, 1);
}

// ---- 셋리스트 mock ----

export async function getSetlistMock(performanceId: number): Promise<SetlistItem[]> {
  await delay(120);
  return setlists
    .filter((s) => s.performanceId === performanceId)
    .sort((a, b) => a.songOrder - b.songOrder);
}

export async function addSetlistItemMock(input: SetlistCreateDTO): Promise<SetlistItem> {
  await delay(150);
  const id = myPerformanceId();
  if (id == null) throw new Error('mock: 본인 공연이 없습니다');
  const created: SetlistItem = {
    id: nextSetlistId++,
    performanceId: id,
    songTitle: input.songTitle,
    singerName: input.singerName,
    songOrder: input.songOrder,
    note: input.note ?? '',
  };
  setlists.push(created);
  return created;
}

export async function updateSetlistItemMock(
  setlistId: number,
  input: SetlistUpdateDTO,
): Promise<SetlistItem> {
  await delay(150);
  const idx = setlists.findIndex((s) => s.id === setlistId);
  if (idx < 0) throw new Error(`mock: setlist ${setlistId} not found`);
  const next: SetlistItem = {
    ...setlists[idx],
    songTitle: input.songTitle,
    singerName: input.singerName,
    songOrder: input.songOrder,
    note: input.note ?? '',
  };
  setlists[idx] = next;
  return next;
}

export async function deleteSetlistItemMock(setlistId: number): Promise<void> {
  await delay(120);
  const idx = setlists.findIndex((s) => s.id === setlistId);
  if (idx >= 0) setlists.splice(idx, 1);
}

// ---- 라이브 공연 (수동 지정) mock ----
// 단일 상태: 한 번에 한 공연만 라이브. 모듈 변수로 세션 동안 유지.
let mockLivePerformanceId: number | null = null;

export async function getLivePerformanceMock(): Promise<number | null> {
  await delay(100);
  return mockLivePerformanceId;
}

export async function setLivePerformanceMock(id: number | null): Promise<number | null> {
  await delay(120);
  mockLivePerformanceId = id;
  return mockLivePerformanceId;
}
