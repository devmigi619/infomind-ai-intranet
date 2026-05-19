import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { getDeptColor } from '../../../shared/constants/colors';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import {
  toYmd,
  addDays,
  DOW_LABELS,
  WEEKEND_COLORS,
} from '../../../shared/utils/date';
import type { ScheduleResponse } from '../api';
import {
  MONTH_CELL_MIN_HEIGHT,
  LANE_HEIGHT,
  LANE_TOP_OFFSET,
  MAX_LANES_PER_CELL,
} from '../constants';

interface MonthViewProps {
  /** 현재 월을 가리키는 임의 날짜 (1일이 아니어도 됨) */
  current: Date;
  /** 백엔드에서 받은 해당 월의 일정 (1일 ~ 말일 범위) */
  schedules: ScheduleResponse[];
  onSchedulePress?: (s: ScheduleResponse) => void;
  onEmptyCellPress?: (ymd: string) => void;
}

interface MonthCell {
  date: Date;
  ymd: string;
  other: boolean;
}

interface MultidayLane {
  schedule: ScheduleResponse;
  laneIdx: number;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

interface MultidayPlacement {
  /** lane에 자리 잡은 멀티데이들 */
  lanes: MultidayLane[];
  /** lane 초과로 잘려나간 멀티데이 — startCol/endCol만 보존 (+N 계산용) */
  dropped: { startCol: number; endCol: number }[];
}

/* ─── 월 그리드 생성 ─────────────────────────────────────────── */

function buildMonthGrid(current: Date): MonthCell[][] {
  const y = current.getFullYear();
  const m = current.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: MonthCell[] = [];
  // 이전 달 채우기
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(y, m, -i);
    cells.push({ date: d, ymd: toYmd(d), other: true });
  }
  // 이번 달
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(y, m, i);
    cells.push({ date: d, ymd: toYmd(d), other: false });
  }
  // 다음 달 채우기 (7의 배수가 될 때까지)
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const d = addDays(last, 1);
    cells.push({ date: d, ymd: toYmd(d), other: true });
  }

  // 주 단위로 분할
  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ─── 멀티데이 lane 배치 ───────────────────────────────────── */

/** 멀티데이 종일 일정 = allday && 시작-종료 다른 날 */
function isMultiday(s: ScheduleResponse): boolean {
  return s.allday && s.displayStYmd !== s.displayEndYmd;
}

/** 같은 주 안에 걸리는 멀티데이를 lane에 배치 */
function placeMultidayLanes(
  week: MonthCell[],
  schedules: ScheduleResponse[],
): MultidayPlacement {
  const weekStart = week[0].ymd;
  const weekEnd = week[6].ymd;

  // 이 주에 걸치는 멀티데이만
  const inWeek = schedules.filter(
    (s) => isMultiday(s) && s.displayStYmd <= weekEnd && s.displayEndYmd >= weekStart,
  );

  // 시작일 → 길이 순 정렬 (긴 일정 먼저 lane 할당해야 깔끔)
  inWeek.sort((a, b) => {
    if (a.displayStYmd !== b.displayStYmd) return a.displayStYmd.localeCompare(b.displayStYmd);
    return b.displayEndYmd.localeCompare(a.displayEndYmd);
  });

  const lanes: MultidayLane[][] = [];
  const placed: MultidayLane[] = [];
  const dropped: { startCol: number; endCol: number }[] = [];

  for (const s of inWeek) {
    // 주 내 startCol — 주 시작 이전부터 이어지는 일정은 0열부터
    let startCol = 0;
    if (s.displayStYmd >= weekStart) {
      for (let i = 0; i < 7; i++) {
        if (week[i].ymd >= s.displayStYmd) {
          startCol = i;
          break;
        }
      }
    }

    // 주 내 endCol — 주 끝 이후까지 이어지는 일정은 6열까지
    let endCol = 6;
    if (s.displayEndYmd <= weekEnd) {
      for (let i = 6; i >= 0; i--) {
        if (week[i].ymd <= s.displayEndYmd) {
          endCol = i;
          break;
        }
      }
    }

    // 빈 lane 찾기 — 한도 초과 시 dropped로 기록
    let laneIdx = 0;
    let assigned = false;
    while (laneIdx < MAX_LANES_PER_CELL) {
      if (!lanes[laneIdx]) lanes[laneIdx] = [];
      const conflict = lanes[laneIdx].some(
        (o) => !(o.endCol < startCol || o.startCol > endCol),
      );
      if (!conflict) {
        const lane: MultidayLane = {
          schedule: s,
          laneIdx,
          startCol,
          endCol,
          continuesLeft: s.displayStYmd < weekStart,
          continuesRight: s.displayEndYmd > weekEnd,
        };
        lanes[laneIdx].push(lane);
        placed.push(lane);
        assigned = true;
        break;
      }
      laneIdx++;
    }
    if (!assigned) {
      dropped.push({ startCol, endCol });
    }
  }

  return { lanes: placed, dropped };
}

