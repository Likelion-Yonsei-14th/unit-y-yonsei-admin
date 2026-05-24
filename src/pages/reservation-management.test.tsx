// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Booth } from '@/features/booths/types';
import type { Reservation } from '@/features/reservations/types';

/**
 * 예약 관리 페이지 통합 테스트.
 *
 * 페이지가 의존하는 4개 훅(useBoothReservations / useNewReservationAlert /
 * useSetReservationStatus / useSetReservationsStatusBulk + useBooths + useAuth)
 * 을 모두 모킹한다. 페이지 자체의 로직(필터/검색/모달/상태 전이 호출)을 검증
 * 하는 게 목적이라 hooks 의 실제 동작은 별도 hooks.test 가 담당.
 */

// 페이지 import 보다 먼저 hoisted — vitest 가 vi.mock 을 import 위로 옮긴다.
vi.mock('@/features/reservations/hooks', () => ({
  useBoothReservations: vi.fn(),
  useNewReservationAlert: vi.fn(),
  useSetReservationStatus: vi.fn(),
  useSetReservationsStatusBulk: vi.fn(),
}));
vi.mock('@/features/booths/hooks', () => ({
  useBooths: vi.fn(),
  useSetBoothReservable: vi.fn(),
}));
vi.mock('@/features/auth/hooks', () => ({
  useAuth: vi.fn(),
}));

import * as reservationsHooks from '@/features/reservations/hooks';
import * as boothsHooks from '@/features/booths/hooks';
import * as authHooks from '@/features/auth/hooks';
import { ReservationManagement } from '@/pages/reservation-management';

const setStatusMutate = vi.fn();
const setStatusBulkMutate = vi.fn();
const setReservableMutate = vi.fn();

const booth: Booth = {
  id: 1,
  adminId: 1,
  name: 'Test Booth',
  organization: 'Test Org',
  description: '',
  date: 3,
  openTime: '17:00',
  closeTime: '22:00',
  sector: '백양로',
  location: 1,
  status: 'OPEN',
  isFood: false,
  isFoodTruck: false,
  instagram: '',
  isReservable: true,
  account: '',
  notice: null,
  locationId: null,
  profileComplete: true,
  representativeMenus: [],
  waitingCount: 0,
  thumbnailUrl: null,
  tags: [],
};

const res = (id: string, override: Partial<Reservation> = {}): Reservation => ({
  id,
  boothId: 1,
  reservationNumber: Number(id.replace(/\D/g, '')) || 1,
  name: id,
  people: 1,
  contact: '010-0000-0000',
  status: 'waiting',
  ...override,
});

const defaultReservations: Reservation[] = [
  res('R1', { reservationNumber: 1, name: '김철수', people: 4, status: 'waiting' }),
  res('R2', { reservationNumber: 2, name: '이영희', people: 2, status: 'completed' }),
  res('R3', { reservationNumber: 3, name: '박민수', people: 3, status: 'cancelled' }),
];

let currentReservations: Reservation[] = defaultReservations;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reservations/1']}>
        <Routes>
          <Route path="/reservations/:boothId" element={<ReservationManagement />} />
          <Route path="/reservations" element={<div>picker-fallback</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setStatusMutate.mockReset();
  setStatusBulkMutate.mockReset();
  setReservableMutate.mockReset();
  currentReservations = defaultReservations;

  // 페이지가 hook 을 호출할 때 mock 이 정의된 객체를 반환하도록 set.
  vi.mocked(reservationsHooks.useBoothReservations).mockImplementation(
    () =>
      ({
        data: currentReservations,
        isLoading: false,
        isError: false,
        isSuccess: true,
        refetch: vi.fn(),
      }) as unknown as ReturnType<typeof reservationsHooks.useBoothReservations>,
  );
  vi.mocked(reservationsHooks.useNewReservationAlert).mockReturnValue(undefined);
  vi.mocked(reservationsHooks.useSetReservationStatus).mockReturnValue({
    mutate: setStatusMutate,
    isPending: false,
  } as unknown as ReturnType<typeof reservationsHooks.useSetReservationStatus>);
  vi.mocked(reservationsHooks.useSetReservationsStatusBulk).mockReturnValue({
    mutate: setStatusBulkMutate,
    isPending: false,
  } as unknown as ReturnType<typeof reservationsHooks.useSetReservationsStatusBulk>);

  vi.mocked(boothsHooks.useBooths).mockReturnValue({
    data: [booth],
  } as unknown as ReturnType<typeof boothsHooks.useBooths>);
  vi.mocked(boothsHooks.useSetBoothReservable).mockReturnValue({
    mutate: setReservableMutate,
    isPending: false,
  } as unknown as ReturnType<typeof boothsHooks.useSetBoothReservable>);

  // Super 계정 — Booth 가드를 통과(자기 부스 외 접근 가능).
  vi.mocked(authHooks.useAuth).mockReturnValue({
    user: {
      id: 1,
      userId: 'super',
      role: 'Super',
      name: '슈퍼어드민',
      boothId: null,
      performanceTeamId: null,
    },
    isAuthenticated: true,
    isInitializing: false,
    can: () => true,
    canEditBooth: () => true,
    canEditPerformance: () => true,
    role: 'Super',
  } as unknown as ReturnType<typeof authHooks.useAuth>);
});

