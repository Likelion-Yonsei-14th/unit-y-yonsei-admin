import { z } from 'zod';

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
