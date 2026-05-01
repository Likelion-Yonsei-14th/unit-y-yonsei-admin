import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useMyBoothProfile, useUpdateMyBoothProfile } from '@/features/booths/hooks';
import { isBoothInfoCompleted, isMenuListCompleted } from '@/features/booths/types';
import { BoothInfoForm } from '@/features/booths/components/booth-info-form';
import { BoothStatusCards } from '@/features/booths/components/booth-status-cards';
import { MenuListForm } from '@/features/booths/components/menu-list-form';

/**
 * Booth 역할 사용자의 자기 부스 관리 페이지.
 *
 * 컨테이너 책임:
 *  - booth 데이터 fetch + 로딩/에러 분기
 *  - 두 폼(부스 정보 / 메뉴 리스트) 의 표시 토글
 *  - 헤더의 부스 운영 ON/OFF 토글 + BoothInfoForm 의 토글 동기화
 *
 * 폼 내부 state(필드/이미지/메뉴) 는 각 sub-component 가 직접 들고 있어
 * 페이지가 비대해지지 않도록 분리됨.
 */
export function BoothManagement() {
  // 이 페이지는 RequirePermission('booth.update.own') 으로 가드 → Booth 역할만 진입.
  const { data: booth, isPending, isError } = useMyBoothProfile();
  const updateProfile = useUpdateMyBoothProfile();

  const [showBoothInfoForm, setShowBoothInfoForm] = useState(false);
  const [showMenuListForm, setShowMenuListForm] = useState(false);

  // 부스 운영 ON/OFF — 헤더 토글과 BoothInfoForm 의 토글이 같은 값을 가리키므로
  // 페이지에서 단일 진실로 두고 둘에 모두 전달한다. 저장은 BoothInfoForm 에서
  // 다른 필드와 함께 일괄 mutation.
  const [reservationEnabled, setReservationEnabled] = useState(false);
  // booth 객체 레퍼런스만 바뀌는 refetch 에서 로컬 토글이 서버 값으로 덮이지 않도록
  // 실제 동기화 트리거 필드만 deps 에 둔다 (저장은 BoothInfoForm 일괄 처리이므로
  // 편집 중 로컬 상태 유지가 중요).
  useEffect(() => {
    if (booth) setReservationEnabled(booth.reservationEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 의도적으로 좁힌 deps. 위 주석 참고.
  }, [booth?.id, booth?.reservationEnabled]);

  // 작성 완료 여부는 저장된 booth 에서만 파생 — 편집 중 입력은 반영되지 않음.
  const boothInfoCompleted = isBoothInfoCompleted(booth);
  const menuListCompleted = isMenuListCompleted(booth);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          {booth.organizationName && (
            <div className="text-sm text-muted-foreground mb-1">
              {booth.organizationName} 부스 예약 관리
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
            onClick={() => setReservationEnabled(!reservationEnabled)}
            aria-label={reservationEnabled ? '부스 운영 끄기' : '부스 운영 켜기'}
            className={`
              relative w-14 h-7 rounded-full transition-all duration-300
              ${reservationEnabled ? 'bg-primary shadow-lg' : 'bg-ds-border-strong'}
            `}
          >
            <div
              className={`
              absolute top-1 w-5 h-5 bg-background rounded-full shadow-md transition-all duration-300
              ${reservationEnabled ? 'left-8' : 'left-1'}
            `}
            />
          </button>
        </div>
      </div>

      {!showBoothInfoForm && !showMenuListForm && (
        <BoothStatusCards
          boothInfoCompleted={boothInfoCompleted}
          menuListCompleted={menuListCompleted}
          onOpenBoothInfo={() => setShowBoothInfoForm(true)}
          onOpenMenuList={() => setShowMenuListForm(true)}
        />
      )}

      {showBoothInfoForm && (
        <BoothInfoForm
          booth={booth}
          reservationEnabled={reservationEnabled}
          onReservationEnabledChange={setReservationEnabled}
          // 작성 안 된 부스 카드 클릭 → 바로 편집 모드로.
          initiallyEditing={!boothInfoCompleted}
          updateMutation={updateProfile}
          onClose={() => setShowBoothInfoForm(false)}
        />
      )}

      {showMenuListForm && (
        <MenuListForm
          booth={booth}
          initiallyEditing={!menuListCompleted}
          updateMutation={updateProfile}
          onClose={() => setShowMenuListForm(false)}
        />
      )}
    </div>
  );
}
