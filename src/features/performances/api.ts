import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockPerformanceDetails, mockPerformanceDetailsById } from '@/mocks/performances';
import { fromPerformanceDetailPatch, toPerformanceDetail, toPerformanceListItem } from './mapper';
import type {
  PerformanceDetail,
  PerformanceDetailDTO,
  PerformanceListItem,
  PerformanceListItemDTO,
} from './types';

// ---- Mock 구현 ----
// 상세 mock 을 가공해 리스트 아이템을 파생. 네트워크 지연을 흉내내 스켈레톤·로딩 상태 검증.

async function listPerformancesMock(): Promise<PerformanceListItem[]> {
  await new Promise((r) => setTimeout(r, 200));
  return mockPerformanceDetails.map((p) => ({
    teamId: p.teamId,
    teamName: p.teamName,
    date: p.date,
    stage: p.stage,
    startTime: p.startTime,
    endTime: p.endTime,
    mainPhotoUrl: p.images.find((img) => img.isMain)?.url ?? null,
  }));
}

async function getPerformanceMock(teamId: number): Promise<PerformanceDetail | null> {
  await new Promise((r) => setTimeout(r, 150));
  return mockPerformanceDetailsById[teamId] ?? null;
}

async function getMyPerformanceMock(): Promise<PerformanceDetail | null> {
  await new Promise((r) => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Performer' || user.performanceTeamId == null) return null;
  return mockPerformanceDetailsById[user.performanceTeamId] ?? null;
}

/**
 * mock 구현은 in-memory 사전에 직접 머지해 같은 세션 동안 수정사항이 살아있게 한다.
 * 실제 백엔드 결정 전까지의 임시 — refetch 로 다시 mockPerformanceDetailsById 에서 읽으면
 * 같은 데이터를 받게 됨.
 */
async function updatePerformanceMock(
  teamId: number,
  patch: Partial<PerformanceDetail>,
): Promise<PerformanceDetail> {
  await new Promise((r) => setTimeout(r, 200));
  const existing = mockPerformanceDetailsById[teamId];
  if (!existing) {
    throw new Error(`mock: performance team ${teamId} not found`);
  }
  const next = { ...existing, ...patch, teamId };
  mockPerformanceDetailsById[teamId] = next;
  return next;
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

async function updatePerformanceReal(
  teamId: number,
  patch: Partial<PerformanceDetail>,
): Promise<PerformanceDetail> {
  // 백엔드 DTO 는 snake_case 라 camelCase Partial 을 그대로 보내면 필드가 무시될 수 있음.
  // mapper 의 fromPerformanceDetailPatch 로 전송된 필드만 snake_case 로 매핑.
  const dto = await api.put<PerformanceDetailDTO>(
    `/performances/${teamId}`,
    fromPerformanceDetailPatch(patch),
  );
  return toPerformanceDetail(dto);
}

// ---- 분기 export ----

export const listPerformances = env.USE_MOCK ? listPerformancesMock : listPerformancesReal;
export const getPerformance = env.USE_MOCK ? getPerformanceMock : getPerformanceReal;
export const getMyPerformance = env.USE_MOCK ? getMyPerformanceMock : getMyPerformanceReal;
export const updatePerformance = env.USE_MOCK ? updatePerformanceMock : updatePerformanceReal;
