import { useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { useMyBooth, useUpdateMyBooth } from '@/features/booths/hooks';
import { BoothInfoForm } from '@/features/booths/components/booth-info-form';
import { BoothStatusCards } from '@/features/booths/components/booth-status-cards';

/**
 * Booth 역할 사용자의 자기 부스 관리 페이지.
 *
 * 컨테이너 책임:
 *  - booth 데이터 fetch + 로딩/에러 분기
 *  - 부스 정보 폼의 표시 토글
 *  - 헤더의 부스 운영 ON/OFF 토글 + BoothInfoForm 의 토글 동기화
 *
 * 폼 내부 state(필드) 는 BoothInfoForm 이 직접 들고 있어 페이지가 비대해지지
 * 않도록 분리됨.
 */
export function BoothManagement() {
  // 이 페이지는 RequirePermission('booth.update.own') 으로 가드 → Booth 역할만 진입.
  const { data: booth, isPending, isError } = useMyBooth();
  const updateBooth = useUpdateMyBooth();

  const [showBoothInfoForm, setShowBoothInfoForm] = useState(false);

  // 부스 운영 ON/OFF — 헤더 토글과 BoothInfoForm 의 토글이 같은 값을 가리키므로
  // 페이지에서 단일 진실로 두고 둘에 모두 전달한다. 저장은 BoothInfoForm 에서
  // 다른 필드와 함께 일괄 mutation.
  const [isReservable, setIsReservable] = useState(false);
  // booth 객체 레퍼런스만 바뀌는 refetch 에서 로컬 토글이 서버 값으로 덮이지 않도록
  // 실제 동기화 트리거 필드만 deps 에 둔다 (저장은 BoothInfoForm 일괄 처리이므로
  // 편집 중 로컬 상태 유지가 중요).
  useEffect(() => {
    if (booth) setIsReservable(booth.isReservable);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 의도적으로 좁힌 deps. 위 주석 참고.
  }, [booth?.id, booth?.isReservable]);

  // 작성 완료 여부는 백엔드 계산값(profileComplete)을 그대로 사용.
  const boothInfoCompleted = booth?.profileComplete ?? false;

  // 폼 → 상태 카드로 복귀. 카드 밖 '이전으로' 버튼이 호출.
  const handleBackToCards = () => {
    setShowBoothInfoForm(false);
  };

  if (isPending) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (isError || !booth) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-xl font-semibold text-foreground">부스 정보를 불러오지 못했습니다.</h1>
        <p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* '이전으로' — 폼 진입 시 카드 밖(헤더 위)에 노출해 복귀 동선을 명확히. */}
      {showBoothInfoForm && (
        <button
          type="button"
          onClick={handleBackToCards}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
          이전으로
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          {booth.organization && (
            <div className="text-sm text-muted-foreground mb-1">
              {booth.organization} 부스 예약 관리
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Store size={32} />
            부스 정보 관리
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">부스 운영 ON/OFF</span>
          <button
            onClick={() => setIsReservable(!isReservable)}
            aria-label={isReservable ? '부스 운영 끄기' : '부스 운영 켜기'}
            className={`
              relative w-14 h-7 rounded-full transition-all duration-300
              ${isReservable ? 'bg-primary shadow-lg' : 'bg-ds-gray-400'}
            `}
          >
            <div
              className={`
              absolute top-1 w-5 h-5 bg-background rounded-full shadow-md transition-all duration-300
              ${isReservable ? 'left-8' : 'left-1'}
            `}
            />
          </button>
        </div>
      </div>

      {!showBoothInfoForm && (
        <BoothStatusCards
          boothInfoCompleted={boothInfoCompleted}
          onOpenBoothInfo={() => setShowBoothInfoForm(true)}
        />
      )}

      {showBoothInfoForm && (
        <BoothInfoForm
          booth={booth}
          isReservable={isReservable}
          onIsReservableChange={setIsReservable}
          // 작성 안 된 부스 카드 클릭 → 바로 편집 모드로.
          initiallyEditing={!boothInfoCompleted}
          updateMutation={updateBooth}
          // 저장 성공 → 카드 화면으로 복귀, 갱신된 작성완료 상태 노출.
          onSaved={handleBackToCards}
        />
      )}
    </div>
  );
}
