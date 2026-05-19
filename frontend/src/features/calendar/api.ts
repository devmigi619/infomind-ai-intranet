import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 타입 ──────────────────────────────────────────────────────────────

export interface AttendeeDto {
  attdUserId: string;
  attdUserName: string;
  userAttdYn: 'Y' | 'N';
  userQryYn: 'Y' | 'N';
}

export interface ScheduleResponse {
  schdSn: number;
  userId: string;
  userName: string;
  deptCd: string | null;
  deptNm: string | null;
  schdNm: string;
  schdStYmd: string;
  /** "HHmm" 4자리 (예: "1430"). 종일 일정이면 null */
  schdStHr: string | null;
  schdEndYmd: string;
  /** "HHmm" 4자리 (예: "1430"). 종일 일정이면 null */
  schdEndHr: string | null;
  displayStYmd: string;
  displayEndYmd: string;
  allday: boolean;
  loopYn: 'Y' | 'N';
  loopSe: string | null;
  rmk: string | null;
  attendees: AttendeeDto[];
  occurrenceYmd: string | null;
  mine: boolean;
  crtAt: string;
  updAt: string;
}

export interface ScheduleCreateRequest {
  schdNm: string;
  deptCd?: string;
  schdStYmd: string;
  schdStHr?: string;
  schdEndYmd: string;
  schdEndHr?: string;
  loopYn: 'Y' | 'N';
  loopSe?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  rmk?: string;
  attendeeUserIds: string[];
}

export interface ScheduleUpdateRequest {
  schdNm: string;
  deptCd?: string;
  schdStYmd: string;
  schdStHr?: string;
  schdEndYmd: string;
  schdEndHr?: string;
  loopYn: 'Y' | 'N';
  loopSe?: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  rmk?: string;
  attendeeUserIds: string[];
}

export interface ScheduleRangeParams {
  st: string;    // YYYYMMDD
  end: string;   // YYYYMMDD
  dept?: string; // 쉼표 구분 부서코드
  mine?: boolean;
}

// ─── HTTP 함수 ────────────────────────────────────────────────────────

const schedulesApi = {
  getRange: (params: ScheduleRangeParams): Promise<ScheduleResponse[]> => {
    const qp: Record<string, string> = { st: params.st, end: params.end };
    if (params.dept) qp.dept = params.dept;
    if (params.mine) qp.mine = 'true';
    return apiClient
      .get('/api/schedules', { params: qp })
      .then((r) => r.data?.data ?? []);
  },

  getDetail: (schdSn: number): Promise<ScheduleResponse> =>
    apiClient.get(`/api/schedules/${schdSn}`).then((r) => r.data.data),

  create: (data: ScheduleCreateRequest): Promise<number> =>
    apiClient.post('/api/schedules', data).then((r) => r.data.data),

  update: (schdSn: number, data: ScheduleUpdateRequest): Promise<void> =>
    apiClient.put(`/api/schedules/${schdSn}`, data).then(() => undefined),

  delete: (schdSn: number): Promise<void> =>
    apiClient.delete(`/api/schedules/${schdSn}`).then(() => undefined),

  markViewed: (schdSn: number): Promise<void> =>
    apiClient.post(`/api/schedules/${schdSn}/viewed`).then(() => undefined),

  respondAttendance: (schdSn: number, attended: boolean): Promise<void> =>
    apiClient
      .post(`/api/schedules/${schdSn}/respond`, null, { params: { attended } })
      .then(() => undefined),

  // ── 반복 일정 인스턴스 처리 ──────────────────────────────────────────

  /** 반복 일정 중 단일 인스턴스만 삭제 (이 일정만 삭제) */
  deleteOccurrence: (schdSn: number, occurrenceYmd: string): Promise<void> =>
    apiClient
      .delete(`/api/schedules/${schdSn}/occurrences/${occurrenceYmd}`)
      .then(() => undefined),

  /** 반복 일정 중 이 일정부터 이후 전부 삭제 */
  deleteFromOccurrence: (schdSn: number, occurrenceYmd: string): Promise<void> =>
    apiClient
      .delete(`/api/schedules/${schdSn}/from-occurrence/${occurrenceYmd}`)
      .then(() => undefined),

  /** 반복 일정 중 단일 인스턴스만 수정 (이 일정만 수정 → 새 단발 row 생성) */
  updateOccurrence: (
    schdSn: number,
    occurrenceYmd: string,
    data: ScheduleUpdateRequest,
  ): Promise<number> =>
    apiClient
      .put(`/api/schedules/${schdSn}/occurrences/${occurrenceYmd}`, data)
      .then((r) => r.data.data),

  /** 반복 일정의 이 일정부터 이후 전부 수정 (새 시리즈 row 생성) */
  updateFromOccurrence: (
    schdSn: number,
    occurrenceYmd: string,
    data: ScheduleUpdateRequest,
  ): Promise<number> =>
    apiClient
      .put(`/api/schedules/${schdSn}/from-occurrence/${occurrenceYmd}`, data)
      .then((r) => r.data.data),
};

