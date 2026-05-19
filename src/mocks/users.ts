/**
 * 유저 관리 mock. user-management 페이지가 보는 풀.
 * 백엔드 붙으면 features/users/ 의 AdminUser 모델로 대체.
 *
 * 일관성 매핑(부스/공연 mock 과 같은 ID 공간):
 *  - boothId 1-30  → mocks/booth-profile.ts 의 mockBoothsById[id]
 *  - performanceTeamId 1-25 → mocks/performances.ts 의 performances 배열 (공연 id)
 *  - 인증 가능한 계정은 features/auth/api.ts 의 MOCK_USERS 와 boothId/teamId 일치
 *    (booth1-3, 5, 7, 13, 15, 28 / performer1-2, 16, 23 등 — 자세한 건 auth/api.ts)
 *
 * - id 100/101: 시스템 관리자(super/master) — 인증 mock 과 매칭.
 * - id 1-30: Booth 운영자 — boothId 가 같은 booth-profile 의 부스를 가리킴.
 * - id 200-209: Performer — performanceTeamId 가 같은 공연팀을 가리킴.
 */

import type { Role } from '@/types/role';

export interface MockUser {
  id: number;
  userId: string;
  role: Role;
  affiliation: string;
  /** Booth 역할이면 보유 부스 id. picker/좌표/예약 페이지가 이 값으로 매칭. */
  boothId: number | null;
  /** 표시용 부스명. */
  boothName: string;
  /** Performer 역할이면 보유 공연팀 id. */
  performanceTeamId: number | null;
  /** 표시용 공연팀명. */
  performanceTeamName: string;
  representative: string;
  phone: string;
  infoCompleted: boolean;
}

interface UserOverrides {
  boothId?: number | null;
  boothName?: string;
  performanceTeamId?: number | null;
  performanceTeamName?: string;
  infoCompleted?: boolean;
}

const u = (
  id: number,
  userId: string,
  role: Role,
  affiliation: string,
  representative: string,
  phone: string,
  options: UserOverrides = {},
): MockUser => ({
  id,
  userId,
  role,
  affiliation,
  boothId: options.boothId ?? null,
  boothName: options.boothName ?? '-',
  performanceTeamId: options.performanceTeamId ?? null,
  performanceTeamName: options.performanceTeamName ?? '-',
  representative,
  phone,
  infoCompleted: options.infoCompleted ?? true,
});

