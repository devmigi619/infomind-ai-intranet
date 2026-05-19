/**
 * Calendar 모듈 공통 상수
 * - 셀 / lane 레이아웃 수치
 * - 최대 lane 수 (월뷰가 너무 비대해지지 않도록)
 */

/** 월뷰 셀 최소 높이 (px) */
export const MONTH_CELL_MIN_HEIGHT = 112;

/** 멀티데이 바 한 줄 높이 (px) */
export const LANE_HEIGHT = 20;

/** 멀티데이 바 시작 top offset (day-num 아래) */
export const LANE_TOP_OFFSET = 30;

/** 한 셀당 최대 표시 가능한 lane(멀티데이 + 단일) 합산 한도 */
export const MAX_LANES_PER_CELL = 4;
