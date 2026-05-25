import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';

/**
 * 오프라인 배너 — 네트워크가 끊기면 상단에 고정 표시.
 *
 * 약전파 행사장에서 화면이 비거나 멈춘 게 버그가 아니라 "네트워크 끊김 +
 * 마지막으로 불러온 데이터를 표시 중"임을 운영진이 바로 알 수 있게 한다.
 * 온라인 여부는 TanStack onlineManager(쿼리 자동 pause/resume 와 동일 소스)를
 * 구독해, 쿼리 동작과 표시가 어긋나지 않도록 한다.
 */
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true, // 초기 렌더는 온라인으로 가정 (깜빡임 방지)
  );

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-ds-warning-subtle px-4 py-2 text-sm font-medium text-ds-warning-pressed shadow-sm"
    >
      <WifiOff size={16} aria-hidden="true" />
      오프라인 — 마지막으로 불러온 데이터를 표시 중입니다
    </div>
  );
}
