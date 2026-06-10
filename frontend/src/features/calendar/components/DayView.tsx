import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
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

  const dayYmd = useMemo(() => toYmd(current), [current]);
  const [now, setNow] = useState<Date>(() => new Date());
  const todayY = useMemo(() => toYmd(now), [now]);
  const isToday = dayYmd === todayY;

  const hourPx = isMobile ? HOUR_PX_MOBILE : HOUR_PX;
  const timeColWidth = isMobile ? TIME_COL_WIDTH_MOBILE : TIME_COL_WIDTH;

  // 종일/멀티데이 일정 — 그 날에 걸치는 모든 것
  const alldayItems = useMemo(() => {
    return schedules
      .filter(
        (sc) =>
          sc.allday && sc.displayStYmd <= dayYmd && sc.displayEndYmd >= dayYmd,
      )
      .sort((a, b) => {
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

  // 종일 영역 — 일정 개수만큼 세로로
  const ALLDAY_BAR_HEIGHT = LANE_HEIGHT - 4;
  const ALLDAY_BAR_GAP = 2;
  const ALLDAY_PADDING_V = 4;
  const ALLDAY_MAX_HEIGHT = isMobile ? 80 : 110;
  const alldayLaneCount = alldayItems.length;
  const alldayContentHeight =
    ALLDAY_PADDING_V * 2 +
    alldayLaneCount * ALLDAY_BAR_HEIGHT +
    Math.max(0, alldayLaneCount - 1) * ALLDAY_BAR_GAP;
  const alldayRowHeight = Math.min(
    ALLDAY_MAX_HEIGHT,
    Math.max(LANE_HEIGHT + ALLDAY_PADDING_V * 2, alldayContentHeight),
  );

  return (
    <View style={{ backgroundColor: theme.bg.surface }} className="flex-1">
      {/* 종일 영역 */}
      <View
        style={{
          borderBottomColor: theme.border.default,
          height: alldayRowHeight,
        }}
        className="flex-row border-b"
      >
        <View
          style={{
            width: timeColWidth,
            borderRightColor: theme.border.subtle,
            backgroundColor: theme.bg.surfaceAlt,
          }}
          className="border-r items-end justify-center pr-3"
        >
          <Text
            style={{ color: theme.text.subtle }}
            className={`font-bold tracking-wider ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}
          >
            종일
          </Text>
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            minHeight: alldayRowHeight,
          }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onEmptyCellPress?.(dayYmd)}
            className="flex-1 px-3 justify-center"
          >
            {alldayItems.length === 0 ? (
              <Text
                style={{ color: theme.text.subtle }}
                className="text-[12px]"
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
                      style={{
                        height: ALLDAY_BAR_HEIGHT,
                        backgroundColor: color,
                        marginTop: i === 0 ? 0 : ALLDAY_BAR_GAP,
                      }}
                      className={`justify-center rounded overflow-hidden ${isMobile ? 'px-2' : 'px-3.5'}`}
                    >
                      <Text
                        className={`font-semibold text-white ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ev.schdNm}
                        {isRange ? (
                          <Text
                            className={`font-medium text-white opacity-85 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}
                          >
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
        className="flex-1"
        contentContainerStyle={{ height: gridHeight }}
        showsVerticalScrollIndicator
      >
        <View style={{ height: gridHeight }} className="flex-row relative">
          {/* 시간 라벨 컬럼 */}
          <View
            style={{
              width: timeColWidth,
              borderRightColor: theme.border.default,
              backgroundColor: theme.bg.surfaceAlt,
            }}
            className="border-r"
          >
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
              const h = HOUR_START + i;
              return (
                <View
                  key={h}
                  style={{
                    height: hourPx,
                    borderBottomColor: theme.border.subtle,
                  }}
                  className={`border-b items-end pt-0.5 ${isMobile ? 'px-1' : 'px-3'}`}
                >
                  <Text
                    style={{ color: theme.text.subtle }}
                    className={`font-mono ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}
                  >
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 하루 컬럼 (배경 격자) */}
          <View
            style={{ borderRightColor: theme.border.subtle }}
            className="flex-1 border-r relative"
          >
            {/* 시간 셀 (격자 + 빈 셀 탭) */}
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
              const h = HOUR_START + i;
              return (
                <TouchableOpacity
                  key={h}
                  activeOpacity={0.6}
                  onPress={() => onEmptyCellPress?.(dayYmd)}
                  style={{
                    height: hourPx,
                    borderBottomColor: theme.border.subtle,
                  }}
                  className="border-b"
                />
              );
            })}

            {/* 시간 일정 카드 (absolute) */}
            {timedLanes.map((lane) => {
              const ev = lane.schedule;
              const { startMins, endMins, laneIdx, laneCount } = lane;
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
                  style={{
                    top,
                    height,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: bgColor,
                    borderLeftColor: color,
                  }}
                  className={`absolute rounded border-l-3 overflow-hidden mx-[1px] ${isMobile ? 'px-1 py-0.5' : 'px-2 py-1'}`}
                >
                  <Text
                    style={{ color }}
                    className={`font-bold ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {ev.schdNm}
                  </Text>
                  {height >= TIMED_MIN_HEIGHT + 12 && (
                    <Text
                      style={{ color }}
                      className={`font-mono mt-0.5 opacity-85 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}
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
              style={{
                top: nowTopPx,
                left: timeColWidth,
                backgroundColor: theme.semantic.danger,
              }}
              className="absolute right-0 h-[2px] z-10"
            >
              <View
                style={{ backgroundColor: theme.semantic.danger }}
                className="absolute left-[-5px] top-[-4px] w-2.5 h-2.5 rounded-full"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
