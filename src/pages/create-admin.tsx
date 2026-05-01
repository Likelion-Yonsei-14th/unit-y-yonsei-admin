import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Check, Shield, FileText, X } from "lucide-react";
import { useCreateUser } from "@/features/users/hooks";
import { createUserSchema, type CreateUserFormValues } from "@/features/users/schema";
import type { Role } from "@/types/role";

const PERMISSION_OPTIONS: Array<{
  value: Role;
  label: string;
  description: string;
  badgeClass: string;
}> = [
  { value: "Super", label: "Super", description: "모든 권한 보유", badgeClass: "bg-ds-secondary-a" },
  { value: "Master", label: "Master", description: "전체 관리 권한", badgeClass: "bg-primary" },
  { value: "Booth", label: "Booth", description: "부스 관리 권한", badgeClass: "bg-ds-success" },
  { value: "Performer", label: "Performer", description: "공연 관리 권한", badgeClass: "bg-ds-warning" },
];

const EMPTY_FORM: CreateUserFormValues = {
  userId: "",
  tempPassword: "",
  affiliation: "",
  // 빈 문자열은 enum 매칭에 실패해 첫 zod parse 시 'permissionType' 에러를 띄운다.
  // (사용자가 카드를 클릭하면 setValue 로 정상 enum 값이 들어감)
  permissionType: "" as unknown as Role,
  representativeName: "",
  representativePhone: "",
  boothName: "",
  performanceTeamName: "",
  internalMemo: "",
};

