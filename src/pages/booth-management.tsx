import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Store } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/features/auth/hooks';
import { useMyBooth, useSetBoothReservable, useUpdateMyBooth } from '@/features/booths/hooks';
import { BoothInfoForm } from '@/features/booths/components/booth-info-form';
import { BoothCreateForm } from '@/features/booths/components/booth-create-form';
import { BoothStatusCards } from '@/features/booths/components/booth-status-cards';
import { useMenus } from '@/features/menus/hooks';
import { MenuListForm } from '@/features/menus/components/menu-list-form';

/** 카드 입구 / 부스 상세 폼 / 메뉴 리스트 — 셋 중 하나를 보여준다. */
type View = 'cards' | 'booth-info' | 'menu';

/**
 * Booth 역할 사용자의 자기 부스 관리 페이지.
 *
 * 컨테이너 책임:
 *  - booth 데이터 fetch + 로딩/에러 분기
 *  - 카드 / 부스 상세 폼 / 메뉴 리스트 뷰 전환
 *  - 헤더의 부스 운영 ON/OFF 토글 + BoothInfoForm 의 토글 동기화
 *
 * 폼 내부 state(필드) 는 BoothInfoForm 이 직접 들고 있어 페이지가 비대해지지
 * 않도록 분리됨.
 */
export function BoothManagement() {
  // 이 페이지는 RequirePermission('booth.update.own') 으로 가드 → Booth 역할만 진입.
  const { data: booth, isPending, isError } = useMyBooth();
  const { can } = useAuth();
  const updateBooth = useUpdateMyBooth();
  const setReservable = useSetBoothReservable();
  // 부스 생성(Super/Master) 모달 — 권한 있을 때만 진입 버튼 노출.
  const [createOpen, setCreateOpen] = useState(false);
  // 메뉴 카드의 작성완료 뱃지용 — 음식 부스일 때만 조회한다.
  const menusQuery = useMenus(booth?.isFood ? booth.id : null);

  const [view, setView] = useState<View>('cards');
  // 부스 운영 ON/OFF 는 즉시 토글하지 않고 확인 다이얼로그를 한 번 거친다.
  // null = 다이얼로그 닫힘, true/false = 전환하려는 목표 값.
  const [pendingReservable, setPendingReservable] = useState<boolean | null>(null);

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

  // 작성 완료 여부 — 부스 상세는 백엔드 계산값(profileComplete), 메뉴는 1개 이상 등록 여부.
  const boothInfoCompleted = booth?.profileComplete ?? false;
  const menuCompleted = (menusQuery.data?.length ?? 0) > 0;

  // 폼/메뉴 → 카드 입구로 복귀.
  const handleBackToCards = () => {
    setView('cards');
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
      {/* '이전으로' — 폼/메뉴 진입 시 카드 밖(헤더 위)에 노출해 복귀 동선을 명확히. */}
      {view !== 'cards' && (
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

        <div className="flex items-center gap-4">
          {/* 부스 생성 — Super/Master(booth.create) 만. Booth 역할은 이 페이지에서 자기
              부스만 다루므로 버튼이 렌더되지 않는다. */}
          {can('booth.create') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-ds-primary-pressed transition-colors duration-200"
            >
              <Plus size={18} />
              부스 생성
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">부스 운영 ON/OFF</span>
            <button
              onClick={() => setPendingReservable(!isReservable)}
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
      </div>

      {view === 'cards' && (
        <BoothStatusCards
          boothInfoCompleted={boothInfoCompleted}
          onOpenBoothInfo={() => setView('booth-info')}
          isFoodBooth={booth.isFood}
          menuCompleted={menuCompleted}
          onOpenMenuList={() => setView('menu')}
        />
      )}

      {view === 'booth-info' && (
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

      {view === 'menu' && <MenuListForm boothId={booth.id} />}

      {can('booth.create') && <BoothCreateForm open={createOpen} onOpenChange={setCreateOpen} />}

      <AlertDialog
        open={pendingReservable !== null}
        onOpenChange={(o) => {
          if (!o) setPendingReservable(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              부스 운영을 {pendingReservable ? '켜시겠어요' : '끄시겠어요'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReservable
                ? '부스 운영을 켜면 방문객이 예약을 접수할 수 있게 됩니다.'
                : '부스 운영을 끄면 방문객의 예약 접수가 중단됩니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingReservable;
                if (target === null) return;
                // 전용 엔드포인트로 즉시 저장 — 성공 시 캐시 갱신 → 토글이 따라 움직인다.
                setReservable.mutate(
                  { id: booth.id, isReservable: target },
                  {
                    onSuccess: () =>
                      toast.success(target ? '부스 운영을 켰습니다.' : '부스 운영을 껐습니다.'),
                    onError: () => toast.error('부스 운영 상태 변경에 실패했습니다.'),
                  },
                );
              }}
            >
              {pendingReservable ? '운영 켜기' : '운영 끄기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
