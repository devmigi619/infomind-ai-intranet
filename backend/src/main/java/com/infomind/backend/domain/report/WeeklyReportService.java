package com.infomind.backend.domain.report;

import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WeeklyReportService {

    private final WeeklyReportRepository weeklyReportRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<WeeklyReportDto> getMyReports(Long userId, Pageable pageable) {
        User user = getUser(userId);
        return weeklyReportRepository.findByAuthorOrderByWeekStartDesc(user, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public WeeklyReportDto getReport(Long reportId) {
        WeeklyReport report = getWeeklyReport(reportId);
        return toDto(report);
    }

    @Transactional
    public WeeklyReportDto createReport(Long authorId, CreateReportRequest req) {
        User author = getUser(authorId);
        WeeklyReport report = WeeklyReport.builder()
                .author(author)
                .weekStart(req.getWeekStart())
                .thisWeek(req.getThisWeek())
                .nextWeek(req.getNextWeek())
                .issues(req.getIssues())
                .build();
        return toDto(weeklyReportRepository.save(report));
    }

    @Transactional
    public WeeklyReportDto updateReport(Long reportId, Long userId, CreateReportRequest req) {
        WeeklyReport report = getWeeklyReport(reportId);
        if (!report.getAuthor().getId().equals(userId)) {
            throw new SecurityException("수정 권한이 없습니다.");
        }
        report.update(req.getThisWeek(), req.getNextWeek(), req.getIssues());
        return toDto(report);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    private WeeklyReport getWeeklyReport(Long reportId) {
        return weeklyReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("주간 보고서를 찾을 수 없습니다."));
    }

    private WeeklyReportDto toDto(WeeklyReport report) {
        return WeeklyReportDto.builder()
                .id(report.getId())
                .authorName(report.getAuthor().getName())
                .weekStart(report.getWeekStart())
                .thisWeek(report.getThisWeek())
                .nextWeek(report.getNextWeek())
                .issues(report.getIssues())
                .createdAt(report.getCreatedAt())
                .build();
    }

    // DTO classes

    @Getter
    @Builder
    public static class WeeklyReportDto {
        private Long id;
        private String authorName;
        private LocalDate weekStart;
        private String thisWeek;
        private String nextWeek;
        private String issues;
        private LocalDateTime createdAt;
    }

    @Getter
    public static class CreateReportRequest {
        @NotNull
        private LocalDate weekStart;
        @NotBlank
        private String thisWeek;
        @NotBlank
        private String nextWeek;
        private String issues;
    }
}