describe('ReservationManagement', () => {
  it('초기 진입 시 "대기자 목록" 탭이 기본이라 waiting 예약만 노출된다', () => {
    renderPage();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.queryByText('이영희')).not.toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('"완료 목록" 필터 클릭 시 completed 예약만 노출된다', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /완료 목록/ }));
    expect(screen.queryByText('김철수')).not.toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('검색어로 신청자명을 필터링한다', () => {
    currentReservations = [
      res('R1', { reservationNumber: 1, name: '김철수', status: 'waiting' }),
      res('R2', { reservationNumber: 2, name: '김영희', status: 'waiting' }),
      res('R3', { reservationNumber: 3, name: '박민수', status: 'waiting' }),
    ];
    renderPage();
    fireEvent.change(screen.getByLabelText('예약 검색'), { target: { value: '김' } });
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('김영희')).toBeInTheDocument();
    expect(screen.queryByText('박민수')).not.toBeInTheDocument();
  });

  it('행 클릭 시 상세 다이얼로그가 열린다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /김철수 예약 상세 보기/ }));
    expect(await screen.findByText('예약 상세 정보')).toBeInTheDocument();
  });

  it('상세 다이얼로그의 "입장" 버튼은 setReservationStatus(completed) 를 호출한다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /김철수 예약 상세 보기/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^입장$/ }));
    expect(setStatusMutate).toHaveBeenCalledWith(
      { id: 'R1', status: 'completed' },
      expect.anything(),
    );
  });

  it('"취소" → 확인 AlertDialog → "취소 확정" 흐름이 cancelled 로 mutation 을 호출한다', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /김철수 예약 상세 보기/ }));
    // 상세 모달의 "취소" 버튼 (인접 아이콘만 있는 case 대비 정확한 이름 매칭).
    fireEvent.click(await screen.findByRole('button', { name: /^취소$/ }));
    // AlertDialog 열림 확인.
    expect(await screen.findByText('예약 취소')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /취소 확정/ }));
    await waitFor(() =>
      expect(setStatusMutate).toHaveBeenCalledWith(
        { id: 'R1', status: 'cancelled' },
        expect.anything(),
      ),
    );
  });

  it('regression: "예약 시간" 컬럼 헤더는 더 이상 렌더되지 않는다', () => {
    renderPage();
    expect(screen.queryByText('예약 시간')).not.toBeInTheDocument();
  });

  it('regression: 예약 가능 토글 → 확인 다이얼로그 → setBoothReservable 로 저장한다 (로컬 state 만 바뀌던 버그)', async () => {
    // booth.isReservable=true 로 시작하므로 토글은 ON. 클릭하면 OFF 로 끄려는 확인을 먼저 받는다.
    renderPage();
    fireEvent.click(screen.getByRole('switch'));
    expect(await screen.findByText('예약 받기를 끄시겠어요?')).toBeInTheDocument();
    // 확인 전에는 아직 mutation 이 호출되면 안 된다(다이얼로그가 게이트).
    expect(setReservableMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '예약 받기 끄기' }));
    await waitFor(() =>
      expect(setReservableMutate).toHaveBeenCalledWith(
        { id: 1, isReservable: false },
        expect.anything(),
      ),
    );
  });

  it('regression: 대기 번호는 reservationNumber 오름차순으로 매겨진다', () => {
    currentReservations = [
      res('A', { reservationNumber: 5, name: 'late' }),
      res('B', { reservationNumber: 3, name: 'early' }),
    ];
    renderPage();
    const earlyRow = screen.getByText('early').closest('tr');
    const lateRow = screen.getByText('late').closest('tr');
    expect(earlyRow).not.toBeNull();
    expect(lateRow).not.toBeNull();
    expect(within(earlyRow!).getByText(/대기 1번/)).toBeInTheDocument();
    expect(within(lateRow!).getByText(/대기 2번/)).toBeInTheDocument();
  });
});
