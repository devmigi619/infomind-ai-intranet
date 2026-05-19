import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Check } from 'lucide-react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useToast } from '../../../shared/hooks/useToast';
import { useConfirm } from '../../../shared/hooks/useConfirm';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { getDeptColor } from '../../../shared/constants/colors';
import {
  addDays,
  getMonthRange,
  getWeekRange,
  parseYmd,
  toYmd,
  DOW_LABELS,
} from '../../../shared/utils/date';
import {
  useScheduleRange,
  useDeleteSchedule,
  useDeleteOccurrence,
  useDeleteFromOccurrence,
  useOrgDepartments,
  type ScheduleResponse,
} from '../api';
import { MonthView } from '../components/MonthView';
import { WeekView } from '../components/WeekView';
import { DayView } from '../components/DayView';
import { ListView } from '../components/ListView';
import {
  ScheduleCreateModal,
  type ScheduleEditMode,
} from '../components/ScheduleCreateModal';
import { ScheduleDetailModal } from '../components/ScheduleDetailModal';

/** 뷰 토글 — 모바일에서는 month/week만 사용 (day/list는 데스크탑 전용) */
const VIEW_OPTIONS = [
  { key: 'month', label: '월', enabled: true },
  { key: 'week', label: '주', enabled: true },
  { key: 'day', label: '일', enabled: true },
  { key: 'list', label: '목록', enabled: true },
] as const;
type ViewKey = (typeof VIEW_OPTIONS)[number]['key'];

/** 목록뷰 한 번에 보여줄 일수 + 더 보기 증가량 */
const LIST_INITIAL_DAYS = 15;
const LIST_LOAD_STEP = 15;
/** 목록뷰 백엔드 범위 상한 (sanity guard — 너무 큰 범위 요청 방지) */
const LIST_MAX_DAYS = 365;

/**
 * 카테고리 칩 — 6단계에서 "업무"는 활성, "휴가"는 비활성("soon")
 * "휴가"는 추후 결재 연동 예정.
 */
const CATEGORY_CHIPS = [
  { key: 'schedule', label: '업무', enabled: true },
  { key: 'vacation', label: '휴가', enabled: false },
] as const;
type CategoryKey = (typeof CATEGORY_CHIPS)[number]['key'];

/** 부서 팝업 — "전체공개"(deptCd=null) 가상 코드 */
const DEPT_NULL_KEY = '_NULL_';

/** 안전 addMonths — 오버플로우(1/31 +1달 → 3/3) 방지.
 *  같은 날짜 유지 + 그 달 말일 클램프 (1/31 +1달 → 2/28). */
function safeAddMonths(d: Date, delta: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}

