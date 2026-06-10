import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useDownloadAttachment } from '../hooks/useDownloadAttachment';
import { apiClient } from '../api/client';
import { attachmentApi, AttachmentFileMeta } from '../../features/attachment/api';

const fontFamily = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export interface AttachmentPreviewModalProps {
  open: boolean;
  file: AttachmentFileMeta | null;
  onClose: () => void;
}

type Kind = 'image' | 'pdf' | 'unsupported';

function getKind(ext: string): Kind {
  const e = (ext ?? '').toLowerCase();
  if (IMAGE_EXTS.includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  return 'unsupported';
}

/**
 * 첨부 미리보기 모달.
 * - 이미지: blob URL 생성해서 표시
 * - PDF: 웹은 iframe (blob URL). 모바일은 안내.
 * - 그 외: "미리보기 미지원" + 다운로드 버튼
 */
export function AttachmentPreviewModal({ open, file, onClose }: AttachmentPreviewModalProps) {
  const theme = useTheme();
  const download = useDownloadAttachment();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const kind = file ? getKind(file.fileExt) : 'unsupported';

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;

    async function load() {
      if (!open || !file) return;
      if (kind === 'unsupported') return;
      // 웹에서만 blob URL 미리 로드. 네이티브는 RN <Image>가 인증 헤더 없이는 못 받음 → 안내.
      if (Platform.OS !== 'web') return;

      setLoading(true);
      setErrorMsg(null);
      try {
        const path = attachmentApi.getDownloadUrl(file.afileId, file.afileSn);
        const res = await apiClient.get(path, { responseType: 'blob' });
        if (cancelled) return;
        const url = URL.createObjectURL(res.data as Blob);
        revoke = url;
        setBlobUrl(url);
      } catch {
        if (!cancelled) setErrorMsg('미리보기를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
      setBlobUrl(null);
    };
  }, [open, file, kind]);

  const handleDownload = async () => {
    if (!file) return;
    const result = await download(file);
    if (!result.ok && result.message) setErrorMsg(result.message);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/55 items-center justify-center p-4">
        <View
          className="w-full max-w-[720px] max-h-[90%] rounded-2xl border overflow-hidden"
          style={{ backgroundColor: theme.bg.surface, borderColor: theme.border.default }}
        >
          <View
            className="flex-row items-center justify-between px-4 py-3 border-b gap-2"
            style={{ borderBottomColor: theme.border.subtle }}
          >
            <Text
              className="flex-1 text-[15px] font-semibold"
              style={{ color: theme.text.primary, fontFamily }}
              numberOfLines={1}
            >
              {file?.oriFileNm ?? '미리보기'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="w-8 h-8 items-center justify-center">
              <Text className="text-base font-medium" style={{ color: theme.text.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View className="min-h-[240px] p-3">
            {loading ? (
              <View className="flex-1 min-h-[240px] items-center justify-center p-5">
                <ActivityIndicator color={theme.brand.primary} />
              </View>
            ) : errorMsg ? (
              <View className="flex-1 min-h-[240px] items-center justify-center p-5">
                <Text className="text-sm" style={{ color: theme.semantic.danger, fontFamily }}>
                  {errorMsg}
                </Text>
              </View>
            ) : !file ? null : kind === 'image' && blobUrl ? (
              <ScrollView
                contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                maximumZoomScale={3}
                minimumZoomScale={1}
              >
                {Platform.OS === 'web' ? (
                  // 웹은 <img> 사용
                  React.createElement('img', {
                    src: blobUrl,
                    alt: file.oriFileNm,
                    style: { maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' },
                  })
                ) : (
                  <Image
                    source={{ uri: blobUrl }}
                    className="w-80 h-80"
                    resizeMode="contain"
                  />
                )}
              </ScrollView>
            ) : kind === 'pdf' && Platform.OS === 'web' && blobUrl ? (
              React.createElement('iframe', {
                src: blobUrl,
                style: { width: '100%', height: '70vh', border: 'none' },
                title: file.oriFileNm,
              })
            ) : kind === 'pdf' ? (
              <View className="flex-1 min-h-[240px] items-center justify-center p-5">
                <Text className="text-sm text-center" style={{ color: theme.text.muted, fontFamily }}>
                  모바일 PDF 미리보기는 추후 지원 예정입니다.
                </Text>
              </View>
            ) : (
              <View className="flex-1 min-h-[240px] items-center justify-center p-5">
                <Text className="text-sm text-center" style={{ color: theme.text.muted, fontFamily }}>
                  이 확장자({file.fileExt})는 미리보기를 지원하지 않습니다.
                </Text>
              </View>
            )}
          </View>

          <View
            className="flex-row gap-2 p-3 border-t justify-end"
            style={{ borderTopColor: theme.border.subtle }}
          >
            <TouchableOpacity
              onPress={handleDownload}
              activeOpacity={0.7}
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: theme.brand.primary }}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text.onBrand, fontFamily }}>
                다운로드
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.default }}
            >
              <Text className="text-sm font-medium" style={{ color: theme.text.body, fontFamily }}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
