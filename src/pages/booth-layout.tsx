import { Map } from 'lucide-react';
import { PlacementEditor } from '@/features/booth-layout/components/placement-editor';
import { useBooths } from '@/features/booths/hooks';

export function BoothLayoutPage() {
  const boothsQuery = useBooths();
  const booths = boothsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-4 md:px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 배치도 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을
            수 있습니다.
          </p>
        </div>
      </header>

      {/* 데스크톱 전용 안내 (가로 1024px 미만) — 좌표 편집기는 캔버스 + DnD + zoom-pan
          이 본질이라 좁은 폭에선 핀이 16px 미만으로 줄어 가독성·정확성이 동시에 깨짐.
          모바일 폴리시 대신 명시적으로 차단. */}
      <div className="lg:hidden flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm rounded-2xl border border-border bg-muted p-6 text-center">
          <Map size={32} className="mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground mb-2">
            데스크톱에서 사용해주세요
          </h2>
          <p className="text-sm text-muted-foreground">
            부스 배치 편집기는 좌표·드래그·확대축소가 정확해야 하는 작업이라 가로 1024px 이상에서
            동작합니다.
          </p>
        </div>
      </div>

      {/* lg 이상에서만 편집기 마운트. flex-col 로 둬서 자식의 h-full 캐스케이드가
          끊기지 않도록 — block 이면 자식 height 100% 가 정확히 평가되지 않아
          PlacementEditor 가 content-height 로 부풀어 페이지 자체가 스크롤되는
          현상이 생긴다. */}
      <div className="hidden lg:flex flex-1 flex-col min-h-0 overflow-hidden">
        {boothsQuery.isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">불러오는 중...</div>
        ) : boothsQuery.isError ? (
          <div className="flex flex-col items-start gap-3 p-8 text-sm">
            <div className="text-destructive">운영자 목록을 불러오지 못했습니다.</div>
            <button
              type="button"
              onClick={() => boothsQuery.refetch()}
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:border-ds-border-strong"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <PlacementEditor booths={booths} />
        )}
      </div>
    </div>
  );
}
