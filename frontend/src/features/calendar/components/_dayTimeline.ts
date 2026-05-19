/**
 * 시간 그리드(주뷰 + 일뷰)에서 공유하는 헬퍼.
 * - 시간 일정 lane 분할 알고리즘 (`placeTimedLanes`)
 * - "HHmm" 시간 문자열 ↔ 분 변환 (`fmtHhmm`, `parseHhmm`)
 * - 시간 그리드 레이아웃 상수
 */
import type { ScheduleResponse } from '../api';

/* ─── 시간 그리드 레이아웃 상수 ─────────────────────────────── */

/** 아침 7시부터 저녁 21시까지 (한 셀 = 1시간) */
export const HOUR_START = 7;
export const HOUR_END = 21;
/** 한 시간 칸 높이(px) — 데스크톱 기본 */
export const HOUR_PX = 48;
/** 모바일에서는 한 시간 칸을 조금 축소 */
export const HOUR_PX_MOBILE = 42;
/** 좌측 시간 라벨 컬럼 너비 */
export const TIME_COL_WIDTH = 56;
export const TIME_COL_WIDTH_MOBILE = 42;
/** 시간 일정 카드 최소 높이 (분 단위 짧은 일정도 보이도록) */
export const TIMED_MIN_HEIGHT = 22;

/* ─── HHmm 시간 변환 ────────────────────────────────────────── */

export function fmtHhmm(hr: string | null | undefined): string {
  if (!hr) return '';
  if (hr.includes(':')) return hr;
  if (hr.length >= 4) return `${hr.slice(0, 2)}:${hr.slice(2, 4)}`;
  if (hr.length === 2) return `${hr}:00`;
  return hr;
}

export function parseHhmm(hr: string | null | undefined): { h: number; m: number } {
  if (!hr) return { h: 0, m: 0 };
  // "HHmm" 또는 "HH:MM" 모두 지원
  const clean = hr.replace(':', '');
  return {
    h: parseInt(clean.slice(0, 2), 10) || 0,
    m: parseInt(clean.slice(2, 4), 10) || 0,
  };
}

/* ─── 시간 일정 lane 분할 ───────────────────────────────────── */

export interface TimedLaneItem {
  schedule: ScheduleResponse;
  /** 분 단위 시작 (그리드 0 기준) */
  startMins: number;
  /** 분 단위 종료 (그리드 0 기준) */
  endMins: number;
  laneIdx: number;
  laneCount: number;
}

/** 한 컬럼(하루) 내 시간 일정들을 lane으로 분할.
 *  - 시작 시각순 정렬, 기존 lane들과 시각 겹치지 않으면 같은 lane 재사용.
 *  - 같은 묶음(서로 연결돼서 겹치는 그룹) 내 모든 일정에 laneCount 동일 부여. */
export function placeTimedLanes(
  schedules: ScheduleResponse[],
  hourStart: number,
  hourEnd: number,
): TimedLaneItem[] {
  const totalMins = (hourEnd - hourStart + 1) * 60;
  // 그리드 범위로 자른 분 좌표 부여
  const items = schedules.map((sc) => {
    const { h: sh, m: sm } = parseHhmm(sc.schdStHr);
    const { h: eh, m: em } = parseHhmm(sc.schdEndHr);
    const startMins = Math.max(0, (sh - hourStart) * 60 + sm);
    const endMins = Math.min(totalMins, (eh - hourStart) * 60 + em);
    return { schedule: sc, startMins, endMins };
  });

  // 시작 시각 오름차순, 같으면 종료 시각 내림차순 (긴 일정 먼저 — 묶음 경계 정확 계산용)
  items.sort((a, b) => {
    if (a.startMins !== b.startMins) return a.startMins - b.startMins;
    return b.endMins - a.endMins;
  });

  // 각 일정에 lane 할당
  type ActiveLane = { endMins: number };
  const lanes: ActiveLane[] = [];
  const assigned: { item: (typeof items)[number]; laneIdx: number }[] = [];

  for (const it of items) {
    let placedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endMins <= it.startMins) {
        placedLane = i;
        lanes[i] = { endMins: it.endMins };
        break;
      }
    }
    if (placedLane === -1) {
      placedLane = lanes.length;
      lanes.push({ endMins: it.endMins });
    }
    assigned.push({ item: it, laneIdx: placedLane });
  }

  // 연결된 묶음(시간이 한 번이라도 겹쳐 연쇄되는 일정 집합) 단위로 laneCount 계산
  // assigned는 이미 startMins 오름차순 — 그대로 sweep.
  const groupId: number[] = new Array(assigned.length).fill(-1);
  let curGroup = -1;
  let curGroupEnd = -1;
  for (let i = 0; i < assigned.length; i++) {
    const it = assigned[i].item;
    if (it.startMins >= curGroupEnd) {
      curGroup++;
      curGroupEnd = it.endMins;
    } else if (it.endMins > curGroupEnd) {
      curGroupEnd = it.endMins;
    }
    groupId[i] = curGroup;
  }

  // 묶음별 lane 수 (그 묶음 안 최대 laneIdx + 1)
  const groupLaneCount: Record<number, number> = {};
  for (let i = 0; i < assigned.length; i++) {
    const g = groupId[i];
    const lc = assigned[i].laneIdx + 1;
    if (!groupLaneCount[g] || lc > groupLaneCount[g]) groupLaneCount[g] = lc;
  }

  return assigned.map((a, i) => ({
    schedule: a.item.schedule,
    startMins: a.item.startMins,
    endMins: a.item.endMins,
    laneIdx: a.laneIdx,
    laneCount: groupLaneCount[groupId[i]] || 1,
  }));
}
