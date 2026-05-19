import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useUiStore } from '../../../store/uiStore';
import { useToast } from '../../../shared/hooks/useToast';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { getDeptColor } from '../../../shared/constants/colors';
import {
  addMonths,
  getMonthRange,
  toYmd,
  parseYmd,
  DOW_LABELS,
  WEEKEND_COLORS,
} from '../../../shared/utils/date';
import {
  useScheduleRange,
  useDeleteSchedule,
  useDeleteOccurrence,
  useDeleteFromOccurrence,
  type ScheduleResponse,
} from '../api';
import {
  ScheduleCreateModal,
  type ScheduleEditMode,
} from './ScheduleCreateModal';
import { ScheduleDetailModal } from './ScheduleDetailModal';

/**
 * 캘린더 LP 퀵패널 — 데스크탑 LP(360px)용
 *
 * 구조 (위→아래):
 *  1) 헤더 (제목 + 열기 → + X)
 *  2) 미니 달력 (월 헤더 + 7x6 그리드, 오늘/선택일/일정 점 표시)
 *  3) 선택 날짜 일정 리스트
 *  4) + 새 일정 버튼 (선택 날짜 prefill)
 *
 * 모달은 컴포넌트 내부에서 직접 렌더 — 등록/수정 모달, 상세 모달, 반복 일정 범위 다이얼로그.
 */

// ─── 점 표시 한도 ──────────────────────────────────────────────────────
const MAX_DOTS_PER_DAY = 3;

const fontFamily = Platform.select({
  web: "'Noto Sans KR', sans-serif",
  default: undefined,
});

// ─── 헬퍼 ──────────────────────────────────────────────────────────────

/** "HHmm" → "HH:MM" */
function fmtHhmm(hr: string | null | undefined): string {
  if (!hr) return '';
  return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
}

/** 7x6=42셀 (이전월 패딩 + 이번달 + 다음월 패딩) */
function buildMonthGrid(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + idx);
    return d;
  });
}

