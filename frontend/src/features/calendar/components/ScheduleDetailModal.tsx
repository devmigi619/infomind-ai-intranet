import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Pencil,
  Trash2,
  Clock,
  User,
  AlignLeft,
  Check,
  X as XIcon,
  Repeat,
} from 'lucide-react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useToast } from '../../../shared/hooks/useToast';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { useCurrentUser } from '../../auth/api';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { getDeptColor } from '../../../shared/constants/colors';
import { parseYmd, DOW_LABELS } from '../../../shared/utils/date';
import {
  useScheduleDetail,
  useMarkViewed,
  useRespondAttendance,
  useDeleteSchedule,
  type ScheduleResponse,
} from '../api';

/**
 * 일정 상세 모달
 *
 * mockup: openDetailModal 함수
 *
 * 정책 정리:
 * - 장소 필드는 DB에 없으므로 표시하지 않음 (사용자 확인)
 * - 작성자(mine=true) 또는 admin만 수정/삭제 버튼 노출
 * - 참석자 본인이며 작성자가 아닐 때만 참석/불참 응답 버튼 노출
 * - 모달이 열릴 때 자동으로 markViewed 호출
 */

interface ScheduleDetailModalProps {
  open: boolean;
  schdSn: number | null;
  /** 반복 일정의 경우 어느 인스턴스인지 (수정/삭제 시 필요) */
  occurrenceYmd: string | null;
  onClose: () => void;
  /** 수정 클릭 — 부모(CalendarScreen)에서 등록 모달 + 반복 옵션 다이얼로그 처리 */
  onEditPress: (schedule: ScheduleResponse, occurrenceYmd: string | null) => void;
  /** 반복 일정 삭제 시 부모(CalendarScreen)에서 범위 선택 다이얼로그 처리 */
  onDeleteLoop?: (schedule: ScheduleResponse, occurrenceYmd: string) => void;
}

/** "HHmm" → "HH:MM" */
function fmtHhmm(hr: string | null | undefined): string {
  if (!hr) return '';
  if (hr.includes(':')) return hr;
  if (hr.length >= 4) return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
  return hr;
}

