package com.infomind.backend.domain.schedule.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AttendeeDto {

    private String attdUserId;
    private String attdUserName;

    /** 참석 여부 — 'Y' / 'N'. */
    private String userAttdYn;
    /** 조회 여부 — 'Y' / 'N'. */
    private String userQryYn;
}
