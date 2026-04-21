import { create } from 'zustand';
import type { CurrentUser } from './types';

interface AuthState {
  user: CurrentUser | null;
  /** 앱 시작 시 /me 요청 중 여부 */
  isInitializing: boolean;
  setUser: (user: CurrentUser | null) => void;
  setInitializing: (b: boolean) => void;
}

/**
 * 인증 상태 저장소.
 *
 * - React Query의 useQuery로 /me를 받아와서 여기 set함.
 * - 사이드바, 가드 등 여러 곳에서 구독하므로 전역 스토어 필요.
 * - 로컬스토리지 동기화는 authStrategy가 담당 (여기서는 순수 메모리 상태만)
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  setUser: (user) => set({ user }),
  setInitializing: (b) => set({ isInitializing: b }),
}));
