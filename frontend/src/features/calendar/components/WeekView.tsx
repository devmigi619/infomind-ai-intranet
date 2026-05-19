import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { getDeptColor, getDeptColorSoft } from '../../../shared/constants/colors';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import {
  toYmd,
  getWeekDates,
  DOW_LABELS,
  WEEKEND_COLORS,
} from '../../../shared/utils/date';
import type { ScheduleResponse } from '../api';
import { LANE_HEIGHT, MAX_LANES_PER_CELL } from '../constants';
import { WeekListView } from './WeekListView';
import {
  HOUR_START,
  HOUR_END,
  HOUR_PX,
  HOUR_PX_MOBILE,
  TIME_COL_WIDTH,
  TIME_COL_WIDTH_MOBILE,
  TIMED_MIN_HEIGHT,
  fmtHhmm,
  placeTimedLanes,
  type TimedLaneItem,
} from './_dayTimeline';

interface WeekViewProps {
  /** 그 주 안의 임의 날짜 — 내부에서 일~토로 정규화 */
  current: Date;
  /** 백엔드에서 받은 해당 주의 일정 (일요일 ~ 토요일 범위) */
  schedules: ScheduleResponse[];
  onSchedulePress?: (s: ScheduleResponse) => void;
  onEmptyCellPress?: (ymd: string) => void;
}

interface MultidayLane {
  schedule: ScheduleResponse;
  laneIdx: number;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

/* ─── 멀티데이 + 종일 lane 배치 ───────────────────────────────── */

function isAllday(s: ScheduleResponse): boolean {
  return s.allday;
}

/** 종일/멀티데이 일정을 lane에 배치 (월뷰와 동일한 알고리즘) */
function placeAlldayLanes(
  weekDates: Date[],
  schedules: ScheduleResponse[],
): MultidayLane[] {
  const weekStart = toYmd(weekDates[0]);
  const weekEnd = toYmd(weekDates[6]);

  // 이 주에 걸치는 종일/멀티데이만
  const inWeek = schedules.filter(
    (s) => isAllday(s) && s.displayStYmd <= weekEnd && s.displayEndYmd >= weekStart,
  );

  // 시작일 → 길이 순 정렬 (긴 일정 먼저 lane 할당해야 깔끔)
  inWeek.sort((a, b) => {
    if (a.displayStYmd !== b.displayStYmd) return a.displayStYmd.localeCompare(b.displayStYmd);
    return b.displayEndYmd.localeCompare(a.displayEndYmd);
  });

  const lanes: MultidayLane[][] = [];
  const placed: MultidayLane[] = [];

  for (const s of inWeek) {
    // 주 시작 이전부터 이어지는 일정은 0열부터
    let startCol = 0;
    if (s.displayStYmd >= weekStart) {
      for (let i = 0; i < 7; i++) {
        if (toYmd(weekDates[i]) >= s.displayStYmd) {
          startCol = i;
          break;
        }
      }
    }

    // 주 끝 이후까지 이어지는 일정은 6열까지
    let endCol = 6;
    if (s.displayEndYmd <= weekEnd) {
      for (let i = 6; i >= 0; i--) {
        if (toYmd(weekDates[i]) <= s.displayEndYmd) {
          endCol = i;
          break;
        }
      }
    }

    // 빈 lane 찾기 — 한도 초과 시 그냥 lane 추가 (주뷰 종일 영역은 세로로 늘어남)
    let laneIdx = 0;
    while (true) {
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
        break;
      }
      laneIdx++;
      // 안전장치 — 그래도 너무 많아지면 dropped 처리
      if (laneIdx >= MAX_LANES_PER_CELL + 4) {
        break;
      }
    }
  }

  return placed;
}

/* ─── 컴포넌트 ─────────────────────────────────────────────── */

