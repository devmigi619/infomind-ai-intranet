import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useDownloadAttachment } from '../hooks/useDownloadAttachment';
import { spacing } from '../constants/spacing';
import { radius } from '../constants/radius';
import { fontSize, fontWeight } from '../constants/typography';
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
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.default },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
            <Text
              style={[styles.title, { color: theme.text.primary }]}
              numberOfLines={1}
            >
              {file?.oriFileNm ?? '미리보기'}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.text.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.brand.primary} />
              </View>
            ) : errorMsg ? (
              <View style={styles.center}>
                <Text style={[styles.errorText, { color: theme.semantic.danger }]}>
                  {errorMsg}
                </Text>
              </View>
            ) : !file ? null : kind === 'image' && blobUrl ? (
              <ScrollView
                contentContainerStyle={styles.imageScroll}
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
                    style={styles.image}
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
              <View style={styles.center}>
                <Text style={[styles.placeholderText, { color: theme.text.muted }]}>
                  모바일 PDF 미리보기는 추후 지원 예정입니다.
                </Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={[styles.placeholderText, { color: theme.text.muted }]}>
                  이 확장자({file.fileExt})는 미리보기를 지원하지 않습니다.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
            <TouchableOpacity
              onPress={handleDownload}
              activeOpacity={0.7}
              style={[styles.downloadBtn, { backgroundColor: theme.brand.primary }]}
            >
              <Text style={[styles.downloadBtnText, { color: theme.text.onBrand }]}>
                다운로드
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.cancelBtn, { borderColor: theme.border.default }]}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text.body }]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  dialog: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  body: {
    minHeight: 240,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  imageScroll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 320,
    height: 320,
  },
  errorText: {
    fontSize: fontSize.body,
    fontFamily,
  },
  placeholderText: {
    fontSize: fontSize.body,
    fontFamily,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  downloadBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
  cancelBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
});
