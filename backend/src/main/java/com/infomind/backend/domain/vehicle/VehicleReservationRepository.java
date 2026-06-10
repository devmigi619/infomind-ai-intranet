package com.infomind.backend.domain.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VehicleReservationRepository
        extends JpaRepository<VehicleReservation, VehicleReservationId> {

    /**
     * 특정 날짜 범위에 걸친 예약 전체 조회
     * 실제 종료시각 = 연장이면 ext_ymd/ext_hhmm, 아니면 rsv_end_ymd/rsv_end_hhmm
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.rsvStYmd <= :endYmd
              AND CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END >= :stYmd
            ORDER BY r.vehId, r.rsvStYmd, r.rsvStHhmm
            """)
    List<VehicleReservation> findByDateRange(
            @Param("stYmd") String stYmd,
            @Param("endYmd") String endYmd);

    /** 특정 사용자의 예약 목록 (최신순) */
    List<VehicleReservation> findByUserIdOrderByRsvStYmdDescRsvStHhmmDesc(String userId);

    /**
     * 충돌 검사 — 같은 차량, 시간 겹침 (연장시간 포함)
     * 실제 종료 = CASE WHEN ext_yn='Y' AND ext_ymd IS NOT NULL THEN ext_ymd/ext_hhmm ELSE rsv_end_ymd/rsv_end_hhmm END
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.vehId = :vehId
              AND NOT (
                  CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END < :stYmd
                  OR (CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END = :stYmd
                      AND CASE WHEN r.extYn = 'Y' AND r.extHhmm IS NOT NULL THEN r.extHhmm ELSE r.rsvEndHhmm END <= :stHhmm)
                  OR r.rsvStYmd > :endYmd
                  OR (r.rsvStYmd = :endYmd AND r.rsvStHhmm >= :endHhmm)
              )
            """)
    List<VehicleReservation> findConflicts(
            @Param("vehId") String vehId,
            @Param("stYmd") String stYmd,
            @Param("stHhmm") String stHhmm,
            @Param("endYmd") String endYmd,
            @Param("endHhmm") String endHhmm);

    /** 차량별 다음 rsv_sn (MAX+1, 없으면 1) */
    @Query("SELECT COALESCE(MAX(r.rsvSn), 0) + 1 FROM VehicleReservation r WHERE r.vehId = :vehId")
    Long nextRsvSn(@Param("vehId") String vehId);

    /**
     * 연장 충돌 검사 — 자기 자신(excludeSn)은 제외, 연장시간 포함
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.vehId = :vehId AND r.rsvSn <> :excludeSn
              AND NOT (
                  CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END < :stYmd
                  OR (CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END = :stYmd
                      AND CASE WHEN r.extYn = 'Y' AND r.extHhmm IS NOT NULL THEN r.extHhmm ELSE r.rsvEndHhmm END <= :stHhmm)
                  OR r.rsvStYmd > :endYmd
                  OR (r.rsvStYmd = :endYmd AND r.rsvStHhmm >= :endHhmm)
              )
            """)
    List<VehicleReservation> findConflictsExcluding(
            @Param("vehId") String vehId,
            @Param("stYmd") String stYmd,
            @Param("stHhmm") String stHhmm,
            @Param("endYmd") String endYmd,
            @Param("endHhmm") String endHhmm,
            @Param("excludeSn") Long excludeSn);
}