/** 셀(col)에 걸리는 드롭된 멀티데이 개수 */
function getDroppedMultidayCount(
  col: number,
  dropped: { startCol: number; endCol: number }[],
): number {
  return dropped.filter((d) => d.startCol <= col && d.endCol >= col).length;
}

/* ─── 셀별 단일 일정 모으기 ─────────────────────────────────── */

/** 해당 날짜에 걸치는 일정 중 멀티데이가 아닌 것 (당일 종일 + 시간 일정) */
function getCellSingleSchedules(
  ymd: string,
  schedules: ScheduleResponse[],
): ScheduleResponse[] {
  return schedules
    .filter((s) => !isMultiday(s) && s.displayStYmd <= ymd && s.displayEndYmd >= ymd)
    .sort((a, b) => {
      // 종일 먼저 → 시간순
      if (a.allday !== b.allday) return a.allday ? -1 : 1;
      const ah = a.schdStHr ?? '0000';
      const bh = b.schdStHr ?? '0000';
      return ah.localeCompare(bh);
    });
}

/** 멀티데이 lane들 중 해당 컬럼을 차지하는 lane 인덱스 set */
function getOccupiedLaneCount(col: number, lanes: MultidayLane[]): number {
  return lanes.filter((l) => l.startCol <= col && l.endCol >= col).length;
}

/**
 * 셀(col)에서 실제로 비워둬야 할 멀티데이 lane 공간 = 그 col을 차지하는 lane 중 최대 idx + 1
 * (lane이 sparse하게 배치돼도 시각적으로 위쪽부터 차지하므로 max idx + 1 만큼만 공간 확보)
 *
 * 예: 주 전체에 lane 2개가 있어도, 어떤 셀에 0번 lane만 걸치면 그 셀은 1줄만 비우면 됨.
 *      lane 1번만 걸치는 셀은 위쪽 lane 0번이 비어 있으므로 2줄을 비워야 막대 위치와 맞음.
 */
function getCellReservedLaneRows(col: number, lanes: MultidayLane[]): number {
  let maxIdx = -1;
  for (const l of lanes) {
    if (l.startCol <= col && l.endCol >= col && l.laneIdx > maxIdx) {
      maxIdx = l.laneIdx;
    }
  }
  return maxIdx + 1;
}

/* ─── HH형식 → "HH:MM" 변환 ─────────────────────────────────── */

/**
 * 백엔드 schdStHr/schdEndHr은 "HHmm" 4자리 (예: "1430")로 오는 것이 표준.
 * 다만 응답 형식이 바뀌어 "HH:MM"으로 와도 안전하게 처리하기 위한 보호망.
 */
function fmtHhmm(hr: string | null | undefined): string {
  if (!hr) return '';
  // 이미 "HH:MM" 형태라면 그대로 사용
  if (hr.includes(':')) return hr;
  if (hr.length >= 4) return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
  if (hr.length === 2) return `${hr}:00`;
  return hr;
}

/* ─── 컴포넌트 ─────────────────────────────────────────────── */

