import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { mockActiveAlerts, mockErrorLogs, mockSystemHealth } from '@/mocks/system';
import { toSystemHealth } from './mapper';
import type {
  ActiveAlert,
  ActiveAlertDTO,
  ErrorLogEntry,
  ErrorLogEntryDTO,
  SystemHealth,
  SystemHealthDTO,
} from './types';

// ---- Mock ----

async function getSystemHealthMock(): Promise<SystemHealth> {
  await new Promise((r) => setTimeout(r, 120));
  return toSystemHealth(mockSystemHealth);
}

async function getErrorLogsMock(): Promise<ErrorLogEntry[]> {
  await new Promise((r) => setTimeout(r, 120));
  return mockErrorLogs;
}

async function getActiveAlertsMock(): Promise<ActiveAlert[]> {
  await new Promise((r) => setTimeout(r, 100));
  return mockActiveAlerts;
}

// ---- Real ----

async function getSystemHealthReal(): Promise<SystemHealth> {
  const dto = await api.get<SystemHealthDTO>('/admin/system/health');
  return toSystemHealth(dto);
}

async function getErrorLogsReal(): Promise<ErrorLogEntry[]> {
  // 응답이 이미 프론트 모델과 동일(camelCase) — 변환 없음.
  return api.get<ErrorLogEntryDTO[]>('/admin/system/errors');
}

async function getActiveAlertsReal(): Promise<ActiveAlert[]> {
  return api.get<ActiveAlertDTO[]>('/admin/system/alerts');
}

// ---- 분기 export ----

export const getSystemHealth = env.USE_MOCK ? getSystemHealthMock : getSystemHealthReal;
export const getErrorLogs = env.USE_MOCK ? getErrorLogsMock : getErrorLogsReal;
export const getActiveAlerts = env.USE_MOCK ? getActiveAlertsMock : getActiveAlertsReal;
