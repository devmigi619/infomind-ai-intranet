package com.infomind.backend.domain.schedule;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * 일정관리 엔티티 (INT_SCHD).
 *
 * <p>공용 캘린더 — 누구나 등록/조회 가능. 수정·삭제는 본인 또는 관리자만.</p>
 *
 * <ul>
 *   <li>종일 일정: {@code schdStHr}/{@code schdEndHr} 가 NULL 이면 종일</li>
 *   <li>반복 일정: {@code loopYn = 'Y'} + {@code loopSe} 공통코드(일/주/월/연)</li>
 *   <li>부서별 일정: {@code deptCd} 값. NULL 이면 전사 공개</li>
 * </ul>
 */
@Entity
@Table(name = "INT_SCHD")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Schedule extends BaseEntity {

    @Id
    @Column(name = "SCHD_SN")
    private Long schdSn;

    /** 작성자 user_id. NOT NULL. */
    @Column(name = "USER_ID", length = 100, nullable = false)
    private String userId;

    /** 부서 코드. NULL 이면 전사 일정. */
    @Column(name = "DEPT_CD", length = 20)
    private String deptCd;

    @Column(name = "SCHD_NM", length = 50)
    private String schdNm;

    @Column(name = "SCHD_ST_YMD", length = 8)
    private String schdStYmd;

    /** NULL 이면 종일 일정. */
    @Column(name = "SCHD_ST_HR", length = 4)
    private String schdStHr;

    @Column(name = "SCHD_END_YMD", length = 8)
    private String schdEndYmd;

    /** NULL 이면 종일 일정. */
    @Column(name = "SCHD_END_HR", length = 4)
    private String schdEndHr;

    @Column(name = "LOOP_YN", length = 1)
    @Builder.Default
    private String loopYn = "N";

    /** 반복 주기 — 공통코드(일/주/월/연). loopYn='Y' 일 때만 의미 있음. */
    @Column(name = "LOOP_SE", length = 20)
    private String loopSe;

    @Column(name = "RMK", columnDefinition = "TEXT")
    private String rmk;

    /** 일정 수정 — 본인 또는 관리자만 호출. */
    public void update(String schdNm, String deptCd,
                       String schdStYmd, String schdStHr,
                       String schdEndYmd, String schdEndHr,
                       String loopYn, String loopSe, String rmk) {
        this.schdNm = schdNm;
        this.deptCd = deptCd;
        this.schdStYmd = schdStYmd;
        this.schdStHr = schdStHr;
        this.schdEndYmd = schdEndYmd;
        this.schdEndHr = schdEndHr;
        this.loopYn = (loopYn != null) ? loopYn : "N";
        this.loopSe = loopSe;
        this.rmk = rmk;
    }

    public boolean isAllDay() {
        return (schdStHr == null || schdStHr.isEmpty())
                && (schdEndHr == null || schdEndHr.isEmpty());
    }

    public boolean isRepeating() {
        return "Y".equalsIgnoreCase(loopYn);
    }
}
