package com.infomind.backend.domain.mtgr;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MtgrReservationRepository extends JpaRepository<MtgrReservation, MtgrReservationId> {

    /**
     * 특정 날짜 범위에 걸친 예약 전체 조회 (연장시간 포함)
     */
    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.rsvStYmd <= :endYmd
              AND CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END >= :stYmd
            ORDER BY r.mtgrId, r.rsvStYmd, r.rsvStHhmm
            """)
    List<MtgrReservation> findByDateRange(
            @Param("stYmd") String stYmd,
            @Param("endYmd") String endYmd);

    /**
     * 충돌 검사 — 같은 회의실, 시간 겹침 (연장시간 포함)
     */
    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.mtgrId = :mtgrId
              AND NOT (
                  CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END < :stYmd
                  OR (CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END = :stYmd
                      AND CASE WHEN r.extYn = 'Y' AND r.extHhmm IS NOT NULL THEN r.extHhmm ELSE r.rsvEndHhmm END <= :stHhmm)
                  OR r.rsvStYmd > :endYmd
                  OR (r.rsvStYmd = :endYmd AND r.rsvStHhmm >= :endHhmm)
              )
            """)
    List<MtgrReservation> findConflicts(
            @Param("mtgrId") String mtgrId,
            @Param("stYmd") String stYmd,
            @Param("stHhmm") String stHhmm,
            @Param("endYmd") String endYmd,
            @Param("endHhmm") String endHhmm);

    @Query("SELECT COALESCE(MAX(r.rsvSn), 0) + 1 FROM MtgrReservation r WHERE r.mtgrId = :mtgrId")
    Long nextRsvSn(@Param("mtgrId") String mtgrId);

    /**
     * 연장 충돌 검사 — 자기 자신 제외, 연장시간 포함
     */
    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.mtgrId = :mtgrId AND r.rsvSn <> :excludeSn
              AND NOT (
                  CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END < :stYmd
                  OR (CASE WHEN r.extYn = 'Y' AND r.extYmd IS NOT NULL THEN r.extYmd ELSE r.rsvEndYmd END = :stYmd
                      AND CASE WHEN r.extYn = 'Y' AND r.extHhmm IS NOT NULL THEN r.extHhmm ELSE r.rsvEndHhmm END <= :stHhmm)
                  OR r.rsvStYmd > :endYmd
                  OR (r.rsvStYmd = :endYmd AND r.rsvStHhmm >= :endHhmm)
              )
            """)
    List<MtgrReservation> findConflictsExcluding(
            @Param("mtgrId") String mtgrId,
            @Param("stYmd") String stYmd,
            @Param("stHhmm") String stHhmm,
            @Param("endYmd") String endYmd,
            @Param("endHhmm") String endHhmm,
            @Param("excludeSn") Long excludeSn);
}
