// src/pages/booth-layout-edit.tsx
import { Map } from 'lucide-react';
import { PlacementEditor } from '@/features/booth-layout/components/placement-editor';

export function BoothLayoutEditPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-4">
        <Map size={28} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">부스 좌표 편집</h1>
          <p className="text-xs text-muted-foreground">
            지도 위에 자리를 찍어 좌표 데이터를 만듭니다. JSON Export 로 백엔드 시드용 파일을 받을 수 있습니다.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <PlacementEditor />
      </div>
    </div>
  );
}
