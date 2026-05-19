import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, AppTheme } from '../../../shared/hooks/useTheme';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { getDeptColor, getDeptColorSoft } from '../../../shared/constants/colors';
import { fontSize, fontWeight } from '../../../shared/constants/typography';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { toYmd } from '../../../shared/utils/date';
import type { ScheduleResponse } from '../api';
import { LANE_HEIGHT } from '../constants';
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
} from './_dayTimeline';

interface DayViewProps {
  /** 보고 있는 그 날 */
  current: Date;
  /** 백엔드에서 받은 그 날 (st = end = current) 범위의 일정 */
  schedules: ScheduleResponse[];
  onSchedulePress?: (s: ScheduleResponse) => void;
  onEmptyCellPress?: (ymd: string) => void;
}

/* ─── 컴포넌트 ─────────────────────────────────────────────── */

export function DayView({
  current,
  schedules,
  onSchedulePress,
  onEmptyCellPress,
}: DayViewProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const s = useMemo(() => makeStyles(theme, isMobile), [theme, isMobile]);

  const dayYmd = useMemo(() => toYmd(current), [current]);
  const [now, setNow] = useState<Date>(() => new Date());
  const todayY = useMemo(() => toYmd(now), [now]);
  const isToday = dayYmd === todayY;

  const hourPx = isMobile ? HOUR_PX_MOBILE : HOUR_PX;
  const timeColWidth = isMobile ? TIME_COL_WIDTH_MOBILE : TIME_COL_WIDTH;

  // 종일/멀티데이 일정 — 그 날에 걸치는 모든 것
  // (멀티데이의 시작/종료 범위에 dayYmd가 포함되면 종일 영역에 표시)
  const alldayItems = useMemo(() => {
    return schedules
      .filter(
        (sc) =>
          sc.allday && sc.displayStYmd <= dayYmd && sc.displayEndYmd >= dayYmd,
      )
      .sort((a, b) => {
        // 시작일 빠른 것 먼저, 같으면 긴 것(종료일 늦은 것) 먼저
        if (a.displayStYmd !== b.displayStYmd) return a.displayStYmd.localeCompare(b.displayStYmd);
        return b.displayEndYmd.localeCompare(a.displayEndYmd);
      });
  }, [schedules, dayYmd]);

  // 시간 일정 — 그 날 시작 + 시간 값 있는 것
  const timedLanes = useMemo(() => {
    const dayTimed = schedules.filter(
      (sc) =>
        !sc.allday &&
        sc.displayStYmd === dayYmd &&
        !!sc.schdStHr &&
        !!sc.schdEndHr,
    );
    return placeTimedLanes(dayTimed, HOUR_START, HOUR_END);
  }, [schedules, dayYmd]);

  // 현재 시각 라인 — 오늘일 때만, 1분마다 갱신
  const showNowLine = isToday;
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

  // 종일 영역 — 일정 개수만큼 세로로 (한도 110px, 초과 시 안에서 스크롤)
  const ALLDAY_BAR_HEIGHT = LANE_HEIGHT - 4;
  const ALLDAY_BAR_GAP = 2;
  const ALLDAY_PADDING_V = 4;
  const ALLDAY_MAX_HEIGHT = isMobile ? 80 : 110;
  const alldayLaneCount = alldayItems.length;
  const alldayContentHeight =
    ALLDAY_PADDING_V * 2 +
    alldayLaneCount * ALLDAY_BAR_HEIGHT +
    Math.max(0, alldayLaneCount - 1) * ALLDAY_BAR_GAP;
  // 일정 없어도 빈 영역 한 줄 정도는 보여줘서 클릭으로 등록 유도
  const alldayRowHeight = Math.min(
    ALLDAY_MAX_HEIGHT,
    Math.max(LANE_HEIGHT + ALLDAY_PADDING_V * 2, alldayContentHeight),
  );

  return (
    <View style={s.root}>
      {/* 종일 영역 */}
      <View
        style={[
          s.alldayRow,
          {
            borderBottomColor: theme.border.default,
            height: alldayRowHeight,
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
          contentContainerStyle={{
            // 일정 있을 땐 컨텐츠 높이, 없을 땐 최소 한 줄 만큼 (TouchableOpacity 클릭 영역 확보)
            minHeight: alldayRowHeight,
          }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onEmptyCellPress?.(dayYmd)}
            style={s.alldayCell}
          >
            {alldayItems.length === 0 ? (
              <Text
                style={[s.alldayEmpty, { color: theme.text.subtle }]}
                numberOfLines={1}
              >
                종일 일정 없음
              </Text>
            ) : (
              <View style={{ paddingVertical: ALLDAY_PADDING_V }}>
                {alldayItems.map((ev, i) => {
                  const color = getDeptColor(ev.deptCd);
                  const isRange = ev.displayStYmd !== ev.displayEndYmd;
                  return (
                    <TouchableOpacity
                      key={`${ev.schdSn}-${ev.occurrenceYmd ?? ev.displayStYmd}`}
                      activeOpacity={0.7}
                      onPress={() => onSchedulePress?.(ev)}
                      style={[
                        s.alldayBar,
                        {
                          height: ALLDAY_BAR_HEIGHT,
                          backgroundColor: color,
                          marginTop: i === 0 ? 0 : ALLDAY_BAR_GAP,
                        },
                      ]}
                    >
                      <Text
                        style={s.alldayBarText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ev.schdNm}
                        {isRange ? (
                          <Text style={s.alldayBarRange}>
                            {'  '}
                            {ev.displayStYmd.slice(4, 6)}/{ev.displayStYmd.slice(6, 8)} –{' '}
                            {ev.displayEndYmd.slice(4, 6)}/{ev.displayEndYmd.slice(6, 8)}
                          </Text>
                        ) : null}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>
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

          {/* 하루 컬럼 (배경 격자) */}
          <View
            style={[
              s.dayCol,
              { borderRightColor: theme.border.subtle },
            ]}
          >
            {/* 시간 셀 (격자 + 빈 셀 탭) */}
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
              const h = HOUR_START + i;
              return (
                <TouchableOpacity
                  key={h}
                  activeOpacity={0.6}
                  onPress={() => onEmptyCellPress?.(dayYmd)}
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
            {timedLanes.map((lane) => {
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

          {/* 현재 시각 라인 — 오늘일 때만 */}
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    headDow: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
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
    alldayCell: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      justifyContent: 'center',
    },
    alldayEmpty: {
      fontSize: fontSize.caption,
    },
    alldayBar: {
      paddingHorizontal: isMobile ? spacing.sm : spacing.md - 2,
      justifyContent: 'center',
      borderRadius: radius.sm,
      overflow: 'hidden',
    },
    alldayBarText: {
      fontSize: isMobile ? 10 : fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: '#FFFFFF',
    },
    alldayBarRange: {
      fontSize: isMobile ? 9 : 10,
      fontWeight: fontWeight.medium,
      color: '#FFFFFF',
      opacity: 0.85,
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
      borderRadius: radius.sm,
      borderLeftWidth: 3,
      paddingHorizontal: isMobile ? 4 : spacing.xs + 2,
      paddingVertical: isMobile ? 2 : 3,
      overflow: 'hidden',
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
