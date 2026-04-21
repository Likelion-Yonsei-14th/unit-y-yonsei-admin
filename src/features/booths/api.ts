import { api } from '@/lib/api-client';
import { env } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store';
import { mockBoothsById } from '@/mocks/booth-profile';
import { toBoothProfile } from './mapper';
import type { BoothProfile, BoothProfileDTO } from './types';

// ---- Mock 구현 ----
// Booth 역할 사용자의 booth_id에 해당하는 mock 프로필 반환.
// Super/Master는 이 훅 대신 다른 경로로 조회해야 함 (아직 미구현).

async function getMyBoothProfileMock(): Promise<BoothProfile | null> {
  await new Promise(r => setTimeout(r, 150));
  const user = useAuthStore.getState().user;
  if (!user || user.role !== 'Booth' || user.boothId == null) return null;
  return mockBoothsById[user.boothId] ?? null;
}

// ---- 실제 구현 ----

async function getMyBoothProfileReal(): Promise<BoothProfile | null> {
  const dto = await api.get<BoothProfileDTO>('/booths/me');
  return toBoothProfile(dto);
}

// ---- 분기 export ----

export const getMyBoothProfile = env.USE_MOCK ? getMyBoothProfileMock : getMyBoothProfileReal;
