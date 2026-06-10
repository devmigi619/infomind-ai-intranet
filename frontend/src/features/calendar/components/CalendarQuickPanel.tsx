import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
    <View className="flex-1">
      {/* 1) 헤더 */}
      <View style={{ borderBottomColor: theme.border.subtle }} className="flex-row items-center justify-between px-4 py-3 border-b">
        <Text style={{ color: theme.text.primary, fontFamily }} className="text-[14px] font-medium">
          캘린더
        </Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={handleOpenFull}
            style={{ backgroundColor: theme.brand.primaryTint }}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-md"
            activeOpacity={0.7}
          >
            <Text style={{ color: theme.brand.primary, fontFamily }} className="text-[11px] font-medium">
              열기
            </Text>
            <ArrowRight size={12} color={theme.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="w-7 h-7 items-center justify-center rounded-md" activeOpacity={0.7}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2) 미니 달력 */}
      <View style={{ borderBottomColor: theme.border.subtle }} className="px-3 pt-3 pb-2 border-b">
        {/* 월 헤더 */}
        <View className="flex-row items-center justify-center gap-3 mb-2">
          <TouchableOpacity
            onPress={goPrevMonth}
            className="w-[26px] h-[26px] items-center justify-center rounded-md"
            activeOpacity={0.6}
          >
            <ChevronLeft size={16} color={theme.text.muted} />
          </TouchableOpacity>
          <Text style={{ color: theme.text.primary, fontFamily }} className="text-[13px] font-semibold min-w-[110px] text-center">
            {monthLabel}
          </Text>
          <TouchableOpacity
            onPress={goNextMonth}
            className="w-[26px] h-[26px] items-center justify-center rounded-md"
            activeOpacity={0.6}
          >
            <ChevronRight size={16} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View className="flex-row mb-1">
          {DOW_LABELS.map((dow, i) => {
            const color =
              i === 0
                ? WEEKEND_COLORS.sun
                : i === 6
                ? WEEKEND_COLORS.sat
                : theme.text.muted;
            return (
              <Text key={dow} style={{ color, fontFamily }} className="flex-1 text-center text-[11px] font-medium py-1">
                {dow}
              </Text>
            );
          })}
        </View>

        {/* 7x6 그리드 */}
        <View className="flex-row flex-wrap">
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
                style={{ width: '14.28%', aspectRatio: 1 }}
                className="p-0.5"
              >
                <View
                  style={{
                    ...(isSelected ? { backgroundColor: theme.brand.primary } : {}),
                    ...(!isSelected && isToday ? { borderWidth: 1, borderColor: theme.brand.primary } : {}),
                  }}
                  className="flex-1 items-center justify-center rounded-md gap-0.5"
                >
                  <Text
                    style={{
                      color: dayNumColor,
                      fontWeight: isToday || isSelected ? fontWeight.semibold : fontWeight.regular,
                      fontFamily,
                    }}
                    className="text-[13px] leading-4"
                  >
                    {d.getDate()}
                  </Text>
                  {dots.length > 0 && (
                    <View className="flex-row items-center gap-0.5 h-1">
                      {dots.map((c, idx) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: isSelected
                              ? theme.text.onBrand
                              : c,
                          }}
                          className="w-1 h-1 rounded-full"
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
      <View className="flex-1 px-3 pt-3">
        <Text style={{ color: theme.text.subtle, fontFamily }} className="text-[11px] font-semibold uppercase tracking-wider mb-2 mx-0.5">
          {fmtSelectedTitle(selectedYmd)}
        </Text>

        {isLoading ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={theme.brand.primary} />
          </View>
        ) : dayList.length === 0 ? (
          <Text style={{ color: theme.text.subtle, fontFamily }} className="text-[13px] px-1 py-2">
            일정 없음
          </Text>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 12, gap: 6 }}
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
                  style={{
                    backgroundColor: theme.bg.surfaceAlt,
                    borderLeftColor: color,
                  }}
                  className="flex-row items-center gap-3 px-3.5 py-2 rounded-md border-l-3"
                >
                  <Text
                    style={{ color: theme.text.muted, fontFamily }}
                    className="text-[11px] font-medium min-w-[38px]"
                    numberOfLines={1}
                  >
                    {timeLabel}
                  </Text>
                  <Text
                    style={{ color: theme.text.primary, fontFamily }}
                    className="flex-1 text-[13px]"
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
      <View style={{ borderTopColor: theme.border.subtle }} className="px-3 py-2.5 border-t">
        <TouchableOpacity
          onPress={handleAddPress}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.brand.primary,
          }}
          className="flex-row items-center justify-center gap-2 py-2.25 rounded-md"
        >
          <Plus size={14} color={theme.text.onBrand} />
          <Text style={{ color: theme.text.onBrand, fontFamily }} className="text-[13px] font-semibold">
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
        <View style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} className="flex-1 items-center justify-center p-6">
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              }}
              className="w-full max-w-[360px] border rounded-2xl p-6 gap-3"
            >
              <Text
                style={{ color: theme.text.primary }}
                className="text-[15px] font-semibold"
              >
                반복 일정 삭제
              </Text>
              <Text style={{ color: theme.text.body }} className="text-[14px] leading-5">
                어느 범위까지 삭제할까요?
              </Text>
              <View className="flex-col gap-2 mt-2">
                <TouchableOpacity
                  onPress={onThisOnly}
                  activeOpacity={0.7}
                  style={{ borderColor: theme.border.default }}
                  className="py-3 px-3 rounded-lg border items-center justify-center"
                >
                  <Text
                    style={{ color: theme.text.primary }}
                    className="text-[14px] font-medium"
                  >
                    이 일정만
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onFromHere}
                  activeOpacity={0.7}
                  style={{ borderColor: theme.border.default }}
                  className="py-3 px-3 rounded-lg border items-center justify-center"
                >
                  <Text
                    style={{ color: theme.text.primary }}
                    className="text-[14px] font-medium"
                  >
                    이 일정부터 이후 전부
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onAll}
                  activeOpacity={0.7}
                  style={{
                    borderColor: theme.semantic.danger,
                    backgroundColor: theme.semantic.danger,
                  }}
                  className="py-3 px-3 rounded-lg border items-center justify-center"
                >
                  <Text
                    style={{ color: '#FFFFFF', fontWeight: fontWeight.semibold }}
                    className="text-[14px]"
                  >
                    전체 반복 일정
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="py-2 items-center justify-center"
              >
                <Text
                  style={{ color: theme.text.muted }}
                  className="text-[13px]"
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
