// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Reservation } from './types';
import { useSetReservationStatus, useSetReservationsStatusBulk } from './hooks';
import * as api from './api';

// 훅이 import 하는 api 모듈을 통째로 spy 로 대체.
// hooks.ts 가 named import 로 잡는 순간 mock 이 바인딩된다.
vi.mock('./api', () => ({
  setReservationStatus: vi.fn(),
  setReservationsStatusBulk: vi.fn(),
  listBoothReservations: vi.fn(),
  getReservationSummary: vi.fn(),
}));

const res = (id: string, status: Reservation['status'] = 'waiting'): Reservation => ({
  id,
  boothId: 1,
  reservationNumber: 1,
  name: id,
  people: 1,
  contact: '010-0000-0000',
  status,
});

/** 각 테스트마다 새 QueryClient — invalidate 가 다른 테스트에 새지 않도록. */
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  vi.mocked(api.setReservationStatus).mockReset();
  vi.mocked(api.setReservationsStatusBulk).mockReset();
});

describe('useSetReservationStatus', () => {
  it('mutate 시 api.setReservationStatus 를 입력 그대로 호출한다', async () => {
    vi.mocked(api.setReservationStatus).mockResolvedValue(res('R1', 'completed'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSetReservationStatus(), { wrapper });
    await act(async () => {
      result.current.mutate({ id: 'R1', status: 'completed' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // TanStack Query v5 는 mutationFn 을 (variables, context) 2-arg 로 호출하므로
    // 두 번째 인자는 context 객체. 첫 번째만 단언.
    expect(api.setReservationStatus).toHaveBeenCalledWith(
      { id: 'R1', status: 'completed' },
      expect.anything(),
    );
    expect(result.current.data).toEqual(res('R1', 'completed'));
  });

  it('성공 시 reservations 쿼리들이 invalidate 되어 stale 표시된다', async () => {
    vi.mocked(api.setReservationStatus).mockResolvedValue(res('R1', 'completed'));
    const { queryClient, wrapper } = makeWrapper();

    // 사전: ['reservations', 1] 쿼리 캐시를 신선 상태로 세팅.
    queryClient.setQueryData(['reservations', 1], [res('R1')]);
    expect(queryClient.getQueryState(['reservations', 1])?.isInvalidated).toBe(false);

    const { result } = renderHook(() => useSetReservationStatus(), { wrapper });
    await act(async () => {
      result.current.mutate({ id: 'R1', status: 'completed' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(['reservations', 1])?.isInvalidated).toBe(true);
  });

  it('api 에러는 mutation.isError 로 전파된다', async () => {
    vi.mocked(api.setReservationStatus).mockRejectedValue(new Error('network'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSetReservationStatus(), { wrapper });
    await act(async () => {
      result.current.mutate({ id: 'R1', status: 'completed' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSetReservationsStatusBulk', () => {
  it('mutate 시 다건 id 와 status 를 한 번에 전달한다', async () => {
    vi.mocked(api.setReservationsStatusBulk).mockResolvedValue([
      res('R1', 'cancelled'),
      res('R2', 'cancelled'),
    ]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useSetReservationsStatusBulk(), { wrapper });
    await act(async () => {
      result.current.mutate({ ids: ['R1', 'R2'], status: 'cancelled' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.setReservationsStatusBulk).toHaveBeenCalledWith(
      { ids: ['R1', 'R2'], status: 'cancelled' },
      expect.anything(),
    );
    expect(result.current.data).toHaveLength(2);
  });
});
