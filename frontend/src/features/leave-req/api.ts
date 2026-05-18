import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 공통 사용자 타입 ─────────────────────────────────────────────────────────

export interface LeaveUserInfo {
  userId: string;
  userNm: string;
  deptCd?: string;
  jbgdCd?: string;
}

// ─── Leave Req DTOs ───────────────────────────────────────────────────────────

export interface LeaveReqSummaryDto {
  reqUserId: string;
  reqUserNm: string;
  reqSn: number;
  aprvRsltSe: string;   // 1=신청, 2=진행, 3=승인, 9=반려
  leaveCd: string;
  leaveDtlCd: string | null;
  leaveMstNm: string;
  leaveDtlNm: string | null;
  leaveUseDcnt: number;
  startYmd: string | null;
  endYmd: string | null;
  crtAt: string | null;
}

export interface LeaveAprvDto {
  aprvUserId: string;
  aprvUserNm: string;
  aprvOrd: number;
  aprvSe: string | null;  // null=미처리, 3=승인, 9=반려
  aprvYmd: string | null;
  rmk: string | null;
}

export interface LeaveRefDto {
  refUserId: string;
  refUserNm: string;
  qryYn: string;
  updAt: string | null;  // 조회일자 (qryYn='Y'일 때만 값 존재)
}

export interface LeaveReqDetailDto extends LeaveReqSummaryDto {
  leaveRsn: string | null;
  deptRefYn: string;
  afileId: string | null;     // 첨부파일 그룹 ID
  leaveStHhmm: string | null; // 반일 시작 시분 HHMM
  leaveEndHhmm: string | null;// 반일 종료 시분 HHMM
  dates: string[];            // YYYYMMDD 배열
  aprvList: LeaveAprvDto[];
  refList: LeaveRefDto[];
}

// ─── 결재선 공통 엔트리 (AprvlTmplModal / LeaveReqFormScreen 공용) ──────────────

export interface AprvEntry {
  aprvUserId: string;
  aprvUserNm: string;
  deptNm?: string;
  jbgdNm?: string;
}

// ─── 결재선 템플릿 DTOs ───────────────────────────────────────────────────────

export interface AprvTmplEntryDto {
  aprvUserId: string;
  aprvUserNm: string;
  aprvOrd: number;
}

export interface RefTmplEntryDto {
  refUserId: string;
  refUserNm: string;
}

export interface UserAprvlTmplDto {
  aprvlId: string;
  userId: string;
  aprvlNm: string;
  deptRefYn: string;   // 'Y' | 'N'
  aprvList: AprvTmplEntryDto[];
  refList: RefTmplEntryDto[];
}

// ─── Request 타입 ─────────────────────────────────────────────────────────────

export interface LeaveReqCreateData {
  leaveCd: string;
  leaveDtlCd?: string | null;
  leaveRsn?: string;
  deptRefYn?: string;
  afileId?: string | null;
  leaveStHhmm?: string | null;
  leaveEndHhmm?: string | null;
  dates: string[];
  aprvList: { aprvUserId: string }[];
  refList: string[];
}

