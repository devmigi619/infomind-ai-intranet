package com.infomind.backend.domain.report;

import com.infomind.backend.domain.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WeeklyReportRepository extends JpaRepository<WeeklyReport, Long> {

    Page<WeeklyReport> findByAuthorOrderByWeekStartDesc(User author, Pageable pageable);

    Optional<WeeklyReport> findByAuthorAndWeekStart(User author, LocalDate weekStart);
}
