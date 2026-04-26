// src/pages/booth-layout-edit.tsx
import { Map } from 'lucide-react';

export function BoothLayoutEditPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-background px-8 py-6">
        <Map size={32} />
        <h1 className="text-3xl font-bold text-foreground">부스 좌표 편집</h1>
      </header>
      <main className="flex-1 p-8 text-muted-foreground">
        편집기 UI (구현 예정).
      </main>
    </div>
  );
}
