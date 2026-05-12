package com.infomind.backend.domain.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VehicleReservationRepository
        extends JpaRepository<VehicleReservation, VehicleReservationId> {

    /**
     * 특정 날짜 범위에 걸친 예약 전체 조회
     * (시작일 ≤ endYmd AND 종료일 ≥ stYmd 조건으로 범위 포함 예약 반환)
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.rsvStYmd <= :endYmd AND r.rsvEndYmd >= :stYmd
            ORDER BY r.vehId, r.rsvStYmd, r.rsvStHhmm
            """)
    List<VehicleReservation> findByDateRange(
            @Param("stYmd") String stYmd,
            @Param("endYmd") String endYmd);

    /** 특정 사용자의 예약 목록 (최신순) */
    List<VehicleReservation> findByUserIdOrderByRsvStYmdDescRsvStHhmmDesc(String userId);

    /**
     * 충돌 검사 — 같은 차량, 시간 겹침
     * 겹침의 역: (종료 < 시작) OR (시작 > 종료) → NOT 이 두 조건 = 겹침
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.vehId = :vehId
              AND NOT (
                  r.rsvEndYmd < :stYmd
                  OR (r.rsvEndYmd = :stYmd AND r.rsvEndHhmm <= :stHhmm)
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
     * 연장 충돌 검사 — 자기 자신(excludeSn)은 제외
     * 연장 시 변경된 종료 시각이 다른 예약과 겹치는지 확인
     */
    @Query("""
            SELECT r FROM VehicleReservation r
            WHERE r.vehId = :vehId AND r.rsvSn <> :excludeSn
              AND NOT (
                  r.rsvEndYmd < :stYmd
                  OR (r.rsvEndYmd = :stYmd AND r.rsvEndHhmm <= :stHhmm)
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
