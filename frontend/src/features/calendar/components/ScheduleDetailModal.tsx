import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
import { useTheme } from '../../../shared/hooks/useTheme';
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
  useScheduleRange,
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
        <View style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} className={isMobile ? "flex-1 items-center justify-start p-4" : "flex-1 items-center justify-center p-6"}>
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: theme.bg.surface,
                maxHeight: isMobile ? '100%' : '92%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.22,
                shadowRadius: 60,
                elevation: 20,
              }}
              className="w-full max-w-[480px] flex-col rounded-[14px] overflow-hidden"
            >
              {/* 헤더 */}
              <View
                style={{ borderBottomColor: theme.border.default }}
                className="flex-row items-center justify-between px-6 py-3.5 border-b"
              >
                <Text style={{ color: theme.text.primary }} className="text-[16px] font-bold">
                  일정 상세
                </Text>
                <View className="flex-row gap-1.5">
                  {canEditDelete && (
                    <>
                      <TouchableOpacity
                        onPress={handleEdit}
                        activeOpacity={0.7}
                        style={{ backgroundColor: theme.brand.primaryTint }}
                        className="w-[30px] h-[30px] rounded-md items-center justify-center"
                      >
                        <Pencil size={14} color={theme.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleDelete}
                        activeOpacity={0.7}
                        style={{ backgroundColor: theme.semanticTint.danger }}
                        className="w-[30px] h-[30px] rounded-md items-center justify-center"
                      >
                        <Trash2 size={14} color={theme.semantic.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    style={{ backgroundColor: theme.bg.surfaceMute }}
                    className="w-[30px] h-[30px] rounded-md items-center justify-center"
                  >
                    <X size={14} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 본문 */}
              {isLoading || !detail ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color={theme.brand.primary} />
                </View>
              ) : (
                <ScrollView
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14 }}
                >
                  {/* 헤더 — pill들 + 제목 */}
                  <View className="gap-1.5 mb-3">
                    <View className="flex-row flex-wrap gap-1.5 items-center">
                      <View
                        style={{
                          backgroundColor: deptColor + '1A',
                        }}
                        className="px-2 py-[3px] rounded-full"
                      >
                        <Text style={{ color: deptColor }} className="text-[12px] font-semibold">
                          {detail.deptNm || '전체공개'}
                        </Text>
                      </View>
                      {detail.allday && (
                        <View
                          style={{ backgroundColor: theme.bg.surfaceMute }}
                          className="px-2 py-[3px] rounded-full"
                        >
                          <Text
                            style={{ color: theme.text.muted }}
                            className="text-[12px] font-semibold"
                          >
                            종일
                          </Text>
                        </View>
                      )}
                      {detail.mine && (
                        <View
                          style={{ backgroundColor: theme.brand.primaryTint }}
                          className="px-2 py-[3px] rounded-full"
                        >
                          <Text
                            style={{ color: theme.brand.primary }}
                            className="text-[12px] font-semibold"
                          >
                            내가 등록
                          </Text>
                        </View>
                      )}
                      {isLoop && (
                        <View
                          style={{
                            backgroundColor: theme.bg.surfaceMute,
                          }}
                          className="px-2 py-[3px] rounded-full flex-row items-center gap-1"
                        >
                          <Repeat size={10} color={theme.text.muted} />
                          <Text
                            style={{ color: theme.text.muted }}
                            className="text-[12px] font-semibold"
                          >
                            반복
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{ color: theme.text.primary }}
                      className="text-[20px] font-bold mt-0.5"
                    >
                      {detail.schdNm}
                    </Text>
                  </View>

                  {/* 정보 박스 */}
                  <View
                    style={{ backgroundColor: theme.bg.surfaceAlt }}
                    className="rounded-[10px] px-3.5 py-3 mb-3"
                  >
                    {/* 시간 */}
                    <View className="flex-row items-center gap-2.5 py-[5px]">
                      <View className="mt-0.5">
                        <Clock size={14} color={theme.text.muted} />
                      </View>
                      <Text style={{ color: theme.text.muted }} className="w-[50px] shrink-0 text-[10px]">
                        시간
                      </Text>
                      <View className="flex-1 min-w-0">
                        <Text
                          style={{ color: theme.text.primary }}
                          className="text-[14px] leading-[20px]"
                        >
                          <Text style={{ fontWeight: fontWeight.semibold }}>
                            {fmtDateRange(displayStYmd, displayEndYmd)}
                          </Text>
                          {!detail.allday ? ` · ${timeLabel}` : ''}
                        </Text>
                      </View>
                    </View>
                    {/* 작성자 */}
                    <View className="flex-row items-center gap-2.5 py-[5px]">
                      <View className="mt-0.5">
                        <User size={14} color={theme.text.muted} />
                      </View>
                      <Text style={{ color: theme.text.muted }} className="w-[50px] shrink-0 text-[10px]">
                        작성자
                      </Text>
                      <View className="flex-1 min-w-0">
                        <Text
                          style={{ color: theme.text.primary }}
                          className="text-[14px] leading-[20px]"
                        >
                          {detail.userName}
                          {detail.deptNm ? ` · ${detail.deptNm}` : ''}
                        </Text>
                      </View>
                    </View>
                    {/* 비고 (있을 때만) */}
                    {!!detail.rmk && (
                      <View className="flex-row items-start gap-2.5 py-[5px]">
                        <View className="mt-0.5">
                          <AlignLeft size={14} color={theme.text.muted} />
                        </View>
                        <Text style={{ color: theme.text.muted }} className="w-[50px] shrink-0 text-[10px]">
                          비고
                        </Text>
                        <View className="flex-1 min-w-0">
                          <Text
                            style={{ color: theme.text.primary }}
                            className="text-[14px] leading-[20px]"
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
                      style={{
                        borderColor: theme.border.default,
                        backgroundColor: theme.bg.surface,
                      }}
                      className="border rounded-[10px] px-3.5 py-3 mb-3"
                    >
                      <Text
                        style={{ color: theme.text.primary }}
                        className="text-[14px] font-bold mb-2"
                      >
                        참석 여부
                      </Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleRespond(true)}
                          activeOpacity={0.7}
                          disabled={respondMutation.isPending}
                          style={
                            myAttendance?.userAttdYn === 'Y'
                              ? {
                                  backgroundColor: theme.semantic.success,
                                  borderColor: theme.semantic.success,
                                }
                              : {
                                  backgroundColor: theme.bg.surface,
                                  borderColor: theme.border.default,
                                }
                          }
                          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg border"
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
                            style={{
                              color:
                                myAttendance?.userAttdYn === 'Y'
                                  ? '#FFFFFF'
                                  : theme.text.body,
                            }}
                            className="text-[14px] font-semibold"
                          >
                            참석
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRespond(false)}
                          activeOpacity={0.7}
                          disabled={respondMutation.isPending}
                          style={
                            myAttendance?.userAttdYn === 'N'
                              ? {
                                  backgroundColor: theme.semantic.danger,
                                  borderColor: theme.semantic.danger,
                                }
                              : {
                                  backgroundColor: theme.bg.surface,
                                  borderColor: theme.border.default,
                                }
                          }
                          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg border"
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
                            style={{
                              color:
                                myAttendance?.userAttdYn === 'N'
                                  ? '#FFFFFF'
                                  : theme.text.body,
                            }}
                            className="text-[14px] font-semibold"
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
                        style={{ color: theme.text.muted }}
                        className="text-[12px] font-bold tracking-[0.4px] mb-2 uppercase"
                      >
                        참석자 ({detail.attendees.length}명)
                      </Text>
                      <View className="gap-1.5">
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
                              style={{ backgroundColor: theme.bg.surfaceAlt }}
                              className="flex-row items-center gap-2.5 px-2.5 py-1.5 rounded-[9px]"
                            >
                              <View
                                style={{
                                  backgroundColor: theme.bg.surfaceMute,
                                }}
                                className="w-[26px] h-[26px] rounded-[13px] items-center justify-center"
                              >
                                <Text
                                  style={{ color: theme.text.muted }}
                                  className="text-[11px] font-bold"
                                >
                                  {a.attdUserName?.[0] ?? '?'}
                                </Text>
                              </View>
                              <Text
                                style={{ color: theme.text.primary }}
                                className="flex-1 text-[14px]"
                                numberOfLines={1}
                              >
                                {a.attdUserName}
                              </Text>
                              <View
                                style={{ backgroundColor: statusBg }}
                                className="px-2 py-[2px] rounded-full"
                              >
                                <Text
                                  style={{ color: statusColor }}
                                  className="text-[12px] font-semibold"
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
                style={{
                  borderTopColor: theme.border.default,
                  backgroundColor: theme.bg.surfaceAlt,
                }}
                className="flex-row justify-end px-6 py-3.5 border-t"
              >
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={{ backgroundColor: theme.brand.primary }}
                  className="px-6 py-[9px] rounded-lg"
                >
                  <Text
                    style={{ color: theme.text.onBrand }}
                    className="text-[14px] font-semibold"
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

