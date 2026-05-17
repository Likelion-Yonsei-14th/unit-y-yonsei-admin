// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useNewReservationAlert } from './hooks';
import type { Reservation } from './types';

// Regression: ISSUE-001 — 예약 관리 페이지 첫 진입 시 기존 예약 전부를
// "새 예약 N건"으로 오인해 가짜 토스트가 떴다.
// Found by /qa on 2026-05-17
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-05-17.md
// 원인: 첫-로드 스킵이 "첫 렌더"를 스킵했는데 그 렌더는 쿼리 로딩 중
// (reservations=[]) 이라, 빈 배열이 기준 집합이 되고 실제 데이터 도착 시
// 전부 신규로 잡혔다. ready(쿼리 첫 응답 완료) 전에는 기준을 잡지 않도록 수정.

vi.mock('sonner', () => ({ toast: vi.fn() }));

const res = (id: string, status: Reservation['status'] = 'waiting'): Reservation => ({
  id,
  boothId: 1,
  time: '',
  name: id,
  people: 1,
  contact: '010-0000-0000',
  status,
});

describe('useNewReservationAlert', () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
  });

  it('쿼리 로딩(ready=false) 중 빈 배열은 기준이 되지 않고, 첫 응답 데이터에 토스트하지 않는다', () => {
    const noop = () => {};
    const { rerender } = renderHook(
      ({ data, ready }: { data: Reservation[]; ready: boolean }) =>
        useNewReservationAlert(data, 1, ready, noop),
      { initialProps: { data: [] as Reservation[], ready: false } },
    );
    // 쿼리 응답 도착: ready=true 로 전환되며 기존 예약 6건이 한 번에 들어온다.
    rerender({
      data: [res('A'), res('B'), res('C'), res('D'), res('E'), res('F')],
      ready: true,
    });
    expect(toast).not.toHaveBeenCalled();
  });

  it('기준 집합 설정 후 새로 등장한 PENDING 예약은 토스트한다', () => {
    const noop = () => {};
    const { rerender } = renderHook(
      ({ data }: { data: Reservation[] }) => useNewReservationAlert(data, 1, true, noop),
      { initialProps: { data: [res('A')] as Reservation[] } },
    );
    expect(toast).not.toHaveBeenCalled(); // 첫 채움 — 기준 집합만 설정
    rerender({ data: [res('A'), res('B')] }); // B 가 신규 도착
    expect(toast).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(toast).mock.calls[0][0])).toContain('새 예약 1건');
  });
});