export function MonthView({
  current,
  schedules,
  onSchedulePress,
  onEmptyCellPress,
}: MonthViewProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const s = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);
  const todayY = useMemo(() => toYmd(new Date()), []);
  const weeks = useMemo(() => buildMonthGrid(current), [current]);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator
    >
      {/* 요일 헤더 */}
      <View style={s.dowRow}>
        {DOW_LABELS.map((label, i) => (
          <View key={label} style={s.dowCell}>
            <Text
              style={[
                s.dowText,
                i === 0 && { color: WEEKEND_COLORS.sun },
                i === 6 && { color: WEEKEND_COLORS.sat },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 주별 행 */}
      {weeks.map((week, wi) => {
        const { lanes: multidayLanes, dropped: droppedMulti } = placeMultidayLanes(
          week,
          schedules,
        );

        return (
          <View key={wi} style={s.weekRow}>
            {/* 셀들 */}
            {week.map((cell, di) => {
              const isToday = cell.ymd === todayY;
              const dow = cell.date.getDay();
              const dayNumColor =
                cell.other
                  ? theme.text.subtle
                  : isToday
                  ? theme.text.onBrand
                  : dow === 0
                  ? WEEKEND_COLORS.sun
                  : dow === 6
                  ? WEEKEND_COLORS.sat
                  : theme.text.primary;

              const singles = getCellSingleSchedules(cell.ymd, schedules);
              const occupiedByMulti = getOccupiedLaneCount(di, multidayLanes);
              const visibleSingleCount = Math.max(
                0,
                MAX_LANES_PER_CELL - occupiedByMulti,
              );
              const visibleSingles = singles.slice(0, visibleSingleCount);
              const droppedMultidayCount = getDroppedMultidayCount(di, droppedMulti);
              const overflow =
                singles.length - visibleSingles.length + droppedMultidayCount;

              // 셀별로 차지된 lane 줄 수만큼만 공간 확보 (이 col에 멀티데이가 없으면 0)
              const cellReservedRows = getCellReservedLaneRows(di, multidayLanes);

              return (
                <TouchableOpacity
                  key={cell.ymd}
                  style={[
                    s.cell,
                    {
                      backgroundColor: cell.other
                        ? theme.bg.surfaceAlt
                        : theme.bg.surface,
                      borderRightColor: theme.border.subtle,
                      borderBottomColor: theme.border.subtle,
                    },
                    di === 6 && { borderRightWidth: 0 },
                  ]}
                  activeOpacity={0.6}
                  onPress={() => onEmptyCellPress?.(cell.ymd)}
                >
                  {/* 일자 번호 */}
                  <View style={s.dayNumWrap}>
                    <View
                      style={[
                        s.dayNumCircle,
                        isToday && { backgroundColor: theme.brand.primary },
                      ]}
                    >
                      <Text
                        style={[
                          s.dayNum,
                          { color: dayNumColor },
                          isToday && { fontWeight: fontWeight.bold },
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </View>
                  </View>

                  {/* 셀별 멀티데이 lane 공간 확보 (위쪽부터 차지된 lane 수만큼) */}
                  {cellReservedRows > 0 && (
                    <View style={{ height: cellReservedRows * LANE_HEIGHT }} />
                  )}

                  {/* 단일 일정 */}
                  {visibleSingles.map((ev) => {
                    const color = getDeptColor(ev.deptCd);
                    if (ev.allday) {
                      return (
                        <TouchableOpacity
                          key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                          style={[s.singleAllday, { backgroundColor: color }]}
                          activeOpacity={0.7}
                          onPress={() => onSchedulePress?.(ev)}
                        >
                          <Text
                            style={s.singleAlldayText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {ev.schdNm}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                        style={s.singleTimed}
                        activeOpacity={0.7}
                        onPress={() => onSchedulePress?.(ev)}
                      >
                        <View style={[s.timedDot, { backgroundColor: color }]} />
                        {/* 모바일: 시간 숨김 — 좁은 셀에서 제목 글자 확보 우선 */}
                        {!isMobile && (
                          <Text
                            style={s.timedTime}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {fmtHhmm(ev.schdStHr)}
                          </Text>
                        )}
                        <Text
                          style={s.timedTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {ev.schdNm}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* +N 오버플로우 */}
                  {overflow > 0 && (
                    <Text style={s.overflowText}>+{overflow}{isMobile ? '' : '개 더'}</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* 멀티데이 바 (셀 위에 absolute) */}
            {multidayLanes.map((lane) => {
              const widthPct =
                ((lane.endCol - lane.startCol + 1) / 7) * 100;
              const leftPct = (lane.startCol / 7) * 100;
              const topPx = LANE_TOP_OFFSET + lane.laneIdx * LANE_HEIGHT;
              const color = getDeptColor(lane.schedule.deptCd);
              return (
                <TouchableOpacity
                  key={`mlane-${lane.schedule.schdSn}`}
                  activeOpacity={0.7}
                  onPress={() => onSchedulePress?.(lane.schedule)}
                  style={[
                    s.multidayBar,
                    {
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: topPx,
                      backgroundColor: color,
                      borderTopLeftRadius: lane.continuesLeft ? 0 : radius.sm,
                      borderBottomLeftRadius: lane.continuesLeft ? 0 : radius.sm,
                      borderTopRightRadius: lane.continuesRight ? 0 : radius.sm,
                      borderBottomRightRadius: lane.continuesRight ? 0 : radius.sm,
                    },
                  ]}
                >
                  <Text
                    style={s.multidayText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lane.continuesLeft ? '… ' : ''}
                    {lane.schedule.schdNm}
                    {lane.continuesRight ? ' →' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ─── 스타일 ────────────────────────────────────────────────── */

const makeStyles = (theme: AppTheme, isMobile: boolean) => {
  // 모바일/데스크톱 공통 작은 토큰 값
  const cellPadX = isMobile ? 2 : spacing.xs - 1;
  const eventFontSize = isMobile ? 10 : fontSize.caption;
  const dotSize = isMobile ? 6 : 7;
  const eventGap = isMobile ? 3 : spacing.xs;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg.surface,
    },
    scrollContent: {
      flexGrow: 1,
    },
    dowRow: {
      flexDirection: 'row',
      backgroundColor: theme.bg.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    dowCell: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    dowText: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: theme.text.muted,
      letterSpacing: 0.4,
    },
    weekRow: {
      flex: 1,
      flexDirection: 'row',
      position: 'relative',
      minHeight: MONTH_CELL_MIN_HEIGHT,
    },
    cell: {
      flex: 1,
      minHeight: MONTH_CELL_MIN_HEIGHT,
      paddingHorizontal: cellPadX,
      paddingBottom: spacing.xs - 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      overflow: 'hidden',
    },
    dayNumWrap: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: 2,
      paddingTop: spacing.xs,
    },
    dayNumCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNum: {
      fontSize: fontSize.micro,
      fontWeight: fontWeight.semibold,
    },
    singleAllday: {
      marginHorizontal: cellPadX,
      marginBottom: 2,
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      borderRadius: radius.sm,
      height: LANE_HEIGHT - 4,
      justifyContent: 'center',
    },
    singleAlldayText: {
      fontSize: eventFontSize,
      fontWeight: fontWeight.semibold,
      color: '#FFFFFF',
      lineHeight: LANE_HEIGHT - 4,
    },
    singleTimed: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: cellPadX,
      marginBottom: 2,
      paddingHorizontal: isMobile ? 2 : spacing.xs,
      gap: eventGap,
      borderRadius: radius.sm,
      height: LANE_HEIGHT - 4,
    },
    timedDot: {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      flexShrink: 0,
    },
    timedTime: {
      fontSize: eventFontSize,
      fontWeight: fontWeight.semibold,
      color: theme.text.muted,
      fontVariant: ['tabular-nums'] as any,
    },
    timedTitle: {
      flex: 1,
      fontSize: eventFontSize,
      color: theme.text.body,
    },
    overflowText: {
      fontSize: eventFontSize,
      color: theme.text.muted,
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      paddingTop: 1,
    },
    multidayBar: {
      position: 'absolute',
      height: LANE_HEIGHT - 4,
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      justifyContent: 'center',
      overflow: 'hidden',
      // 좌우 셀 경계와 살짝 띄움 — left/width는 인라인으로 보정
    },
    multidayText: {
      fontSize: eventFontSize,
      fontWeight: fontWeight.semibold,
      color: '#FFFFFF',
    },
  });
};
