import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── MST ─────────────────────────────────────────────────────────────────────

export interface LeaveMstDto {
  leaveCd: string;
  leaveNm: string;
  dedYn: string;   // Y/N
  paidYn: string;  // Y/N
  useYn: string;   // Y/N
}

export interface MstCreateRequest {
  leaveCd: string;
  leaveNm: string;
  dedYn: string;
  paidYn: string;
  useYn?: string;
}

export interface MstUpdateRequest {
  leaveNm: string;
  dedYn: string;
  paidYn: string;
  useYn: string;
}

// ─── DTL ─────────────────────────────────────────────────────────────────────

export interface LeaveDtlDto {
  leaveCd: string;
  leaveDtlCd: string;
  leaveDtlNm: string | null;
  leaveDtlDesc: string | null;
  /** INT_COM_CODE UP_CD='LEAVE_SE': F(종일), H(반일) */
  leaveSe: string | null;
  useAvlDcnt: number | null;
  useYn: string;
}

export interface DtlCreateRequest {
  leaveCd: string;
  leaveDtlCd: string;
  leaveDtlNm?: string | null;
  leaveDtlDesc?: string | null;
  leaveSe?: string | null;
  useAvlDcnt?: number | null;
  useYn?: string;
}

export interface DtlUpdateRequest {
  leaveDtlNm?: string | null;
  leaveDtlDesc?: string | null;
  leaveSe?: string | null;
  useAvlDcnt?: number | null;
  useYn: string;
}

// ─── POL ─────────────────────────────────────────────────────────────────────

export interface LeavePolDto {
  leavePolCd: string;
  leavePolNm: string;
  leavePolDesc: string | null;
  polStMon: number | null;
  /** 마지막 구간은 999 */
  polEndMon: number | null;
  leaveDcnt: number | null;
  addDcnt: number | null;
  addCycMon: number | null;
  maxDcnt: number | null;
  useYn: string;
}

export interface PolCreateRequest {
  leavePolCd: string;
  leavePolNm: string;
  leavePolDesc?: string | null;
  polStMon?: number | null;
  polEndMon?: number | null;
  leaveDcnt?: number | null;
  addDcnt?: number | null;
  addCycMon?: number | null;
  maxDcnt?: number | null;
  useYn?: string;
}

export interface PolUpdateRequest {
  leavePolNm: string;
  leavePolDesc?: string | null;
  polStMon?: number | null;
  polEndMon?: number | null;
  leaveDcnt?: number | null;
  addDcnt?: number | null;
  addCycMon?: number | null;
  maxDcnt?: number | null;
  useYn: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const leaveApi = {
  // MST
  getAllMst: (): Promise<LeaveMstDto[]> =>
    apiClient.get('/api/admin/leave-mst').then((r) => r.data?.data ?? []),
  createMst: (data: MstCreateRequest): Promise<LeaveMstDto> =>
    apiClient.post('/api/admin/leave-mst', data).then((r) => r.data.data),
  updateMst: (leaveCd: string, data: MstUpdateRequest): Promise<LeaveMstDto> =>
    apiClient.put(`/api/admin/leave-mst/${leaveCd}`, data).then((r) => r.data.data),
  deleteMst: (leaveCd: string): Promise<void> =>
    apiClient.delete(`/api/admin/leave-mst/${leaveCd}`).then(() => undefined),

  // DTL
  getDtl: (leaveCd: string): Promise<LeaveDtlDto[]> =>
    apiClient.get('/api/admin/leave-dtl', { params: { leaveCd } }).then((r) => r.data?.data ?? []),
  createDtl: (data: DtlCreateRequest): Promise<LeaveDtlDto> =>
    apiClient.post('/api/admin/leave-dtl', data).then((r) => r.data.data),
  updateDtl: (leaveCd: string, leaveDtlCd: string, data: DtlUpdateRequest): Promise<LeaveDtlDto> =>
    apiClient.put(`/api/admin/leave-dtl/${leaveCd}/${leaveDtlCd}`, data).then((r) => r.data.data),
  deleteDtl: (leaveCd: string, leaveDtlCd: string): Promise<void> =>
    apiClient.delete(`/api/admin/leave-dtl/${leaveCd}/${leaveDtlCd}`).then(() => undefined),

  // POL
  getAllPol: (): Promise<LeavePolDto[]> =>
    apiClient.get('/api/admin/leave-pol').then((r) => r.data?.data ?? []),
  createPol: (data: PolCreateRequest): Promise<LeavePolDto> =>
    apiClient.post('/api/admin/leave-pol', data).then((r) => r.data.data),
  updatePol: (leavePolCd: string, data: PolUpdateRequest): Promise<LeavePolDto> =>
    apiClient.put(`/api/admin/leave-pol/${leavePolCd}`, data).then((r) => r.data.data),
  deletePol: (leavePolCd: string): Promise<void> =>
    apiClient.delete(`/api/admin/leave-pol/${leavePolCd}`).then(() => undefined),
};

// ─── Hooks — MST ─────────────────────────────────────────────────────────────

export const useLeaveMstList = () =>
  useQuery({ queryKey: ['admin-leave-mst'], queryFn: leaveApi.getAllMst });

export const useCreateLeaveMst = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.createMst,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-mst'] }),
  });
};

export const useUpdateLeaveMst = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveCd, data }: { leaveCd: string; data: MstUpdateRequest }) =>
      leaveApi.updateMst(leaveCd, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-mst'] }),
  });
};

export const useDeleteLeaveMst = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leaveCd: string) => leaveApi.deleteMst(leaveCd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-mst'] }),
  });
};

// ─── Hooks — DTL ─────────────────────────────────────────────────────────────

export const useLeaveDtlList = (leaveCd: string | null) =>
  useQuery({
    queryKey: ['admin-leave-dtl', leaveCd],
    queryFn: () => leaveApi.getDtl(leaveCd!),
    enabled: !!leaveCd,
  });

export const useCreateLeaveDtl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.createDtl,
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['admin-leave-dtl', vars.leaveCd] }),
  });
};

export const useUpdateLeaveDtl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaveCd,
      leaveDtlCd,
      data,
    }: {
      leaveCd: string;
      leaveDtlCd: string;
      data: DtlUpdateRequest;
    }) => leaveApi.updateDtl(leaveCd, leaveDtlCd, data),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['admin-leave-dtl', vars.leaveCd] }),
  });
};

export const useDeleteLeaveDtl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveCd, leaveDtlCd }: { leaveCd: string; leaveDtlCd: string }) =>
      leaveApi.deleteDtl(leaveCd, leaveDtlCd),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ['admin-leave-dtl', vars.leaveCd] }),
  });
};

// ─── Hooks — POL ─────────────────────────────────────────────────────────────

export const useLeavePolList = () =>
  useQuery({ queryKey: ['admin-leave-pol'], queryFn: leaveApi.getAllPol });

export const useCreateLeavePol = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.createPol,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-pol'] }),
  });
};

export const useUpdateLeavePol = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leavePolCd, data }: { leavePolCd: string; data: PolUpdateRequest }) =>
      leaveApi.updatePol(leavePolCd, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-pol'] }),
  });
};

export const useDeleteLeavePol = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leavePolCd: string) => leaveApi.deletePol(leavePolCd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leave-pol'] }),
  });
};
