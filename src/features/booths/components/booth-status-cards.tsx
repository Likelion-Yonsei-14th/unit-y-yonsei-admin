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
        relative w-full overflow-hidden rounded-2xl p-8 transition-all duration-300 text-left cursor-pointer hover:scale-105
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
  /** 백엔드 계산값(Booth.profileComplete). */
  boothInfoCompleted: boolean;
  onOpenBoothInfo: () => void;
  /** 음식 부스(isFood)일 때만 메뉴 카드를 노출한다. */
  isFoodBooth: boolean;
  /** 메뉴가 1개 이상 등록됐는지. */
  menuCompleted: boolean;
  onOpenMenuList: () => void;
}

/**
 * 부스 관리 페이지의 입구 — 작성 상태 카드.
 * 항상 '부스 상세 정보' 카드를 보여주고, 음식 부스면 '메뉴 리스트' 카드를 함께 띄운다.
 */
export function BoothStatusCards({
  boothInfoCompleted,
  onOpenBoothInfo,
  isFoodBooth,
  menuCompleted,
  onOpenMenuList,
}: Props) {
  return (
    <div className={`mb-8 grid grid-cols-1 gap-6 ${isFoodBooth ? 'sm:grid-cols-2' : 'max-w-lg'}`}>
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
      {isFoodBooth && (
        <StatusCard
          title={
            <>
              메뉴 리스트
              <br />
              작성
            </>
          }
          completed={menuCompleted}
          decoration={<UtensilsCrossed size={56} aria-hidden="true" />}
          onClick={onOpenMenuList}
        />
      )}
    </div>
  );
}