export interface TmplCreateData {
  aprvlNm: string;
  deptRefYn?: string;  // 'Y' | 'N'
  aprvList: { aprvUserId: string }[];
  refList: string[];
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

const leaveReqApi = {
  getList: (role: 'my' | 'approver' | 'ref'): Promise<LeaveReqSummaryDto[]> =>
    apiClient.get('/api/leave-req', { params: { role } }).then((r) => r.data?.data ?? []),

  getDetail: (reqUserId: string, reqSn: number): Promise<LeaveReqDetailDto> =>
    apiClient.get(`/api/leave-req/${reqUserId}/${reqSn}`).then((r) => r.data.data),

  create: (data: LeaveReqCreateData): Promise<LeaveReqDetailDto> =>
    apiClient.post('/api/leave-req', data).then((r) => r.data.data),

  update: (reqUserId: string, reqSn: number, data: LeaveReqCreateData): Promise<LeaveReqDetailDto> =>
    apiClient.put(`/api/leave-req/${reqUserId}/${reqSn}`, data).then((r) => r.data.data),

  cancel: (reqUserId: string, reqSn: number): Promise<void> =>
    apiClient.delete(`/api/leave-req/${reqUserId}/${reqSn}`).then(() => undefined),

  approve: (reqUserId: string, reqSn: number): Promise<LeaveReqDetailDto> =>
    apiClient.post(`/api/leave-req/${reqUserId}/${reqSn}/approve`).then((r) => r.data.data),

  reject: (reqUserId: string, reqSn: number, rmk?: string): Promise<LeaveReqDetailDto> =>
    apiClient
      .post(`/api/leave-req/${reqUserId}/${reqSn}/reject`, { rmk })
      .then((r) => r.data.data),
};

const tmplApi = {
  getMyTmpls: (): Promise<UserAprvlTmplDto[]> =>
    apiClient.get('/api/user-aprvl-tmpl').then((r) => r.data?.data ?? []),

  create: (data: TmplCreateData): Promise<UserAprvlTmplDto> =>
    apiClient.post('/api/user-aprvl-tmpl', data).then((r) => r.data.data),

  update: (aprvlId: string, data: TmplCreateData): Promise<UserAprvlTmplDto> =>
    apiClient.put(`/api/user-aprvl-tmpl/${aprvlId}`, data).then((r) => r.data.data),

  delete: (aprvlId: string): Promise<void> =>
    apiClient.delete(`/api/user-aprvl-tmpl/${aprvlId}`).then(() => undefined),
};

// ─── 조직도 DTOs & 훅 (결재선 지정 트리에서 사용) ────────────────────────────

export interface OrgDeptDto {
  deptCd: string;
  upDeptCd: string | null;
  deptNm: string;
  deptLvl: number;
}

export interface OrgJbgdDto {
  jbgdCd: string;
  jbgdNm: string;
  jbgdSn: number;
}

export interface OrgUserDto {
  userId: string;
  userNm: string;
  deptCd: string | null;
  jbgdCd: string | null;
  userSe: string;
}

export const useOrgDepts = () =>
  useQuery<OrgDeptDto[]>({
    queryKey: ['org-depts'],
    queryFn: () => apiClient.get('/api/org/departments').then((r) => r.data?.data ?? []),
  });

export const useOrgJbgds = () =>
  useQuery<OrgJbgdDto[]>({
    queryKey: ['org-jbgds'],
    queryFn: () => apiClient.get('/api/org/job-grades').then((r) => r.data?.data ?? []),
  });

export const useOrgUsers = () =>
  useQuery<OrgUserDto[]>({
    queryKey: ['org-users'],
    queryFn: () => apiClient.get('/api/users').then((r) => r.data?.data ?? []),
  });

// ─── 사용자용 휴가 유형 DTOs ──────────────────────────────────────────────────

export interface LeaveMstDto {
  leaveCd: string;
  leaveNm: string;
  dedYn: string;
  paidYn: string;
  useYn: string;
}

export interface LeaveDtlDto {
  leaveCd: string;
  leaveDtlCd: string;
  leaveDtlNm: string;
  leaveDtlDesc: string | null;
  leaveSe: string;      // F=종일, H=반일
  useAvlDcnt: number;
  useYn: string;
}

// ─── 잔여 휴가 DTOs ───────────────────────────────────────────────────────────

export interface LeaveBalanceDto {
  year: string;
  entitlementDcnt?: number;
  usedDcnt: number;
  remainingDcnt?: number;
  usedPct?: number;
}

export interface MyLeaveBalanceDto {
  currentYear: LeaveBalanceDto;
  history: LeaveBalanceDto[];
}

// ─── React Query 훅 ───────────────────────────────────────────────────────────

export const useLeaveReqList = (role: 'my' | 'approver' | 'ref') =>
  useQuery({
    queryKey: ['leave-req', role],
    queryFn: () => leaveReqApi.getList(role),
  });

export const useLeaveReqDetail = (reqUserId: string | null, reqSn: number | null) =>
  useQuery<LeaveReqDetailDto>({
    queryKey: ['leave-req-detail', reqUserId, reqSn],
    queryFn: () => leaveReqApi.getDetail(reqUserId!, reqSn!),
    enabled: !!reqUserId && reqSn !== null,
  });

export const useCreateLeaveReq = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveReqApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-req'] });
    },
  });
};

export const useUpdateLeaveReq = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reqUserId,
      reqSn,
      data,
    }: {
      reqUserId: string;
      reqSn: number;
      data: LeaveReqCreateData;
    }) => leaveReqApi.update(reqUserId, reqSn, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['leave-req'] });
      qc.invalidateQueries({ queryKey: ['leave-req-detail', vars.reqUserId, vars.reqSn] });
    },
  });
};

export const useCancelLeaveReq = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqUserId, reqSn }: { reqUserId: string; reqSn: number }) =>
      leaveReqApi.cancel(reqUserId, reqSn),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-req'] }),
  });
};

export const useApproveLeaveReq = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reqUserId, reqSn }: { reqUserId: string; reqSn: number }) =>
      leaveReqApi.approve(reqUserId, reqSn),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['leave-req'] });
      qc.invalidateQueries({ queryKey: ['leave-req-detail', vars.reqUserId, vars.reqSn] });
    },
  });
};

export const useRejectLeaveReq = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reqUserId,
      reqSn,
      rmk,
    }: {
      reqUserId: string;
      reqSn: number;
      rmk?: string;
    }) => leaveReqApi.reject(reqUserId, reqSn, rmk),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['leave-req'] });
      qc.invalidateQueries({ queryKey: ['leave-req-detail', vars.reqUserId, vars.reqSn] });
    },
  });
};

export const useMyLeaveBalance = () =>
  useQuery<MyLeaveBalanceDto>({
    queryKey: ['leave-balance'],
    queryFn: () =>
      apiClient.get('/api/leave-req/my-leave-balance').then((r) => r.data.data),
  });

// ─── 사용자용 휴가 유형 훅 ────────────────────────────────────────────────────

export const useLeaveMstList = () =>
  useQuery<LeaveMstDto[]>({
    queryKey: ['leave-mst'],
    queryFn: () => apiClient.get('/api/leave-mst').then((r) => r.data?.data ?? []),
  });

export const useLeaveDtlList = (leaveCd: string | null) =>
  useQuery<LeaveDtlDto[]>({
    queryKey: ['leave-dtl', leaveCd],
    queryFn: () =>
      apiClient.get('/api/leave-dtl', { params: { leaveCd } }).then((r) => r.data?.data ?? []),
    enabled: !!leaveCd,
  });

// ─── 결재선 템플릿 훅 ─────────────────────────────────────────────────────────

export const useUserAprvlTmplList = () =>
  useQuery<UserAprvlTmplDto[]>({ queryKey: ['user-aprvl-tmpl'], queryFn: tmplApi.getMyTmpls });

export const useCreateUserAprvlTmpl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tmplApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-aprvl-tmpl'] }),
  });
};

export const useUpdateUserAprvlTmpl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aprvlId, data }: { aprvlId: string; data: TmplCreateData }) =>
      tmplApi.update(aprvlId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-aprvl-tmpl'] }),
  });
};

export const useDeleteUserAprvlTmpl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aprvlId: string) => tmplApi.delete(aprvlId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-aprvl-tmpl'] }),
  });
};
