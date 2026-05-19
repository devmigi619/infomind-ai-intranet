package com.infomind.backend.domain.schedule;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleAttdId implements Serializable {

    private Long schdSn;
    private String attdUserId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ScheduleAttdId)) return false;
        ScheduleAttdId that = (ScheduleAttdId) o;
        return Objects.equals(schdSn, that.schdSn)
                && Objects.equals(attdUserId, that.attdUserId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(schdSn, attdUserId);
    }
}
