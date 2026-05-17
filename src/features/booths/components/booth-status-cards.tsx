import { Check, Store, UtensilsCrossed, X } from 'lucide-react';

interface StatusCardProps {
  title: React.ReactNode;
  completed: boolean;
  decoration: React.ReactNode;
  onClick: () => void;
}

function StatusCard({ title, completed, decoration, onClick }: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-8 transition-all duration-300 text-left cursor-pointer hover:scale-105
        ${
          completed
            ? 'bg-ds-success-subtle border-2 border-ds-success-subtle hover:border-ds-success'
            : 'bg-ds-error-subtle border-2 border-ds-error-subtle hover:border-ds-error'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg
            ${completed ? 'bg-ds-success text-white' : 'bg-destructive text-destructive-foreground'}
          `}
        >
          {completed ? <Check size={32} /> : <X size={32} />}
        </div>
      </div>
      <div
        className={`text-sm font-medium ${completed ? 'text-ds-success-pressed' : 'text-ds-error-pressed'}`}
      >
        {completed ? '작성완료' : '작성필요'}
      </div>

      <div className="mt-8">
        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4">
          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            {decoration}
          </div>
        </div>
      </div>
    </button>
  );
}

interface Props {
  boothInfoCompleted: boolean;
  menuListCompleted: boolean;
  onOpenBoothInfo: () => void;
  onOpenMenuList: () => void;
}

/**
 * 부스 관리 페이지의 입구 — 두 작성 영역(부스 상세 / 메뉴 리스트) 의 완료
 * 상태를 한눈에 보여주고 클릭으로 폼 진입.
 */
export function BoothStatusCards({
  boothInfoCompleted,
  menuListCompleted,
  onOpenBoothInfo,
  onOpenMenuList,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <StatusCard
        title={
          <>
            부스 상세 정보
            <br />
            작성
          </>
        }
        completed={boothInfoCompleted}
        decoration={<Store size={56} aria-hidden="true" />}
        onClick={onOpenBoothInfo}
      />
      <StatusCard
        title={
          <>
            메뉴 리스트
            <br />
            작성
          </>
        }
        completed={menuListCompleted}
        decoration={<UtensilsCrossed size={56} aria-hidden="true" />}
        onClick={onOpenMenuList}
      />
    </div>
  );
}
