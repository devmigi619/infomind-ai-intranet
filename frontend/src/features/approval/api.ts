import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── 공통 키 타입 ────────────────────────────────────────────────────────────

export interface AprvReqKey {
  aprvFormId: string;
  reqUserId:  string;
  aprvReqSn:  number;
}

// ─── 목록 DTO ────────────────────────────────────────────────────────────────

export interface AprvSummary extends AprvReqKey {
  aprvFormNm:        string;
  reqUserNm:         string;
  reqSum:            string | null;
  reqYmd:            string | null;
  aprvRsltSe:        string;   // 1=신청, 2=진행, 3=승인, 9=반려
  crtAt:             string | null;
  currentAprvUserNm: string | null;
}

// ─── 상세 DTO ────────────────────────────────────────────────────────────────

export interface AprvFormField {
  aprvRefCd: string;
  aprvRefNm: string;
  aprvRefSe: string | null;
  reqdYn:    string;
}

export interface AprvLineItem {
  aprvUserId: string;
  aprvUserNm: string;
  aprvOrd:    number;
  aprvSe:     string | null;
  aprvYmd:    string | null;
  rmk:        string | null;
}

export interface AprvRefItem {
  refUserId: string;
  refUserNm: string;
  qryYn:     string;
}

export interface AprvDetail extends AprvSummary {
  aprvReqDesc: Record<string, unknown> | null;
  dtlFields:   AprvFormField[];
  fileYn:      string;
  afileId:     string | null;
  deptRefYn:   string;
  aprvList:    AprvLineItem[];
  refList:     AprvRefItem[];
}

// ─── 양식 DTO ────────────────────────────────────────────────────────────────

export interface AprvFormSummary {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn:     string;
  dtlCount:   number;
  crtAt:      string | null;
}

export interface AprvFormDetail {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn:     string;
  rmk:        string | null;
  dtls:       AprvFormField[];
}

// ─── 요청 타입 ───────────────────────────────────────────────────────────────

export interface CreateAprvRequest {
  aprvFormId:   string;
  reqSum:       string;
  reqYmd?:      string;
  aprvReqDesc?: Record<string, unknown>;
  deptRefYn?:   string;
  aprvList?:    Array<{ aprvUserId: string; aprvOrd: number }>;
  refUserIds?:  string[];
}

export interface ApproveRequest {
  rmk?: string;
}

// ─── API 함수 ────────────────────────────────────────────────────────────────

const aprvApi = {
  getMine: (): Promise<AprvSummary[]> =>
    apiClient.get('/api/approvals/mine').then((r) => r.data?.data ?? []),

  getPending: (): Promise<AprvSummary[]> =>
    apiClient.get('/api/approvals/pending').then((r) => r.data?.data ?? []),

  getDetail: (key: AprvReqKey): Promise<AprvDetail> =>
    apiClient
      .get(`/api/approvals/${key.aprvFormId}/${key.reqUserId}/${key.aprvReqSn}`)
      .then((r) => r.data.data),

  create: (data: CreateAprvRequest): Promise<AprvDetail> =>
    apiClient.post('/api/approvals', data).then((r) => r.data.data),

  approve: (key: AprvReqKey, data?: ApproveRequest): Promise<AprvDetail> =>
    apiClient
      .post(`/api/approvals/${key.aprvFormId}/${key.reqUserId}/${key.aprvReqSn}/approve`, data ?? {})
      .then((r) => r.data.data),

  reject: (key: AprvReqKey, data?: ApproveRequest): Promise<AprvDetail> =>
    apiClient
      .post(`/api/approvals/${key.aprvFormId}/${key.reqUserId}/${key.aprvReqSn}/reject`, data ?? {})
      .then((r) => r.data.data),

  cancel: (key: AprvReqKey): Promise<void> =>
    apiClient
      .post(`/api/approvals/${key.aprvFormId}/${key.reqUserId}/${key.aprvReqSn}/cancel`)
      .then(() => undefined),
};

const formApi = {
  getList: (): Promise<AprvFormSummary[]> =>
    apiClient.get('/api/aprv-forms').then((r) => r.data?.data ?? []),

  getDetail: (aprvFormId: string): Promise<AprvFormDetail> =>
    apiClient.get(`/api/aprv-forms/${aprvFormId}`).then((r) => r.data.data),
};

// ─── React Query 훅 ──────────────────────────────────────────────────────────

const QK = {
  mine:    ['approvals', 'mine'] as const,
  pending: ['approvals', 'pending'] as const,
  detail:  (k: AprvReqKey) =>
    ['approvals', 'detail', k.aprvFormId, k.reqUserId, k.aprvReqSn] as const,
  forms:   ['aprv-forms'] as const,
  form:    (id: string) => ['aprv-forms', id] as const,
};

export const useMyApprovals      = () =>
  useQuery({ queryKey: QK.mine, queryFn: aprvApi.getMine });

export const usePendingApprovals = () =>
  useQuery({ queryKey: QK.pending, queryFn: aprvApi.getPending });

export const useAprvDetail = (key: AprvReqKey | null) =>
  useQuery({
    queryKey: key ? QK.detail(key) : ['approvals', 'detail', null],
    queryFn:  () => aprvApi.getDetail(key!),
    enabled:  !!key,
  });

export const useAprvFormList   = () =>
  useQuery({ queryKey: QK.forms, queryFn: formApi.getList });

export const useAprvFormDetail = (id: string) =>
  useQuery({ queryKey: QK.form(id), queryFn: () => formApi.getDetail(id), enabled: !!id });

export const useCreateAprv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aprvApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.mine });
      qc.invalidateQueries({ queryKey: QK.pending });
    },
  });
};

export const useApproveAprv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: AprvReqKey; data?: ApproveRequest }) =>
      aprvApi.approve(key, data),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: QK.pending });
      qc.invalidateQueries({ queryKey: QK.mine });
      qc.invalidateQueries({ queryKey: QK.detail(key) });
    },
  });
};

export const useRejectAprv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: AprvReqKey; data?: ApproveRequest }) =>
      aprvApi.reject(key, data),
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: QK.pending });
      qc.invalidateQueries({ queryKey: QK.mine });
      qc.invalidateQueries({ queryKey: QK.detail(key) });
    },
  });
};

export const useCancelAprv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aprvApi.cancel,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.mine }),
  });
};
