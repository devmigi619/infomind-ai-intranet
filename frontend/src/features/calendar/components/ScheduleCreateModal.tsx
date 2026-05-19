import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
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
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
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
  const styles = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);
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
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View ref={modalRef} collapsable={false} style={styles.modal}>
              {/* 헤더 */}
              <View style={styles.modalHdr}>
                <Text style={[styles.modalHdrTitle, { color: theme.text.muted }]}>
                  {headerTitle}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={[
                    styles.modalIconBtn,
                    { backgroundColor: 'transparent' },
                  ]}
                >
                  <X size={16} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* 본문 */}
              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                {/* 제목 — 보더 없는 큰 폰트 + 하단 구분선 */}
                <View
                  style={[
                    styles.titleRow,
                    { borderBottomColor: theme.border.subtle },
                  ]}
                >
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="제목"
                    placeholderTextColor={theme.text.subtle}
                    style={[styles.inputTitle, { color: theme.text.primary }]}
                    autoFocus={Platform.OS === 'web'}
                  />
                </View>

                {/* 🕐 언제 */}
                <View
                  style={[
                    styles.iconRow,
                    styles.rowLayerTop,
                    { borderBottomColor: theme.border.subtle },
                  ]}
                >
                  <View style={styles.iconCell}>
                    <Clock size={18} color={theme.text.muted} />
                  </View>
                  <View style={styles.contentCell}>
                    {/* 날짜 입력 — 시작/종료 항상 노출. 같으면 단일, 다르면 멀티데이 */}
                    <View style={styles.dtRow}>
                      <TextInput
                        ref={startDateRef}
                        value={startDate}
                        onChangeText={setStartDate}
                        onFocus={() => openDatePicker('start')}
                        onPressIn={() => openDatePicker('start')}
                        placeholder="2026-05-19"
                        placeholderTextColor={theme.text.subtle}
                        style={[
                          styles.dtInputDate,
                          {
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                            color: theme.text.primary,
                          },
                        ]}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={[styles.dtSep, { color: theme.text.muted }]}>
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
                        style={[
                          styles.dtInputDate,
                          {
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                            color: theme.text.primary,
                          },
                        ]}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.dtRow}>
                      <TextInput
                        value={allday ? '' : startHm}
                        onChangeText={setStartHm}
                        placeholder={allday ? '' : '14:00'}
                        placeholderTextColor={theme.text.subtle}
                        editable={!allday}
                        style={[
                          styles.dtInput,
                          {
                            borderColor: theme.border.default,
                            backgroundColor: allday
                              ? theme.bg.surfaceAlt
                              : theme.bg.surface,
                            color: allday
                              ? theme.text.subtle
                              : theme.text.primary,
                            opacity: allday ? 0.65 : 1,
                          },
                        ]}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={[styles.dtSep, { color: theme.text.muted }]}>
                        ~
                      </Text>
                      <TextInput
                        value={allday ? '' : endHm}
                        onChangeText={setEndHm}
                        placeholder={allday ? '' : '15:00'}
                        placeholderTextColor={theme.text.subtle}
                        editable={!allday}
                        style={[
                          styles.dtInput,
                          {
                            borderColor: theme.border.default,
                            backgroundColor: allday
                              ? theme.bg.surfaceAlt
                              : theme.bg.surface,
                            color: allday
                              ? theme.text.subtle
                              : theme.text.primary,
                            opacity: allday ? 0.65 : 1,
                          },
                        ]}
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
                      style={styles.checkboxRow}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: allday
                              ? theme.brand.primary
                              : theme.border.strong,
                            backgroundColor: allday
                              ? theme.brand.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        {allday && (
                          <Text style={styles.checkboxMark}>✓</Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          { color: theme.text.body },
                        ]}
                      >
                        종일
                      </Text>
                    </TouchableOpacity>

                    {/* 반복 select */}
                    <View style={styles.loopSelectWrap}>
                      <TouchableOpacity
                        ref={loopTriggerRef}
                        onPress={toggleLoopDropdown}
                        activeOpacity={0.7}
                        style={[
                          styles.loopSelectTrigger,
                          {
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.loopSelectText,
                            { color: theme.text.body },
                          ]}
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
                  style={[
                    styles.iconRow,
                    styles.rowLayerMiddle,
                    { borderBottomColor: theme.border.subtle },
                  ]}
                >
                  <View style={styles.iconCell}>
                    <Users size={18} color={theme.text.muted} />
                  </View>
                  <View style={styles.contentCell}>
                    <TouchableOpacity
                      ref={attendeeTriggerRef}
                      activeOpacity={1}
                      onPress={openAttendeeDropdown}
                      style={[
                        styles.attdSearchWrap,
                        {
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                        },
                      ]}
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
                        style={[
                          styles.attdSearchInput,
                          { color: theme.text.primary },
                        ]}
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
                      <View style={styles.attdSelected}>
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
                                style={[
                                  styles.attdChip,
                                  {
                                    borderColor: theme.border.default,
                                    backgroundColor: theme.bg.surfaceAlt,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attdChipName,
                                    { color: theme.text.primary },
                                  ]}
                                >
                                  {uid}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoveAttendee(uid)}
                                  activeOpacity={0.6}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  style={styles.attdChipRemove}
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
                              style={[
                                styles.attdChip,
                                {
                                  borderColor: theme.border.default,
                                  backgroundColor: theme.bg.surfaceAlt,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.attdAvatarSmall,
                                  { backgroundColor: avatarColor + '1A' },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attdAvatarTextSmall,
                                    { color: avatarColor },
                                  ]}
                                >
                                  {n.name?.[0] ?? '?'}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.attdChipName,
                                  { color: theme.text.primary },
                                ]}
                              >
                                {n.name}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveAttendee(uid)}
                                activeOpacity={0.6}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                style={styles.attdChipRemove}
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
                  style={[styles.iconRow, { borderBottomColor: theme.border.subtle }]}
                >
                  <View style={styles.iconCell}>
                    <AlignLeft size={18} color={theme.text.muted} />
                  </View>
                  <View style={styles.contentCell}>
                    <TextInput
                      value={rmk}
                      onChangeText={setRmk}
                      placeholder="비고"
                      placeholderTextColor={theme.text.subtle}
                      style={[
                        styles.inputMemo,
                        {
                          borderColor: theme.border.default,
                          backgroundColor: theme.bg.surface,
                          color: theme.text.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* 🏢 부서 */}
                <View style={[styles.iconRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.iconCell}>
                    <Building2 size={18} color={theme.text.muted} />
                  </View>
                  <View style={styles.contentCell}>
                    <View style={styles.deptChips}>
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
                            style={[
                              styles.deptChip,
                              {
                                borderColor: active
                                  ? theme.text.primary
                                  : theme.border.default,
                                backgroundColor: active
                                  ? theme.text.primary
                                  : theme.bg.surface,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.deptChipDot,
                                {
                                  backgroundColor: active
                                    ? 'rgba(255,255,255,0.9)'
                                    : color,
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.deptChipText,
                                {
                                  color: active
                                    ? theme.bg.surface
                                    : theme.text.body,
                                },
                              ]}
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
                  <View style={styles.overlayDismissLayer}>
                    <TouchableWithoutFeedback>
                      <View
                        style={[
                          styles.datePickerPanel,
                          {
                            top: dateOverlayPos.top,
                            left: dateOverlayPos.left,
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                          },
                        ]}
                      >
                        <View style={styles.datePickerHeader}>
                          <View style={styles.datePickerTitleWrap}>
                            <CalendarDays size={14} color={theme.text.muted} />
                            <Text
                              style={[
                                styles.datePickerTitle,
                                { color: theme.text.body },
                              ]}
                            >
                              {datePickerMonth.getFullYear()}.
                              {String(datePickerMonth.getMonth() + 1).padStart(
                                2,
                                '0',
                              )}
                            </Text>
                          </View>
                          <View style={styles.datePickerNav}>
                            <TouchableOpacity
                              onPress={() =>
                                setDatePickerMonth((d) => addMonths(d, -1))
                              }
                              activeOpacity={0.7}
                              style={styles.datePickerNavBtn}
                            >
                              <ChevronLeft size={15} color={theme.text.muted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                setDatePickerMonth((d) => addMonths(d, 1))
                              }
                              activeOpacity={0.7}
                              style={styles.datePickerNavBtn}
                            >
                              <ChevronRight size={15} color={theme.text.muted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.datePickerGrid}>
                          {['일', '월', '화', '수', '목', '금', '토'].map(
                            (w) => (
                              <Text
                                key={w}
                                style={[
                                  styles.datePickerWeek,
                                  { color: theme.text.muted },
                                ]}
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
                                style={[
                                  styles.datePickerDay,
                                  selected && {
                                    backgroundColor: theme.brand.primary,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.datePickerDayText,
                                    {
                                      color: selected
                                        ? theme.text.onBrand
                                        : muted
                                        ? theme.text.subtle
                                        : theme.text.body,
                                      fontWeight: selected
                                        ? fontWeight.semibold
                                        : fontWeight.medium,
                                    },
                                  ]}
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
                  <View style={styles.overlayDismissLayer}>
                    <TouchableWithoutFeedback>
                      <View
                        style={[
                          styles.loopSelectMenu,
                          {
                            top: loopOverlayPos.top,
                            left: loopOverlayPos.left,
                            width: loopOverlayPos.width,
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                          },
                        ]}
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
                              style={[
                                styles.loopSelectItem,
                                active && {
                                  backgroundColor: theme.brand.primaryTint,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.loopSelectItemText,
                                  {
                                    color: active
                                      ? theme.brand.primary
                                      : theme.text.body,
                                    fontWeight: active
                                      ? fontWeight.semibold
                                      : fontWeight.medium,
                                  },
                                ]}
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
                  <View style={styles.overlayDismissLayer}>
                    <TouchableWithoutFeedback>
                      <View
                        style={[
                          styles.attdDropdown,
                          {
                            top: attdOverlayPos.top,
                            left: attdOverlayPos.left,
                            width: attdOverlayPos.width,
                            maxHeight: attdOverlayPos.maxHeight,
                            borderColor: theme.border.default,
                            backgroundColor: theme.bg.surface,
                          },
                        ]}
                      >
                        <View style={styles.attdDropdownHeader}>
                          <Text
                            style={[
                              styles.attdDropdownTitle,
                              { color: theme.text.muted },
                            ]}
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
                            style={[
                              styles.attdDropdownEmpty,
                              { color: theme.text.muted },
                            ]}
                          >
                            결과 없음
                          </Text>
                        ) : (
                          <ScrollView
                            style={[
                              styles.attdDropdownList,
                              {
                                maxHeight: Math.max(
                                  60,
                                  attdOverlayPos.maxHeight - 34,
                                ),
                              },
                            ]}
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
                                  style={[
                                    styles.attdDropdownItem,
                                    added && { opacity: 0.4 },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.attdAvatar,
                                      { backgroundColor: avatarColor + '1A' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.attdAvatarText,
                                        { color: avatarColor },
                                      ]}
                                    >
                                      {n.name?.[0] ?? '?'}
                                    </Text>
                                  </View>
                                  <View style={styles.attdInfo}>
                                    <Text
                                      style={[
                                        styles.attdName,
                                        { color: theme.text.primary },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {n.name}
                                    </Text>
                                    {!!n.department && (
                                      <Text
                                        style={[
                                          styles.attdDeptSub,
                                          { color: theme.text.muted },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {n.department}
                                      </Text>
                                    )}
                                  </View>
                                  {added && (
                                    <Text
                                      style={[
                                        styles.attdAddedTag,
                                        { color: theme.text.muted },
                                      ]}
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
                style={[
                  styles.modalFtr,
                  {
                    borderTopColor: theme.border.default,
                    backgroundColor: theme.bg.surfaceAlt,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={isPending}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: theme.brand.primary,
                      opacity: isPending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: theme.text.onBrand },
                    ]}
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
              <Text style={[dialogStyles.title, { color: theme.text.primary }]}>
                반복 일정 수정
              </Text>
              <Text style={[dialogStyles.message, { color: theme.text.body }]}>
                저장 범위를 선택해주세요.
              </Text>
              <View style={dialogStyles.btnGroup}>
                <TouchableOpacity
                  onPress={() => onSelect('one')}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text style={[dialogStyles.optionBtnText, { color: theme.text.primary }]}>
                    이 일정만
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onSelect('from')}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    { borderColor: theme.border.default },
                  ]}
                >
                  <Text style={[dialogStyles.optionBtnText, { color: theme.text.primary }]}>
                    이 일정부터 이후 전부
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onSelect('all')}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.optionBtn,
                    {
                      borderColor: theme.brand.primary,
                      backgroundColor: theme.brand.primary,
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
                <Text style={[dialogStyles.cancelBtnText, { color: theme.text.muted }]}>
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
              <Text style={[dialogStyles.title, { color: theme.text.primary }]}>
                저장하시겠습니까?
              </Text>
              <Text style={[dialogStyles.message, { color: theme.text.body }]}>
                입력한 수정사항을 저장합니다.
              </Text>
              <View style={dialogStyles.confirmRow}>
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.confirmBtn,
                    {
                      borderColor: theme.border.default,
                      backgroundColor: theme.bg.surface,
                    },
                  ]}
                >
                  <Text style={[dialogStyles.confirmBtnText, { color: theme.text.body }]}>
                    취소
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  style={[
                    dialogStyles.confirmBtn,
                    {
                      borderColor: theme.brand.primary,
                      backgroundColor: theme.brand.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      dialogStyles.confirmBtnText,
                      { color: theme.text.onBrand, fontWeight: fontWeight.semibold },
                    ]}
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
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
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
    gap: spacing.sm,
  },
  optionBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  optionBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  cancelBtn: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});

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
      maxHeight: isMobile ? '100%' : '94%',
      flexDirection: 'column',
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      overflow: 'hidden',
      // 모달 그림자
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.2,
      shadowRadius: 70,
      elevation: 24,
    },
    modalHdr: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 14,
      paddingBottom: 12,
      paddingHorizontal: spacing.lg,
    },
    modalHdrTitle: {
      fontSize: fontSize.bodyLg,
      fontWeight: fontWeight.semibold,
    },
    modalIconBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },

    // 제목 (보더 없는 큰 폰트)
    titleRow: {
      paddingTop: 4,
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    inputTitle: {
      paddingVertical: 8,
      fontSize: 20,
      fontWeight: fontWeight.semibold,
      // RN에서 outline 없음 — 기본 input
    } as any,

    // 아이콘 행
    iconRow: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      alignItems: 'flex-start',
      position: 'relative',
    },
    rowLayerTop: {
      zIndex: 30,
    },
    rowLayerMiddle: {
      zIndex: 20,
    },
    iconCell: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 4,
    },
    contentCell: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
    },

    // 날짜/시간 입력
    dtRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 10,
      flexWrap: 'wrap',
      minHeight: 34,
    },
    dtInputDate: {
      borderWidth: 1,
      borderRadius: radius.md + 1,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: fontSize.small,
      fontVariant: ['tabular-nums'] as any,
      minWidth: 0,
      flex: 1,
      flexBasis: 120,
    },
    dtInput: {
      borderWidth: 1,
      borderRadius: radius.md + 1,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: fontSize.small,
      fontVariant: ['tabular-nums'] as any,
      minWidth: 0,
      width: 110,
    },
    dtSep: {
      fontSize: fontSize.body,
      flexShrink: 0,
    },

    // 체크박스
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 2,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 3,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxMark: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: fontWeight.bold,
      lineHeight: 12,
    },
    checkboxLabel: {
      fontSize: fontSize.small,
    },

    // 반복 선택
    loopSelectWrap: {
      marginTop: 10,
      position: 'relative',
      zIndex: 5,
    },
    loopSelectTrigger: {
      minHeight: 38,
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    loopSelectText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.medium,
    },
    loopSelectMenu: {
      position: 'absolute',
      borderWidth: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
      zIndex: 90,
    },
    loopSelectItem: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    loopSelectItemText: {
      fontSize: fontSize.small,
    },

    // 참석자 검색 입력
    attdSearchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderRadius: radius.lg,
      minHeight: 40,
    },
    attdSearchInput: {
      flex: 1,
      fontSize: fontSize.small,
      paddingVertical: 0,
    },
    overlayDismissLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 80,
    },
    datePickerPanel: {
      position: 'absolute',
      width: 284,
      borderWidth: 1,
      borderRadius: radius.lg + 2,
      padding: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 12,
      zIndex: 90,
    },
    datePickerHeader: {
      height: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    datePickerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    datePickerTitle: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.semibold,
    },
    datePickerNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    datePickerNavBtn: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    datePickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    datePickerWeek: {
      width: `${100 / 7}%`,
      height: 24,
      textAlign: 'center',
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
    },
    datePickerDay: {
      width: `${100 / 7}%`,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    datePickerDayText: {
      fontSize: fontSize.small,
    },
    attdDropdown: {
      position: 'absolute',
      borderWidth: 1,
      borderRadius: radius.lg + 2,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 12,
      minHeight: 92,
      zIndex: 90,
    },
    attdDropdownHeader: {
      height: 34,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    attdDropdownTitle: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.medium,
    },
    attdDropdownList: {
      flexShrink: 1,
    },
    attdDropdownEmpty: {
      padding: 12,
      fontSize: fontSize.micro,
      textAlign: 'center',
    },
    attdDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
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
    attdInfo: {
      flex: 1,
      minWidth: 0,
    },
    attdName: {
      fontSize: fontSize.small,
    },
    attdDeptSub: {
      fontSize: fontSize.caption,
    },
    attdAddedTag: {
      fontSize: fontSize.caption,
    },
    attdSelected: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    attdChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    attdAvatarSmall: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attdAvatarTextSmall: {
      fontSize: 10,
      fontWeight: fontWeight.bold,
    },
    attdChipName: {
      fontSize: fontSize.micro,
      paddingRight: 6,
      paddingLeft: 2,
    },
    attdChipRemove: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // 비고
    inputMemo: {
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: fontSize.small,
    },

    // 부서 칩
    deptChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    deptChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    deptChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    deptChipText: {
      fontSize: fontSize.micro + 0.5,
    },

    // 푸터
    modalFtr: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderTopWidth: 1,
    },
    saveBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 9,
      borderRadius: radius.lg,
    },
    saveBtnText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.semibold,
    },
  });
