/**
 * 유저 관리 mock. user-management 페이지가 보는 풀.
 * 백엔드 붙으면 features/users/ 의 AdminUser 모델로 대체.
 *
 * - id 1, 2, 3 은 기존 시드(인증/예약 mock 호환).
 * - id 10, 11, 20 은 인증 mock(MOCK_USERS 의 super/master/booth1/booth2/performer1) 와 매칭.
 *   페이지에 표시되는 유저 풀과 실제 로그인 가능한 계정의 일관성을 유지.
 * - 그 외 유저는 풍부한 운영 시뮬레이션을 위한 시드 — 부스/공연 mock 의 booth_id /
 *   teamId 와 짝지어 두면 picker / 권한 화면에서 자연스러움.
 */

import type { Role } from '@/types/role';

export interface MockUser {
  id: number;
  userId: string;
  role: Role;
  affiliation: string;
  boothName: string;
  performanceTeamName: string;
  representative: string;
  email: string;
  phone: string;
  infoCompleted: boolean;
  active: boolean;
}

const u = (
  id: number,
  userId: string,
  role: Role,
  affiliation: string,
  representative: string,
  phone: string,
  email: string,
  options: Partial<Pick<MockUser, 'boothName' | 'performanceTeamName' | 'infoCompleted' | 'active'>> = {},
): MockUser => ({
  id,
  userId,
  role,
  affiliation,
  boothName: options.boothName ?? '-',
  performanceTeamName: options.performanceTeamName ?? '-',
  representative,
  email,
  phone,
  infoCompleted: options.infoCompleted ?? true,
  active: options.active ?? true,
});