// ─── React Query 훅 ──────────────────────────────────────────────────

export const useScheduleRange = (params: ScheduleRangeParams) =>
  useQuery({
    queryKey: ['schedules', params.st, params.end, params.dept ?? '', params.mine ?? false],
    queryFn: () => schedulesApi.getRange(params),
    enabled: !!params.st && !!params.end,
  });

export const useScheduleDetail = (schdSn: number | null | undefined) =>
  useQuery({
    queryKey: ['schedule-detail', schdSn],
    queryFn: () => schedulesApi.getDetail(schdSn as number),
    enabled: !!schdSn,
    staleTime: 0,
    gcTime: 0,
  });

export const useCreateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleCreateRequest) => schedulesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useUpdateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ schdSn, data }: { schdSn: number; data: ScheduleUpdateRequest }) =>
      schedulesApi.update(schdSn, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail', vars.schdSn] });
    },
  });
};

export const useDeleteSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schdSn: number) => schedulesApi.delete(schdSn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useMarkViewed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (schdSn: number) => schedulesApi.markViewed(schdSn),
    onSuccess: (_data, schdSn) => {
      qc.invalidateQueries({ queryKey: ['schedule-detail', schdSn] });
    },
  });
};

export const useRespondAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ schdSn, attended }: { schdSn: number; attended: boolean }) =>
      schedulesApi.respondAttendance(schdSn, attended),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail', vars.schdSn] });
    },
  });
};

// ─── 반복 일정 인스턴스 훅 ──────────────────────────────────────────

export const useDeleteOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      schdSn,
      occurrenceYmd,
    }: {
      schdSn: number;
      occurrenceYmd: string;
    }) => schedulesApi.deleteOccurrence(schdSn, occurrenceYmd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useDeleteFromOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      schdSn,
      occurrenceYmd,
    }: {
      schdSn: number;
      occurrenceYmd: string;
    }) => schedulesApi.deleteFromOccurrence(schdSn, occurrenceYmd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
};

export const useUpdateOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      schdSn,
      occurrenceYmd,
      data,
    }: {
      schdSn: number;
      occurrenceYmd: string;
      data: ScheduleUpdateRequest;
    }) => schedulesApi.updateOccurrence(schdSn, occurrenceYmd, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail', vars.schdSn] });
    },
  });
};

export const useUpdateFromOccurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      schdSn,
      occurrenceYmd,
      data,
    }: {
      schdSn: number;
      occurrenceYmd: string;
      data: ScheduleUpdateRequest;
    }) => schedulesApi.updateFromOccurrence(schdSn, occurrenceYmd, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-detail', vars.schdSn] });
    },
  });
};

// ─── 일반 사용자용 부서 조회 (조직도 READ) ──────────────────────────
// /api/org/departments — 인증된 모든 사용자 접근 가능. 사용 중(useYn='Y')인 부서만 반환.
// 캘린더의 등록 모달 부서 칩과 6단계 필터 드롭다운에서 사용.

/** OrgController.DeptDto와 매칭. admin Department와 useYn 빼고 호환. */
export interface OrgDept {
  deptCd: string;
  upDeptCd: string | null;
  deptNm: string;
  deptLvl: number;
}

export const useOrgDepartments = () =>
  useQuery({
    queryKey: ['org-departments'],
    queryFn: (): Promise<OrgDept[]> =>
      apiClient.get('/api/org/departments').then((r) => r.data?.data ?? []),
  });

export { schedulesApi };
