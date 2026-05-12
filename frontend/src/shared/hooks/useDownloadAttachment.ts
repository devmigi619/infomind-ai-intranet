import { useCallback } from 'react';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { attachmentApi, AttachmentFileMeta } from '../../features/attachment/api';

/**
 * 첨부 파일 다운로드 훅.
 * - 웹: apiClient로 blob 받아서 a 태그 트리거
 * - 모바일: expo-file-system + expo-sharing이 설치되어 있으면 사용,
 *   아니면 "추후 지원" 안내.
 */
export function useDownloadAttachment() {
  return useCallback(async (file: AttachmentFileMeta): Promise<{ ok: boolean; message?: string }> => {
    const path = attachmentApi.getDownloadUrl(file.afileId, file.afileSn);

    if (Platform.OS === 'web') {
      try {
        const res = await apiClient.get(path, { responseType: 'blob' });
        const blob = res.data as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.oriFileNm ?? file.fileNm;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // ObjectURL 해제는 약간의 지연 후
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: '다운로드에 실패했습니다.' };
      }
    }

    // 모바일: expo-file-system/sharing이 설치되지 않은 환경 → 안내만
    return {
      ok: false,
      message: '모바일 다운로드는 추후 지원 예정입니다.',
    };
  }, []);
}
