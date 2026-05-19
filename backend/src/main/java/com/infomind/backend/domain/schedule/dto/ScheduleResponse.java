package com.infomind.backend.domain.schedule.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ScheduleResponse {

    private Long schdSn;

    private String userId;
    /** 작성자 이름. */
    private String userName;

    private String deptCd;
    /** 부서명 — deptCd 가 null 이면 null. */
    private String deptNm;
    private String schdNm;

    private String schdStYmd;
    private String schdStHr;
    private String schdEndYmd;
    private String schdEndHr;

    /** 캘린더에 실제 배치할 시작일. 반복 발생분은 occurrenceYmd 기준. */
    private String displayStYmd;
    /** 캘린더에 실제 배치할 종료일. */
    private String displayEndYmd;

    /** schdStHr 가 비어있으면 종일 일정. */
    private boolean allday;

    private String loopYn;
    private String loopSe;

    private String rmk;

    private List<AttendeeDto> attendees;

    /**
     * 반복 일정을 펼쳤을 때 해당 발생일 (YYYYMMDD).
     * 단발 일정이거나 원본 행 자체를 가리킬 때는 null.
     */
    private String occurrenceYmd;

    /** 현재 로그인 사용자가 작성자인지 여부. */
    private boolean mine;

    private LocalDateTime crtAt;
    private LocalDateTime updAt;
}
