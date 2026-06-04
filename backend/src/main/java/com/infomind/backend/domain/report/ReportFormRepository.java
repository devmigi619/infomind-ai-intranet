package com.infomind.backend.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportFormRepository extends JpaRepository<ReportForm, String> {
    List<ReportForm> findAllByOrderByCrtAtDesc();
    List<ReportForm> findByDeptCdAndUseYn(String deptCd, String useYn);
}
