import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-client';
import { useChangeMyPassword } from '@/features/auth/hooks';

/**
 * 비밀번호 변경 폼 검증.
 *
 * - 백엔드 newPassword 가 @Size(min=8, max=72) 라 동일 한도를 적용.
 * - 새 비번 ≠ 현재 비번은 클라이언트에서도 한 번 거른다(서버도 A-020 으로 거름).
 * - 확인 일치는 백엔드에 없는 클라이언트 전용 가드.
 */
const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(72, '비밀번호는 72자 이하여야 합니다.'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmNewPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass =
  'w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all';

/**
 * 본인 비밀번호 변경 다이얼로그.
 * 사이드바의 "비밀번호 변경" 버튼이 트리거. 성공 시 hooks 의 mutation 이
 * 토스트 + 로그아웃 + /login 으로 이동까지 처리하므로 여기서는 폼만 다룬다.
 */
export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const mutation = useChangeMyPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = (values: FormValues) => {
    mutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onError: (err) => {
          // 백엔드가 보낸 코드로 어느 필드 에러인지 분기. 그 외는 일반 토스트.
          if (err instanceof ApiError) {
            const code = err.body?.code;
            if (code === 'A-021') {
              setError('currentPassword', {
                message: '현재 비밀번호가 일치하지 않습니다.',
              });
              return;
            }
            if (code === 'A-020') {
              setError('newPassword', {
                message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
              });
              return;
            }
          }
          toast.error('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>
            변경 후 자동으로 로그아웃됩니다. 새 비밀번호로 다시 로그인해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              현재 비밀번호
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
              className={inputClass}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              새 비밀번호{' '}
              <span className="font-normal text-muted-foreground">(8자 이상 72자 이하)</span>
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
              className={inputClass}
            />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="confirm-new-password"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              새 비밀번호 확인
            </label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              {...register('confirmNewPassword')}
              className={inputClass}
            />
            {errors.confirmNewPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.confirmNewPassword.message}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
              className="px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-ds-primary-pressed disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              변경
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
