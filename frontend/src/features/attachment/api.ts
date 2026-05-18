import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { apiClient } from '../../shared/api/client';

// ─── 타입 ──────────────────────────────────────────────────────────────

export interface AttachmentFileMeta {
  afileId: string;
  afileSn: number;
  fileNm: string;
  oriFileNm: string;
  fileExt: string;
  fileSize: number;
  webpFileNm?: string;
  storage: string;
}

export interface AttachmentUploadResponse {
  afileId: string;
  files: AttachmentFileMeta[];
}

/**
 * expo-document-picker / expo-image-picker 결과와 호환되는 형태.
 * - web: File 객체에서 추출 (uri는 ObjectURL, file 필드 포함)
 * - native: expo-document-picker DocumentPickerAsset (uri 기반)
 */
export interface DocumentAsset {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  /** web 전용 — 실제 File 객체 (FormData에 직접 추가) */
  file?: File;
}

// ─── HTTP 함수 ────────────────────────────────────────────────────────

const attachmentApi = {
  upload: async (
    files: DocumentAsset[],
    prefix?: string,
    afileId?: string,
    embedEnabled: boolean = true,
  ): Promise<AttachmentUploadResponse> => {
    const form = new FormData();

    for (const f of files) {
      if (Platform.OS === 'web') {
        // 웹: File 객체 우선 사용
        if (f.file) {
          form.append('files', f.file, f.name);
        } else {
          // ObjectURL → Blob 변환 (fallback)
          const blob = await fetch(f.uri).then((r) => r.blob());
          form.append('files', blob, f.name);
        }
      } else {
        // RN native: uri 기반 객체. RN FormData가 인식하는 형태.
        form.append('files', {
          uri: f.uri,
          name: f.name,
          type: f.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }
    }

    if (prefix) form.append('prefix', prefix);
    if (afileId) form.append('afileId', afileId);
    if (!embedEnabled) form.append('embedEnabled', 'false');

    const res = await apiClient.post('/api/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.data;
  },

  getList: (afileId: string): Promise<AttachmentFileMeta[]> =>
    apiClient.get(`/api/files/${afileId}`).then((r) => r.data?.data ?? []),

  delete: (afileId: string, afileSn: number): Promise<void> =>
    apiClient.delete(`/api/files/${afileId}/${afileSn}`).then(() => undefined),

  /** 다운로드 URL 경로만 반환 — 인증 헤더는 호출 측에서 처리 */
  getDownloadUrl: (afileId: string, afileSn: number): string =>
    `/api/files/${afileId}/${afileSn}`,
};

// ─── React Query 훅 ──────────────────────────────────────────────────

export const useUploadAttachments = () =>
  useMutation({
    mutationFn: ({
      files,
      prefix,
      afileId,
      embedEnabled = true,
    }: {
      files: DocumentAsset[];
      prefix?: string;
      afileId?: string;
      embedEnabled?: boolean;
    }) => attachmentApi.upload(files, prefix, afileId, embedEnabled),
  });

export const useAttachmentList = (afileId?: string | null) =>
  useQuery({
    queryKey: ['attachment-list', afileId],
    queryFn: () => attachmentApi.getList(afileId as string),
    enabled: !!afileId,
  });

export const useDeleteAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ afileId, afileSn }: { afileId: string; afileSn: number }) =>
      attachmentApi.delete(afileId, afileSn),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['attachment-list', vars.afileId] });
    },
  });
};

export { attachmentApi };
