import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';

/**
 * 오프라인 배너 — 네트워크가 끊기면 레이아웃 상단(흐름 내)에 표시된다.
 *
 * 약전파 행사장에서 화면이 비거나 멈춘 게 버그가 아니라 "네트워크 끊김 +
 * 마지막으로 불러온 데이터를 표시 중"임을 운영진이 바로 알 수 있게 한다.
 * 온라인 여부는 TanStack onlineManager(쿼리 자동 pause/resume 와 동일 소스)를
 * 구독한다. fixed 가 아니라 흐름 내 블록이라 상단 sticky 바를 가리지 않고,
 * 보이는 동안 콘텐츠를 아래로 민다(온라인이면 null → 레이아웃 영향 없음).
 */
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    // SSR getServerSnapshot — 이 앱은 CSR 전용이라 실제로 호출되진 않지만,
    // 추후 SSR/프리렌더 도입 시 클라이언트 스냅샷과 같은 값을 반환해
    // hydration mismatch 를 피하도록 onlineManager.isOnline() 으로 맞춰 둔다.
    () => onlineManager.isOnline(),
  );

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-ds-warning bg-ds-warning-subtle px-4 py-2 text-sm font-medium text-ds-warning-pressed"
    >
      <WifiOff size={16} aria-hidden="true" />
      오프라인 — 마지막으로 불러온 데이터를 표시 중입니다
    </div>
  );
}
