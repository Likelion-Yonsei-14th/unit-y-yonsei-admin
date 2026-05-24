/**
 * 시스템 상태(System) 도메인 — 백엔드 /api/admin/system/* 응답 미러.
 *
 * 이 API 는 다른 도메인과 달리 응답이 **이미 camelCase** 라 DTO↔Model 변환이
 * 거의 항등이다. 그래도 레이어 일관성을 위해 DTO/Model 을 분리하고, mapper 는
 * 파생 표시값(0~1 비율 → 퍼센트) 정규화 전용으로 둔다.
 *
 * ⚠️ 모든 수치 필드는 해당 메트릭이 없으면 null(부분 실패 허용) — 모델에서도
 * null 을 지우지 말 것. null 을 0 으로 떨어뜨리면 "정상"으로 오독된다.
 */

/** 백엔드 Spring Actuator health status. */
export type SystemStatus = 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN';

// ---- DTO (백엔드 응답 그대로) ----

export interface HeapDTO {
  usedBytes: number | null;
  maxBytes: number | null;
  /** 0~1. */
  usedRatio: number | null;
}

export interface DbPoolDTO {
  active: number | null;
  idle: number | null;
  pending: number | null;
  max: number | null;
}

export interface SystemHealthDTO {
  status: SystemStatus;
  version: string | null;
  uptimeSeconds: number | null;
  heap: HeapDTO;
  dbPool: DbPoolDTO;
  liveThreads: number | null;
  /** 0~1. */
  cpuUsage: number | null;
}

export interface ErrorLogEntryDTO {
  /** ISO-8601 LocalDateTime — **타임존 없음**(예 "2026-05-25T02:10:01.056"). */
  timestamp: string;
  /** 항상 "ERROR". */
  level: string;
  logger: string;
  message: string;
  /** "예외클래스명: 메시지" 또는 null. */
  throwable: string | null;
}

export interface ActiveAlertDTO {
  fingerprint: string;
  /** Grafana alertname. */
  name: string;
  /** "critical" | "high" | "medium" ... 자유 문자열. */
  severity: string;
  /** Grafana annotation summary. */
  summary: string;
  /** ISO-8601 — Grafana 가 보낸 값, **오프셋/Z 포함**. */
  startsAt: string;
}

// ---- 프론트 모델 ----

/** heap 사용량. usedRatio 를 percent(0~100 정수)로 정규화. */
export interface HeapUsage {
  usedBytes: number | null;
  maxBytes: number | null;
  percent: number | null;
}

export interface SystemHealth {
  status: SystemStatus;
  version: string | null;
  uptimeSeconds: number | null;
  heap: HeapUsage;
  dbPool: DbPoolDTO;
  liveThreads: number | null;
  /** 0~100 정수. cpuUsage 를 퍼센트로 정규화. */
  cpuPercent: number | null;
}

/** 에러 로그·알림은 변환할 게 없어 DTO 를 그대로 모델로 쓴다. */
export type ErrorLogEntry = ErrorLogEntryDTO;
export type ActiveAlert = ActiveAlertDTO;