export function CalendarScreen() {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const s = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);
  const toast = useToast();
  const confirm = useConfirm();

  // 현재 보고 있는 기준 날짜 — 모든 뷰가 공유. 뷰 전환 시 보정 X (mockup 패턴).
  const [current, setCurrent] = useState<Date>(() => new Date());

  // 활성 뷰
  const [activeView, setActiveView] = useState<ViewKey>('month');
  // 목록뷰 — 한 번에 보여줄 일수 (mockup의 state.listLimit)
  const [listLimit, setListLimit] = useState<number>(LIST_INITIAL_DAYS);

  // ─── 필터 상태 (6단계) ────────────────────────────────────────────
  /** 활성 카테고리 — 기본 "업무"만 활성. "휴가"는 영구 비활성. */
  const [activeCats, setActiveCats] = useState<Set<CategoryKey>>(
    () => new Set<CategoryKey>(['schedule']),
  );
  /** 선택된 부서 코드 (다중) — 빈 셋이면 "전체 부서" */
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(() => new Set());
  /** 부서 팝업 열림 여부 */
  const [deptPopOpen, setDeptPopOpen] = useState(false);
  /** 부서 트리거 ref — 팝업 위치 측정용 */
  const deptTriggerRef = useRef<View>(null);
  /** 부서 팝업 위치 (트리거 바로 아래로 측정해서 띄움) */
  const [deptPopPos, setDeptPopPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  }>({ top: 0, left: 0, minWidth: 200 });
  /** 내 일정만 토글 */
  const [mineOnly, setMineOnly] = useState(false);

  const { data: depts = [] } = useOrgDepartments();

  // ─── 모달 상태 (7/9단계) ──────────────────────────────────────────
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    mode: ScheduleEditMode;
  }>({ open: false, mode: { kind: 'create' } });

  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    schdSn: number | null;
    occurrenceYmd: string | null;
  }>({ open: false, schdSn: null, occurrenceYmd: null });

  /** 반복 일정 수정/삭제 시 범위 선택 다이얼로그 상태 */
  const [loopActionDialog, setLoopActionDialog] = useState<{
    open: boolean;
    action: 'edit' | 'delete';
    schedule: ScheduleResponse;
    occurrenceYmd: string;
  } | null>(null);

  const deleteMutation = useDeleteSchedule();
  const deleteOccMutation = useDeleteOccurrence();
  const deleteFromOccMutation = useDeleteFromOccurrence();

  const closeDetailModal = useCallback(() => {
    setDetailModal({ open: false, schdSn: null, occurrenceYmd: null });
  }, []);

  const confirmAfterLoopDialogClose = useCallback(
    (opts: Parameters<typeof confirm>[0]) =>
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          confirm(opts).then(resolve);
        }, 0);
      }),
    [confirm],
  );

  // 뷰에 따라 useScheduleRange 범위 결정
  const { st, end } = useMemo(() => {
    if (activeView === 'week') {
      return getWeekRange(current);
    }
    if (activeView === 'day') {
      const y = toYmd(current);
      return { st: y, end: y };
    }
    if (activeView === 'list') {
      // 목록뷰는 current(기준일)부터 listLimit일치
      const st0 = toYmd(current);
      const end0 = toYmd(addDays(current, listLimit - 1));
      return { st: st0, end: end0 };
    }
    return getMonthRange(current.getFullYear(), current.getMonth());
  }, [activeView, current, listLimit]);

  /** 백엔드로 보낼 dept 파라미터 — 콤마 구분.
   *  "전체공개"(_NULL_)는 백엔드 미지원 가능성을 고려해 서버에는 빈 코드만 전달하지 않음.
   *  → "_NULL_"이 선택 셋에 포함되면 일단 빈 코드로 보내지 않고 클라이언트 사이드에서 필터.
   *  실용상 부서 선택이 모두 있는 경우 전부 보내고, "_NULL_"만 있으면 빈 결과 회피 위해 dept 미전달 + 클라이언트 필터로 처리. */
  const deptParam = useMemo(() => {
    const real = Array.from(selectedDepts).filter((c) => c !== DEPT_NULL_KEY);
    if (real.length === 0) return undefined;
    return real.join(',');
  }, [selectedDepts]);

  const { data: rawSchedules = [], isLoading } = useScheduleRange({
    st,
    end,
    dept: deptParam,
    mine: mineOnly,
  });

  /** 클라이언트 사이드 추가 필터:
   *  - "업무" 카테고리가 꺼져 있으면 전부 숨김 (현재 schedule만 운영 → 전체 숨김)
   *  - 부서 필터에 "_NULL_"이 포함되어 있고 실제 부서도 골랐다면, 결과에 deptCd=null인 항목을 합쳐서 포함
   *  - 부서 필터에 "_NULL_"만 있다면 deptCd=null인 항목만 표시
   */
  const schedules = useMemo(() => {
    let result = rawSchedules;

    // 카테고리: "업무" 꺼져 있으면 일정 전부 숨김
    if (!activeCats.has('schedule')) {
      result = [];
    }

    // 부서 "전체공개" 필터링 — selectedDepts에 _NULL_이 있을 때만 의미
    if (selectedDepts.has(DEPT_NULL_KEY)) {
      const realCount = selectedDepts.size - 1;
      if (realCount === 0) {
        // _NULL_만 선택 — deptCd=null인 항목만
        result = result.filter((sc) => !sc.deptCd);
      }
      // realCount > 0: 백엔드가 real deptCd 매칭 결과 + 클라이언트가 deptCd=null도 포함하고 싶음
      // 다만 백엔드에서 real deptCd만 보내주므로 deptCd=null인 항목은 결과에 안 들어옴
      // 이를 보완하려면 별도 호출이 필요. 현재 단계에서는 트레이드오프 — 보고에 명시.
    } else if (selectedDepts.size > 0) {
      // 부서가 선택돼 있는데 _NULL_은 없음 → 백엔드 결과 그대로 (deptCd=null 항목 자연스럽게 제외됨)
    }

    return result;
  }, [rawSchedules, activeCats, selectedDepts]);

  // ─── 네비게이션 ───────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    setCurrent((d) => {
      if (activeView === 'week') return addDays(d, -7);
      if (activeView === 'day') return addDays(d, -1);
      if (activeView === 'list') return addDays(d, -1);
      return safeAddMonths(d, -1);
    });
  }, [activeView]);

  const goNext = useCallback(() => {
    setCurrent((d) => {
      if (activeView === 'week') return addDays(d, 7);
      if (activeView === 'day') return addDays(d, 1);
      if (activeView === 'list') return addDays(d, 1);
      return safeAddMonths(d, 1);
    });
  }, [activeView]);

  const goToday = useCallback(() => {
    const now = new Date();
    if (activeView === 'week' || activeView === 'day') {
      setCurrent(now);
    } else if (activeView === 'list') {
      setCurrent(now);
      setListLimit(LIST_INITIAL_DAYS);
    } else {
      setCurrent(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [activeView]);

  const handleViewPress = useCallback((key: ViewKey, enabled: boolean) => {
    if (!enabled) return;
    if (key === 'list') {
      setListLimit(LIST_INITIAL_DAYS);
    }
    setActiveView(key);
  }, []);

  const handleLoadMore = useCallback(() => {
    setListLimit((n) => Math.min(LIST_MAX_DAYS, n + LIST_LOAD_STEP));
  }, []);

  // ─── 모달 트리거 ──────────────────────────────────────────────────
  const handleSchedulePress = useCallback((sc: ScheduleResponse) => {
    setDetailModal({
      open: true,
      schdSn: sc.schdSn,
      occurrenceYmd: sc.occurrenceYmd,
    });
  }, []);

  const handleEmptyCellPress = useCallback((ymd: string) => {
    setCreateModal({
      open: true,
      mode: { kind: 'create', prefillYmd: ymd },
    });
  }, []);

  const handleAddBtnPress = useCallback(() => {
    setCreateModal({
      open: true,
      mode: { kind: 'create' },
    });
  }, []);

  /** 상세 모달에서 "수정" 클릭 — 단발이면 바로, 반복이면 범위 선택 다이얼로그 */
  const handleEditFromDetail = useCallback(
    (schedule: ScheduleResponse, occurrenceYmd: string | null) => {
      // 반복 판정은 loopYn 기준만. occurrenceYmd가 null이면 표시 시작일로 fallback.
      if (schedule.loopYn === 'Y') {
        closeDetailModal();
        setCreateModal({
          open: true,
          mode: {
            kind: 'updateLoop',
            schedule,
            occurrenceYmd: occurrenceYmd || schedule.occurrenceYmd || schedule.displayStYmd,
          },
        });
      } else {
        // 단발 — 바로 수정 모달
        closeDetailModal();
        setCreateModal({
          open: true,
          mode: { kind: 'update', schedule },
        });
      }
    },
    [closeDetailModal],
  );

  /** 상세 모달에서 반복 일정 "삭제" 클릭 — 범위 선택 다이얼로그 */
  const handleDeleteLoopFromDetail = useCallback(
    (schedule: ScheduleResponse, occurrenceYmd: string) => {
      closeDetailModal();
      setLoopActionDialog({
        open: true,
        action: 'delete',
        schedule,
        occurrenceYmd,
      });
    },
    [closeDetailModal],
  );

  /** 범위 선택 다이얼로그 — "이 일정만" 선택 */
  const handleLoopActionThisOnly = useCallback(async () => {
    if (!loopActionDialog) return;
    const { action, schedule, occurrenceYmd } = loopActionDialog;
    setLoopActionDialog(null);

    if (action === 'edit') {
      closeDetailModal();
      setCreateModal({
        open: true,
        mode: { kind: 'updateOccurrence', schedule, occurrenceYmd },
      });
    } else {
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
          onSuccess: () => {
            toast.success('이 일정만 삭제되었습니다.');
            closeDetailModal();
          },
          onError: (err) => {
            const message =
              (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
            toast.error(message);
          },
        },
      );
    }
  }, [loopActionDialog, confirmAfterLoopDialogClose, closeDetailModal, deleteOccMutation, toast]);

  /** 범위 선택 다이얼로그 — "이 일정부터 이후 전부" 선택 */
  const handleLoopActionFromHere = useCallback(async () => {
    if (!loopActionDialog) return;
    const { action, schedule, occurrenceYmd } = loopActionDialog;
    setLoopActionDialog(null);

    if (action === 'edit') {
      closeDetailModal();
      setCreateModal({
        open: true,
        mode: { kind: 'updateFromOccurrence', schedule, occurrenceYmd },
      });
    } else {
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
          onSuccess: () => {
            toast.success('이 일정부터 이후 전부 삭제되었습니다.');
            closeDetailModal();
          },
          onError: (err) => {
            const message =
              (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
            toast.error(message);
          },
        },
      );
    }
  }, [loopActionDialog, confirmAfterLoopDialogClose, closeDetailModal, deleteFromOccMutation, toast]);

  /** 범위 선택 다이얼로그 — "전체 반복 일정" 선택 */
  const handleLoopActionAll = useCallback(async () => {
    if (!loopActionDialog) return;
    const { action, schedule } = loopActionDialog;
    setLoopActionDialog(null);

    if (action === 'edit') {
      closeDetailModal();
      setCreateModal({
        open: true,
        mode: { kind: 'update', schedule },
      });
    } else {
      const ok = await confirmAfterLoopDialogClose({
        title: '전체 반복 일정을 삭제하시겠습니까?',
        message: '반복 시리즈와 예외, 참석자 정보가 함께 삭제됩니다.',
        confirmText: '삭제',
        cancelText: '취소',
        danger: true,
      });
      if (!ok) return;
      deleteMutation.mutate(schedule.schdSn, {
        onSuccess: () => {
          toast.success('전체 반복 일정이 삭제되었습니다.');
          closeDetailModal();
        },
        onError: (err) => {
          const message =
            (err as any)?.response?.data?.message ?? '삭제에 실패했습니다.';
          toast.error(message);
        },
      });
    }
  }, [loopActionDialog, confirmAfterLoopDialogClose, closeDetailModal, deleteMutation, toast]);

  // ─── 타이틀 계산 ──────────────────────────────────────────────────
  const titleText = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    if (activeView === 'week') {
      const sunDate = parseYmd(st);
      const satDate = parseYmd(end);
      const sy = sunDate.getFullYear();
      const sm = sunDate.getMonth() + 1;
      const sd = sunDate.getDate();
      const ey = satDate.getFullYear();
      const em = satDate.getMonth() + 1;
      const ed = satDate.getDate();
      return `${sy}.${pad(sm)}.${pad(sd)} ~ ${ey}.${pad(em)}.${pad(ed)}`;
    }
    if (activeView === 'day') {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      const d = current.getDate();
      const dow = DOW_LABELS[current.getDay()];
      return `${y}.${pad(m)}.${pad(d)} (${dow})`;
    }
    if (activeView === 'list') {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      const d = current.getDate();
      const dow = DOW_LABELS[current.getDay()];
      return `${y}.${pad(m)}.${pad(d)} (${dow}) 다가오는 일정`;
    }
    return `${current.getFullYear()}.${pad(current.getMonth() + 1)}`;
  }, [activeView, current, st, end]);

  // ─── 필터 핸들러 ──────────────────────────────────────────────────
  const handleCatToggle = useCallback((cat: CategoryKey, enabled: boolean) => {
    if (!enabled) return;
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleDeptItemToggle = useCallback((code: string) => {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (code === '_all') {
        return new Set<string>();
      }
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  /* ─── 공통 조각 ───────────────────────────────────────────── */

  const renderTodayBtn = () => (
    <TouchableOpacity
      style={[s.todayBtn, { borderColor: theme.border.default }]}
      activeOpacity={0.7}
      onPress={goToday}
    >
      <Text style={[s.todayBtnText, { color: theme.text.body }]}>오늘</Text>
    </TouchableOpacity>
  );

  const renderNav = () => (
    <View style={s.navGroup}>
      <TouchableOpacity style={s.navBtn} activeOpacity={0.6} onPress={goPrev}>
        <ChevronLeft size={18} color={theme.text.muted} />
      </TouchableOpacity>
      <Text style={[s.title, { color: theme.text.primary }]} numberOfLines={1}>
        {titleText}
      </Text>
      <TouchableOpacity style={s.navBtn} activeOpacity={0.6} onPress={goNext}>
        <ChevronRight size={18} color={theme.text.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderViewToggle = () => (
    <View
      style={[
        s.viewToggle,
        { borderColor: theme.border.default, backgroundColor: theme.bg.surfaceAlt },
      ]}
    >
      {VIEW_OPTIONS.filter((opt) => {
        if (isMobile && (opt.key === 'day' || opt.key === 'list')) return false;
        return true;
      }).map((opt) => {
        const active = opt.key === activeView;
        const enabled = opt.enabled;
        const textColor = active
          ? theme.text.onBrand
          : enabled
          ? theme.text.body
          : theme.text.subtle;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={enabled ? 0.7 : 1}
            disabled={!enabled}
            onPress={() => handleViewPress(opt.key, enabled)}
            style={[
              s.vtBtn,
              active && { backgroundColor: theme.brand.primary },
            ]}
          >
            <Text
              style={[
                s.vtText,
                { color: textColor },
                active && { fontWeight: fontWeight.semibold },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /** 새 일정 버튼 — 활성 */
  const renderAddBtn = () => (
    <TouchableOpacity
      onPress={handleAddBtnPress}
      activeOpacity={0.8}
      style={[
        s.addBtn,
        {
          borderColor: theme.brand.primary,
          backgroundColor: theme.brand.primary,
        },
      ]}
    >
      <Plus size={14} color={theme.text.onBrand} />
      <Text style={[s.addBtnText, { color: theme.text.onBrand }]}>새 일정</Text>
    </TouchableOpacity>
  );

  /** 카테고리 칩 — "업무" 활성 토글, "휴가" 비활성 + soon 배지 */
  const renderCatChips = () => (
    <View style={s.catChips}>
      {CATEGORY_CHIPS.map((c) => {
        const enabled = c.enabled;
        const active = enabled && activeCats.has(c.key);
        return (
          <TouchableOpacity
            key={c.key}
            activeOpacity={enabled ? 0.7 : 1}
            disabled={!enabled}
            onPress={() => handleCatToggle(c.key, enabled)}
            style={[
              s.catChip,
              !enabled
                ? {
                    borderColor: theme.border.default,
                    borderStyle: 'dashed',
                    backgroundColor: 'transparent',
                    opacity: 0.45,
                  }
                : active
                ? {
                    borderColor: theme.text.primary,
                    backgroundColor: theme.text.primary,
                  }
                : {
                    borderColor: theme.border.default,
                    backgroundColor: theme.bg.surface,
                  },
            ]}
          >
            <Text
              style={[
                s.catChipText,
                {
                  color: !enabled
                    ? theme.text.subtle
                    : active
                    ? theme.bg.surface
                    : theme.text.body,
                },
              ]}
            >
              {c.label}
            </Text>
            {!enabled && (
              <View style={[s.lockBadge, { backgroundColor: theme.bg.surfaceMute }]}>
                <Text style={[s.lockBadgeText, { color: theme.text.subtle }]}>soon</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /** 부서 트리거 — 클릭 시 트리거 위치 측정 후 팝업 열림 */
  const openDeptPop = () => {
    deptTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setDeptPopPos({
        top: y + height + 4,
        left: x,
        minWidth: Math.max(width, 200),
      });
      setDeptPopOpen(true);
    });
  };

  const renderDeptTrigger = () => {
    const count = selectedDepts.size;
    return (
      <View ref={deptTriggerRef} collapsable={false}>
        <TouchableOpacity
          onPress={openDeptPop}
          activeOpacity={0.7}
          style={[
            s.deptTrigger,
            {
              borderColor: theme.border.default,
              backgroundColor: theme.bg.surface,
            },
          ]}
        >
          <Text style={[s.deptTriggerText, { color: theme.text.body }]}>부서</Text>
          {count > 0 && (
            <View style={[s.deptCount, { backgroundColor: theme.brand.primary }]}>
              <Text style={[s.deptCountText, { color: theme.text.onBrand }]}>{count}</Text>
            </View>
          )}
          <ChevronDown size={12} color={theme.text.muted} />
        </TouchableOpacity>
      </View>
    );
  };

  /** 내 일정만 토글 — 클릭 가능 */
  const renderMineToggle = () => (
    <TouchableOpacity
      onPress={() => setMineOnly((v) => !v)}
      activeOpacity={0.7}
      style={s.mineToggle}
    >
      <Text style={[s.mineToggleLabel, { color: theme.text.muted }]}>내 일정만</Text>
      <View
        style={[
          s.switchTrack,
          {
            backgroundColor: mineOnly ? theme.brand.primary : theme.border.strong,
            alignItems: mineOnly ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        <View style={[s.switchThumb, { backgroundColor: '#FFFFFF' }]} />
      </View>
    </TouchableOpacity>
  );

  /** 부서 팝업 — Modal로 배치 (외부 클릭 닫힘 + RN absolute 한계 우회) */
  const renderDeptPop = () => (
    <Modal
      visible={deptPopOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setDeptPopOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setDeptPopOpen(false)}>
        <View style={s.deptPopBackdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                s.deptPop,
                {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.default,
                  top: deptPopPos.top,
                  left: deptPopPos.left,
                  minWidth: deptPopPos.minWidth,
                },
              ]}
            >
              {/* 전체 부서 */}
              <TouchableOpacity
                onPress={() => handleDeptItemToggle('_all')}
                activeOpacity={0.7}
                style={s.deptPopItem}
              >
                <View
                  style={[
                    s.deptPopCheck,
                    {
                      borderColor:
                        selectedDepts.size === 0
                          ? theme.brand.primary
                          : theme.border.strong,
                      backgroundColor:
                        selectedDepts.size === 0
                          ? theme.brand.primary
                          : 'transparent',
                    },
                  ]}
                >
                  {selectedDepts.size === 0 && (
                    <Check size={9} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[s.deptPopText, { color: theme.text.body }]}>
                  전체 부서
                </Text>
              </TouchableOpacity>

              <View style={[s.deptPopDivider, { backgroundColor: theme.border.subtle }]} />

              {/* 실제 부서 목록 */}
              <View>
                {depts.map((d) => {
                  const checked = selectedDepts.has(d.deptCd);
                  const color = getDeptColor(d.deptCd);
                  return (
                    <TouchableOpacity
                      key={d.deptCd}
                      onPress={() => handleDeptItemToggle(d.deptCd)}
                      activeOpacity={0.7}
                      style={s.deptPopItem}
                    >
                      <View
                        style={[
                          s.deptPopCheck,
                          {
                            borderColor: checked
                              ? theme.brand.primary
                              : theme.border.strong,
                            backgroundColor: checked
                              ? theme.brand.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        {checked && <Check size={9} color="#FFFFFF" />}
                      </View>
                      <View
                        style={[s.deptPopDot, { backgroundColor: color }]}
                      />
                      <Text style={[s.deptPopText, { color: theme.text.body }]}>
                        {d.deptNm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* 전체공개 (deptCd=null) */}
                <TouchableOpacity
                  onPress={() => handleDeptItemToggle(DEPT_NULL_KEY)}
                  activeOpacity={0.7}
                  style={s.deptPopItem}
                >
                  <View
                    style={[
                      s.deptPopCheck,
                      {
                        borderColor: selectedDepts.has(DEPT_NULL_KEY)
                          ? theme.brand.primary
                          : theme.border.strong,
                        backgroundColor: selectedDepts.has(DEPT_NULL_KEY)
                          ? theme.brand.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    {selectedDepts.has(DEPT_NULL_KEY) && (
                      <Check size={9} color="#FFFFFF" />
                    )}
                  </View>
                  <View
                    style={[
                      s.deptPopDot,
                      { backgroundColor: getDeptColor(null) },
                    ]}
                  />
                  <Text style={[s.deptPopText, { color: theme.text.body }]}>
                    전체공개
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  /* ─── 모바일 / 데스크톱 분기 ─────────────────────────────── */

  return (
    <View style={s.root}>
      {isMobile ? (
        <>
          {/* M1행: 오늘 · 좌 · 타이틀 · 우 · 새 일정 */}
          <View style={s.toolbarRow1}>
            {renderTodayBtn()}
            <View style={s.mobileCenter}>{renderNav()}</View>
            {renderAddBtn()}
          </View>

          {/* M2행: 뷰 토글 (가운데) */}
          <View style={s.toolbarMobileRow2}>{renderViewToggle()}</View>

          {/* M3행: 카테고리 칩 + 부서 + 내 일정만 */}
          <View style={[s.toolbarRow2, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.row2Left}>
              {renderCatChips()}
              {renderDeptTrigger()}
            </View>
            <View style={s.row2Right}>
              {renderMineToggle()}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* D1행: 오늘 · 이전/다음/타이틀 · 뷰토글 + 새 일정 */}
          <View style={s.toolbarRow1}>
            <View style={s.tbLeft}>{renderTodayBtn()}</View>
            <View style={s.tbCenter}>{renderNav()}</View>
            <View style={s.tbRight}>
              {renderViewToggle()}
              {renderAddBtn()}
            </View>
          </View>

          {/* D2행: 카테고리 칩 + 부서 드롭다운 + 내 일정만 */}
          <View style={[s.toolbarRow2, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.row2Left}>
              {renderCatChips()}
              {renderDeptTrigger()}
            </View>
            <View style={s.row2Right}>
              {renderMineToggle()}
            </View>
          </View>
        </>
      )}

      {/* 본문 */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={theme.brand.primary} />
        </View>
      ) : activeView === 'week' ? (
        <WeekView
          current={current}
          schedules={schedules}
          onSchedulePress={handleSchedulePress}
          onEmptyCellPress={handleEmptyCellPress}
        />
      ) : activeView === 'day' && !isMobile ? (
        <DayView
          current={current}
          schedules={schedules}
          onSchedulePress={handleSchedulePress}
          onEmptyCellPress={handleEmptyCellPress}
        />
      ) : activeView === 'list' && !isMobile ? (
        <ListView
          startYmd={toYmd(current)}
          schedules={schedules}
          listLimit={listLimit}
          onLoadMore={handleLoadMore}
          loadMoreStep={LIST_LOAD_STEP}
          onSchedulePress={handleSchedulePress}
          onEmptyCellPress={handleEmptyCellPress}
        />
      ) : (
        <MonthView
          current={current}
          schedules={schedules}
          onSchedulePress={handleSchedulePress}
          onEmptyCellPress={handleEmptyCellPress}
        />
      )}

      {/* 부서 팝업 */}
      {renderDeptPop()}

      {/* 등록/수정 모달 */}
      <ScheduleCreateModal
        open={createModal.open}
        mode={createModal.mode}
        onClose={() =>
          setCreateModal((prev) => ({ ...prev, open: false }))
        }
      />

      {/* 상세 모달 */}
      <ScheduleDetailModal
        open={detailModal.open}
        schdSn={detailModal.schdSn}
        occurrenceYmd={detailModal.occurrenceYmd}
        onClose={() =>
          setDetailModal({ open: false, schdSn: null, occurrenceYmd: null })
        }
        onEditPress={handleEditFromDetail}
        onDeleteLoop={handleDeleteLoopFromDetail}
      />

      {/* 반복 일정 범위 선택 다이얼로그 */}
      <LoopActionDialog
        data={loopActionDialog}
        onClose={() => setLoopActionDialog(null)}
        onThisOnly={handleLoopActionThisOnly}
        onFromHere={handleLoopActionFromHere}
        onAll={handleLoopActionAll}
      />
    </View>
  );
}

// ─── 반복 일정 범위 선택 다이얼로그 ────────────────────────────────────
interface LoopActionDialogProps {
  data: {
    open: boolean;
    action: 'edit' | 'delete';
    schedule: ScheduleResponse;
    occurrenceYmd: string;
  } | null;
  onClose: () => void;
  onThisOnly: () => void;
  onFromHere: () => void;
  onAll: () => void;
}

function LoopActionDialog({
  data,
  onClose,
  onThisOnly,
  onFromHere,
  onAll,
}: LoopActionDialogProps) {
  const theme = useTheme();
  if (!data || !data.open) return null;
  const action = data.action;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={loopDialogStyles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                loopDialogStyles.dialog,
                {
                  backgroundColor: theme.bg.surface,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Text
                style={[
                  loopDialogStyles.title,
                  { color: theme.text.primary },
                ]}
              >
                {action === 'edit' ? '반복 일정 수정' : '반복 일정 삭제'}
              </Text>
              <Text
                style={[
                  loopDialogStyles.message,
                  { color: theme.text.body },
                ]}
              >
                {action === 'edit'
                  ? '어느 범위까지 수정할까요?'
                  : '어느 범위까지 삭제할까요?'}
              </Text>

              <View style={loopDialogStyles.btnGroup}>
                <TouchableOpacity
                  onPress={onThisOnly}
                  activeOpacity={0.7}
                  style={[
                    loopDialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text
                    style={[
                      loopDialogStyles.optionBtnText,
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
                    loopDialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text
                    style={[
                      loopDialogStyles.optionBtnText,
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
                    loopDialogStyles.optionBtn,
                    {
                      borderColor:
                        action === 'delete'
                          ? theme.semantic.danger
                          : theme.brand.primary,
                      backgroundColor:
                        action === 'delete'
                          ? theme.semantic.danger
                          : theme.brand.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      loopDialogStyles.optionBtnText,
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
                style={loopDialogStyles.cancelBtn}
              >
                <Text
                  style={[
                    loopDialogStyles.cancelBtnText,
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

const loopDialogStyles = StyleSheet.create({
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

const makeStyles = (theme: AppTheme, isMobile: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg.surface,
    },
    // ── 1행 ──────────────────────────────────────────────
    toolbarRow1: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isMobile ? spacing.md : spacing.base,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      gap: isMobile ? spacing.sm : spacing.md,
      backgroundColor: theme.bg.surface,
    },
    tbLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    tbCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    tbRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    mobileCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    navGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
      flexShrink: 1,
    },
    todayBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    todayBtnText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.medium,
    },
    navBtn: {
      width: isMobile ? 28 : 32,
      height: isMobile ? 28 : 32,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: isMobile ? fontSize.bodyLg : fontSize.heading,
      fontWeight: fontWeight.bold,
      minWidth: isMobile ? 0 : 140,
      textAlign: 'center',
      flexShrink: 1,
    },
    toolbarMobileRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: theme.bg.surface,
    },
    viewToggle: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: 2,
    },
    vtBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.md,
    },
    vtText: {
      fontSize: fontSize.micro,
      fontWeight: fontWeight.medium,
    },
    // ── 새 일정 버튼 ──────────────────────────────────────
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 1,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    addBtnText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.semibold,
    },
    // ── 2행 ──────────────────────────────────────────────
    toolbarRow2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      paddingHorizontal: isMobile ? spacing.md : spacing.base,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      backgroundColor: theme.bg.surface,
    },
    row2Left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    row2Right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    catChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      flexWrap: 'wrap',
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md - 1,
      paddingVertical: 5,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    catChipText: {
      fontSize: fontSize.micro,
    },
    lockBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radius.sm,
    },
    lockBadgeText: {
      fontSize: 9,
      fontWeight: fontWeight.semibold,
    },
    deptTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    deptTriggerText: {
      fontSize: fontSize.micro,
    },
    deptCount: {
      minWidth: 16,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deptCountText: {
      fontSize: 10,
      fontWeight: fontWeight.bold,
    },
    deptPopBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    deptPop: {
      // 위치/너비는 트리거 measureInWindow 결과로 인라인 주입 (deptPopPos)
      position: 'absolute',
      maxWidth: 280,
      maxHeight: 360,
      borderWidth: 1,
      borderRadius: radius.lg + 2,
      padding: spacing.sm,
      gap: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
    },
    deptPopItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: radius.md,
    },
    deptPopCheck: {
      width: 14,
      height: 14,
      borderWidth: 1.5,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deptPopDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    deptPopText: {
      fontSize: fontSize.small,
    },
    deptPopDivider: {
      height: 1,
      marginVertical: 4,
    },
    // ── 내 일정만 토글 ────────────────────────────────────
    mineToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
    },
    mineToggleLabel: {
      fontSize: fontSize.micro,
    },
    switchTrack: {
      width: 30,
      height: 16,
      borderRadius: radius.full,
      padding: 2,
      justifyContent: 'center',
      flexDirection: 'row',
    },
    switchThumb: {
      width: 12,
      height: 12,
      borderRadius: radius.full,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