export const mockUsers: MockUser[] = [
  // ---- 시스템 관리자 ----
  u(100, 'super', 'Super', '기획단', '슈퍼어드민', '010-0000-0001'),
  u(101, 'master', 'Master', '기획단', '마스터어드민', '010-0000-0002'),
  u(102, 'staff_kim', 'Master', '기획단 운영팀', '김지민', '010-0000-0003'),
  u(103, 'staff_lee', 'Master', '기획단 운영팀', '이서연', '010-0000-0004'),

  // ---- 부스 운영자들 — boothId ↔ mockBoothsById 매칭 ----
  u(1, 'munjeong_01', 'Booth', '문헌정보학과', '정민호', '010-1234-1234', {
    boothId: 1,
    boothName: '문헌정보학과 부스',
    infoCompleted: true,
  }),
  u(11, 'booth2', 'Booth', '미배정', '미입력', '010-0000-0011', {
    boothId: 2,
    boothName: '(미작성)',
    infoCompleted: false,
  }),
  u(2, 'business_food', 'Booth', '경영학과', '박지훈', '010-2222-1111', {
    boothId: 3,
    boothName: '경영학과 푸드트럭',
    infoCompleted: true,
  }),
  u(4, 'cse_hotdog', 'Booth', '컴퓨터과학과', '김도윤', '010-2222-0004', {
    boothId: 4,
    boothName: '컴공이 만드는 핫도그',
    infoCompleted: true,
  }),
  u(5, 'design_waffle', 'Booth', '디자인예술학부', '이수아', '010-2222-0005', {
    boothId: 5,
    boothName: '디자인학부 와플 카페',
    infoCompleted: true,
  }),
  u(6, 'stat_tteok', 'Booth', '응용통계학과', '한지우', '010-2222-0006', {
    boothId: 6,
    boothName: '응통 떡볶이',
    infoCompleted: true,
  }),
  u(7, 'sw_chick', 'Booth', '사회복지학과', '정유진', '010-2222-0007', {
    boothId: 7,
    boothName: '사복과 닭강정',
    infoCompleted: true,
  }),
  u(8, 'psych_cafe', 'Booth', '심리학과', '최민서', '010-2222-0008', {
    boothId: 8,
    boothName: '심리학과 카페',
    infoCompleted: true,
  }),
  u(9, 'eng_takoyaki', 'Booth', '영어영문학과', '윤하늘', '010-2222-0009', {
    boothId: 9,
    boothName: '영문과 타코야끼',
    infoCompleted: true,
  }),
  u(10, 'pol_churros', 'Booth', '정치외교학과', '강서윤', '010-2222-0010', {
    boothId: 10,
    boothName: '정외 추로스',
    infoCompleted: true,
  }),
  u(12, 'anthro_dump', 'Booth', '문화인류학과', '오지호', '010-2222-0012', {
    boothId: 11,
    boothName: '문화인류학과 만두',
    infoCompleted: false,
  }),
  u(13, 'history_hoddeok', 'Booth', '사학과', '신아라', '010-2222-0013', {
    boothId: 12,
    boothName: '사학과 호떡',
    infoCompleted: true,
  }),
  u(14, 'chem_icecream', 'Booth', '화학과', '백승현', '010-2222-0014', {
    boothId: 13,
    boothName: '화학과 아이스크림',
    infoCompleted: true,
  }),
  u(15, 'bio_cotton', 'Booth', '생명과학부', '조하늘', '010-2222-0015', {
    boothId: 14,
    boothName: '생명과학부 솜사탕',
    infoCompleted: true,
  }),
  u(16, 'astro_cafe', 'Booth', '천문우주학과', '김서진', '010-2222-0016', {
    boothId: 15,
    boothName: '별빛 카페',
    infoCompleted: true,
  }),
  u(17, 'likelion_shop', 'Booth', '멋쟁이사자처럼', '우태호', '010-2222-0017', {
    boothId: 16,
    boothName: '멋사 굿즈샵',
    infoCompleted: true,
  }),
  u(18, 'yonphoto', 'Booth', '사진동아리', '이도현', '010-2222-0018', {
    boothId: 17,
    boothName: '연포토 즉석사진',
    infoCompleted: true,
  }),
  u(19, 'media_vr', 'Booth', '미디어아트학과', '홍채영', '010-2222-0019', {
    boothId: 18,
    boothName: 'VR 체험존',
    infoCompleted: true,
  }),
  u(20, 'koreanmusic', 'Booth', '한국음악과', '박세영', '010-2222-0020', {
    boothId: 19,
    boothName: '국악 체험 부스',
    infoCompleted: true,
  }),
  u(21, 'cloth_paint', 'Booth', '의류환경학과', '문지원', '010-2222-0021', {
    boothId: 20,
    boothName: '의류환경학과 페이스페인팅',
    infoCompleted: true,
  }),
  u(22, 'edu_board', 'Booth', '교육학과', '강유나', '010-2222-0022', {
    boothId: 21,
    boothName: '교육 보드게임',
    infoCompleted: true,
  }),
  u(23, 'admin_rice', 'Booth', '행정학과', '서민재', '010-2222-0023', {
    boothId: 22,
    boothName: '떡 만들기 체험',
    infoCompleted: false,
  }),
  u(24, 'arch_mini', 'Booth', '건축학과', '안수빈', '010-2222-0024', {
    boothId: 23,
    boothName: '미니어처 워크샵',
    infoCompleted: true,
  }),
  u(25, 'mech_cotton', 'Booth', '기계공학과', '권태우', '010-2222-0025', {
    boothId: 24,
    boothName: '솜사탕 자판기',
    infoCompleted: true,
  }),
  u(26, 'ee_lucky', 'Booth', '전기전자공학과', '심재훈', '010-2222-0026', {
    boothId: 25,
    boothName: '럭키 드로우',
    infoCompleted: true,
  }),
  u(27, 'theo_bakery', 'Booth', '신학과', '한가람', '010-2222-0027', {
    boothId: 26,
    boothName: '나눔 베이커리',
    infoCompleted: true,
  }),
  u(28, 'info_debug', 'Booth', '정보대학원', '이재현', '010-2222-0028', {
    boothId: 27,
    boothName: '코드 디버깅 카페',
    infoCompleted: true,
  }),
  u(29, 'welfare', 'Booth', '학생복지위원회', '김도현', '010-2222-0029', {
    boothId: 28,
    boothName: '학생복지 안전 부스',
    infoCompleted: true,
  }),
  u(30, 'aerospace_test', 'Booth', '우주항공공학과', '진보경', '010-2222-0030', {
    boothId: 29,
    boothName: '(미작성)',
    infoCompleted: false,
  }),

  // ---- 공연팀 대표들 — performanceTeamId ↔ mocks/performances.ts 의 공연 id 매칭 ----
  u(200, 'performer1', 'Performer', '멋쟁이사자처럼', '우태호', '010-3333-0001', {
    performanceTeamId: 1,
    performanceTeamName: '멋쟁이사자처럼 연세대',
    infoCompleted: true,
  }),
  u(201, 'songdo_band', 'Performer', '국제캠 인디', '이채원', '010-3333-0002', {
    performanceTeamId: 2,
    performanceTeamName: '송도노인정양로원',
    infoCompleted: true,
  }),
  u(202, 'palette', 'Performer', '음악동아리', '김민준', '010-3333-0003', {
    performanceTeamId: 3,
    performanceTeamName: '팔레트',
    infoCompleted: true,
  }),
  u(203, 'occlusion', 'Performer', '락밴드 동아리', '오재석', '010-3333-0004', {
    performanceTeamId: 4,
    performanceTeamName: 'Occlusion',
    infoCompleted: true,
  }),
  u(204, 'jazzfeel', 'Performer', '재즈 동아리', '한진우', '010-3333-0005', {
    performanceTeamId: 5,
    performanceTeamName: '재즈필',
    infoCompleted: true,
  }),
  u(205, 'btl', 'Performer', '댄스 동아리', '홍지수', '010-3333-0006', {
    performanceTeamId: 16,
    performanceTeamName: 'BTL',
    infoCompleted: true,
  }),
  u(206, 'cumputer_01', 'Performer', '멋쟁이사자처럼', '멋사OB', '010-3333-0007', {
    performanceTeamId: null,
    performanceTeamName: '멋쟁이사자처럼 OB',
    infoCompleted: false,
  }),
  u(207, 'perseus', 'Performer', '락밴드 동아리', '이도균', '010-3333-0008', {
    performanceTeamId: 10,
    performanceTeamName: '페르세우스',
    infoCompleted: true,
  }),
  u(208, 'echo_band', 'Performer', '인디 밴드', '박서영', '010-3333-0009', {
    performanceTeamId: 22,
    performanceTeamName: 'Echo',
    infoCompleted: true,
  }),
  u(209, 'komi_squad', 'Performer', '댄스 동아리', '윤재현', '010-3333-0010', {
    performanceTeamId: 23,
    performanceTeamName: 'KOMI Squad',
    infoCompleted: true,
  }),
];
