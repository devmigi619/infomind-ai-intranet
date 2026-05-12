package com.infomind.backend.domain.vehicle;

import com.infomind.backend.common.ApiResponse;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleRepository vehicleRepository;
    private final VehicleReservationRepository reservationRepository;
    private final UserRepository userRepository;

    // ── DTO ─────────────────────────────────────────────────────────────────

    public record VehicleDto(
            String vehId, String vehNm, String vehNo, String vehSe, String deptCd
    ) {}

    public record VehicleReservationDto(
            String vehId, Long rsvSn, String userId, String userNm,
            String rsvStYmd, String rsvStHhmm, String rsvEndYmd, String rsvEndHhmm,
            String rmk, boolean mine,
            // 반납
            String rtnYn, String rtnYmd, String rtnHhmm, String rtnPlc,
            // 연장
            String extYn, String extYmd, String extHhmm
    ) {}

    public record CreateReservationRequest(
            String rsvStYmd, String rsvStHhmm, String rsvEndYmd, String rsvEndHhmm, String rmk
    ) {}

    public record ReturnRequest(
            String rtnYmd, String rtnHhmm, String rtnPlc
    ) {}

    public record ExtendRequest(
            String newEndYmd, String newEndHhmm
    ) {}

    // ── 유틸 ─────────────────────────────────────────────────────────────────

    private static final DateTimeFormatter YMD  = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HHmm");

    private String today()   { return LocalDate.now().format(YMD); }
    private String maxDate() { return LocalDate.now().plusDays(7).format(YMD); }

    /** VehicleReservation → DTO 변환 */
    private VehicleReservationDto toDto(VehicleReservation r, Map<String, String> userNmMap, String currentUserId) {
        return new VehicleReservationDto(
                r.getVehId(), r.getRsvSn(),
                r.getUserId(), userNmMap.getOrDefault(r.getUserId(), r.getUserId()),
                r.getRsvStYmd(), r.getRsvStHhmm(), r.getRsvEndYmd(), r.getRsvEndHhmm(),
                r.getRmk(), r.getUserId().equals(currentUserId),
                r.getRtnYn(), r.getRtnYmd(), r.getRtnHhmm(), r.getRtnPlc(),
                r.getExtYn(), r.getExtYmd(), r.getExtHhmm()
        );
    }

    /** userId → userNm 맵 */
    private Map<String, String> userNmMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(
                        u -> u.getUserId(),
                        u -> u.getUserNm() != null ? u.getUserNm() : u.getUserId(),
                        (a, b) -> a));
    }

    // ── API ─────────────────────────────────────────────────────────────────

    /** GET /api/vehicles — 활성 차량 목록 */
    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleDto>>> getVehicles() {
        List<VehicleDto> list = vehicleRepository.findByUseYnOrderByVehNmAsc("Y")
                .stream()
                .map(v -> new VehicleDto(v.getVehId(), v.getVehNm(), v.getVehNo(), v.getVehSe(), v.getDeptCd()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** GET /api/vehicles/reservations?date=YYYYMMDD — 날짜별 예약 현황 */
    @GetMapping("/reservations")
    public ResponseEntity<ApiResponse<List<VehicleReservationDto>>> getReservations(
            @RequestParam String date,
            @AuthenticationPrincipal String currentUserId
    ) {
        Map<String, String> nmMap = userNmMap();
        List<VehicleReservationDto> list = reservationRepository
                .findByDateRange(date, date)
                .stream()
                .map(r -> toDto(r, nmMap, currentUserId))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** POST /api/vehicles/{vehId}/reservations — 예약 신청 */
    @PostMapping("/{vehId}/reservations")
    public ResponseEntity<ApiResponse<VehicleReservationDto>> createReservation(
            @PathVariable String vehId,
            @RequestBody CreateReservationRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        // 날짜 범위 검증 (오늘 ~ 오늘+7일)
        String today = today();
        if (req.rsvStYmd().compareTo(today) < 0 || req.rsvStYmd().compareTo(maxDate()) > 0) {
            throw new IllegalArgumentException("예약 가능 기간은 오늘부터 7일 이내입니다.");
        }
        // 종료 > 시작
        if (req.rsvEndYmd().compareTo(req.rsvStYmd()) < 0
                || (req.rsvEndYmd().equals(req.rsvStYmd()) && req.rsvEndHhmm().compareTo(req.rsvStHhmm()) <= 0)) {
            throw new IllegalArgumentException("종료 시각은 시작 시각보다 늦어야 합니다.");
        }
        // 충돌 검사
        if (!reservationRepository.findConflicts(vehId, req.rsvStYmd(), req.rsvStHhmm(), req.rsvEndYmd(), req.rsvEndHhmm()).isEmpty()) {
            throw new IllegalArgumentException("해당 시간대에 이미 예약이 있습니다.");
        }

        Long nextSn = reservationRepository.nextRsvSn(vehId);
        VehicleReservation saved = reservationRepository.save(
                VehicleReservation.builder()
                        .vehId(vehId).rsvSn(nextSn).userId(currentUserId)
                        .rsvStYmd(req.rsvStYmd()).rsvStHhmm(req.rsvStHhmm())
                        .rsvEndYmd(req.rsvEndYmd()).rsvEndHhmm(req.rsvEndHhmm())
                        .rmk(req.rmk())
                        .build()
        );

        Map<String, String> nmMap = userNmMap();
        return ResponseEntity.ok(ApiResponse.ok(toDto(saved, nmMap, currentUserId)));
    }

    /** DELETE /api/vehicles/{vehId}/reservations/{rsvSn} — 예약 취소 */
    @DeleteMapping("/{vehId}/reservations/{rsvSn}")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(
            @PathVariable String vehId,
            @PathVariable Long rsvSn,
            @AuthenticationPrincipal String currentUserId
    ) {
        VehicleReservation rsv = reservationRepository.findById(new VehicleReservationId(vehId, rsvSn))
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다."));
        if (!rsv.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(ApiResponse.fail("본인의 예약만 취소할 수 있습니다."));
        }
        reservationRepository.delete(rsv);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** PATCH /api/vehicles/{vehId}/reservations/{rsvSn}/return — 반납 처리 */
    @PatchMapping("/{vehId}/reservations/{rsvSn}/return")
    public ResponseEntity<ApiResponse<VehicleReservationDto>> returnReservation(
            @PathVariable String vehId,
            @PathVariable Long rsvSn,
            @RequestBody ReturnRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        VehicleReservation rsv = reservationRepository.findById(new VehicleReservationId(vehId, rsvSn))
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다."));
        if (!rsv.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(ApiResponse.fail("본인의 예약만 반납할 수 있습니다."));
        }
        if ("Y".equals(rsv.getRtnYn())) {
            throw new IllegalArgumentException("이미 반납 처리된 예약입니다.");
        }

        rsv.doReturn(req.rtnYmd(), req.rtnHhmm(), req.rtnPlc());
        VehicleReservation saved = reservationRepository.save(rsv);

        Map<String, String> nmMap = userNmMap();
        return ResponseEntity.ok(ApiResponse.ok(toDto(saved, nmMap, currentUserId)));
    }

    /** PATCH /api/vehicles/{vehId}/reservations/{rsvSn}/extend — 예약 연장 */
    @PatchMapping("/{vehId}/reservations/{rsvSn}/extend")
    public ResponseEntity<ApiResponse<VehicleReservationDto>> extendReservation(
            @PathVariable String vehId,
            @PathVariable Long rsvSn,
            @RequestBody ExtendRequest req,
            @AuthenticationPrincipal String currentUserId
    ) {
        VehicleReservation rsv = reservationRepository.findById(new VehicleReservationId(vehId, rsvSn))
                .orElseThrow(() -> new IllegalArgumentException("예약을 찾을 수 없습니다."));
        if (!rsv.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(ApiResponse.fail("본인의 예약만 연장할 수 있습니다."));
        }
        // 연장 방향 검증 (새 종료 > 현재 종료)
        if (req.newEndYmd().compareTo(rsv.getRsvEndYmd()) < 0
                || (req.newEndYmd().equals(rsv.getRsvEndYmd()) && req.newEndHhmm().compareTo(rsv.getRsvEndHhmm()) <= 0)) {
            throw new IllegalArgumentException("연장 종료 시각은 현재 종료 시각보다 늦어야 합니다.");
        }
        // 오늘+7일 이내
        if (req.newEndYmd().compareTo(maxDate()) > 0) {
            throw new IllegalArgumentException("연장 가능 기간은 오늘부터 7일 이내입니다.");
        }
        // 충돌 검사 (자기 자신 제외)
        if (!reservationRepository.findConflictsExcluding(
                vehId, rsv.getRsvStYmd(), rsv.getRsvStHhmm(), req.newEndYmd(), req.newEndHhmm(), rsvSn).isEmpty()) {
            throw new IllegalArgumentException("해당 시간대에 이미 예약이 있습니다.");
        }

        rsv.extend(req.newEndYmd(), req.newEndHhmm());
        VehicleReservation saved = reservationRepository.save(rsv);

        Map<String, String> nmMap = userNmMap();
        return ResponseEntity.ok(ApiResponse.ok(toDto(saved, nmMap, currentUserId)));
    }
}
