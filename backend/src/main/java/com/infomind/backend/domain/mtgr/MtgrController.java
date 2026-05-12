package com.infomind.backend.domain.mtgr;

import com.infomind.backend.common.ApiResponse;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mtgrs")
@RequiredArgsConstructor
public class MtgrController {

    private final MtgrRepository mtgrRepository;
    private final MtgrReservationRepository reservationRepository;
    private final UserRepository userRepository;

    // ── DTO ─────────────────────────────────────────────────────────────────

    public record MtgrDto(
            String mtgrId, String mtgrNm, String mtgrPlc, String mtgrSe, String deptCd
    ) {}

    public record MtgrReservationDto(
            String mtgrId, Long rsvSn, String userId, String userNm,
            String rsvStYmd, String rsvStHhmm, String rsvEndYmd, String rsvEndHhmm,
            String rmk, boolean mine,
            String extYn, String extYmd, String extHhmm
    ) {}

    public record CreateReservationRequest(
            String rsvStYmd, String rsvStHhmm, String rsvEndYmd, String rsvEndHhmm, String rmk
    ) {}

    public record ExtendRequest(
            String newEndYmd, String newEndHhmm
    ) {}

    // ── 유틸 ─────────────────────────────────────────────────────────────────

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");
    private String today() { return LocalDate.now().format(YMD); }
    private String maxDate() { return LocalDate.now().plusDays(14).format(YMD); } // 회의실은 14일 정도로 넉넉히

    private MtgrReservationDto toDto(MtgrReservation r, Map<String, String> userNmMap, String currentUserId) {
        return new MtgrReservationDto(
                r.getMtgrId(), r.getRsvSn(),
                r.getUserId(), userNmMap.getOrDefault(r.getUserId(), r.getUserId()),
                r.getRsvStYmd(), r.getRsvStHhmm(), r.getRsvEndYmd(), r.getRsvEndHhmm(),
                r.getRmk(), r.getUserId().equals(currentUserId),
                r.getExtYn(), r.getExtYmd(), r.getExtHhmm()
        );
    }

    private Map<String, String> userNmMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(
                        User::getUserId,
                        u -> u.getUserNm() != null ? u.getUserNm() : u.getUserId(),
                        (a, b) -> a));
    }

    // ── API ─────────────────────────────────────────────────────────────────

    /** 회의실 목록 조회 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MtgrDto>>> getMtgrs() {
        List<MtgrDto> list = mtgrRepository.findByUseYnOrderByMtgrNmAsc("Y")
                .stream()
                .map(m -> new MtgrDto(m.getMtgrId(), m.getMtgrNm(), m.getMtgrPlc(), m.getMtgrSe(), m.getDeptCd()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** 날짜별 예약 현황 */
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<List<MtgrReservationDto>>> getReservations(
            @RequestParam String date,
            @AuthenticationPrincipal String currentUserId
    ) {
        Map<String, String> nmMap = userNmMap();
        List<MtgrReservationDto> list = reservationRepository
                .findByDateRange(date, date)
                .stream()
                .map(r -> toDto(r, nmMap, currentUserId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** 예약 신청 */
    @PostMapping("/{mtgrId}/reservations")
    public ResponseEntity<ApiResponse<MtgrReservationDto>> createReservation(
            @PathVariable String mtgrId,
            @RequestBody CreateReservationRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        Mtgr mtgr = mtgrRepository.findById(mtgrId)
                .orElseThrow(() -> new IllegalArgumentException("회의실을 찾을 수 없습니다."));

        // 부서 제어 (MTGR_SE = 'D'인 경우 해당 부서원만 가능)
        if ("D".equals(mtgr.getMtgrSe())) {
            User user = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자 정보를 찾을 수 없습니다."));
            if (mtgr.getDeptCd() != null && !mtgr.getDeptCd().equals(user.getDeptCd())) {
                return ResponseEntity.status(403).body(ApiResponse.fail("해당 부서 전용 회의실입니다."));
            }
        }

        // 검증
        String today = today();
        if (req.rsvStYmd().compareTo(today) < 0 || req.rsvStYmd().compareTo(maxDate()) > 0) {
            throw new IllegalArgumentException("예약 가능 기간이 아닙니다.");
        }
        if (req.rsvEndYmd().compareTo(req.rsvStYmd()) < 0
                || (req.rsvEndYmd().equals(req.rsvStYmd()) && req.rsvEndHhmm().compareTo(req.rsvStHhmm()) <= 0)) {
            throw new IllegalArgumentException("종료 시각은 시작 시각보다 늦어야 합니다.");
        }

        // 충돌 검사
        if (!reservationRepository.findConflicts(mtgrId, req.rsvStYmd(), req.rsvStHhmm(), req.rsvEndYmd(), req.rsvEndHhmm()).isEmpty()) {
            throw new IllegalArgumentException("해당 시간대에 이미 예약이 있습니다.");
        }

        Long nextSn = reservationRepository.nextRsvSn(mtgrId);
        MtgrReservation saved = reservationRepository.save(
                MtgrReservation.builder()
                        .mtgrId(mtgrId).rsvSn(nextSn).userId(currentUserId)
                        .rsvStYmd(req.rsvStYmd()).rsvStHhmm(req.rsvStHhmm())
                        .rsvEndYmd(req.rsvEndYmd()).rsvEndHhmm(req.rsvEndHhmm())
                        .rmk(req.rmk())
                        .build()
        );

        return ResponseEntity.ok(ApiResponse.ok(toDto(saved, userNmMap(), currentUserId)));
    }

    /** 예약 취소 */
    @DeleteMapping("/{mtgrId}/reservations/{rsvSn}")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(
            @PathVariable String mtgrId,
            @PathVariable Long rsvSn,
            @AuthenticationPrincipal String currentUserId
    ) {
        MtgrReservation rsv = reservationRepository.findById(new MtgrReservationId(mtgrId, rsvSn))
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다."));
        if (!rsv.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(ApiResponse.fail("본인의 예약만 취소할 수 있습니다."));
        }
        reservationRepository.delete(rsv);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 예약 연장 */
    @PatchMapping("/{mtgrId}/reservations/{rsvSn}/extend")
    public ResponseEntity<ApiResponse<MtgrReservationDto>> extendReservation(
            @PathVariable String mtgrId,
            @PathVariable Long rsvSn,
            @RequestBody ExtendRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        MtgrReservation rsv = reservationRepository.findById(new MtgrReservationId(mtgrId, rsvSn))
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다."));
        if (!rsv.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(ApiResponse.fail("본인의 예약만 연장할 수 있습니다."));
        }
        if (req.newEndYmd().compareTo(rsv.getRsvEndYmd()) < 0
                || (req.newEndYmd().equals(rsv.getRsvEndYmd()) && req.newEndHhmm().compareTo(rsv.getRsvEndHhmm()) <= 0)) {
            throw new IllegalArgumentException("연장 종료 시각은 현재 종료 시각보다 늦어야 합니다.");
        }

        // 충돌 검사
        if (!reservationRepository.findConflictsExcluding(
                mtgrId, rsv.getRsvStYmd(), rsv.getRsvStHhmm(), req.newEndYmd(), req.newEndHhmm(), rsvSn).isEmpty()) {
            throw new IllegalArgumentException("해당 시간대에 이미 예약이 있습니다.");
        }

        rsv.extend(req.newEndYmd(), req.newEndHhmm());
        MtgrReservation saved = reservationRepository.save(rsv);

        return ResponseEntity.ok(ApiResponse.ok(toDto(saved, userNmMap(), currentUserId)));
    }
}
