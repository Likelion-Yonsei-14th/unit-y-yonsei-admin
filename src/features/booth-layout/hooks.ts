// src/features/booth-layout/hooks.ts (전체)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  copyPlacements,
  createPlacement,
  deletePlacement,
  getPlacementsByBoothId,
  listPlacements,
  resetSection,
  updatePlacement,
  type CopyPlacementsInput,
  type CreatePlacementInput,
} from './api';
import type { BoothPlacement, MapSectionId } from './types';

/** 특정 날짜에 배치된 부스 목록 조회. */
export function usePlacements(date: string) {
  return useQuery({
    queryKey: ['booth-placements', date],
    queryFn: () => listPlacements(date),
    enabled: !!date,
  });
}

/**
 * 한 운영자(booth account) 의 모든 자리 조회.
 * 자리가 여러 개 가능 — array 반환.
 */
export function useMyBoothPlacements(boothId: number | null) {
  return useQuery({
    queryKey: ['booth-placement', 'by-booth', boothId],
    queryFn: () => getPlacementsByBoothId(boothId!),
    enabled: boothId != null,
  });
}

// ---- mutations ----

export function useCreatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) => createPlacement(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', created.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', created.boothId] });
    },
  });
}

export function useUpdatePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (placement: BoothPlacement) => updatePlacement(placement),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', updated.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', updated.boothId] });
    },
  });
}

export function useDeletePlacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string; boothId: number }) =>
      deletePlacement(vars.id).then(() => vars),
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.date] });
      qc.invalidateQueries({ queryKey: ['booth-placement', 'by-booth', vars.boothId] });
    },
  });
}

export function useCopyPlacements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyPlacementsInput) => copyPlacements(input),
    onSuccess: (_created, vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.fromDate] });
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.toDate] });
    },
  });
}

export function useResetSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { date: string; section: MapSectionId }) =>
      resetSection(vars.date, vars.section).then(() => vars),
    onSuccess: (vars) => {
      qc.invalidateQueries({ queryKey: ['booth-placements', vars.date] });
    },
  });
}
