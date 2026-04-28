import { Map } from 'lucide-react';
import { PlacementEditor } from '@/features/booth-layout/components/placement-editor';
import { useBooths } from '@/features/booths/hooks';

export function BoothLayoutPage() {
  const boothsQuery = useBooths();
  const booths = boothsQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 배치도 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을 수 있습니다.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
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
