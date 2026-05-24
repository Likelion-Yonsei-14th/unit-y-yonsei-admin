import type { ActiveAlertDTO, ErrorLogEntryDTO, SystemHealthDTO } from '@/features/system/types';

/**
 * 시스템 상태 mock 픽스처.
 * `super` 로그인 시 페이지가 끝까지 채워지도록(QA용) 정상 스냅샷 + 에러 몇 건 +
 * 빈 알림(=무사고)을 둔다. 실제 백엔드 응답 형태를 그대로 흉내.
 */
export const mockSystemHealth: SystemHealthDTO = {
  status: 'UP',
  version: '0.7.0',
  uptimeSeconds: 38211,
  heap: { usedBytes: 268435456, maxBytes: 1073741824, usedRatio: 0.25 },
  dbPool: { active: 2, idle: 8, pending: 0, max: 10 },
  liveThreads: 42,
  cpuUsage: 0.13,
};

export const mockErrorLogs: ErrorLogEntryDTO[] = [
  {
    timestamp: '2026-05-25T02:10:01.056',
    level: 'ERROR',
    logger: 'c.l.y.d.domain.booth.BoothService',
    message: '부스 좌표 갱신 중 낙관적 락 충돌',
    throwable: 'org.springframework.orm.ObjectOptimisticLockingFailureException: row was updated',
  },
  {
    timestamp: '2026-05-25T01:47:33.910',
    level: 'ERROR',
    logger: 'c.l.y.d.domain.image.ImageUploadService',
    message: 'presigned URL 발급 실패 — S3 응답 지연',
    throwable: 'java.util.concurrent.TimeoutException: presign timed out after 3000ms',
  },
  {
    timestamp: '2026-05-25T00:12:08.221',
    level: 'ERROR',
    logger: 'c.l.y.d.domain.reservation.ReservationService',
    message: '예약 생성 중 알 수 없는 오류',
    throwable: null,
  },
];

/** 빈 배열 = 활성 알림 없음(정상). Grafana 웹훅이 들어오면 채워짐. */
export const mockActiveAlerts: ActiveAlertDTO[] = [];
