import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockPerformanceDetails, mockPerformanceDetailsById } from '@/mocks/performances';
import { toPerformanceDetail, toPerformanceListItem } from './mapper';
import type {
  PerformanceDetail, PerformanceDetailDTO,
  PerformanceListItem, PerformanceListItemDTO,
} from './types';

// ---- Mock 구현 ----
// 상세 mock 을 가공해 리스트 아이템을 파생. 네트워크 지연을 흉내내 스켈레톤·로딩 상태 검증.

async function listPerformancesMock(): Promise<PerformanceListItem[]> {
  await new Promise(r => setTimeout(r, 200));
  return mockPerformanceDetails.map(p => ({
    teamId: p.teamId,
    teamName: p.teamName,
    date: p.date,
    stage: p.stage,
    startTime: p.startTime,
    endTime: p.endTime,
    mainPhotoUrl: p.images.find(img => img.isMain)?.url ?? null,
  }));
}

async function getPerformanceMock(teamId: number): Promise<PerformanceDetail | null> {
  await new Promise(r => setTimeout(r, 150));
  return mockPerformanceDetailsById[teamId] ?? null;
}

async function getMyPerformanceMock(): Promise<PerformanceDetail | null> {
  await new Promise(r => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Performer' || user.performanceTeamId == null) return null;
  return mockPerformanceDetailsById[user.performanceTeamId] ?? null;
}

// ---- 실제 구현 ----

async function listPerformancesReal(): Promise<PerformanceListItem[]> {
  const dtos = await api.get<PerformanceListItemDTO[]>('/performances');
  return dtos.map(toPerformanceListItem);
}

async function getPerformanceReal(teamId: number): Promise<PerformanceDetail | null> {
  const dto = await api.get<PerformanceDetailDTO>(`/performances/${teamId}`);
  return toPerformanceDetail(dto);
}

async function getMyPerformanceReal(): Promise<PerformanceDetail | null> {
  const dto = await api.get<PerformanceDetailDTO>('/performances/me');
  return toPerformanceDetail(dto);
}

// ---- 분기 export ----

export const listPerformances = env.USE_MOCK ? listPerformancesMock : listPerformancesReal;
export const getPerformance = env.USE_MOCK ? getPerformanceMock : getPerformanceReal;
export const getMyPerformance = env.USE_MOCK ? getMyPerformanceMock : getMyPerformanceReal;
