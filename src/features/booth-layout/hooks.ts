import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMapLocation,
  deleteMapLocation,
  listMapLocations,
  updateMapLocation,
  type CreateMapLocationInput,
  type UpdateMapLocationPatch,
} from './api';

const KEY = ['map-locations'] as const;

/** BOOTH 타입 MapLocation 전체 조회. */
export function useMapLocations() {
  return useQuery({
    queryKey: KEY,
    queryFn: listMapLocations,
  });
}

export function useCreateMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMapLocationInput) => createMapLocation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; patch: UpdateMapLocationPatch }) =>
      updateMapLocation(vars.id, vars.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMapLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMapLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
