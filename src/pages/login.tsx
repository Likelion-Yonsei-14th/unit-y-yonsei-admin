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
          <h1 className="ds-display text-foreground mb-2">대동제 어드민</h1>
          <p className="ds-body-2 text-muted-foreground">
            관리자 계정으로 로그인해주세요
          </p>
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
                {login.error instanceof Error
                  ? login.error.message
                  : '로그인에 실패했습니다'}
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
              🛠 Mock 모드 안내 (VITE_USE_MOCK=true)
            </p>
            <div className="ds-caption text-ds-warning-pressed space-y-0.5 font-mono">
              <div>super / super1234 (슈퍼어드민)</div>
              <div>master / master1234 (마스터어드민)</div>
              <div>booth1 / booth1234 (부스운영자 · 작성 완료)</div>
              <div>booth2 / booth1234 (부스운영자 · 빈 프로필)</div>
              <div>performer1 / perf1234 (공연팀)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
