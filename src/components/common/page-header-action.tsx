import { type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

/**
 * 페이지 타이틀 섹션 오른쪽에 놓이는 주요 액션 버튼.
 *
 * 각 페이지가 제각각 px/py와 text 사이즈를 쓰던 것을 하나로 통일하기 위해
 * shadcn Button을 고정 size="lg"로 감싸고, 톤만 prop으로 선택하게 한다.
 */
type Tone = 'blue' | 'purple' | 'green' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  blue: 'bg-primary text-primary-foreground hover:bg-ds-primary-pressed',
  purple: 'bg-ds-violet-500 text-white hover:bg-ds-violet-700',
  green: 'bg-ds-success text-white hover:bg-ds-success-pressed',
  neutral: 'bg-ds-gray-800 text-white hover:bg-ds-gray-700',
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
