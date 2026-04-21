import { type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

/**
 * 페이지 타이틀 섹션 오른쪽에 놓이는 주요 액션 버튼.
 *
 * 각 페이지가 제각각 px/py와 text 사이즈를 쓰던 것을 하나로 통일하기 위해
 * shadcn Button을 고정 size="lg"로 감싸고, 톤만 prop으로 선택하게 한다.
 * 톤별 그라데이션은 Figma Make 원본 비주얼을 유지 — 색상 토큰 마이그레이션은 별건.
 */
type Tone = 'blue' | 'purple' | 'green' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  blue: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-200',
  purple: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-200',
  green: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-200',
  neutral: 'bg-slate-800 text-white hover:bg-slate-700',
};

interface Props extends Omit<ComponentProps<'button'>, 'className'> {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageHeaderAction({
  tone = 'blue',
  icon,
  children,
  className,
  ...props
}: Props) {
  return (
    <Button
      type="button"
      size="lg"
      className={cn(TONE_CLASS[tone], 'transition-all duration-200', className)}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
}
