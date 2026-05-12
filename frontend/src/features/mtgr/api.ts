import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 타입 ──────────────────────────────────────────────────────────────

export interface MtgrDto {
  mtgrId: string;
  mtgrNm: string;
  mtgrPlc: string;
  mtgrSe: string | null;
  deptCd: string | null;
}

export interface MtgrReservationDto {
  mtgrId: string;
  rsvSn: number;
  userId: string;
  userNm: string;
  rsvStYmd: string;    // YYYYMMDD
  rsvStHhmm: string;   // HHMM
  rsvEndYmd: string;
  rsvEndHhmm: string;
  rmk: string | null;
  mine: boolean;
  // 연장
  extYn: string;         // 'Y' | 'N'
  extYmd: string | null;
  extHhmm: string | null;
}

export interface CreateMtgrReservationRequest {
  rsvStYmd: string;
  rsvStHhmm: string;
  rsvEndYmd: string;
  rsvEndHhmm: string;
  rmk?: string;
}

export interface ExtendMtgrReservationRequest {
  newEndYmd: string;
  newEndHhmm: string;
}

// ─── API 함수 ──────────────────────────────────────────────────────────

const mtgrApi = {
  getMtgrs: (): Promise<MtgrDto[]> =>
    apiClient.get('/api/mtgrs').then((r) => r.data?.data ?? []),

  getReservations: (date: string): Promise<MtgrReservationDto[]> =>
    apiClient
      .get('/api/mtgrs/reservations', { params: { date } })
      .then((r) => r.data?.data ?? []),

  create: ({
    mtgrId,
    data,
  }: {
    mtgrId: string;
    data: CreateMtgrReservationRequest;
  }): Promise<MtgrReservationDto> =>
    apiClient.post(`/api/mtgrs/${mtgrId}/reservations`, data).then((r) => r.data.data),

  cancel: ({ mtgrId, rsvSn }: { mtgrId: string; rsvSn: number }): Promise<void> =>
    apiClient.delete(`/api/mtgrs/${mtgrId}/reservations/${rsvSn}`).then((r) => r.data),

  extend: ({
    mtgrId,
    rsvSn,
    data,
  }: {
    mtgrId: string;
    rsvSn: number;
    data: ExtendMtgrReservationRequest;
  }): Promise<MtgrReservationDto> =>
    apiClient
      .patch(`/api/mtgrs/${mtgrId}/reservations/${rsvSn}/extend`, data)
      .then((r) => r.data.data),
};

// ─── React Query 훅 ────────────────────────────────────────────────────

export const useMtgrs = () =>
  useQuery<MtgrDto[]>({
    queryKey: ['mtgrs'],
    queryFn: mtgrApi.getMtgrs,
    staleTime: 1000 * 60 * 5,
  });

export const useMtgrReservations = (date: string) =>
  useQuery<MtgrReservationDto[]>({
    queryKey: ['mtgr-reservations', date],
    queryFn: () => mtgrApi.getReservations(date),
    enabled: !!date,
  });

export const useCreateMtgrReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtgrApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mtgr-reservations'] }),
  });
};

export const useCancelMtgrReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtgrApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mtgr-reservations'] }),
  });
};

export const useExtendMtgrReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mtgrApi.extend,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mtgr-reservations'] }),
  });
};
