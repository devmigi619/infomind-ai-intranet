import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import {
  X,
  Clock,
  Users,
  AlignLeft,
  Building2,
  Search,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useToast } from '../../../shared/hooks/useToast';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { spacing } from '../../../shared/constants/spacing';
import { radius } from '../../../shared/constants/radius';
import { getDeptColor } from '../../../shared/constants/colors';
import { fmtYmdDash, dashToYmd } from '../../../shared/utils/date';
import { useUsers } from '../../users/api';
import {
  useCreateSchedule,
  useUpdateSchedule,
  useUpdateOccurrence,
  useUpdateFromOccurrence,
  useOrgDepartments,
  type ScheduleCreateRequest,
  type ScheduleResponse,
} from '../api';

/**
 * 일정 등록/수정 모달
 *
 * - 제목 (보더 없는 큰 폰트 + 하단 구분선)
 * - 🕐 언제: 시작일/종료일 텍스트 입력 (YYYY-MM-DD) + 종일 체크 + 시간 입력 + 반복 칩
 * - 👥 참석자: 검색 + 드롭다운 + 선택 칩
 * - ✎ 비고
 * - 🏢 부서: 단일 선택 칩 (재클릭 해제)
 */

type LoopType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type DateField = 'start' | 'end';

const LOOP_OPTIONS = ['', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const;

const LOOP_LABEL: Record<string, string> = {
  '': '반복 안함',
  DAY: '매일',
  WEEK: '매주',
  MONTH: '매월',
  YEAR: '매년',
};

/** "HHmm" → "HH:MM" */
function hrToHm(hr: string): string {
  if (!hr) return '';
  return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
}
/** "HH:MM" → "HHmm" */
function hmToHr(hm: string): string {
  return hm.replace(':', '');
}

/** "HHmm" 한 시간 더하기 (24:00 클램프 = 23:30) */
function addHourToHr(hr: string, h: number): string {
  const hh = parseInt(hr.slice(0, 2), 10);
  const mm = parseInt(hr.slice(2, 4), 10);
  let total = hh * 60 + mm + h * 60;
  if (total >= 24 * 60) total = 23 * 60 + 30;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}${String(nm).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" 형식 + 실제 유효 날짜인지 검증 */
function isValidDateDash(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
  if (m < 1 || m > 12) return false;
  const lastDay = new Date(y, m, 0).getDate();
  if (d < 1 || d > lastDay) return false;
  return true;
}

/** "HH:MM" 형식 + 실제 유효 시간인지 검증 */
function isValidTimeHm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(':').map((v) => parseInt(v, 10));
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

function parseDateDash(s: string): Date | null {
  if (!isValidDateDash(s)) return null;
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

function dateToDash(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

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

/** 모달 모드 — 새 일정 / 수정 / 이 일정만 / 이 일정부터 */
export type ScheduleEditMode =
  | { kind: 'create'; prefillYmd?: string }
  | { kind: 'update'; schedule: ScheduleResponse }
  | {
      kind: 'updateLoop';
      schedule: ScheduleResponse;
      occurrenceYmd: string;
    }
  | {
      kind: 'updateOccurrence';
      schedule: ScheduleResponse;
      occurrenceYmd: string;
    }
  | {
      kind: 'updateFromOccurrence';
      schedule: ScheduleResponse;
      occurrenceYmd: string;
    };

interface ScheduleCreateModalProps {
  open: boolean;
  mode: ScheduleEditMode;
  onClose: () => void;
}

type LoopSaveScope = 'one' | 'from' | 'all';

interface PendingSave {
  scope: LoopSaveScope | 'single';
  schedule: ScheduleResponse;
  occurrenceYmd?: string;
  payload: ScheduleCreateRequest;
}

export function ScheduleCreateModal({
  open,
  mode,
  onClose,
}: ScheduleCreateModalProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const toast = useToast();

  const { data: depts = [] } = useOrgDepartments();
  const { data: allUsers = [] } = useUsers();

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  const updateOccMutation = useUpdateOccurrence();
  const updateFromOccMutation = useUpdateFromOccurrence();
  const modalRef = useRef<any>(null);
  const loopTriggerRef = useRef<any>(null);
  const startDateRef = useRef<any>(null);
  const endDateRef = useRef<any>(null);
  const attendeeTriggerRef = useRef<any>(null);

  // ─── 폼 상태 ─────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }, [today]);
  const initialYmd = useMemo(() => {
    if (mode.kind === 'create') return mode.prefillYmd ?? todayYmd;
    if (
      mode.kind === 'updateLoop' ||
      mode.kind === 'updateOccurrence' ||
      mode.kind === 'updateFromOccurrence'
    ) {
      return mode.occurrenceYmd;
    }
    return mode.schedule.schdStYmd;
  }, [mode, todayYmd]);

  const [title, setTitle] = useState('');
  // 날짜 입력은 사용자 편의를 위해 "YYYY-MM-DD" 문자열로 보관, 저장 시 "YYYYMMDD"로 변환
  const [startDate, setStartDate] = useState(fmtYmdDash(initialYmd));
  const [endDate, setEndDate] = useState(fmtYmdDash(initialYmd));
  const [startHm, setStartHm] = useState('14:00');
  const [endHm, setEndHm] = useState('15:00');
  const [allday, setAllday] = useState(true);
  const [loopType, setLoopType] = useState<'' | LoopType>('');
  const [loopSelectOpen, setLoopSelectOpen] = useState(false);
  const [loopOverlayPos, setLoopOverlayPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [activeDateField, setActiveDateField] = useState<DateField | null>(
    null,
  );
  const [datePickerMonth, setDatePickerMonth] = useState(() => new Date());
  const [dateOverlayPos, setDateOverlayPos] = useState({
    top: 0,
    left: 0,
  });
  const [rmk, setRmk] = useState('');
  const [deptCode, setDeptCode] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [attdOverlayPos, setAttdOverlayPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 300,
  });
  const [pendingLoopPayload, setPendingLoopPayload] =
    useState<ScheduleCreateRequest | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  // ─── 모달 열릴 때 상태 초기화 ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    setPendingLoopPayload(null);
    setPendingSave(null);

    if (mode.kind === 'create') {
      const init = mode.prefillYmd ?? todayYmd;
      setTitle('');
      setStartDate(fmtYmdDash(init));
      setEndDate(fmtYmdDash(init));
      setStartHm('');
      setEndHm('');
      setAllday(true);
      setLoopType('');
      setRmk('');
      setDeptCode(null);
      setAttendees([]);
    } else {
      // 수정 모드 — 기존 일정 값 prefill
      const s = mode.schedule;
      const isOccurrenceMode =
        mode.kind === 'updateLoop' ||
        mode.kind === 'updateOccurrence' ||
        mode.kind === 'updateFromOccurrence';
      const baseYmd = isOccurrenceMode ? mode.occurrenceYmd : s.schdStYmd;
      setTitle(s.schdNm);
      setStartDate(fmtYmdDash(baseYmd));
      setEndDate(fmtYmdDash(isOccurrenceMode ? baseYmd : s.schdEndYmd));
      setStartHm(s.allday ? '' : hrToHm(s.schdStHr ?? '1400'));
      setEndHm(s.allday ? '' : hrToHm(s.schdEndHr ?? '1500'));
      setAllday(s.allday);
      setLoopType(
        mode.kind === 'updateOccurrence'
          ? ''
          : (s.loopYn === 'Y' ? (s.loopSe as LoopType) : '') ?? '',
      );
      setRmk(s.rmk ?? '');
      setDeptCode(s.deptCd ?? null);
      setAttendees(s.attendees.map((a) => a.attdUserId));
    }
    setSearchQuery('');
    setDropdownOpen(false);
    setLoopSelectOpen(false);
    setActiveDateField(null);
  }, [open, mode, todayYmd]);

  // ─── 참석자 ───────────────────────────────────────────────
  // 백엔드 응답이 `userId/userNm/deptCd`로 올 수도, axios 변환을 거쳐
  // 프론트 `UserInfo`(username/name/department)로 올 수도 있어 양쪽 모두 지원.
  const normalizeUser = (u: any) => {
    const userId: string = u.username ?? u.userId ?? '';
    const name: string = u.name ?? u.userNm ?? userId;
    const department: string = u.department ?? u.deptCd ?? '';
    return { userId, name, department };
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (allUsers as any[]).map((u) => ({ ...u, _n: normalizeUser(u) }));
    if (!q) return list;
    return list.filter(
      (u) =>
        u._n.name.toLowerCase().includes(q) ||
        u._n.userId.toLowerCase().includes(q),
    );
  }, [searchQuery, allUsers]);

  const datePickerDays = useMemo(
    () => buildMonthGrid(datePickerMonth),
    [datePickerMonth],
  );

  const measureUnderRef = (
    ref: React.RefObject<any>,
    widthHint: number | null,
    cb: (pos: { top: number; left: number; width: number; maxHeight: number }) => void,
  ) => {
    requestAnimationFrame(() => {
      modalRef.current?.measureInWindow((mx: number, my: number, mw: number, mh: number) => {
        ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          const panelWidth = widthHint ?? width;
          const rawLeft = x - mx;
          const left = Math.max(12, Math.min(rawLeft, mw - panelWidth - 12));
          const top = y - my + height + 4;
          cb({
            top,
            left,
            width: panelWidth,
            maxHeight: Math.max(180, Math.min(320, mh - top - 24)),
          });
        });
      });
    });
  };

  const closeFloatingPanels = () => {
    setLoopSelectOpen(false);
    setDropdownOpen(false);
    setActiveDateField(null);
  };

  const openDatePicker = (field: DateField) => {
    setLoopSelectOpen(false);
    setDropdownOpen(false);
    const value = field === 'start' ? startDate : endDate;
    const base = parseDateDash(value) ?? new Date();
    setDatePickerMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    const ref = field === 'start' ? startDateRef : endDateRef;
    measureUnderRef(ref, 284, ({ top, left }) => {
      setDateOverlayPos({ top, left });
      setActiveDateField(field);
    });
  };

  const selectDate = (date: Date) => {
    const next = dateToDash(date);
    if (activeDateField === 'start') {
      setStartDate(next);
    } else if (activeDateField === 'end') {
      setEndDate(next);
    }
    setActiveDateField(null);
  };

  const openLoopDropdown = () => {
    setDropdownOpen(false);
    setActiveDateField(null);
    measureUnderRef(loopTriggerRef, null, ({ top, left, width }) => {
      setLoopOverlayPos({ top, left, width });
      setLoopSelectOpen(true);
    });
  };

  const toggleLoopDropdown = () => {
    if (loopSelectOpen) {
      setLoopSelectOpen(false);
      return;
    }
    openLoopDropdown();
  };

  const handleAddAttendee = (userId: string) => {
    if (attendees.includes(userId)) return;
    setAttendees([...attendees, userId]);
    setSearchQuery('');
  };
  const handleRemoveAttendee = (userId: string) => {
    setAttendees(attendees.filter((id) => id !== userId));
  };
  const measureAttendeeOverlay = (afterMeasure?: () => void) => {
    measureUnderRef(attendeeTriggerRef, null, ({ top, left, width, maxHeight }) => {
      setAttdOverlayPos({
        top,
        left,
        width,
        maxHeight,
      });
      afterMeasure?.();
    });
  };
  const openAttendeeDropdown = () => {
    setLoopSelectOpen(false);
    setActiveDateField(null);
    measureAttendeeOverlay(() => setDropdownOpen(true));
  };
  const toggleAttendeeDropdown = () => {
    if (dropdownOpen) {
      setDropdownOpen(false);
      return;
    }
    openAttendeeDropdown();
  };

  const handleSuccess = (msg: string) => {
    toast.success(msg);
    setPendingLoopPayload(null);
    setPendingSave(null);
    onClose();
  };
  const handleError = (err: unknown) => {
    const message =
      (err as any)?.response?.data?.message ?? '저장에 실패했습니다.';
    toast.error(message);
  };

  const executePendingSave = () => {
    if (!pendingSave) return;
    const save = pendingSave;
    setPendingSave(null);

    if (save.scope === 'single') {
      updateMutation.mutate(
        { schdSn: save.schedule.schdSn, data: save.payload },
        {
          onSuccess: () => handleSuccess('일정이 수정되었습니다.'),
          onError: handleError,
        },
      );
    } else if (save.scope === 'one' && save.occurrenceYmd) {
      updateOccMutation.mutate(
        {
          schdSn: save.schedule.schdSn,
          occurrenceYmd: save.occurrenceYmd,
          data: { ...save.payload, loopYn: 'N', loopSe: undefined },
        },
        {
          onSuccess: () => handleSuccess('이 일정만 수정되었습니다.'),
          onError: handleError,
        },
      );
    } else if (save.scope === 'from' && save.occurrenceYmd) {
      updateFromOccMutation.mutate(
        {
          schdSn: save.schedule.schdSn,
          occurrenceYmd: save.occurrenceYmd,
          data: { ...save.payload, loopYn: 'Y' },
        },
        {
          onSuccess: () =>
            handleSuccess('이 일정부터 이후 전부 수정되었습니다.'),
          onError: handleError,
        },
      );
    } else if (save.scope === 'all') {
      updateMutation.mutate(
        { schdSn: save.schedule.schdSn, data: save.payload },
        {
          onSuccess: () => handleSuccess('전체 반복 일정이 수정되었습니다.'),
          onError: handleError,
        },
      );
    }
  };

  const handleLoopSaveScope = (scope: LoopSaveScope) => {
    if (!pendingLoopPayload || mode.kind !== 'updateLoop') return;
    setPendingSave({
      scope,
      schedule: mode.schedule,
      occurrenceYmd: mode.occurrenceYmd,
      payload: pendingLoopPayload,
    });
    setPendingLoopPayload(null);
  };

  // ─── 저장 ─────────────────────────────────────────────────
  const handleSave = () => {
    const t = title.trim();
    if (!t) {
      toast.error('일정 제목을 입력해주세요.');
      return;
    }

    // 날짜 형식 검증
    if (!isValidDateDash(startDate)) {
      toast.error('시작 날짜를 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }
    if (!isValidDateDash(endDate)) {
      toast.error('종료 날짜를 YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }

    const startYmd = dashToYmd(startDate);
    const endYmd = dashToYmd(endDate);

    if (endYmd < startYmd) {
      toast.error('종료 날짜는 시작 날짜와 같거나 이후여야 합니다.');
      return;
    }
    if (loopType && startYmd !== endYmd) {
      toast.error('반복 일정은 하루 일정만 등록할 수 있습니다.');
      return;
    }

    // 시간 입력 검증 (종일 OFF일 때만)
    let stHr: string | undefined;
    let endHrVal: string | undefined;
    if (!allday) {
      if (!startHm.trim() || !endHm.trim()) {
        toast.error('시간 일정은 시작 시간과 종료 시간을 입력해주세요.');
        return;
      }
      if (!isValidTimeHm(startHm)) {
        toast.error('시작 시간을 HH:MM 형식으로 입력해주세요.');
        return;
      }
      if (!isValidTimeHm(endHm)) {
        toast.error('종료 시간을 HH:MM 형식으로 입력해주세요.');
        return;
      }
      stHr = hmToHr(startHm);
      endHrVal = hmToHr(endHm);
      // 시간 일정인데 종료가 시작보다 빠르면 보정
      if (endHrVal <= stHr) {
        endHrVal = addHourToHr(stHr, 1);
      }
    }

    const payload: ScheduleCreateRequest = {
      schdNm: t,
      deptCd: deptCode || undefined,
      schdStYmd: startYmd,
      schdStHr: stHr,
      schdEndYmd: endYmd,
      schdEndHr: endHrVal,
      loopYn: loopType ? 'Y' : 'N',
      loopSe: loopType ? (loopType as LoopType) : undefined,
      rmk: rmk.trim() || undefined,
      attendeeUserIds: attendees,
    };

    if (mode.kind === 'create') {
      createMutation.mutate(payload, {
        onSuccess: () => handleSuccess(`"${t}" 일정이 등록되었습니다.`),
        onError: handleError,
      });
    } else if (mode.kind === 'update') {
      setPendingSave({ scope: 'single', schedule: mode.schedule, payload });
    } else if (mode.kind === 'updateLoop') {
      setPendingLoopPayload(payload);
    } else if (mode.kind === 'updateOccurrence') {
      setPendingSave({
        scope: 'one',
        schedule: mode.schedule,
        occurrenceYmd: mode.occurrenceYmd,
        payload,
      });
    } else {
      setPendingSave({
        scope: 'from',
        schedule: mode.schedule,
        occurrenceYmd: mode.occurrenceYmd,
        payload,
      });
    }
  };

  const headerTitle =
    mode.kind === 'create'
      ? '새 일정'
      : mode.kind === 'updateLoop'
      ? '반복 일정 수정'
      : mode.kind === 'updateOccurrence'
      ? '이 일정만 수정'
      : mode.kind === 'updateFromOccurrence'
      ? '이 일정부터 이후 전부 수정'
      : '일정 수정';

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateOccMutation.isPending ||
    updateFromOccMutation.isPending;

  // ─── 렌더 ─────────────────────────────────────────────────
  return (
    <>
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
                ref={modalRef}
                collapsable={false}
                style={{
                  backgroundColor: theme.bg.surface,
                  maxHeight: isMobile ? '100%' : '94%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 24 },
                  shadowOpacity: 0.2,
                  shadowRadius: 70,
                  elevation: 24,
                }}
                className="w-full max-w-[480px] flex-col rounded-[14px] overflow-hidden"
              >
              {/* 헤더 */}
              <View className="flex-row items-center justify-between pt-[14px] pb-[12px] px-6">
                <Text style={{ color: theme.text.muted }} className="text-[16px] font-semibold">
                  {headerTitle}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{ backgroundColor: 'transparent' }}
                  className="w-[30px] h-[30px] rounded-lg items-center justify-center"
                >
                  <X size={16} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* 본문 */}
              <ScrollView
                className="px-6 pb-4"
                keyboardShouldPersistTaps="handled"
              >
                {/* 제목 — 보더 없는 큰 폰트 + 하단 구분선 */}
                <View
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="pt-1 pb-[14px] border-b"
                >
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="제목"
                    placeholderTextColor={theme.text.subtle}
                    style={{ color: theme.text.primary }}
                    className="py-2 text-[20px] font-semibold"
                    autoFocus={Platform.OS === 'web'}
                  />
                </View>

                {/* 🕐 언제 */}
                <View
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="flex-row gap-3.5 py-3.5 border-b items-start relative z-30"
                >
                  <View className="w-7 items-center justify-start pt-1">
                    <Clock size={18} color={theme.text.muted} />
                  </View>
                  <View className="flex-1 min-w-0 relative">
                    {/* 날짜 입력 — 시작/종료 항상 노출. 같으면 단일, 다르면 멀티데이 */}
                    <View className="flex-row items-center gap-2 mb-2.5 flex-wrap min-h-[34px]">
                      <TextInput
                        ref={startDateRef}
                        value={startDate}
                        onChangeText={setStartDate}
                        onFocus={() => openDatePicker('start')}
                        onPressIn={() => openDatePicker('start')}
                        placeholder="2026-05-19"
                        placeholderTextColor={theme.text.subtle}
                        style={{
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          color: theme.text.primary,
                        }}
                        className="border rounded-[7px] px-2.5 py-1.5 text-[14px] flex-1 basis-[120px] min-w-0"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={{ color: theme.text.muted }} className="text-[15px] shrink-0">
                        ~
                      </Text>
                      <TextInput
                        ref={endDateRef}
                        value={endDate}
                        onChangeText={setEndDate}
                        onFocus={() => openDatePicker('end')}
                        onPressIn={() => openDatePicker('end')}
                        placeholder="2026-05-19"
                        placeholderTextColor={theme.text.subtle}
                        style={{
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          color: theme.text.primary,
                        }}
                        className="border rounded-[7px] px-2.5 py-1.5 text-[14px] flex-1 basis-[120px] min-w-0"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View className="flex-row items-center gap-2 mb-2.5 flex-wrap min-h-[34px]">
                      <TextInput
                        value={allday ? '' : startHm}
                        onChangeText={setStartHm}
                        placeholder={allday ? '' : '14:00'}
                        placeholderTextColor={theme.text.subtle}
                        editable={!allday}
                        style={{
                          borderColor: theme.border.default,
                          backgroundColor: allday
                            ? theme.bg.surfaceAlt
                            : theme.bg.surface,
                          color: allday
                            ? theme.text.subtle
                            : theme.text.primary,
                          opacity: allday ? 0.65 : 1,
                        }}
                        className="border rounded-[7px] px-2.5 py-1.5 text-[14px] w-[110px] min-w-0"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={{ color: theme.text.muted }} className="text-[15px] shrink-0">
                        ~
                      </Text>
                      <TextInput
                        value={allday ? '' : endHm}
                        onChangeText={setEndHm}
                        placeholder={allday ? '' : '15:00'}
                        placeholderTextColor={theme.text.subtle}
                        editable={!allday}
                        style={{
                          borderColor: theme.border.default,
                          backgroundColor: allday
                            ? theme.bg.surfaceAlt
                            : theme.bg.surface,
                          color: allday
                            ? theme.text.subtle
                            : theme.text.primary,
                          opacity: allday ? 0.65 : 1,
                        }}
                        className="border rounded-[7px] px-2.5 py-1.5 text-[14px] w-[110px] min-w-0"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {/* 종일 체크 */}
                    <TouchableOpacity
                      onPress={() => {
                        setAllday((v) => {
                          const next = !v;
                          if (next) {
                            setStartHm('');
                            setEndHm('');
                          }
                          return next;
                        });
                      }}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-1.5 pt-0.5"
                    >
                      <View
                        style={{
                          borderColor: allday
                            ? theme.brand.primary
                            : theme.border.strong,
                          backgroundColor: allday
                            ? theme.brand.primary
                            : 'transparent',
                        }}
                        className="w-4 h-4 rounded-[3px] border-[1.5px] items-center justify-center"
                      >
                        {allday && (
                          <Text className="text-white text-[11px] font-bold leading-3">✓</Text>
                        )}
                      </View>
                      <Text
                        style={{ color: theme.text.body }}
                        className="text-[14px]"
                      >
                        종일
                      </Text>
                    </TouchableOpacity>

                    {/* 반복 select */}
                    <View className="mt-2.5 relative z-10">
                      <TouchableOpacity
                        ref={loopTriggerRef}
                        onPress={toggleLoopDropdown}
                        activeOpacity={0.7}
                        style={{
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                        }}
                        className="min-h-[38px] border rounded-lg px-3 flex-row items-center justify-between"
                      >
                        <Text
                          style={{ color: theme.text.body }}
                          className="text-[14px] font-medium"
                        >
                          {LOOP_LABEL[loopType]}
                        </Text>
                        {loopSelectOpen ? (
                          <ChevronUp size={14} color={theme.text.muted} />
                        ) : (
                          <ChevronDown size={14} color={theme.text.muted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* 👥 참석자 */}
                <View
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="flex-row gap-3.5 py-3.5 border-b items-start relative z-20"
                >
                  <View className="w-7 items-center justify-start pt-1">
                    <Users size={18} color={theme.text.muted} />
                  </View>
                  <View className="flex-1 min-w-0 relative">
                    <TouchableOpacity
                      ref={attendeeTriggerRef}
                      activeOpacity={1}
                      onPress={openAttendeeDropdown}
                      style={{
                        borderColor: theme.border.default,
                        backgroundColor: theme.bg.surface,
                      }}
                      className="flex-row items-center gap-2 px-3 py-[9px] border rounded-lg min-h-[40px]"
                    >
                      <Search size={13} color={theme.text.muted} />
                      <TextInput
                        value={searchQuery}
                        onChangeText={(v) => {
                          setSearchQuery(v);
                          openAttendeeDropdown();
                        }}
                        onFocus={openAttendeeDropdown}
                        placeholder="이름으로 검색"
                        placeholderTextColor={theme.text.subtle}
                        style={{ color: theme.text.primary }}
                        className="flex-1 text-[14px] py-0"
                      />
                      <TouchableOpacity
                        onPress={toggleAttendeeDropdown}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        {dropdownOpen ? (
                          <ChevronUp size={14} color={theme.text.muted} />
                        ) : (
                          <ChevronDown size={14} color={theme.text.muted} />
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {/* 선택된 참석자 칩 */}
                    {attendees.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-2">
                        {attendees.map((uid) => {
                          const found = (allUsers as any[]).find((x: any) => {
                            const n = normalizeUser(x);
                            return n.userId === uid;
                          });
                          if (!found) {
                            // 사용자 정보 없으면 ID만 표시
                            return (
                              <View
                                key={uid}
                                style={{
                                  borderColor: theme.border.default,
                                  backgroundColor: theme.bg.surfaceAlt,
                                }}
                                className="flex-row items-center gap-1.5 px-1 py-[3px] rounded-full border"
                              >
                                <Text
                                  style={{ color: theme.text.primary }}
                                  className="text-[10px] pr-1.5 pl-0.5"
                                >
                                  {uid}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoveAttendee(uid)}
                                  activeOpacity={0.6}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  className="w-[18px] h-[18px] rounded-full items-center justify-center"
                                >
                                  <X size={10} color={theme.text.muted} />
                                </TouchableOpacity>
                              </View>
                            );
                          }
                          const n = normalizeUser(found);
                          const avatarColor = getDeptColor(n.department);
                          return (
                            <View
                              key={uid}
                              style={{
                                borderColor: theme.border.default,
                                backgroundColor: theme.bg.surfaceAlt,
                              }}
                              className="flex-row items-center gap-1.5 px-1 py-[3px] rounded-full border"
                            >
                              <View
                                style={{ backgroundColor: avatarColor + '1A' }}
                                className="w-5 h-5 rounded-full items-center justify-center"
                              >
                                <Text
                                  style={{ color: avatarColor }}
                                  className="text-[10px] font-bold"
                                >
                                  {n.name?.[0] ?? '?'}
                                </Text>
                              </View>
                              <Text
                                style={{ color: theme.text.primary }}
                                className="text-[10px] pr-1.5 pl-0.5"
                              >
                                {n.name}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveAttendee(uid)}
                                activeOpacity={0.6}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                className="w-[18px] h-[18px] rounded-full items-center justify-center"
                              >
                                <X size={10} color={theme.text.muted} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>

                {/* ✎ 비고 */}
                <View
                  style={{ borderBottomColor: theme.border.subtle }}
                  className="flex-row gap-3.5 py-3.5 border-b items-start relative"
                >
                  <View className="w-7 items-center justify-start pt-1">
                    <AlignLeft size={18} color={theme.text.muted} />
                  </View>
                  <View className="flex-1 min-w-0 relative">
                    <TextInput
                      value={rmk}
                      onChangeText={setRmk}
                      placeholder="비고"
                      placeholderTextColor={theme.text.subtle}
                      style={{
                        borderColor: theme.border.default,
                        backgroundColor: theme.bg.surface,
                        color: theme.text.primary,
                      }}
                      className="border rounded-lg px-3 py-[9px] text-[14px]"
                    />
                  </View>
                </View>

                {/* 🏢 부서 */}
                <View className="flex-row gap-3.5 py-3.5 border-b-0 items-start relative">
                  <View className="w-7 items-center justify-start pt-1">
                    <Building2 size={18} color={theme.text.muted} />
                  </View>
                  <View className="flex-1 min-w-0 relative">
                    <View className="flex-row flex-wrap gap-1.5">
                      {depts.map((d) => {
                        const active = deptCode === d.deptCd;
                        const color = getDeptColor(d.deptCd);
                        return (
                          <TouchableOpacity
                            key={d.deptCd}
                            activeOpacity={0.7}
                            onPress={() =>
                              setDeptCode(active ? null : d.deptCd)
                            }
                            style={{
                              borderColor: active ? theme.text.primary : theme.border.default,
                              backgroundColor: active ? theme.text.primary : theme.bg.surface,
                            }}
                            className="flex-row items-center gap-1.5 px-3 py-[5px] rounded-full border"
                          >
                            <View
                              style={{
                                backgroundColor: active
                                  ? 'rgba(255,255,255,0.9)'
                                  : color,
                              }}
                              className="w-2 h-2 rounded-full"
                            />
                            <Text
                              style={{
                                color: active
                                  ? theme.bg.surface
                                  : theme.text.body,
                              }}
                              className="text-[10.5px]"
                            >
                              {d.deptNm}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {activeDateField && (
                <TouchableWithoutFeedback onPress={() => setActiveDateField(null)}>
                  <View className="absolute inset-0 z-[80]">
                    <TouchableWithoutFeedback>
                      <View
                        style={{
                          top: dateOverlayPos.top,
                          left: dateOverlayPos.left,
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.12,
                          shadowRadius: 28,
                          elevation: 12,
                        }}
                        className="absolute w-[284px] border rounded-[10px] p-2.5 z-[90]"
                      >
                        <View className="h-[30px] flex-row items-center justify-between mb-1.5">
                          <View className="flex-row items-center gap-1.5">
                            <CalendarDays size={14} color={theme.text.muted} />
                            <Text
                              style={{ color: theme.text.body }}
                              className="text-[14px] font-semibold"
                            >
                              {datePickerMonth.getFullYear()}.
                              {String(datePickerMonth.getMonth() + 1).padStart(
                                2,
                                '0',
                              )}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-0.5">
                            <TouchableOpacity
                              onPress={() =>
                                setDatePickerMonth((d) => addMonths(d, -1))
                              }
                              activeOpacity={0.7}
                              className="w-[26px] h-[26px] items-center justify-center rounded-[6px]"
                            >
                              <ChevronLeft size={15} color={theme.text.muted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                setDatePickerMonth((d) => addMonths(d, 1))
                              }
                              activeOpacity={0.7}
                              className="w-[26px] h-[26px] items-center justify-center rounded-[6px]"
                            >
                              <ChevronRight size={15} color={theme.text.muted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View className="flex-row flex-wrap">
                          {['일', '월', '화', '수', '목', '금', '토'].map(
                            (w) => (
                              <Text
                                key={w}
                                style={{ color: theme.text.muted }}
                                className="w-[14.28%] h-6 text-center text-[12px] font-medium"
                              >
                                {w}
                              </Text>
                            ),
                          )}
                          {datePickerDays.map((d) => {
                            const dash = dateToDash(d);
                            const selected =
                              dash ===
                              (activeDateField === 'start'
                                ? startDate
                                : endDate);
                            const muted =
                              d.getMonth() !== datePickerMonth.getMonth();
                            return (
                              <TouchableOpacity
                                key={dash}
                                onPress={() => selectDate(d)}
                                activeOpacity={0.7}
                                style={selected ? { backgroundColor: theme.brand.primary } : undefined}
                                className="w-[14.28%] h-[30px] items-center justify-center rounded-[6px]"
                              >
                                <Text
                                  style={{
                                    color: selected
                                      ? theme.text.onBrand
                                      : muted
                                      ? theme.text.subtle
                                      : theme.text.body,
                                    fontWeight: selected
                                      ? fontWeight.semibold
                                      : fontWeight.medium,
                                  }}
                                  className="text-[14px]"
                                >
                                  {d.getDate()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              )}

              {loopSelectOpen && (
                <TouchableWithoutFeedback onPress={() => setLoopSelectOpen(false)}>
                  <View className="absolute inset-0 z-[80]">
                    <TouchableWithoutFeedback>
                      <View
                        style={{
                          top: loopOverlayPos.top,
                          left: loopOverlayPos.left,
                          width: loopOverlayPos.width,
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.12,
                          shadowRadius: 28,
                          elevation: 8,
                        }}
                        className="absolute border rounded-lg overflow-hidden z-[90]"
                      >
                        {LOOP_OPTIONS.map((opt) => {
                          const active = loopType === opt;
                          return (
                            <TouchableOpacity
                              key={opt || 'none'}
                              onPress={() => {
                                setLoopType(opt as LoopType | '');
                                setLoopSelectOpen(false);
                              }}
                              activeOpacity={0.7}
                              style={active ? { backgroundColor: theme.brand.primaryTint } : undefined}
                              className="min-h-[38px] justify-center px-3"
                            >
                              <Text
                                style={{
                                  color: active
                                    ? theme.brand.primary
                                    : theme.text.body,
                                  fontWeight: active
                                    ? fontWeight.semibold
                                    : fontWeight.medium,
                                }}
                                className="text-[14px]"
                              >
                                {LOOP_LABEL[opt]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              )}

              {dropdownOpen && (
                <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
                  <View className="absolute inset-0 z-[80]">
                    <TouchableWithoutFeedback>
                      <View
                        style={{
                          top: attdOverlayPos.top,
                          left: attdOverlayPos.left,
                          width: attdOverlayPos.width,
                          maxHeight: attdOverlayPos.maxHeight,
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.12,
                          shadowRadius: 28,
                          elevation: 12,
                        }}
                        className="absolute border rounded-[10px] overflow-hidden min-h-[92px] z-[90]"
                      >
                        <View className="h-[34px] px-3 flex-row items-center justify-between">
                          <Text
                            style={{ color: theme.text.muted }}
                            className="text-[12px] font-medium"
                          >
                            참석자 추가
                          </Text>
                          <TouchableOpacity
                            onPress={() => setDropdownOpen(false)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <X size={13} color={theme.text.muted} />
                          </TouchableOpacity>
                        </View>
                        {filteredUsers.length === 0 ? (
                          <Text
                            style={{ color: theme.text.muted }}
                            className="p-3 text-[10px] text-center"
                          >
                            결과 없음
                          </Text>
                        ) : (
                          <ScrollView
                            style={{
                              maxHeight: Math.max(
                                60,
                                attdOverlayPos.maxHeight - 34,
                              ),
                            }}
                            className="shrink"
                            nestedScrollEnabled
                          >
                            {filteredUsers.map((u: any) => {
                              const n = u._n;
                              const added = attendees.includes(n.userId);
                              const avatarColor = getDeptColor(n.department);
                              return (
                                <TouchableOpacity
                                  key={n.userId}
                                  activeOpacity={added ? 1 : 0.7}
                                  disabled={added}
                                  onPress={() => handleAddAttendee(n.userId)}
                                  style={added ? { opacity: 0.4 } : undefined}
                                  className="flex-row items-center gap-2.5 px-3 py-2"
                                >
                                  <View
                                    style={{ backgroundColor: avatarColor + '1A' }}
                                    className="w-[26px] h-[26px] rounded-[13px] items-center justify-center"
                                  >
                                    <Text
                                      style={{ color: avatarColor }}
                                      className="text-[11px] font-bold"
                                    >
                                      {n.name?.[0] ?? '?'}
                                    </Text>
                                  </View>
                                  <View className="flex-1 min-w-0">
                                    <Text
                                      style={{ color: theme.text.primary }}
                                      className="text-[14px]"
                                      numberOfLines={1}
                                    >
                                      {n.name}
                                    </Text>
                                    {!!n.department && (
                                      <Text
                                        style={{ color: theme.text.muted }}
                                        className="text-[12px]"
                                        numberOfLines={1}
                                      >
                                        {n.department}
                                      </Text>
                                    )}
                                  </View>
                                  {added && (
                                    <Text
                                      style={{ color: theme.text.muted }}
                                      className="text-[12px]"
                                    >
                                      추가됨
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              )}

              {/* 푸터 — 저장만 */}
              <View
                style={{
                  borderTopColor: theme.border.default,
                  backgroundColor: theme.bg.surfaceAlt,
                }}
                className="flex-row justify-end px-6 py-3.5 border-t"
              >
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={isPending}
                  style={{
                    backgroundColor: theme.brand.primary,
                    opacity: isPending ? 0.6 : 1,
                  }}
                  className="px-6 py-[9px] rounded-lg"
                >
                  <Text
                    style={{ color: theme.text.onBrand }}
                    className="text-[14px] font-semibold"
                  >
                    저장
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <LoopSaveRangeDialog
        open={!!pendingLoopPayload}
        onClose={() => setPendingLoopPayload(null)}
        onSelect={handleLoopSaveScope}
      />
      <SaveConfirmDialog
        open={!!pendingSave}
        onCancel={() => setPendingSave(null)}
        onConfirm={executePendingSave}
      />
    </>
  );
}

function LoopSaveRangeDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (scope: LoopSaveScope) => void;
}) {
  const theme = useTheme();
  if (!open) return null;

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
              className="w-full max-w-[360px] border rounded-[16px] p-6 gap-4"
            >
              <Text style={{ color: theme.text.primary }} className="text-[16px] font-semibold">
                반복 일정 수정
              </Text>
              <Text style={{ color: theme.text.body }} className="text-[14px] leading-[21px]">
                저장 범위를 선택해주세요.
              </Text>
              <View className="flex-col gap-2">
                <TouchableOpacity
                  onPress={() => onSelect('one')}
                  activeOpacity={0.7}
                  style={{ borderColor: theme.border.default }}
                  className="min-h-[42px] border rounded-lg items-center justify-center px-4"
                >
                  <Text style={{ color: theme.text.primary }} className="text-[14px] font-medium">
                    이 일정만
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onSelect('from')}
                  activeOpacity={0.7}
                  style={{ borderColor: theme.border.default }}
                  className="min-h-[42px] border rounded-lg items-center justify-center px-4"
                >
                  <Text style={{ color: theme.text.primary }} className="text-[14px] font-medium">
                    이 일정부터 이후 전부
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onSelect('all')}
                  activeOpacity={0.7}
                  style={{
                    borderColor: theme.brand.primary,
                    backgroundColor: theme.brand.primary,
                  }}
                  className="min-h-[42px] border rounded-lg items-center justify-center px-4"
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
                <Text style={{ color: theme.text.muted }} className="text-[14px]">
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

function SaveConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  if (!open) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} className="flex-1 items-center justify-center p-6">
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: theme.bg.surface,
                borderColor: theme.border.default,
              }}
              className="w-full max-w-[360px] border rounded-[16px] p-6 gap-4"
            >
              <Text style={{ color: theme.text.primary }} className="text-[16px] font-semibold">
                저장하시겠습니까?
              </Text>
              <Text style={{ color: theme.text.body }} className="text-[14px] leading-[21px]">
                입력한 수정사항을 저장합니다.
              </Text>
              <View className="flex-row gap-2 mt-1">
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  style={{
                    borderColor: theme.border.default,
                    backgroundColor: theme.bg.surface,
                  }}
                  className="flex-1 h-10 border rounded-lg items-center justify-center"
                >
                  <Text style={{ color: theme.text.body }} className="text-[14px] font-medium">
                    취소
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  style={{
                    borderColor: theme.brand.primary,
                    backgroundColor: theme.brand.primary,
                  }}
                  className="flex-1 h-10 border rounded-lg items-center justify-center"
                >
                  <Text
                    style={{ color: theme.text.onBrand, fontWeight: fontWeight.semibold }}
                    className="text-[14px]"
                  >
                    저장
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

