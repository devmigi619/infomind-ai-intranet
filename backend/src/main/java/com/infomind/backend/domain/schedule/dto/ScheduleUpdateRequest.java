package com.infomind.backend.domain.schedule.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class ScheduleUpdateRequest {

    private String schdNm;
    private String deptCd;

    private String schdStYmd;
    private String schdStHr;

    private String schdEndYmd;
    private String schdEndHr;

    private String loopYn;
    private String loopSe;

    private String rmk;

    private List<String> attendeeUserIds;
}