/** "20260519" → "5월 19일 (화)" */
function fmtSelectedTitle(ymd: string): string {
  const d = parseYmd(ymd);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}월 ${day}일 (${DOW_LABELS[d.getDay()]})`;
}

// ─── Props ─────────────────────────────────────────────────────────────

interface CalendarQuickPanelProps {
  onClose: () => void;
}

// ─── 컴포넌트 ──────────────────────────────────────────────────────────

export function CalendarQuickPanel({ onClose }: CalendarQuickPanelProps) {
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const closeLeftPanel = useUiStore((s) => s.closeLeftPanel);
  const setActiveFullScreen = useUiStore((s) => s.setActiveFullScreen);

  // ─── 상태 ─────────────────────────────────────────────────────────────
  /** 현재 보고 있는 월의 1일 Date */
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  /** 선택 일자 (YYYYMMDD) — 기본값: 오늘 */
  const [selectedYmd, setSelectedYmd] = useState<string>(() => toYmd(new Date()));

  /** 등록/수정 모달 */
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    mode: ScheduleEditMode;
  }>({ open: false, mode: { kind: 'create' } });

  /** 상세 모달 */
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    schdSn: number | null;
    occurrenceYmd: string | null;
  }>({ open: false, schdSn: null, occurrenceYmd: null });

  /** 반복 일정 범위 선택 다이얼로그 — 삭제 흐름 */
  const [loopDeleteDialog, setLoopDeleteDialog] = useState<{
    schedule: ScheduleResponse;
    occurrenceYmd: string;
  } | null>(null);

  const deleteMutation = useDeleteSchedule();
  const deleteOccMutation = useDeleteOccurrence();
  const deleteFromOccMutation = useDeleteFromOccurrence();

  // ─── 데이터 ──────────────────────────────────────────────────────────
  const { st, end } = useMemo(
    () => getMonthRange(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate],
  );

  const { data: schedules = [], isLoading } = useScheduleRange({ st, end });

  /** 날짜별 → (부서별 dedupe된) 색상 점 배열, 최대 MAX_DOTS_PER_DAY개 */
  const dotsByYmd = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const sc of schedules) {
      // displayStYmd ~ displayEndYmd 범위에 있는 모든 날에 점 누적
      // (멀티데이 종일/반복 occurrence 모두 displayStYmd/displayEndYmd 기준)
      const stD = parseYmd(sc.displayStYmd);
      const endD = parseYmd(sc.displayEndYmd);
      const color = getDeptColor(sc.deptCd);
      // 안전 cap: 이상 데이터로 인한 무한 루프 방지 (한 달 그리드 = 42셀)
      let guard = 0;
      for (
        let d = new Date(stD);
        d <= endD && guard < 60;
        d.setDate(d.getDate() + 1), guard++
      ) {
        const y = toYmd(d);
        if (!map[y]) map[y] = [];
        // 같은 색 중복 방지 + 한도 제한
        if (map[y].length < MAX_DOTS_PER_DAY && !map[y].includes(color)) {
          map[y].push(color);
        }
      }
    }
    return map;
  }, [schedules]);

  /** 선택 날짜에 걸리는 일정만 필터 + 정렬 (종일 먼저, 시간순) */
  const dayList = useMemo(() => {
    const list = schedules.filter(
      (sc) => sc.displayStYmd <= selectedYmd && sc.displayEndYmd >= selectedYmd,
    );
    return list.sort((a, b) => {
      // 종일 먼저
      if (a.allday !== b.allday) return a.allday ? -1 : 1;
      // 시간 일정은 시작시간 오름차순
      if (!a.allday && !b.allday) {
        return (a.schdStHr ?? '').localeCompare(b.schdStHr ?? '');
      }
      return 0;
    });
  }, [schedules, selectedYmd]);

  const gridDays = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const todayYmd = useMemo(() => toYmd(new Date()), []);

  // ─── 핸들러 ───────────────────────────────────────────────────────────
  const handleOpenFull = useCallback(() => {
    closeLeftPanel();
    setActiveFullScreen('calendar');
  }, [closeLeftPanel, setActiveFullScreen]);

  const goPrevMonth = useCallback(() => {
    setMonthDate((d) => addMonths(d, -1));
  }, []);

  const goNextMonth = useCallback(() => {
    setMonthDate((d) => addMonths(d, 1));
  }, []);

  const handleDayPress = useCallback((d: Date) => {
    setSelectedYmd(toYmd(d));
    // 다른 달의 셀을 누르면 보고 있는 월도 그 달로 이동
    setMonthDate((cur) => {
      if (
        d.getFullYear() !== cur.getFullYear() ||
        d.getMonth() !== cur.getMonth()
      ) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
      return cur;
    });
  }, []);

  const handleSchedulePress = useCallback((sc: ScheduleResponse) => {
    setDetailModal({
      open: true,
      schdSn: sc.schdSn,
      occurrenceYmd: sc.occurrenceYmd,
    });
  }, []);

  const handleAddPress = useCallback(() => {
    setCreateModal({
      open: true,
      mode: { kind: 'create', prefillYmd: selectedYmd },
    });
  }, [selectedYmd]);

  const closeDetailModal = useCallback(() => {
    setDetailModal({ open: false, schdSn: null, occurrenceYmd: null });
  }, []);

  /** 반복 삭제 범위 다이얼로그 닫힘 → confirm 띄우는 흐름에서
   *  두 모달이 겹쳐 보이지 않도록 setTimeout(0)으로 한 tick 미룸. */
  const confirmAfterLoopDialogClose = useCallback(
    (opts: Parameters<typeof confirm>[0]) =>
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          confirm(opts).then(resolve);
        }, 0);
      }),
    [confirm],
  );

  /** 상세 모달 → 수정 클릭 */
  const handleEditFromDetail = useCallback(
    (schedule: ScheduleResponse, occurrenceYmd: string | null) => {
      closeDetailModal();
      if (schedule.loopYn === 'Y') {
        setCreateModal({
          open: true,
          mode: {
            kind: 'updateLoop',
            schedule,
            occurrenceYmd:
              occurrenceYmd || schedule.occurrenceYmd || schedule.displayStYmd,
          },
        });
      } else {
        setCreateModal({
          open: true,
          mode: { kind: 'update', schedule },
        });
      }
    },
    [closeDetailModal],
  );

  /** 상세 모달 → 반복 일정 삭제 클릭 → 범위 선택 다이얼로그 */
  const handleDeleteLoopFromDetail = useCallback(
    (schedule: ScheduleResponse, occurrenceYmd: string) => {
      closeDetailModal();
      setLoopDeleteDialog({ schedule, occurrenceYmd });
    },
    [closeDetailModal],
  );

  /** 반복 삭제 — 이 일정만 */
  const handleLoopDelThisOnly = useCallback(async () => {
    if (!loopDeleteDialog) return;
    const { schedule, occurrenceYmd } = loopDeleteDialog;
    setLoopDeleteDialog(null);
    const ok = await confirmAfterLoopDialogClose({
      title: '이 일정만 삭제하시겠습니까?',
      message: '반복 일정 중 이 날짜만 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    });
    if (!ok) return;
    deleteOccMutation.mutate(
      { schdSn: schedule.schdSn, occurrenceYmd },
      {
        onSuccess: () => toast.success('이 일정만 삭제되었습니다.'),
        onError: (err) => {
          const message =
            (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  }, [loopDeleteDialog, confirmAfterLoopDialogClose, deleteOccMutation, toast]);

  /** 반복 삭제 — 이 일정부터 이후 */
  const handleLoopDelFromHere = useCallback(async () => {
    if (!loopDeleteDialog) return;
    const { schedule, occurrenceYmd } = loopDeleteDialog;
    setLoopDeleteDialog(null);
    const ok = await confirmAfterLoopDialogClose({
      title: '이 일정부터 이후 전부 삭제하시겠습니까?',
      message: '선택한 날짜부터 이후 반복 일정이 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    });
    if (!ok) return;
    deleteFromOccMutation.mutate(
      { schdSn: schedule.schdSn, occurrenceYmd },
      {
        onSuccess: () => toast.success('이 일정부터 이후 전부 삭제되었습니다.'),
        onError: (err) => {
          const message =
            (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
          toast.error(message);
        },
      },
    );
  }, [loopDeleteDialog, confirmAfterLoopDialogClose, deleteFromOccMutation, toast]);

  /** 반복 삭제 — 전체 */
  const handleLoopDelAll = useCallback(async () => {
    if (!loopDeleteDialog) return;
    const { schedule } = loopDeleteDialog;
    setLoopDeleteDialog(null);
    const ok = await confirmAfterLoopDialogClose({
      title: '전체 반복 일정을 삭제하시겠습니까?',
      message: '반복 시리즈와 예외, 참석자 정보가 함께 삭제됩니다.',
      confirmText: '삭제',
      cancelText: '취소',
      danger: true,
    });
    if (!ok) return;
    deleteMutation.mutate(schedule.schdSn, {
      onSuccess: () => toast.success('전체 반복 일정이 삭제되었습니다.'),
      onError: (err) => {
        const message =
          (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
        toast.error(message);
      },
    });
  }, [loopDeleteDialog, confirm, deleteMutation, toast]);

  // ─── 렌더 ─────────────────────────────────────────────────────────────
  const monthLabel = `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`;

  return (
    <View style={styles.container}>
      {/* 1) 헤더 */}
      <View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          캘린더
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleOpenFull}
            style={[styles.openButton, { backgroundColor: theme.brand.primaryTint }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.openButtonText, { color: theme.brand.primary }]}>
              열기
            </Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2) 미니 달력 */}
      <View style={[styles.calBlock, { borderBottomColor: theme.border.subtle }]}>
        {/* 월 헤더 */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={goPrevMonth}
            style={styles.navBtn}
            activeOpacity={0.6}
          >
            <ChevronLeft size={16} color={theme.text.muted} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text.primary }]}>
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={goNextMonth}
            style={styles.navBtn}
            activeOpacity={0.6}
          >
            <ChevronRight size={16} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={styles.dowRow}>
          {DOW_LABELS.map((dow, i) => {
            const color =
              i === 0
                ? WEEKEND_COLORS.sun
                : i === 6
                ? WEEKEND_COLORS.sat
                : theme.text.muted;
            return (
              <Text key={dow} style={[styles.dowCell, { color }]}>
                {dow}
              </Text>
            );
          })}
        </View>

        {/* 7x6 그리드 */}
        <View style={styles.grid}>
          {gridDays.map((d) => {
            const ymd = toYmd(d);
            const isCurMonth = d.getMonth() === monthDate.getMonth();
            const isToday = ymd === todayYmd;
            const isSelected = ymd === selectedYmd;
            const dow = d.getDay();
            const dots = dotsByYmd[ymd] ?? [];

            const dayNumColor = isSelected
              ? theme.text.onBrand
              : !isCurMonth
              ? theme.text.subtle
              : dow === 0
              ? WEEKEND_COLORS.sun
              : dow === 6
              ? WEEKEND_COLORS.sat
              : theme.text.body;

            return (
              <TouchableOpacity
                key={ymd}
                onPress={() => handleDayPress(d)}
                activeOpacity={0.6}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayCellInner,
                    isSelected && {
                      backgroundColor: theme.brand.primary,
                    },
                    !isSelected && isToday && {
                      borderWidth: 1,
                      borderColor: theme.brand.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: dayNumColor,
                        fontWeight: isToday || isSelected ? fontWeight.semibold : fontWeight.regular,
                      },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  {dots.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dots.map((c, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.dot,
                            {
                              backgroundColor: isSelected
                                ? theme.text.onBrand
                                : c,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3) 선택 날짜 일정 리스트 */}
      <View style={styles.listBlock}>
        <Text style={[styles.listHeader, { color: theme.text.subtle }]}>
          {fmtSelectedTitle(selectedYmd)}
        </Text>

        {isLoading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator size="small" color={theme.brand.primary} />
          </View>
        ) : dayList.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text.subtle }]}>
            일정 없음
          </Text>
        ) : (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {dayList.map((sc) => {
              const color = getDeptColor(sc.deptCd);
              const timeLabel = sc.allday
                ? '종일'
                : sc.schdStHr
                ? fmtHhmm(sc.schdStHr)
                : '';
              return (
                <TouchableOpacity
                  key={`${sc.schdSn}-${sc.occurrenceYmd ?? sc.displayStYmd}`}
                  onPress={() => handleSchedulePress(sc)}
                  activeOpacity={0.7}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: theme.bg.surfaceAlt,
                      borderLeftColor: color,
                    },
                  ]}
                >
                  <Text
                    style={[styles.itemTime, { color: theme.text.muted }]}
                    numberOfLines={1}
                  >
                    {timeLabel}
                  </Text>
                  <Text
                    style={[styles.itemTitle, { color: theme.text.primary }]}
                    numberOfLines={1}
                  >
                    {sc.schdNm}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 4) + 새 일정 버튼 */}
      <View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
        <TouchableOpacity
          onPress={handleAddPress}
          activeOpacity={0.8}
          style={[
            styles.addBtn,
            {
              backgroundColor: theme.brand.primary,
            },
          ]}
        >
          <Plus size={14} color={theme.text.onBrand} />
          <Text style={[styles.addBtnText, { color: theme.text.onBrand }]}>
            새 일정
          </Text>
        </TouchableOpacity>
      </View>

      {/* 모달 — 등록/수정 */}
      <ScheduleCreateModal
        open={createModal.open}
        mode={createModal.mode}
        onClose={() => setCreateModal((prev) => ({ ...prev, open: false }))}
      />

      {/* 모달 — 상세 */}
      <ScheduleDetailModal
        open={detailModal.open}
        schdSn={detailModal.schdSn}
        occurrenceYmd={detailModal.occurrenceYmd}
        onClose={closeDetailModal}
        onEditPress={handleEditFromDetail}
        onDeleteLoop={handleDeleteLoopFromDetail}
      />

      {/* 모달 — 반복 일정 삭제 범위 선택 */}
      <LoopDeleteRangeDialog
        data={loopDeleteDialog}
        onClose={() => setLoopDeleteDialog(null)}
        onThisOnly={handleLoopDelThisOnly}
        onFromHere={handleLoopDelFromHere}
        onAll={handleLoopDelAll}
      />
    </View>
  );
}

// ─── 반복 일정 삭제 범위 선택 다이얼로그 ───────────────────────────────
// CalendarScreen의 LoopActionDialog(삭제 케이스)와 동일 동작.
// LP에서는 삭제 진입점만 있으므로 'delete' 전용으로 단순화.
interface LoopDeleteRangeDialogProps {
  data: { schedule: ScheduleResponse; occurrenceYmd: string } | null;
  onClose: () => void;
  onThisOnly: () => void;
  onFromHere: () => void;
  onAll: () => void;
}

function LoopDeleteRangeDialog({
  data,
  onClose,
  onThisOnly,
  onFromHere,
  onAll,
}: LoopDeleteRangeDialogProps) {
  const theme = useTheme();
  if (!data) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={dialogStyles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                dialogStyles.dialog,
                {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Text
                style={[dialogStyles.title, { color: theme.text.primary }]}
              >
                반복 일정 삭제
              </Text>
              <Text style={[dialogStyles.message, { color: theme.text.body }]}>
                어느 범위까지 삭제할까요?
              </Text>
              <View style={dialogStyles.btnGroup}>
                <TouchableOpacity
                  onPress={onThisOnly}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text
                    style={[
                      dialogStyles.optionBtnText,
                      { color: theme.text.primary },
                    ]}
                  >
                    이 일정만
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onFromHere}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text
                    style={[
                      dialogStyles.optionBtnText,
                      { color: theme.text.primary },
                    ]}
                  >
                    이 일정부터 이후 전부
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onAll}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    {
                      borderColor: theme.semantic.danger,
                      backgroundColor: theme.semantic.danger,
                    },
                  ]}
                >
                  <Text
                    style={[
                      dialogStyles.optionBtnText,
                      { color: '#FFFFFF', fontWeight: fontWeight.semibold },
                    ]}
                  >
                    전체 반복 일정
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={dialogStyles.cancelBtn}
              >
                <Text
                  style={[
                    dialogStyles.cancelBtnText,
                    { color: theme.text.muted },
                  ]}
                >
                  취소
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── 스타일 ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  openButtonText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    fontFamily,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  // 미니 달력 블록
  calBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  monthLabel: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
    minWidth: 110,
    textAlign: 'center',
  },

  // 요일 헤더
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dowCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    fontFamily,
    paddingVertical: 4,
  },

  // 그리드 (7x6)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: 2,
  },
  dayNum: {
    fontSize: fontSize.small,
    fontFamily,
    lineHeight: fontSize.small * 1.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // 선택 날짜 리스트 블록
  listBlock: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  listHeader: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginHorizontal: 2,
  },
  listLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.small,
    fontFamily,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
  },
  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    paddingBottom: spacing.sm,
    gap: spacing.xs + 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
  },
  itemTime: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    fontFamily,
    minWidth: 38,
  },
  itemTitle: {
    flex: 1,
    fontSize: fontSize.small,
    fontFamily,
  },

  // 푸터 (+ 새 일정 버튼)
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  addBtnText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontFamily,
  },
});

const dialogStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  message: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
  },
  btnGroup: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.small,
  },
});
