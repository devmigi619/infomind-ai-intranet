package com.infomind.backend.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReportRoundRepository extends JpaRepository<ReportRound, ReportRoundId> {
    List<ReportRound> findByRptFormIdOrderByRoundSnDesc(String rptFormId);
    boolean existsByRptFormId(String rptFormId);
    boolean existsByRptFormIdAndRoundYmd(String rptFormId, String roundYmd);

    @Query("SELECT COALESCE(MAX(r.roundSn), 0) + 1 FROM ReportRound r WHERE r.rptFormId = :formId")
    Long nextRoundSn(@Param("formId") String formId);
}