/** "YYYYMMDD" → "YYYY년 M월 D일 (요일)" */
function fmtFullDate(ymd: string): string {
  const d = parseYmd(ymd);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW_LABELS[d.getDay()]})`;
}

/** 시작/종료 같은 날 → 한 줄, 다른 날 → "MM/DD – MM/DD" */
function fmtDateRange(st: string, end: string): string {
  if (st === end) return fmtFullDate(st);
  return `${st.slice(4, 6)}/${st.slice(6, 8)} – ${end.slice(4, 6)}/${end.slice(6, 8)}`;
}

export function ScheduleDetailModal({
  open,
  schdSn,
  occurrenceYmd,
  onClose,
  onEditPress,
  onDeleteLoop,
}: ScheduleDetailModalProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const styles = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);
  const toast = useToast();
  const confirm = useConfirm();

  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const { data: detail, isLoading } = useScheduleDetail(open ? schdSn : null);

  const markViewedMutation = useMarkViewed();
  const respondMutation = useRespondAttendance();
  const deleteMutation = useDeleteSchedule();

  const confirmAfterClose = useCallback(
    (opts: Parameters<typeof confirm>[0]) =>
      new Promise<boolean>((resolve) => {
        onClose();
        setTimeout(() => {
          confirm(opts).then(resolve);
        }, 0);
      }),
    [confirm, onClose],
  );

  // 모달이 열릴 때 markViewed 자동 호출
  const markedRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (!open || !schdSn) return;
    if (markedRef.current === schdSn) return;
    markedRef.current = schdSn;
    markViewedMutation.mutate(schdSn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schdSn]);

  useEffect(() => {
    if (!open) markedRef.current = null;
  }, [open]);

  if (!open) return null;

  // 작성자(mine) 또는 admin만 수정/삭제 가능 — 백엔드 권한과 일치
  const canEditDelete = !!detail && (detail.mine || isAdmin);
  // 참석자 본인이며 작성자가 아닐 때만 응답 버튼
  const myAttendance = detail?.attendees.find(
    (a) => a.attdUserId === currentUser?.userId,
  );
  const canRespond = !!detail && !detail.mine && !!myAttendance;
  const isLoop = !!detail && (detail.loopYn === 'Y' || !!detail.occurrenceYmd);

  // ─── 핸들러 ────────────────────────────────────────────────
  const handleEdit = () => {
    if (!detail) return;
    onEditPress(detail, occurrenceYmd);
  };

  const handleDelete = async () => {
    if (!detail) return;

    if (isLoop && occurrenceYmd && onDeleteLoop) {
      // 반복 일정 — 부모에서 범위 선택 다이얼로그 후 처리
      onDeleteLoop(detail, occurrenceYmd);
      return;
    }
    // 단발 일정 — 단순 확인 후 삭제
    const ok = await confirmAfterClose({
      title: '이 일정을 삭제하시겠습니까?',
      message: '삭제된 일정은 복구할 수 없습니다.',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    });
    if (!ok) return;
    deleteMutation.mutate(detail.schdSn, {
      onSuccess: () => {
        toast.success('일정이 삭제되었습니다.');
      },
      onError: (err) => {
        const message =
          (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
        toast.error(message);
      },
    });
  };

  const handleRespond = (attended: boolean) => {
    if (!detail) return;
    respondMutation.mutate(
      { schdSn: detail.schdSn, attended },
      {
        onSuccess: () =>
          toast.success(attended ? '참석으로 응답했습니다.' : '불참으로 응답했습니다.'),
        onError: (err) => {
          const message =
            (err as any)?.response?.data?.message ?? '응답 처리에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  };

  // ─── 렌더 ──────────────────────────────────────────────────
  const deptColor = detail ? getDeptColor(detail.deptCd) : theme.text.muted;
  const displayStYmd = detail ? (occurrenceYmd ?? detail.displayStYmd) : '';
  const displayEndYmd = detail ? (occurrenceYmd ?? detail.displayEndYmd) : '';
  const timeLabel = detail
    ? detail.allday
      ? '종일'
      : `${fmtHhmm(detail.schdStHr)} – ${fmtHhmm(detail.schdEndHr)}`
    : '';

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              {/* 헤더 */}
              <View
                style={[
                  styles.modalHdr,
                  { borderBottomColor: theme.border.default },
                ]}
              >
                <Text style={[styles.modalHdrTitle, { color: theme.text.primary }]}>
                  일정 상세
                </Text>
                <View style={styles.modalHdrActions}>
                  {canEditDelete && (
                    <>
                      <TouchableOpacity
                        onPress={handleEdit}
                        activeOpacity={0.7}
                        style={[
                          styles.modalIconBtn,
                          { backgroundColor: theme.brand.primaryTint },
                        ]}
                      >
                        <Pencil size={14} color={theme.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDelete}
                        activeOpacity={0.7}
                        style={[
                          styles.modalIconBtn,
                          { backgroundColor: theme.semanticTint.danger },
                        ]}
                      >
                        <Trash2 size={14} color={theme.semantic.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    style={[
                      styles.modalIconBtn,
                      { backgroundColor: theme.bg.surfaceMute },
                    ]}
                  >
                    <X size={14} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 본문 */}
              {isLoading || !detail ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={theme.brand.primary} />
                </View>
              ) : (
                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                >
                  {/* 헤더 — pill들 + 제목 */}
                  <View style={styles.detailHead}>
                    <View style={styles.detailPillRow}>
                      <View
                        style={[
                          styles.detailPill,
                          {
                            backgroundColor: deptColor + '1A',
                          },
                        ]}
                      >
                        <Text style={[styles.detailPillText, { color: deptColor }]}>
                          {detail.deptNm || '전체공개'}
                        </Text>
                      </View>
                      {detail.allday && (
                        <View
                          style={[
                            styles.detailPill,
                            { backgroundColor: theme.bg.surfaceMute },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailPillText,
                              { color: theme.text.muted },
                            ]}
                          >
                            종일
                          </Text>
                        </View>
                      )}
                      {detail.mine && (
                        <View
                          style={[
                            styles.detailPill,
                            { backgroundColor: theme.brand.primaryTint },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailPillText,
                              { color: theme.brand.primary },
                            ]}
                          >
                            내가 등록
                          </Text>
                        </View>
                      )}
                      {isLoop && (
                        <View
                          style={[
                            styles.detailPill,
                            {
                              backgroundColor: theme.bg.surfaceMute,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            },
                          ]}
                        >
                          <Repeat size={10} color={theme.text.muted} />
                          <Text
                            style={[
                              styles.detailPillText,
                              { color: theme.text.muted },
                            ]}
                          >
                            반복
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.detailTitle, { color: theme.text.primary }]}
                    >
                      {detail.schdNm}
                    </Text>
                  </View>

                  {/* 정보 박스 */}
                  <View
                    style={[
                      styles.detailInfo,
                      { backgroundColor: theme.bg.surfaceAlt },
                    ]}
                  >
                    {/* 시간 */}
                    <View style={styles.detailInfoRow}>
                      <View style={styles.detailInfoIcon}>
                        <Clock size={14} color={theme.text.muted} />
                      </View>
                      <Text style={[styles.detailInfoK, { color: theme.text.muted }]}>
                        시간
                      </Text>
                      <View style={styles.detailInfoV}>
                        <Text
                          style={[styles.detailInfoVText, { color: theme.text.primary }]}
                        >
                          <Text style={{ fontWeight: fontWeight.semibold }}>
                            {fmtDateRange(displayStYmd, displayEndYmd)}
                          </Text>
                          {!detail.allday ? ` · ${timeLabel}` : ''}
                        </Text>
                      </View>
                    </View>
                    {/* 작성자 */}
                    <View style={styles.detailInfoRow}>
                      <View style={styles.detailInfoIcon}>
                        <User size={14} color={theme.text.muted} />
                      </View>
                      <Text style={[styles.detailInfoK, { color: theme.text.muted }]}>
                        작성자
                      </Text>
                      <View style={styles.detailInfoV}>
                        <Text
                          style={[styles.detailInfoVText, { color: theme.text.primary }]}
                        >
                          {detail.userName}
                          {detail.deptNm ? ` · ${detail.deptNm}` : ''}
                        </Text>
                      </View>
                    </View>
                    {/* 비고 (있을 때만) */}
                    {!!detail.rmk && (
                      <View style={[styles.detailInfoRow, { alignItems: 'flex-start' }]}>
                        <View style={styles.detailInfoIcon}>
                          <AlignLeft size={14} color={theme.text.muted} />
                        </View>
                        <Text style={[styles.detailInfoK, { color: theme.text.muted }]}>
                          비고
                        </Text>
                        <View style={styles.detailInfoV}>
                          <Text
                            style={[styles.detailInfoVText, { color: theme.text.primary }]}
                          >
                            {detail.rmk}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* 참석 응답 (참석자 본인일 때만) */}
                  {canRespond && (
                    <View
                      style={[
                        styles.detailRespond,
                        {
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailRespondTitle,
                          { color: theme.text.primary },
                        ]}
                      >
                        참석 여부
                      </Text>
                      <View style={styles.detailRespondRow}>
                        <TouchableOpacity
                          onPress={() => handleRespond(true)}
                          activeOpacity={0.7}
                          disabled={respondMutation.isPending}
                          style={[
                            styles.respondBtn,
                            myAttendance?.userAttdYn === 'Y'
                              ? {
                                  backgroundColor: theme.semantic.success,
                                  borderColor: theme.semantic.success,
                                }
                              : {
                                  backgroundColor: theme.bg.surface,
                                  borderColor: theme.border.default,
                                },
                          ]}
                        >
                          <Check
                            size={14}
                            color={
                              myAttendance?.userAttdYn === 'Y'
                                ? '#FFFFFF'
                                : theme.text.body
                            }
                          />
                          <Text
                            style={[
                              styles.respondBtnText,
                              {
                                color:
                                  myAttendance?.userAttdYn === 'Y'
                                    ? '#FFFFFF'
                                    : theme.text.body,
                              },
                            ]}
                          >
                            참석
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRespond(false)}
                          activeOpacity={0.7}
                          disabled={respondMutation.isPending}
                          style={[
                            styles.respondBtn,
                            myAttendance?.userAttdYn === 'N'
                              ? {
                                  backgroundColor: theme.semantic.danger,
                                  borderColor: theme.semantic.danger,
                                }
                              : {
                                  backgroundColor: theme.bg.surface,
                                  borderColor: theme.border.default,
                                },
                          ]}
                        >
                          <XIcon
                            size={14}
                            color={
                              myAttendance?.userAttdYn === 'N'
                                ? '#FFFFFF'
                                : theme.text.body
                            }
                          />
                          <Text
                            style={[
                              styles.respondBtnText,
                              {
                                color:
                                  myAttendance?.userAttdYn === 'N'
                                    ? '#FFFFFF'
                                    : theme.text.body,
                              },
                            ]}
                          >
                            불참
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 참석자 명단 */}
                  {detail.attendees.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      <Text
                        style={[
                          styles.attdListTitle,
                          { color: theme.text.muted },
                        ]}
                      >
                        참석자 ({detail.attendees.length}명)
                      </Text>
                      <View style={styles.attdList}>
                        {detail.attendees.map((a) => {
                          const status: 'yes' | 'no' | 'pending' =
                            a.userQryYn === 'N'
                              ? 'pending'
                              : a.userAttdYn === 'Y'
                              ? 'yes'
                              : 'no';
                          const statusLabel =
                            status === 'yes'
                              ? '참석'
                              : status === 'no'
                              ? '불참'
                              : '미응답';
                          const statusBg =
                            status === 'yes'
                              ? theme.semanticTint.success
                              : status === 'no'
                              ? theme.semanticTint.danger
                              : theme.bg.surfaceMute;
                          const statusColor =
                            status === 'yes'
                              ? theme.semantic.success
                              : status === 'no'
                              ? theme.semantic.danger
                              : theme.text.muted;
                          return (
                            <View
                              key={a.attdUserId}
                              style={[
                                styles.attdRow,
                                { backgroundColor: theme.bg.surfaceAlt },
                              ]}
                            >
                              <View
                                style={[
                                  styles.attdAvatar,
                                  {
                                    backgroundColor: theme.bg.surfaceMute,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attdAvatarText,
                                    { color: theme.text.muted },
                                  ]}
                                >
                                  {a.attdUserName?.[0] ?? '?'}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.attdRowName,
                                  { color: theme.text.primary },
                                ]}
                                numberOfLines={1}
                              >
                                {a.attdUserName}
                              </Text>
                              <View
                                style={[
                                  styles.attdStatus,
                                  { backgroundColor: statusBg },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attdStatusText,
                                    { color: statusColor },
                                  ]}
                                >
                                  {statusLabel}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* 푸터 — 닫기 */}
              <View
                style={[
                  styles.modalFtr,
                  {
                    borderTopColor: theme.border.default,
                    backgroundColor: theme.bg.surfaceAlt,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: theme.brand.primary },
                  ]}
                >
                  <Text
                    style={[styles.closeBtnText, { color: theme.text.onBrand }]}
                  >
                    닫기
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme, isMobile: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.5)',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? spacing.md : spacing.xl,
    },
    modal: {
      width: '100%',
      maxWidth: 480,
      maxHeight: isMobile ? '100%' : '92%',
      flexDirection: 'column',
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.22,
      shadowRadius: 60,
      elevation: 20,
    },
    modalHdr: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    modalHdrTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
    },
    modalHdrActions: {
      flexDirection: 'row',
      gap: 6,
    },
    modalIconBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingWrap: {
      paddingVertical: spacing['2xl'],
      alignItems: 'center',
    },
    modalBody: {
      flexGrow: 0,
    },
    modalBodyContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg - 2,
    },

    // 헤더 (pill + 제목)
    detailHead: {
      gap: 6,
      marginBottom: 12,
    },
    detailPillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
    },
    detailPill: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    detailPillText: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    detailTitle: {
      fontSize: fontSize.heading,
      fontWeight: fontWeight.bold,
      marginTop: 2,
    },

    // 정보 박스
    detailInfo: {
      borderRadius: radius.lg + 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    detailInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 5,
    },
    detailInfoIcon: {
      marginTop: 2,
    },
    detailInfoK: {
      width: 50,
      flexShrink: 0,
      fontSize: fontSize.micro,
    },
    detailInfoV: {
      flex: 1,
      minWidth: 0,
    },
    detailInfoVText: {
      fontSize: fontSize.small,
      lineHeight: fontSize.small * 1.45,
    },

    // 참석 응답
    detailRespond: {
      borderWidth: 1,
      borderRadius: radius.lg + 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    detailRespondTitle: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.bold,
      marginBottom: 8,
    },
    detailRespondRow: {
      flexDirection: 'row',
      gap: 8,
    },
    respondBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    respondBtnText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.semibold,
    },

    // 참석자 명단
    attdListTitle: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      letterSpacing: 0.4,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    attdList: {
      gap: 5,
    },
    attdRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: radius.md + 1,
    },
    attdAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attdAvatarText: {
      fontSize: 11,
      fontWeight: fontWeight.bold,
    },
    attdRowName: {
      flex: 1,
      fontSize: fontSize.small,
    },
    attdStatus: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    attdStatusText: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },

    // 푸터
    modalFtr: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    closeBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 9,
      borderRadius: radius.lg,
    },
    closeBtnText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.semibold,
    },
  });