export const mockUsers: MockUser[] = [
  // ---- 시스템 관리자 ----
  u(100, 'super',  'Super',  '기획단', '슈퍼어드민', '010-0000-0001', 'super@yonsei.ac.kr'),
  u(101, 'master', 'Master', '기획단', '마스터어드민', '010-0000-0002', 'master@yonsei.ac.kr'),
  u(102, 'staff_kim', 'Master', '기획단 운영팀', '김지민', '010-0000-0003', 'jimin.kim@yonsei.ac.kr'),
  u(103, 'staff_lee', 'Master', '기획단 운영팀', '이서연', '010-0000-0004', 'seoyeon.lee@yonsei.ac.kr'),

  // ---- 부스 운영자들 — booth-profile.ts 의 booth_id 와 매칭 ----
  u(1,  'munjeong_01',   'Booth', '문헌정보학과',  '정민호', '010-1234-1234', 'munjeong@yonsei.ac.kr',     { boothName: '문헌정보학과 부스', infoCompleted: true }),
  u(11, 'booth2',        'Booth', '미배정',         '미입력',  '010-0000-0011', 'booth2@yonsei.ac.kr',     { boothName: '(미작성)', infoCompleted: false }),
  u(2,  'business_food', 'Booth', '경영학과',      '박지훈', '010-2222-1111', 'business@yonsei.ac.kr',    { boothName: '경영학과 푸드트럭', infoCompleted: true }),
  u(4,  'cse_hotdog',    'Booth', '컴퓨터과학과',  '김도윤', '010-2222-0004', 'cse@yonsei.ac.kr',         { boothName: '컴공이 만드는 핫도그', infoCompleted: true }),
  u(5,  'design_waffle', 'Booth', '디자인예술학부','이수아', '010-2222-0005', 'design@yonsei.ac.kr',      { boothName: '디자인학부 와플 카페', infoCompleted: true }),
  u(6,  'stat_tteok',    'Booth', '응용통계학과',  '한지우', '010-2222-0006', 'stat@yonsei.ac.kr',        { boothName: '응통 떡볶이', infoCompleted: true }),
  u(7,  'sw_chick',      'Booth', '사회복지학과',  '정유진', '010-2222-0007', 'sw@yonsei.ac.kr',          { boothName: '사복과 닭강정', infoCompleted: true }),
  u(8,  'psych_cafe',    'Booth', '심리학과',      '최민서', '010-2222-0008', 'psych@yonsei.ac.kr',       { boothName: '심리학과 카페', infoCompleted: true }),
  u(9,  'eng_takoyaki',  'Booth', '영어영문학과',  '윤하늘', '010-2222-0009', 'english@yonsei.ac.kr',     { boothName: '영문과 타코야끼', infoCompleted: true }),
  u(10, 'pol_churros',   'Booth', '정치외교학과',  '강서윤', '010-2222-0010', 'polisci@yonsei.ac.kr',     { boothName: '정외 추로스', infoCompleted: true }),
  u(12, 'anthro_dump',   'Booth', '문화인류학과',  '오지호', '010-2222-0012', 'anthro@yonsei.ac.kr',      { boothName: '문화인류학과 만두', infoCompleted: false }),
  u(13, 'history_hoddeok','Booth','사학과',        '신아라', '010-2222-0013', 'history@yonsei.ac.kr',     { boothName: '사학과 호떡', infoCompleted: true }),
  u(14, 'chem_icecream', 'Booth', '화학과',        '백승현', '010-2222-0014', 'chem@yonsei.ac.kr',        { boothName: '화학과 아이스크림', infoCompleted: true }),
  u(15, 'bio_cotton',    'Booth', '생명과학부',    '조하늘', '010-2222-0015', 'bio@yonsei.ac.kr',         { boothName: '생명과학부 솜사탕', infoCompleted: true }),
  u(16, 'astro_cafe',    'Booth', '천문우주학과',  '김서진', '010-2222-0016', 'astro@yonsei.ac.kr',       { boothName: '별빛 카페', infoCompleted: true }),
  u(17, 'likelion_shop', 'Booth', '멋쟁이사자처럼','우태호', '010-2222-0017', 'likelion@yonsei.ac.kr',    { boothName: '멋사 굿즈샵', infoCompleted: true }),
  u(18, 'yonphoto',      'Booth', '사진동아리',    '이도현', '010-2222-0018', 'yonphoto@yonsei.ac.kr',    { boothName: '연포토 즉석사진', infoCompleted: true }),
  u(19, 'media_vr',      'Booth', '미디어아트학과','홍채영', '010-2222-0019', 'media@yonsei.ac.kr',       { boothName: 'VR 체험존', infoCompleted: true }),
  u(20, 'koreanmusic',   'Booth', '한국음악과',    '박세영', '010-2222-0020', 'kmusic@yonsei.ac.kr',      { boothName: '국악 체험 부스', infoCompleted: true }),
  u(21, 'cloth_paint',   'Booth', '의류환경학과',  '문지원', '010-2222-0021', 'cloth@yonsei.ac.kr',       { boothName: '의류환경학과 페이스페인팅', infoCompleted: true }),
  u(22, 'edu_board',     'Booth', '교육학과',      '강유나', '010-2222-0022', 'edu@yonsei.ac.kr',         { boothName: '교육 보드게임', infoCompleted: true }),
  u(23, 'admin_rice',    'Booth', '행정학과',      '서민재', '010-2222-0023', 'admin@yonsei.ac.kr',       { boothName: '떡 만들기 체험', infoCompleted: false }),
  u(24, 'arch_mini',     'Booth', '건축학과',      '안수빈', '010-2222-0024', 'arch@yonsei.ac.kr',        { boothName: '미니어처 워크샵', infoCompleted: true }),
  u(25, 'mech_cotton',   'Booth', '기계공학과',    '권태우', '010-2222-0025', 'mech@yonsei.ac.kr',        { boothName: '솜사탕 자판기', infoCompleted: true }),
  u(26, 'ee_lucky',      'Booth', '전기전자공학과','심재훈', '010-2222-0026', 'ee@yonsei.ac.kr',          { boothName: '럭키 드로우', infoCompleted: true }),
  u(27, 'theo_bakery',   'Booth', '신학과',        '한가람', '010-2222-0027', 'theo@yonsei.ac.kr',        { boothName: '나눔 베이커리', infoCompleted: true }),
  u(28, 'info_debug',    'Booth', '정보대학원',    '이재현', '010-2222-0028', 'info@yonsei.ac.kr',        { boothName: '코드 디버깅 카페', infoCompleted: true }),
  u(29, 'welfare',       'Booth', '학생복지위원회','김도현', '010-2222-0029', 'welfare@yonsei.ac.kr',     { boothName: '학생복지 안전 부스', infoCompleted: true }),
  u(30, 'aerospace_test','Booth', '우주항공공학과','진보경', '010-2222-0030', 'aero@yonsei.ac.kr',        { boothName: '(미작성)', infoCompleted: false }),
  u(3,  'inactive_user01','Booth','체육교육학과',  '김재현', '010-5678-5678', 'kim@yonsei.ac.kr',         { boothName: '체대 솜사탕', infoCompleted: true, active: false }),

  // ---- 공연팀 대표들 — performances.ts 의 teamId 와 매칭 ----
  u(200, 'performer1',  'Performer', '멋쟁이사자처럼', '우태호', '010-3333-0001', 'likelion_band@yonsei.ac.kr', { performanceTeamName: '멋쟁이사자처럼 연세대', infoCompleted: true }),
  u(201, 'songdo_band', 'Performer', '국제캠 인디',     '이채원', '010-3333-0002', 'songdo@yonsei.ac.kr',        { performanceTeamName: '송도노인정양로원', infoCompleted: true }),
  u(202, 'palette',     'Performer', '음악동아리',      '김민준', '010-3333-0003', 'palette@yonsei.ac.kr',       { performanceTeamName: '팔레트', infoCompleted: true }),
  u(203, 'occlusion',   'Performer', '락밴드 동아리',   '오재석', '010-3333-0004', 'occlusion@yonsei.ac.kr',     { performanceTeamName: 'Occlusion', infoCompleted: true }),
  u(204, 'jazzfeel',    'Performer', '재즈 동아리',     '한진우', '010-3333-0005', 'jazz@yonsei.ac.kr',          { performanceTeamName: '재즈필', infoCompleted: true }),
  u(205, 'btl',         'Performer', '댄스 동아리',     '홍지수', '010-3333-0006', 'btl@yonsei.ac.kr',           { performanceTeamName: 'BTL', infoCompleted: true }),
  u(206, 'cumputer_01', 'Performer', '멋쟁이사자처럼', '멋사OB', '010-3333-0007', 'likelion_ob@yonsei.ac.kr',    { performanceTeamName: '멋쟁이사자처럼 OB', infoCompleted: false }),
  u(207, 'perseus',     'Performer', '락밴드 동아리',   '이도균', '010-3333-0008', 'perseus@yonsei.ac.kr',       { performanceTeamName: '페르세우스', infoCompleted: true }),
  u(208, 'echo_band',   'Performer', '인디 밴드',       '박서영', '010-3333-0009', 'echo@yonsei.ac.kr',          { performanceTeamName: 'Echo', infoCompleted: true }),
  u(209, 'komi_squad',  'Performer', '댄스 동아리',     '윤재현', '010-3333-0010', 'komi@yonsei.ac.kr',          { performanceTeamName: 'KOMI Squad', infoCompleted: true }),
];
