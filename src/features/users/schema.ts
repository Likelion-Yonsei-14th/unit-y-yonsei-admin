import { z } from 'zod';
import { FESTIVAL_DATES } from '@/features/booth-layout/sections';

/**
 * 축제 날짜 리터럴 — schema 와 UI 양쪽에서 동일 단일 소스(FESTIVAL_DATES)로
 * 통일. FESTIVAL_DATES 는 readonly tuple 이라 z.enum 의 mutable tuple 타입에
 * 직접 못 들어가 한 번 spread + cast.
 */
const FESTIVAL_DATE_ENUM = [...FESTIVAL_DATES] as [
  (typeof FESTIVAL_DATES)[number],
  ...(typeof FESTIVAL_DATES)[number][],
];

/**
 * 신규 어드민 계정 생성 폼 스키마.
 *
 * 권한 유형(permissionType) 에 따라 부스명/공연팀명 중 하나가 필수로 토글되는데,
 * 같은 폼 안에서 공유 필드 다수가 있어 discriminatedUnion 보다 superRefine 으로
 * 분기 검증하는 편이 form binding 이 단순하다.
 */
export const createUserSchema = z
  .object({
    userId: z.string().min(1, '유저 ID를 입력해주세요'),
    // 빈 값 → '입력해주세요', 8자 미만 → '최소 8자' 두 메시지를 분리해서 보여준다.
    tempPassword: z
      .string()
      .min(1, '임시 비밀번호를 입력해주세요')
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    affiliation: z.string().min(1, '소속을 입력해주세요'),
    permissionType: z.enum(['Super', 'Master', 'Booth', 'Performer'], {
      message: '권한 유형을 선택해주세요',
    }),
    representativeName: z.string().min(1, '대표자명을 입력해주세요'),
    representativePhone: z.string().min(1, '대표자 전화번호를 입력해주세요'),
    /** 권한이 Booth 일 때 필수 — 분기 검증은 아래 superRefine. */
    boothName: z.string().optional(),
    /** 권한이 Performer 일 때 필수 — 분기 검증은 아래 superRefine. */
    performanceTeamName: z.string().optional(),
    internalMemo: z.string().min(1, '내부 메모를 입력해주세요'),

    // ---- 운영 정보 (선택) — Master 가 알면 발급 시점에 미리 잡아둘 수 있는 초기값들. ----
    // 모두 optional. 비워 두면 본인 또는 운영진이 후속 화면에서 채운다.
    // 좌표(부스 자리)는 booth-layout PlacementEditor 의 그래픽 picker 가 잡으므로
    // 텍스트 필드로는 받지 않는다 — 자리 후보 메모(boothLocationNote) 만 받음.
    /** Booth 캠퍼스 — MapSectionId 와 일치(global=송도, baekyang=백양로, hangeul=한글탑). */
    boothCampus: z.enum(['global', 'baekyang', 'hangeul']).optional(),
    /**
     * Booth 운영 날짜 — 백엔드 Booth.date 가 단일 정수라 한 부스 = 하루, 단일 선택.
     * 부스 운영 가능일은 5/27 (송도), 5/28 / 5/29 (신촌). 5/26 블루런 은 부스 없음.
     */
    boothOperatingDate: z.enum(FESTIVAL_DATE_ENUM).optional(),
    /** 부스 자리 후보 메모. 좌표 입력 X — PlacementEditor 에서 별도. */
    boothLocationNote: z.string().optional(),
    /** Performer 공연 일자(YYYY-MM-DD). FESTIVAL_DATES 단일 소스 사용. */
    performanceDate: z.enum(FESTIVAL_DATE_ENUM).optional(),
    /** Performer 초기 배정 스테이지 — create-admin 의 PERFORMER_STAGES 와 일치. */
    performanceStage: z.enum(['songdo', 'dongmoon', 'nocheon']).optional(),
    /** Performer 시작 시각 (HH:MM, 24h). */
    performanceStartTime: z.string().optional(),
    /** Performer 종료 시각 (HH:MM, 24h). */
    performanceEndTime: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.permissionType === 'Booth' && !data.boothName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '부스명을 입력해주세요',
        path: ['boothName'],
      });
    }
    if (data.permissionType === 'Performer' && !data.performanceTeamName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '공연팀명을 입력해주세요',
        path: ['performanceTeamName'],
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