export function WeekView({
  current,
  schedules,
  onSchedulePress,
  onEmptyCellPress,
}: WeekViewProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const s = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);

  const weekDates = useMemo(() => getWeekDates(current), [current]);
  const weekYmds = useMemo(() => weekDates.map(toYmd), [weekDates]);
  // 1분마다 갱신되는 현재 시각 — todayY/현재시각 라인 둘 다 이 state에 의존
  // (자정 경계에서도 todayY가 자동 갱신되도록)
  const [now, setNow] = useState<Date>(() => new Date());
  const todayY = useMemo(() => toYmd(now), [now]);

  const hourPx = isMobile ? HOUR_PX_MOBILE : HOUR_PX;
  const timeColWidth = isMobile ? TIME_COL_WIDTH_MOBILE : TIME_COL_WIDTH;

  // 종일 lane 배치
  const alldayLanes = useMemo(
    () => placeAlldayLanes(weekDates, schedules),
    [weekDates, schedules],
  );
  const alldayLaneCount = useMemo(() => {
    let max = 0;
    for (const l of alldayLanes) {
      if (l.laneIdx + 1 > max) max = l.laneIdx + 1;
    }
    return Math.max(1, max);
  }, [alldayLanes]);

  // 시간 일정만 추출 (종일 제외 + null 시간 방어) — 컬럼별 lane 분할
  const timedLanesByDay = useMemo(() => {
    const buckets: Record<string, ScheduleResponse[]> = {};
    for (const y of weekYmds) buckets[y] = [];
    for (const sc of schedules) {
      if (sc.allday) continue;
      // 시간 값이 비어 있는 일정은 시간 그리드에 그리지 않음
      if (!sc.schdStHr || !sc.schdEndHr) continue;
      // 시간 일정은 하루 단위로만 표시 (멀티데이 시간 일정은 시작일 컬럼에)
      if (buckets[sc.displayStYmd] !== undefined) {
        buckets[sc.displayStYmd].push(sc);
      }
    }
    const map: Record<string, TimedLaneItem[]> = {};
    for (const y of weekYmds) {
      map[y] = placeTimedLanes(buckets[y], HOUR_START, HOUR_END);
    }
    return map;
  }, [schedules, weekYmds]);

  // 현재 시각 라인 — 1분마다 갱신
  //  - 오늘이 이번 주에 포함될 때만 타이머 가동
  //  - 모바일은 리스트로 위임돼 라인 자체가 없으니 타이머 스킵
  const showNowLine = !isMobile && weekYmds.includes(todayY);
  useEffect(() => {
    if (!showNowLine) return;
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [showNowLine]);
  const nowTopPx = useMemo(() => {
    if (!showNowLine) return -1;
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < HOUR_START || h > HOUR_END) return -1;
    return (h - HOUR_START + m / 60) * hourPx;
  }, [showNowLine, hourPx, now]);

  // 시간 그리드 전체 높이
  const gridHeight = (HOUR_END - HOUR_START + 1) * hourPx;

  const ALLDAY_BAR_HEIGHT = LANE_HEIGHT - 4;
  const ALLDAY_BAR_GAP = 2;
  const ALLDAY_PADDING_V = 4;
  // 종일 영역 한도 — 너무 많으면 안에서 스크롤 (시간 그리드 영역 보장)
  const ALLDAY_MAX_HEIGHT = isMobile ? 80 : 110;
  const alldayContentHeight =
    ALLDAY_PADDING_V * 2 +
    alldayLaneCount * ALLDAY_BAR_HEIGHT +
    Math.max(0, alldayLaneCount - 1) * ALLDAY_BAR_GAP;

  // 모바일은 시간 그리드 대신 요일별 리스트로 렌더 (좁은 컬럼에서 제목 잘림 방지)
  // 훅 호출 순서 유지를 위해 모든 훅 뒤에서 분기.
  if (isMobile) {
    return (
      <WeekListView
        current={current}
        schedules={schedules}
        onSchedulePress={onSchedulePress}
        onEmptyCellPress={onEmptyCellPress}
      />
    );
  }

  return (
    <View style={s.root}>
      {/* 요일 헤더 (시간 컬럼 라벨 자리 + 7일) */}
      <View style={[s.headRow, { borderBottomColor: theme.border.default }]}>
        <View style={[s.headTimeCol, { width: timeColWidth, borderRightColor: theme.border.subtle }]} />
        {weekDates.map((d, i) => {
          const dy = weekYmds[i];
          const isToday = dy === todayY;
          const dow = d.getDay();
          const dowColor =
            dow === 0
              ? WEEKEND_COLORS.sun
              : dow === 6
              ? WEEKEND_COLORS.sat
              : theme.text.muted;
          const numColor = isToday
            ? theme.text.onBrand
            : dow === 0
            ? WEEKEND_COLORS.sun
            : dow === 6
            ? WEEKEND_COLORS.sat
            : theme.text.primary;
          return (
            <View
              key={dy}
              style={[
                s.headDayCol,
                { borderRightColor: theme.border.subtle },
                i === 6 && { borderRightWidth: 0 },
              ]}
            >
              <Text style={[s.headDow, { color: dowColor }]}>{DOW_LABELS[i]}</Text>
              <View
                style={[
                  s.headNumCircle,
                  isToday && { backgroundColor: theme.brand.primary },
                ]}
              >
                <Text
                  style={[
                    s.headNum,
                    { color: numColor },
                    isToday && { fontWeight: fontWeight.bold },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 종일 영역 — 칸이 너무 많으면 안에서 스크롤 */}
      <View
        style={[
          s.alldayRow,
          {
            borderBottomColor: theme.border.default,
            height: Math.min(ALLDAY_MAX_HEIGHT, alldayContentHeight),
          },
        ]}
      >
        <View
          style={[
            s.alldayLabelCol,
            {
              width: timeColWidth,
              borderRightColor: theme.border.subtle,
              backgroundColor: theme.bg.surfaceAlt,
            },
          ]}
        >
          <Text style={[s.alldayLabelText, { color: theme.text.subtle }]}>종일</Text>
        </View>
        <ScrollView
          style={s.alldayScroll}
          contentContainerStyle={{ height: alldayContentHeight }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.alldayGrid}>
            {/* 7일 빈 셀 (테두리 + 클릭 영역) */}
            {weekDates.map((_d, i) => (
              <TouchableOpacity
                key={weekYmds[i]}
                activeOpacity={0.6}
                onPress={() => onEmptyCellPress?.(weekYmds[i])}
                style={[
                  s.alldayCell,
                  { borderRightColor: theme.border.subtle },
                  i === 6 && { borderRightWidth: 0 },
                ]}
              />
            ))}

            {/* 종일/멀티데이 바 (absolute) */}
            {alldayLanes.map((lane) => {
              const widthPct = ((lane.endCol - lane.startCol + 1) / 7) * 100;
              const leftPct = (lane.startCol / 7) * 100;
              const topPx = ALLDAY_PADDING_V + lane.laneIdx * (ALLDAY_BAR_HEIGHT + ALLDAY_BAR_GAP);
              const color = getDeptColor(lane.schedule.deptCd);
              return (
                <TouchableOpacity
                  key={`alane-${lane.schedule.schdSn}`}
                  activeOpacity={0.7}
                  onPress={() => onSchedulePress?.(lane.schedule)}
                  style={[
                    s.alldayBar,
                    {
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: topPx,
                      height: ALLDAY_BAR_HEIGHT,
                      backgroundColor: color,
                      borderTopLeftRadius: lane.continuesLeft ? 0 : radius.sm,
                      borderBottomLeftRadius: lane.continuesLeft ? 0 : radius.sm,
                      borderTopRightRadius: lane.continuesRight ? 0 : radius.sm,
                      borderBottomRightRadius: lane.continuesRight ? 0 : radius.sm,
                    },
                  ]}
                >
                  <Text style={s.alldayBarText} numberOfLines={1} ellipsizeMode="tail">
                    {lane.continuesLeft ? '… ' : ''}
                    {lane.schedule.schdNm}
                    {lane.continuesRight ? ' →' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 시간 그리드 (스크롤) */}
      <ScrollView
        style={s.timelineScroll}
        contentContainerStyle={{ height: gridHeight }}
        showsVerticalScrollIndicator
      >
        <View style={[s.timelineInner, { height: gridHeight }]}>
          {/* 시간 라벨 컬럼 */}
          <View
            style={[
              s.timeLabelCol,
              {
                width: timeColWidth,
                borderRightColor: theme.border.default,
                backgroundColor: theme.bg.surfaceAlt,
              },
            ]}
          >
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
              const h = HOUR_START + i;
              return (
                <View
                  key={h}
                  style={[
                    s.timeLabelCell,
                    {
                      height: hourPx,
                      borderBottomColor: theme.border.subtle,
                    },
                  ]}
                >
                  <Text style={[s.timeLabelText, { color: theme.text.subtle }]}>
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 7일 컬럼 (배경 격자) */}
          {weekDates.map((_d, di) => {
            const dy = weekYmds[di];
            return (
              <View
                key={dy}
                style={[
                  s.dayCol,
                  {
                    borderRightColor: theme.border.subtle,
                  },
                  di === 6 && { borderRightWidth: 0 },
                ]}
              >
                {/* 시간 셀 (격자 + 빈 셀 탭) */}
                {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
                  const h = HOUR_START + i;
                  return (
                    <TouchableOpacity
                      key={h}
                      activeOpacity={0.6}
                      onPress={() => onEmptyCellPress?.(dy)}
                      style={[
                        s.timeCell,
                        {
                          height: hourPx,
                          borderBottomColor: theme.border.subtle,
                        },
                      ]}
                    />
                  );
                })}

                {/* 시간 일정 카드 (absolute) — 시각 겹침은 lane 분할 */}
                {timedLanesByDay[dy].map((lane) => {
                  const ev = lane.schedule;
                  const { startMins, endMins, laneIdx, laneCount } = lane;
                  // 그리드 시작 이전 종료 / 끝 이후 시작은 안 그림
                  if (endMins <= 0) return null;
                  if (startMins >= (HOUR_END - HOUR_START + 1) * 60) return null;

                  const top = (startMins / 60) * hourPx;
                  const height = Math.max(
                    TIMED_MIN_HEIGHT,
                    ((endMins - startMins) / 60) * hourPx,
                  );
                  const widthPct = 100 / laneCount;
                  const leftPct = laneIdx * widthPct;

                  const color = getDeptColor(ev.deptCd);
                  const bgColor = getDeptColorSoft(ev.deptCd);
                  return (
                    <TouchableOpacity
                      key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                      activeOpacity={0.7}
                      onPress={() => onSchedulePress?.(ev)}
                      style={[
                        s.timedEvent,
                        {
                          top,
                          height,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: bgColor,
                          borderLeftColor: color,
                        },
                      ]}
                    >
                      <Text
                        style={[s.timedEventTitle, { color }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ev.schdNm}
                      </Text>
                      {height >= TIMED_MIN_HEIGHT + 12 && (
                        <Text
                          style={[s.timedEventTime, { color }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {fmtHhmm(ev.schdStHr)} – {fmtHhmm(ev.schdEndHr)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {/* 현재 시각 라인 (오늘이 이번 주에 있을 때만) */}
          {showNowLine && nowTopPx >= 0 && nowTopPx <= gridHeight && (
            <View
              pointerEvents="none"
              style={[
                s.nowLine,
                {
                  top: nowTopPx,
                  left: timeColWidth,
                  backgroundColor: theme.semantic.danger,
                },
              ]}
            >
              <View
                style={[
                  s.nowLineDot,
                  { backgroundColor: theme.semantic.danger },
                ]}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── 스타일 ────────────────────────────────────────────────── */

const makeStyles = (theme: AppTheme, isMobile: boolean) => {
  const dayNumSize = isMobile ? 22 : 26;
  const timedFontSize = isMobile ? 10 : fontSize.caption;
  const timedTimeFontSize = isMobile ? 9 : 10;
  const timeLabelFontSize = isMobile ? 9 : 10;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg.surface,
    },
    // ─── 헤더 ─────────────────────────────────────────
    headRow: {
      flexDirection: 'row',
      backgroundColor: theme.bg.surfaceAlt,
      borderBottomWidth: 1,
    },
    headTimeCol: {
      borderRightWidth: 1,
    },
    headDayCol: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      borderRightWidth: 1,
    },
    headDow: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      marginBottom: 3,
    },
    headNumCircle: {
      width: dayNumSize,
      height: dayNumSize,
      borderRadius: dayNumSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headNum: {
      fontSize: isMobile ? fontSize.micro : fontSize.body,
      fontWeight: fontWeight.bold,
    },
    // ─── 종일 영역 ─────────────────────────────────────
    alldayRow: {
      flexDirection: 'row',
      backgroundColor: theme.bg.surface,
      borderBottomWidth: 1,
    },
    alldayLabelCol: {
      borderRightWidth: 1,
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingRight: spacing.sm,
    },
    alldayLabelText: {
      fontSize: isMobile ? 9 : 10,
      fontWeight: fontWeight.bold,
      letterSpacing: 0.4,
    },
    alldayScroll: {
      flex: 1,
    },
    alldayGrid: {
      flex: 1,
      flexDirection: 'row',
      position: 'relative',
      paddingVertical: 4,
    },
    alldayCell: {
      flex: 1,
      borderRightWidth: 1,
    },
    alldayBar: {
      position: 'absolute',
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    alldayBarText: {
      fontSize: isMobile ? 10 : fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: '#FFFFFF',
    },
    // ─── 시간 그리드 ───────────────────────────────────
    timelineScroll: {
      flex: 1,
    },
    timelineInner: {
      flexDirection: 'row',
      position: 'relative',
    },
    timeLabelCol: {
      borderRightWidth: 1,
    },
    timeLabelCell: {
      borderBottomWidth: 1,
      alignItems: 'flex-end',
      paddingHorizontal: isMobile ? 4 : spacing.sm,
      paddingTop: 2,
    },
    timeLabelText: {
      fontSize: timeLabelFontSize,
      fontVariant: ['tabular-nums'] as any,
    },
    dayCol: {
      flex: 1,
      borderRightWidth: 1,
      position: 'relative',
    },
    timeCell: {
      borderBottomWidth: 1,
    },
    timedEvent: {
      position: 'absolute',
      // left/width는 lane 인덱스에 따라 인라인으로 부여
      borderRadius: radius.sm,
      borderLeftWidth: 3,
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      paddingVertical: isMobile ? 2 : 3,
      overflow: 'hidden',
      // 컬럼 좌우 가장자리와 lane 사이 살짝 띄움
      marginLeft: 1,
      marginRight: 1,
    },
    timedEventTitle: {
      fontSize: timedFontSize,
      fontWeight: fontWeight.bold,
    },
    timedEventTime: {
      fontSize: timedTimeFontSize,
      fontVariant: ['tabular-nums'] as any,
      marginTop: 1,
      opacity: 0.85,
    },
    // ─── 현재 시각 라인 ────────────────────────────────
    nowLine: {
      position: 'absolute',
      right: 0,
      height: 2,
      zIndex: 5,
    },
    nowLineDot: {
      position: 'absolute',
      left: -5,
      top: -4,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
  });
};
