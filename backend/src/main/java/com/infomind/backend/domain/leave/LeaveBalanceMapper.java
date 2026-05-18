package com.infomind.backend.domain.leave;

import lombok.Data;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface LeaveBalanceMapper {

    /**
     * 사용자별 연도별 승인된 차감 휴가 사용일수 조회
     */
    List<YearlyUsedDto> getUsedByYear(@Param("userId") String userId);

    /**
     * DB 함수 f_leave_calc 로 사용자의 기본 휴가 부여일수 조회
     * (INT_USER.hire_ymd → 근속개월 → INT_LEAVE_POL 매칭)
     */
    BigDecimal calcEntitlement(@Param("userId") String userId);

    @Data
    class YearlyUsedDto {
        private String year;
        private BigDecimal usedDcnt;
    }
}
