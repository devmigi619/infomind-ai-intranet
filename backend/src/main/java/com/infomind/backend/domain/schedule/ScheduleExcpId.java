package com.infomind.backend.domain.schedule;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleExcpId implements Serializable {

    private Long schdSn;
    private String excpYmd;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ScheduleExcpId)) return false;
        ScheduleExcpId that = (ScheduleExcpId) o;
        return Objects.equals(schdSn, that.schdSn)
                && Objects.equals(excpYmd, that.excpYmd);
    }

    @Override
    public int hashCode() {
        return Objects.hash(schdSn, excpYmd);
    }
}
