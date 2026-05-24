import type { SystemHealth, SystemHealthDTO } from './types';

/** 0~1 비율 → 0~100 정수 퍼센트. null 은 보존(표시단에서 "—"). */
const toPercent = (ratio: number | null): number | null =>
  ratio == null ? null : Math.round(ratio * 100);

export const toSystemHealth = (d: SystemHealthDTO): SystemHealth => ({
  status: d.status,
  version: d.version,
  uptimeSeconds: d.uptimeSeconds,
  heap: {
    usedBytes: d.heap?.usedBytes ?? null,
    maxBytes: d.heap?.maxBytes ?? null,
    percent: toPercent(d.heap?.usedRatio ?? null),
  },
  dbPool: {
    active: d.dbPool?.active ?? null,
    idle: d.dbPool?.idle ?? null,
    pending: d.dbPool?.pending ?? null,
    max: d.dbPool?.max ?? null,
  },
  liveThreads: d.liveThreads,
  cpuPercent: toPercent(d.cpuUsage),
});
