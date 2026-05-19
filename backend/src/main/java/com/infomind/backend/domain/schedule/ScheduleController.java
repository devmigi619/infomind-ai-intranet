package com.infomind.backend.domain.schedule;

import com.infomind.backend.common.ApiResponse;
import com.infomind.backend.domain.schedule.dto.ScheduleCreateRequest;
import com.infomind.backend.domain.schedule.dto.ScheduleResponse;
import com.infomind.backend.domain.schedule.dto.ScheduleUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * 일정(캘린더) REST 컨트롤러.
 *
 * <h3>단일 인스턴스 처리 API 3종</h3>
 * <ul>
 *   <li>{@code DELETE /occurrences/{occurrenceYmd}} — 이 발생일만 삭제</li>
 *   <li>{@code PUT /occurrences/{occurrenceYmd}} — 이 발생일만 수정 (새 단발 row 생성)</li>
 *   <li>{@code PUT /from-occurrence/{occurrenceYmd}} — 이 발생일 이후 전부 수정 (새 시리즈 생성)</li>
 * </ul>
 * {@code occurrenceYmd}는 {@code YYYYMMDD} 형식이며 반복 시리즈 내 특정 인스턴스를 식별한다.
 *
 * <p>미구현: "이 일정부터 이후 전부 삭제"({@code DELETE /from-occurrence/...})는 백엔드 구현 완료.
 * 프론트엔드에서 아직 미노출 — 추후 ScheduleDetailModal에서 노출 예정.</p>
 */
@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    // ── 기간 조회 ─────────────────────────────────────────────────────────────

    /**
     * GET /api/schedules?st=YYYYMMDD&end=YYYYMMDD&dept=HR,DEV&mine=true
     *
     * <ul>
     *   <li>{@code dept} — 콤마 구분 부서 코드 목록. 생략 시 전체.</li>
     *   <li>{@code mine} — true 이면 본인 관련 일정만 반환.</li>
     * </ul>
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse>>> findByRange(
            @RequestParam String st,
            @RequestParam String end,
            @RequestParam(required = false) String dept,
            @RequestParam(defaultValue = "false") boolean mine,
            @AuthenticationPrincipal String currentUserId
    ) {
        List<String> deptFilters = (dept != null && !dept.isBlank())
                ? Arrays.asList(dept.split(","))
                : Collections.emptyList();

        List<ScheduleResponse> result =
                scheduleService.findByRange(st, end, deptFilters, mine, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── 단건 조회 ─────────────────────────────────────────────────────────────

    @GetMapping("/{schdSn}")
    public ResponseEntity<ApiResponse<ScheduleResponse>> getDetail(
            @PathVariable Long schdSn,
            @AuthenticationPrincipal String currentUserId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getDetail(schdSn, currentUserId)));
    }

    // ── 등록 ─────────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<Long>> create(
            @RequestBody ScheduleCreateRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        Long schdSn = scheduleService.create(req, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(schdSn));
    }

    // ── 수정 ─────────────────────────────────────────────────────────────────

    @PutMapping("/{schdSn}")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long schdSn,
            @RequestBody ScheduleUpdateRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        scheduleService.update(schdSn, req, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 삭제 ─────────────────────────────────────────────────────────────────

    @DeleteMapping("/{schdSn}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long schdSn,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        scheduleService.delete(schdSn, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 반복 일정: 단일 인스턴스 삭제 ──────────────────────────────────────────
    // DELETE /api/schedules/{schdSn}/occurrences/{occurrenceYmd}
    // → int_schd_excp (schdSn, occurrenceYmd, end_yn='N') INSERT

    @DeleteMapping("/{schdSn}/occurrences/{occurrenceYmd}")
    public ResponseEntity<ApiResponse<Void>> deleteOccurrence(
            @PathVariable Long schdSn,
            @PathVariable String occurrenceYmd,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        scheduleService.deleteOccurrence(schdSn, occurrenceYmd, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 반복 일정: 이 일정부터 이후 전부 삭제 ───────────────────────────────
    // DELETE /api/schedules/{schdSn}/from-occurrence/{occurrenceYmd}
    // → int_schd_excp (schdSn, occurrenceYmd, end_yn='Y') INSERT

    @DeleteMapping("/{schdSn}/from-occurrence/{occurrenceYmd}")
    public ResponseEntity<ApiResponse<Void>> deleteFromOccurrence(
            @PathVariable Long schdSn,
            @PathVariable String occurrenceYmd,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        scheduleService.deleteFromOccurrence(schdSn, occurrenceYmd, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 반복 일정: 단일 인스턴스 수정 ──────────────────────────────────────────
    // PUT /api/schedules/{schdSn}/occurrences/{occurrenceYmd}
    // → excp(end_yn='N') INSERT + 새 단발 row INSERT (loopYn='N')

    @PutMapping("/{schdSn}/occurrences/{occurrenceYmd}")
    public ResponseEntity<ApiResponse<Long>> updateOccurrence(
            @PathVariable Long schdSn,
            @PathVariable String occurrenceYmd,
            @RequestBody ScheduleUpdateRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        Long newSn = scheduleService.updateOccurrence(
                schdSn, occurrenceYmd, req, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(newSn));
    }

    // ── 반복 일정: 이 일정부터 이후 전부 수정 ────────────────────────────────
    // PUT /api/schedules/{schdSn}/from-occurrence/{occurrenceYmd}
    // → excp(end_yn='Y') INSERT + 새 시리즈 row INSERT (loopYn='Y')

    @PutMapping("/{schdSn}/from-occurrence/{occurrenceYmd}")
    public ResponseEntity<ApiResponse<Long>> updateFromOccurrence(
            @PathVariable Long schdSn,
            @PathVariable String occurrenceYmd,
            @RequestBody ScheduleUpdateRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        boolean admin = isAdmin();
        Long newSn = scheduleService.updateFromOccurrence(
                schdSn, occurrenceYmd, req, currentUserId, admin);
        return ResponseEntity.ok(ApiResponse.ok(newSn));
    }

    // ── 조회 마킹 ─────────────────────────────────────────────────────────────

    @PostMapping("/{schdSn}/viewed")
    public ResponseEntity<ApiResponse<Void>> markViewed(
            @PathVariable Long schdSn,
            @AuthenticationPrincipal String currentUserId
    ) {
        scheduleService.markViewed(schdSn, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 참석/불참 응답 ────────────────────────────────────────────────────────

    @PostMapping("/{schdSn}/respond")
    public ResponseEntity<ApiResponse<Void>> respondAttendance(
            @PathVariable Long schdSn,
            @RequestParam boolean attended,
            @AuthenticationPrincipal String currentUserId
    ) {
        scheduleService.respondAttendance(schdSn, currentUserId, attended);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── 유틸 ─────────────────────────────────────────────────────────────────

    private boolean isAdmin() {
        return SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
