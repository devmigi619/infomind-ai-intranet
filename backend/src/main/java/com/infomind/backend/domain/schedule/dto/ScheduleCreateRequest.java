package com.infomind.backend.domain.schedule.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class ScheduleCreateRequest {

    private String schdNm;
    private String deptCd;

    /** 시작일 YYYYMMDD. */
    private String schdStYmd;
    /** 시작 시각 HHMM. NULL 이면 종일. */
    private String schdStHr;

    /** 종료일 YYYYMMDD. */
    private String schdEndYmd;
    /** 종료 시각 HHMM. NULL 이면 종일. */
    private String schdEndHr;

    /** 반복 여부 — 'Y' / 'N'. */
    private String loopYn;
    /** 반복 주기 공통코드 — DAY / WEEK / MONTH / YEAR. */
    private String loopSe;

    private String rmk;

    /** 참석자 userId 목록. 비어 있어도 무방. */
    private List<String> attendeeUserIds;
}
