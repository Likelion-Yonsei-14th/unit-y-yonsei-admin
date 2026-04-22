import { Lock, Star } from 'lucide-react';
import type { PickerBooth } from '@/features/booth-layout/types';

interface BoothSliderCardProps {
  booth: PickerBooth;
  isFocused: boolean;
  isMine: boolean;
  canEnter: boolean;
  onClick: () => void;
}

export function BoothSliderCard({
  booth,
  isFocused,
  isMine,
  canEnter,
  onClick,
}: BoothSliderCardProps) {
  const { placement, profile, counts } = booth;
  const displayName = profile.name || '이름 미입력 부스';
  const displayOrg = profile.organizationName || '-';
  const total = counts.waiting + counts.completed + counts.cancelled;

  return (
    <button
      type="button"
      onClick={onClick}
      title={!canEnter ? '본인 부스만 예약 관리가 가능합니다' : undefined}
      data-booth-id={placement.boothId}
      className={`flex w-[280px] shrink-0 flex-col items-start gap-2 rounded-xl border bg-background p-4 text-left shadow-sm transition-all ${
        isFocused
          ? 'border-primary scale-[1.02] ring-2 ring-primary/20'
          : 'border-border hover:border-ds-border-strong'
      } ${!canEnter ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className="flex w-full items-center gap-2 font-semibold text-foreground">
        {isMine && <Star size={14} className="shrink-0 text-primary" />}
        <span className="truncate" title={displayName}>{displayName}</span>
        {!canEnter && <Lock size={12} className="ml-auto shrink-0 text-muted-foreground" />}
      </div>
      <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate" title={displayOrg}>{displayOrg}</span>
        <span className="shrink-0">· #{placement.boothNumber}</span>
      </div>
      {total === 0 ? (
        <div className="text-xs text-ds-text-disabled">예약 없음</div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center rounded-full bg-ds-primary-subtle px-2 py-0.5 font-medium text-ds-primary-pressed">
            대기 {counts.waiting}
          </span>
          <span className="inline-flex items-center rounded-full bg-ds-success-subtle px-2 py-0.5 font-medium text-ds-success-pressed">
            완료 {counts.completed}
          </span>
          <span className="inline-flex items-center rounded-full bg-ds-error-subtle px-2 py-0.5 font-medium text-ds-error-pressed">
            취소 {counts.cancelled}
          </span>
        </div>
      )}
    </button>
  );
}
