import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 타입 ──────────────────────────────────────────────────────────────

export interface VehicleDto {
  vehId: string;
  vehNm: string;
  vehNo: string;
  vehSe: string | null;
  deptCd: string | null;
}

export interface VehicleReservationDto {
  vehId: string;
  rsvSn: number;
  userId: string;
  userNm: string;
  rsvStYmd: string;    // YYYYMMDD
  rsvStHhmm: string;   // HHMM
  rsvEndYmd: string;
  rsvEndHhmm: string;
  rmk: string | null;
  mine: boolean;
  // 반납
  rtnYn: string;         // 'Y' | 'N'
  rtnYmd: string | null;
  rtnHhmm: string | null;
  rtnPlc: string | null;
  // 연장
  extYn: string;         // 'Y' | 'N'
  extYmd: string | null;
  extHhmm: string | null;
}

export interface CreateVehicleReservationRequest {
  rsvStYmd: string;
  rsvStHhmm: string;
  rsvEndYmd: string;
  rsvEndHhmm: string;
  rmk?: string;
}

export interface ReturnVehicleRequest {
  rtnYmd: string;
  rtnHhmm: string;
  rtnPlc?: string;
}

export interface ExtendReservationRequest {
  newEndYmd: string;
  newEndHhmm: string;
}

// ─── API 함수 ──────────────────────────────────────────────────────────

const vehicleApi = {
  getVehicles: (): Promise<VehicleDto[]> =>
    apiClient.get('/api/vehicles').then((r) => r.data?.data ?? []),

  getReservations: (date: string): Promise<VehicleReservationDto[]> =>
    apiClient
      .get('/api/vehicles/reservations', { params: { date } })
      .then((r) => r.data?.data ?? []),

  create: ({
    vehId,
    data,
  }: {
    vehId: string;
    data: CreateVehicleReservationRequest;
  }): Promise<VehicleReservationDto> =>
    apiClient.post(`/api/vehicles/${vehId}/reservations`, data).then((r) => r.data.data),

  cancel: ({ vehId, rsvSn }: { vehId: string; rsvSn: number }): Promise<void> =>
    apiClient.delete(`/api/vehicles/${vehId}/reservations/${rsvSn}`).then((r) => r.data),

  doReturn: ({
    vehId,
    rsvSn,
    data,
  }: {
    vehId: string;
    rsvSn: number;
    data: ReturnVehicleRequest;
  }): Promise<VehicleReservationDto> =>
    apiClient
      .patch(`/api/vehicles/${vehId}/reservations/${rsvSn}/return`, data)
      .then((r) => r.data.data),

  extend: ({
    vehId,
    rsvSn,
    data,
  }: {
    vehId: string;
    rsvSn: number;
    data: ExtendReservationRequest;
  }): Promise<VehicleReservationDto> =>
    apiClient
      .patch(`/api/vehicles/${vehId}/reservations/${rsvSn}/extend`, data)
      .then((r) => r.data.data),
};

// ─── React Query 훅 ────────────────────────────────────────────────────

export const useVehicles = () =>
  useQuery<VehicleDto[]>({
    queryKey: ['vehicles'],
    queryFn: vehicleApi.getVehicles,
    staleTime: 1000 * 60 * 5,
  });

export const useVehicleReservations = (date: string) =>
  useQuery<VehicleReservationDto[]>({
    queryKey: ['vehicle-reservations', date],
    queryFn: () => vehicleApi.getReservations(date),
    enabled: !!date,
  });

export const useCreateVehicleReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-reservations'] }),
  });
};

export const useCancelVehicleReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-reservations'] }),
  });
};

export const useReturnVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.doReturn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-reservations'] }),
  });
};

export const useExtendReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.extend,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-reservations'] }),
  });
};
