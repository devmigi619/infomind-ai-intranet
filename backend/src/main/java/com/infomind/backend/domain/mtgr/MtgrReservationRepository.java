package com.infomind.backend.domain.mtgr;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MtgrReservationRepository extends JpaRepository<MtgrReservation, MtgrReservationId> {

    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.rsvStYmd <= :endYmd AND r.rsvEndYmd >= :stYmd
            ORDER BY r.mtgrId, r.rsvStYmd, r.rsvStHhmm
            """)
    List<MtgrReservation> findByDateRange(
            @Param("stYmd") String stYmd,
            @Param("endYmd") String endYmd);

    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.mtgrId = :mtgrId
              AND NOT (
                  r.rsvEndYmd < :stYmd
                  OR (r.rsvEndYmd = :stYmd AND r.rsvEndHhmm <= :stHhmm)
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

    @Query("""
            SELECT r FROM MtgrReservation r
            WHERE r.mtgrId = :mtgrId AND r.rsvSn <> :excludeSn
              AND NOT (
                  r.rsvEndYmd < :stYmd
                  OR (r.rsvEndYmd = :stYmd AND r.rsvEndHhmm <= :stHhmm)
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
