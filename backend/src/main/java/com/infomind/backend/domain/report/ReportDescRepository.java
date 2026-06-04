package com.infomind.backend.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportDescRepository extends JpaRepository<ReportDesc, ReportDescId> {
    List<ReportDesc> findByRptFormIdAndRoundSn(String rptFormId, Long roundSn);
    List<ReportDesc> findByRptFormIdAndRoundSnAndSbmtYn(String rptFormId, Long roundSn, String sbmtYn);
    boolean existsByRptFormIdAndRoundSn(String rptFormId, Long roundSn);
    List<ReportDesc> findByUserId(String userId);
}
