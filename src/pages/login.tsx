import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/features/auth/hooks';
import { loginSchema, type LoginFormValues } from '@/features/auth/schema';
import { env } from '@/lib/env';

/**
 * 로그인 페이지.
 *
 * 피그마에 전용 디자인이 없었음 → 디자인 시스템 토큰으로 기본형 구성.
 * 기획자 컨펌 후 필요 시 리디자인.
 */
export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: '', password: '' },
  });

  const login = useLogin();

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="ds-display text-foreground mb-2">대동제 Jelly:U 어드민</h1>
          <p className="ds-body-2 text-muted-foreground">관리자 계정으로 로그인해주세요</p>
          {/* 화면 표시는 w-40(160px). 320×277 PNG 가 retina 2x 와 정확히 매치 — 그 이상은 과스펙.
              width/height 명시로 이미지 로드 전 layout shift 방지. */}
          <img
            src="/jelly-mascot.png"
            alt="Jelly:U 마스코트"
            width={320}
            height={277}
            decoding="async"
            className="mx-auto mt-4 w-40 h-auto"
          />
        </div>

        {/* 운영진 가입 안내 — 계정이 없는 운영진을 위한 진입 동선. 로그인 폼 위로 노출. */}
        <div className="mb-6 rounded-2xl bg-background p-6 shadow-sm">
          <p className="ds-body-2 text-muted-foreground mb-3">부스·공연 운영진이라면?</p>
          <ol className="ds-body-2 list-decimal list-inside space-y-1.5 text-foreground">
            <li>
              <a
                href="https://open.kakao.com/o/g6GxwAvi"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2 hover:text-ds-primary-pressed"
              >
                오픈카톡 입장
              </a>
            </li>
            <li>오픈카톡 공지내 구글폼으로 가입 신청</li>
            <li>할당된 전용 계정 ID/PW로 로그인</li>
            <li>부스·공연 정보 입력</li>
          </ol>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-background rounded-2xl p-8 space-y-5 shadow-sm"
          noValidate
        >
          <div className="space-y-1.5">
            <label htmlFor="userId" className="ds-body-2 font-medium text-foreground">
              아이디
            </label>
            <input
              id="userId"
              type="text"
              autoComplete="username"
              {...register('userId')}
              className="w-full px-4 py-2.5 rounded-lg border border-ds-border-strong bg-background text-foreground placeholder:text-ds-text-disabled focus:outline-none focus:border-ring focus:ring-2 focus:ring-ds-primary-subtle transition"
              placeholder="예: admin"
              disabled={login.isPending}
            />
            {errors.userId && (
              <p className="ds-caption text-ds-error-pressed">{errors.userId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="ds-body-2 font-medium text-foreground">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="w-full px-4 py-2.5 rounded-lg border border-ds-border-strong bg-background text-foreground placeholder:text-ds-text-disabled focus:outline-none focus:border-ring focus:ring-2 focus:ring-ds-primary-subtle transition"
              placeholder="비밀번호"
              disabled={login.isPending}
            />
            {errors.password && (
              <p className="ds-caption text-ds-error-pressed">{errors.password.message}</p>
            )}
          </div>

          {login.isError && (
            <div className="rounded-lg bg-ds-error-subtle px-4 py-3">
              <p className="ds-body-2 text-ds-error-pressed">
                {login.error instanceof Error ? login.error.message : '로그인에 실패했습니다'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium ds-body-1 hover:bg-ds-primary-pressed active:bg-ds-primary-pressed disabled:bg-ds-bg-tertiary disabled:text-ds-text-disabled transition"
          >
            {login.isPending ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {env.USE_MOCK && (
          <div className="mt-4 rounded-lg bg-ds-warning-subtle border border-ds-warning/30 px-4 py-3">
            <p className="ds-caption font-medium text-ds-warning-pressed mb-1.5">
              🛠 Mock 모드 안내 (VITE_USE_MOCK=true) — 비밀번호는 아무거나 입력
            </p>
            <div className="text-[11px] sm:text-xs text-ds-warning-pressed space-y-0.5 font-mono break-words">
              <div>super (슈퍼어드민)</div>
              <div>master (마스터어드민)</div>
              <div className="pt-1 text-[10px] opacity-80">─ Booth ─</div>
              <div>booth1 — 문헌정보학과 · 인기 · 다일 운영</div>
              <div>booth2 — 빈 프로필 (작성 전 데모)</div>
              <div>booth3 — 경영학과 · 한글탑</div>
              <div>booth5 — 디자인 와플 · 인기</div>
              <div>booth7 — 사회복지 닭강정 · 인기</div>
              <div>booth13 — 화학과 아이스크림 · 인기</div>
              <div>booth15 — 별빛 카페 · 다중 자리</div>
              <div>booth28 — 안전 부스 · 모든 날짜</div>
              <div className="pt-1 text-[10px] opacity-80">─ Performer ─</div>
              <div>performer1 — 멋사 · 5/28 백양로</div>
              <div>performer2 — 송도노인정양로원 · 5/27 송도</div>
              <div>performer16 — BTL · 5/28 백양로 헤드라이너</div>
              <div>performer23 — KOMI Squad · 5/29 백양로</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