export function CreateAdmin() {
  const createMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: EMPTY_FORM,
    mode: "onSubmit",
  });

  const permissionType = watch("permissionType");
  const needsBoothName = permissionType === "Booth";
  const needsPerformanceTeamName = permissionType === "Performer";

  const onSubmit = (values: CreateUserFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        // 성공 알림 3초 후 폼 초기화 — 기존 UX 유지.
        setTimeout(() => {
          reset(EMPTY_FORM);
          createMutation.reset();
        }, 3000);
      },
    });
  };

  // mutation 이 새 요청을 시작하면 직전 success 안내가 사라지도록 RHF submit 상태도 함께 초기화.
  useEffect(() => {
    if (createMutation.isPending && isSubmitSuccessful) {
      // no-op: react-hook-form 이 isSubmitSuccessful 을 자체 관리하므로 별도 reset 불필요.
    }
  }, [createMutation.isPending, isSubmitSuccessful]);

  const isSuccess = createMutation.isSuccess && !createMutation.isPending;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <UserPlus size={32} />
          신규 어드민 계정 생성
        </h1>
        <p className="text-muted-foreground mt-2">외부 요청을 받아 새로운 어드민 계정을 생성합니다. 생성된 계정 정보는 요청자에게 전달됩니다.</p>
      </div>

      {/* 성공/실패 알림 — mutation 결과만을 신뢰 (이전: 무조건 success 토스트로 거짓말). */}
      {isSuccess && (
        <div role="status" className="mb-6 flex items-center gap-2 px-4 py-3 bg-ds-success-subtle border border-ds-success text-ds-success-pressed rounded-lg shadow-lg">
          <div className="w-6 h-6 bg-ds-success rounded-full flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
          <span className="font-medium">계정이 성공적으로 생성되었습니다!</span>
        </div>
      )}
      {createMutation.isError && (
        <div role="alert" className="mb-6 flex items-center gap-2 px-4 py-3 bg-ds-error-subtle border border-destructive text-destructive rounded-lg shadow-lg">
          <X size={16} />
          <span className="font-medium">계정 생성에 실패했습니다. 잠시 후 다시 시도해주세요.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="bg-background rounded-2xl p-4 md:p-8 shadow-sm space-y-6">
          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-4 bg-ds-primary-subtle border border-ds-primary rounded-lg">
            <Shield size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-ds-primary-pressed">
              <p className="font-semibold mb-1">관리자 안내사항</p>
              <ul className="list-disc list-inside space-y-1 text-ds-primary-pressed">
                <li>이 페이지는 Super 권한을 가진 운영진만 접근할 수 있습니다</li>
                <li>외부 요청을 검토한 후 적절한 권한을 부여하여 계정을 생성해주세요</li>
                <li>부스/공연팀 계정은 실제 운영하는 부스/공연팀명과 일치해야 합니다</li>
                <li>생성된 계정 정보(ID, 임시 비밀번호)는 요청자에게 안전하게 전달해주세요</li>
              </ul>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="user-id" className="block text-sm font-semibold text-foreground mb-2">
                유저 ID <span className="text-destructive">*</span>
              </label>
              <input
                id="user-id"
                type="text"
                placeholder="example_user"
                aria-invalid={!!errors.userId}
                {...register("userId")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.userId ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
                }`}
              />
              {errors.userId && <p className="text-destructive text-xs mt-1">{errors.userId.message}</p>}
            </div>

            <div>
              <label htmlFor="temp-password" className="block text-sm font-semibold text-foreground mb-2">
                임시 비밀번호 <span className="text-destructive">*</span>
              </label>
              <input
                id="temp-password"
                type="password"
                placeholder="최소 8자 이상"
                aria-invalid={!!errors.tempPassword}
                {...register("tempPassword")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.tempPassword ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
                }`}
              />
              {errors.tempPassword && <p className="text-destructive text-xs mt-1">{errors.tempPassword.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="affiliation" className="block text-sm font-semibold text-foreground mb-2">
              소속 <span className="text-destructive">*</span>
            </label>
            <input
              id="affiliation"
              type="text"
              placeholder="예: 문헌정보학과, 멋쟁이사자처럼, 총학생회 등"
              aria-invalid={!!errors.affiliation}
              {...register("affiliation")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.affiliation ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
              }`}
            />
            {errors.affiliation && <p className="text-destructive text-xs mt-1">{errors.affiliation.message}</p>}
          </div>

          {/* Permission Type — radiogroup 으로 의미 매칭 */}
          <div>
            <span id="permission-label" className="block text-sm font-semibold text-foreground mb-3">
              권한 유형 <span className="text-destructive">*</span>
            </span>
            <div role="radiogroup" aria-labelledby="permission-label" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PERMISSION_OPTIONS.map((option) => {
                const selected = permissionType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setValue("permissionType", option.value, { shouldValidate: true })}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-left
                      ${selected
                        ? `border-transparent ${option.badgeClass} text-white shadow-lg`
                        : 'border-border hover:border-ds-border-strong bg-background'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={18} />
                      <span className="font-bold">{option.label}</span>
                    </div>
                    <p className={`text-xs ${selected ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.permissionType && <p className="text-destructive text-xs mt-1">{errors.permissionType.message}</p>}
          </div>

          {/* Booth Name - Conditional */}
          {needsBoothName && (
            <div className="p-4 bg-ds-success-subtle border border-ds-success rounded-lg">
              <label htmlFor="booth-name-input" className="block text-sm font-semibold text-ds-success-pressed mb-2">
                부스명 <span className="text-destructive">*</span>
              </label>
              <input
                id="booth-name-input"
                type="text"
                placeholder="운영할 부스 이름을 입력하세요"
                aria-invalid={!!errors.boothName}
                {...register("boothName")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-background ${
                  errors.boothName ? 'border-destructive focus:ring-destructive' : 'border-ds-success focus:ring-ds-success'
                }`}
              />
              {errors.boothName && <p className="text-destructive text-xs mt-1">{errors.boothName.message}</p>}
            </div>
          )}

          {/* Performance Team Name - Conditional */}
          {needsPerformanceTeamName && (
            <div className="p-4 bg-ds-warning-subtle border border-ds-warning rounded-lg">
              <label htmlFor="performance-team-name-input" className="block text-sm font-semibold text-ds-warning-pressed mb-2">
                공연팀명 <span className="text-destructive">*</span>
              </label>
              <input
                id="performance-team-name-input"
                type="text"
                placeholder="공연팀 이름을 입력하세요"
                aria-invalid={!!errors.performanceTeamName}
                {...register("performanceTeamName")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-background ${
                  errors.performanceTeamName ? 'border-destructive focus:ring-destructive' : 'border-ds-warning focus:ring-ds-warning'
                }`}
              />
              {errors.performanceTeamName && <p className="text-destructive text-xs mt-1">{errors.performanceTeamName.message}</p>}
            </div>
          )}

          {/* Representative Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="representative-name" className="block text-sm font-semibold text-foreground mb-2">
                대표자명 <span className="text-destructive">*</span>
              </label>
              <input
                id="representative-name"
                type="text"
                placeholder="홍길동"
                aria-invalid={!!errors.representativeName}
                {...register("representativeName")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.representativeName ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
                }`}
              />
              {errors.representativeName && <p className="text-destructive text-xs mt-1">{errors.representativeName.message}</p>}
            </div>

            <div>
              <label htmlFor="representative-phone" className="block text-sm font-semibold text-foreground mb-2">
                대표자 전화번호 <span className="text-destructive">*</span>
              </label>
              <input
                id="representative-phone"
                type="tel"
                placeholder="010-1234-5678"
                aria-invalid={!!errors.representativePhone}
                {...register("representativePhone")}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.representativePhone ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
                }`}
              />
              {errors.representativePhone && <p className="text-destructive text-xs mt-1">{errors.representativePhone.message}</p>}
            </div>
          </div>

          {/* Internal Memo */}
          <div>
            <label htmlFor="internal-memo" className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileText size={16} />
              내부 메모
            </label>
            <textarea
              id="internal-memo"
              rows={4}
              placeholder="요청 경로, 검토 내용, 특이사항 등을 기록해주세요. (예: 카카오톡으로 요청받음 - 문헌정보학과 부스 운영 확인 완료)"
              aria-invalid={!!errors.internalMemo}
              {...register("internalMemo")}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                errors.internalMemo ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-ring'
              }`}
            />
            {errors.internalMemo && <p className="text-destructive text-xs mt-1">{errors.internalMemo.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              계정 생성 이력 관리를 위한 내부 메모입니다. 요청자에게 공개되지 않습니다.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              reset(EMPTY_FORM);
              createMutation.reset();
            }}
            disabled={createMutation.isPending}
            className="px-6 py-3 bg-background border border-ds-border-strong text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <UserPlus size={18} />
            {createMutation.isPending ? "생성 중…" : "계정 생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
