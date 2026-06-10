package com.infomind.backend.domain.schedule;

import com.infomind.backend.domain.admin.Department;
import com.infomind.backend.domain.admin.DepartmentRepository;
import com.infomind.backend.domain.schedule.dto.*;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 일정(캘린더) 도메인 서비스.
 *
 * <h3>반복 일정 처리 패턴</h3>
 * 반복 일정은 시리즈 row 1개({@code LOOP_YN='Y'})로 저장한다.
 * 예외(특정 날짜 skip·시리즈 종료)는 {@code INT_SCHD_EXCP} 테이블로 표현하며,
 * 실제 발생 인스턴스 목록은 조회 시점에 {@link #findByRange}가 펼쳐서 반환한다.
 *
 * <h3>부서 권한 정책</h3>
 * {@code DEPT_CD = null}이면 전사 공개. 일반 사용자는 자기 부서 + 전사(null) 일정을
 * 기본으로 본다. 참석자로 포함된 경우에는 부서와 무관하게 조회된다.
 * 서버에서 부서를 강제 필터링하지는 않으며 클라이언트가 {@code dept} 파라미터로 제어한다.
 *
 * <h3>단일 인스턴스 처리</h3>
 * 단일 수정/삭제로 시리즈에서 떼어낸 파생 단발 row는 원본 시리즈 삭제({@link #delete}) 시
 * 함께 삭제되지 않는다. 이는 의도된 정책이다 (단일 처리 이력 보존).
 */
@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleAttdRepository scheduleAttdRepository;
    private final ScheduleExcpRepository scheduleExcpRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    // ── 상수 ─────────────────────────────────────────────────────────────────

    // ── 생성 ─────────────────────────────────────────────────────────────────

    @Transactional
    public Long create(ScheduleCreateRequest req, String currentUserId) {
        String loopYn = req.getLoopYn() != null ? req.getLoopYn() : "N";
        validateRepeatingSingleDay(loopYn, req.getLoopSe(), req.getSchdStYmd(), req.getSchdEndYmd());

        Long nextSn = scheduleRepository.findMaxSchdSn() + 1L;
        Schedule schedule = Schedule.builder()
                .schdSn(nextSn)
                .userId(currentUserId)
                .deptCd(req.getDeptCd())
                .schdNm(req.getSchdNm())
                .schdStYmd(req.getSchdStYmd())
                .schdStHr(req.getSchdStHr())
                .schdEndYmd(req.getSchdEndYmd())
                .schdEndHr(req.getSchdEndHr())
                .loopYn(loopYn)
                .loopSe(req.getLoopSe())
                .rmk(req.getRmk())
                .build();

        Schedule saved = scheduleRepository.save(schedule);
        saveAttendees(saved.getSchdSn(), req.getAttendeeUserIds());

        return saved.getSchdSn();
    }

    // ── 수정 ─────────────────────────────────────────────────────────────────

    @Transactional
    public void update(Long schdSn, ScheduleUpdateRequest req,
                       String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);
        validateRepeatingSingleDay(req.getLoopYn(), req.getLoopSe(), req.getSchdStYmd(), req.getSchdEndYmd());

        schedule.update(
                req.getSchdNm(), req.getDeptCd(),
                req.getSchdStYmd(), req.getSchdStHr(),
                req.getSchdEndYmd(), req.getSchdEndHr(),
                req.getLoopYn(), req.getLoopSe(), req.getRmk()
        );

        // 참석자 재구성
        scheduleAttdRepository.deleteBySchdSn(schdSn);
        saveAttendees(schdSn, req.getAttendeeUserIds());
    }

    // ── 삭제 ─────────────────────────────────────────────────────────────────

    /**
     * 시리즈 전체 삭제. excp·참석자도 함께 제거한다.
     *
     * <p>단일 수정({@link #updateOccurrence})으로 시리즈에서 떼어낸 파생 단발 row는
     * 별도 {@code SCHD_SN}을 가지므로 여기서 삭제되지 않는다 — 정책상 보존.</p>
     */
    @Transactional
    public void delete(Long schdSn, String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);

        scheduleAttdRepository.deleteBySchdSn(schdSn);
        scheduleExcpRepository.deleteBySchdSn(schdSn);
        scheduleRepository.delete(schedule);
    }

    // ── 반복 일정: 단일 인스턴스 삭제 ──────────────────────────────────────────

    /**
     * 반복 일정 중 특정 발생일({@code occurrenceYmd}) 하나만 삭제.
     *
     * <p>{@code INT_SCHD_EXCP(schdSn, occurrenceYmd, end_yn='N')} INSERT.
     * 이미 excp 행이 존재하면 멱등 처리(no-op)하여 PK 충돌을 방지한다.</p>
     */
    @Transactional
    public void deleteOccurrence(Long schdSn, String occurrenceYmd,
                                  String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);

        // 이미 예외가 있으면 멱등 처리 (중복 INSERT로 인한 PK 충돌 방지)
        if (scheduleExcpRepository.existsById(new ScheduleExcpId(schdSn, occurrenceYmd))) {
            return;
        }

        ScheduleExcp excp = ScheduleExcp.builder()
                .schdSn(schdSn)
                .excpYmd(occurrenceYmd)
                .endYn("N")
                .build();
        scheduleExcpRepository.save(excp);
    }

    // ── 반복 일정: 이 일정부터 이후 전부 삭제 ───────────────────────────────
    // INT_SCHD_EXCP(schdSn, occurrenceYmd, endYn='Y') UPSERT 성격으로 처리

    @Transactional
    public void deleteFromOccurrence(Long schdSn, String occurrenceYmd,
                                     String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);

        ScheduleExcpId id = new ScheduleExcpId(schdSn, occurrenceYmd);
        Optional<ScheduleExcp> existing = scheduleExcpRepository.findById(id);
        if (existing.isPresent()) {
            ScheduleExcp excp = existing.get();
            if (!excp.isEnd()) {
                excp.markEnd();
                scheduleExcpRepository.save(excp);
            }
            return;
        }

        ScheduleExcp endMarker = ScheduleExcp.builder()
                .schdSn(schdSn)
                .excpYmd(occurrenceYmd)
                .endYn("Y")
                .build();
        scheduleExcpRepository.save(endMarker);
    }

    // ── 반복 일정: 단일 인스턴스 수정 ──────────────────────────────────────────

    /**
     * 반복 일정 중 특정 발생일 하나만 수정 (이 일정만 수정).
     *
     * <p>한 트랜잭션 안에서: excp(end_yn='N') INSERT → 새 단발 row({@code LOOP_YN='N'}) INSERT.
     * 새 row의 {@code userId}는 호출자가 아닌 원본 시리즈 작성자로 유지된다
     * (admin이 수정해도 소유자는 원본 사용자).</p>
     *
     * <p>excp가 이미 존재하면 409 Conflict — 프론트 더블클릭 방어.</p>
     *
     * @return 새로 생성된 단발 일정의 {@code schdSn}
     */
    @Transactional
    public Long updateOccurrence(Long schdSn, String occurrenceYmd,
                                  ScheduleUpdateRequest req,
                                  String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);

        // excp가 이미 존재하면 이 occurrence는 이미 단일 처리됨 → 409 Conflict
        // 프론트 더블클릭 방어 + 백엔드 이중 안전망 (orphan 단발 row 생성 방지)
        if (scheduleExcpRepository.existsById(new ScheduleExcpId(schdSn, occurrenceYmd))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이 일정은 이미 단일 처리되었습니다.");
        }

        // 1) 원본 반복 시리즈에서 해당 발생일 skip 마킹
        ScheduleExcp excp = ScheduleExcp.builder()
                .schdSn(schdSn)
                .excpYmd(occurrenceYmd)
                .endYn("N")
                .build();
        scheduleExcpRepository.save(excp);

        // 2) body 내용으로 새 단발 row INSERT (loopYn='N' 강제)
        //    작성자(userId)는 원본 시리즈 작성자 유지 — 호출자가 admin이어도 원본 보존
        Long nextSn = scheduleRepository.findMaxSchdSn() + 1L;
        Schedule newOne = Schedule.builder()
                .schdSn(nextSn)
                .userId(schedule.getUserId())
                .deptCd(req.getDeptCd())
                .schdNm(req.getSchdNm())
                .schdStYmd(req.getSchdStYmd())
                .schdStHr(req.getSchdStHr())
                .schdEndYmd(req.getSchdEndYmd())
                .schdEndHr(req.getSchdEndHr())
                .loopYn("N")
                .loopSe(null)
                .rmk(req.getRmk())
                .build();
        Schedule saved = scheduleRepository.save(newOne);
        saveAttendees(saved.getSchdSn(), req.getAttendeeUserIds());

        return saved.getSchdSn();
    }

    // ── 반복 일정: 이 일정부터 이후 전부 수정 ────────────────────────────────

    /**
     * 반복 일정의 특정 발생일부터 이후 전체를 수정 (이 일정부터 이후 모두 수정).
     *
     * <p>한 트랜잭션 안에서: excp(end_yn='Y') INSERT → 새 시리즈 row({@code LOOP_YN='Y'}) INSERT.
     * 새 시리즈의 {@code userId}도 원본 시리즈 작성자 유지.
     * {@code schdEndYmd}가 null이면 원본 시리즈 종료일로 fallback하여 조회 누락을 방지한다.</p>
     *
     * @return 새로 생성된 시리즈의 {@code schdSn}
     */
    @Transactional
    public Long updateFromOccurrence(Long schdSn, String occurrenceYmd,
                                      ScheduleUpdateRequest req,
                                      String currentUserId, boolean isAdmin) {
        Schedule schedule = findOrThrow(schdSn);
        checkOwner(schedule, currentUserId, isAdmin);

        // 1) 원본 시리즈를 해당 발생일부터 종료 처리 (이미 종료 마커가 있으면 skip)
        Optional<ScheduleExcp> existingEnd = scheduleExcpRepository.findById(
                new ScheduleExcpId(schdSn, occurrenceYmd));
        if (existingEnd.isPresent()) {
            ScheduleExcp excp = existingEnd.get();
            if (!excp.isEnd()) {
                excp.markEnd();
                scheduleExcpRepository.save(excp);
            }
        } else {
            ScheduleExcp endMarker = ScheduleExcp.builder()
                    .schdSn(schdSn)
                    .excpYmd(occurrenceYmd)
                    .endYn("Y")
                    .build();
            scheduleExcpRepository.save(endMarker);
        }

        // 2) body 내용으로 새 시리즈 row INSERT (loopYn='Y' 강제, loopSe 는 body 우선)
        //    schdEndYmd 가 null 이면 원본 schedule 의 endYmd 로 fallback —
        //    f_schd_qry 에서 null endYmd 는 조회 누락을 유발하기 때문
        //    DISC-1 정신을 시리즈 분기에도 적용 — admin이 남의 시리즈 분기시켜도 새 시리즈 작성자는 원본 사용자
        String newLoopSe = (req.getLoopSe() != null) ? req.getLoopSe() : schedule.getLoopSe();
        String newEndYmd = (req.getSchdEndYmd() != null) ? req.getSchdEndYmd() : schedule.getSchdEndYmd();
        validateRepeatingSingleDay("Y", newLoopSe, req.getSchdStYmd(), newEndYmd);
        Long nextSn = scheduleRepository.findMaxSchdSn() + 1L;
        Schedule newSeries = Schedule.builder()
                .schdSn(nextSn)
                .userId(schedule.getUserId())
                .deptCd(req.getDeptCd())
                .schdNm(req.getSchdNm())
                .schdStYmd(req.getSchdStYmd())
                .schdStHr(req.getSchdStHr())
                .schdEndYmd(newEndYmd)
                .schdEndHr(req.getSchdEndHr())
                .loopYn("Y")
                .loopSe(newLoopSe)
                .rmk(req.getRmk())
                .build();
        Schedule saved = scheduleRepository.save(newSeries);
        saveAttendees(saved.getSchdSn(), req.getAttendeeUserIds());

        return saved.getSchdSn();
    }

    // ── 단건 조회 ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ScheduleResponse getDetail(Long schdSn, String currentUserId) {
        Schedule schedule = findOrThrow(schdSn);
        List<ScheduleAttd> attds = scheduleAttdRepository.findBySchdSn(schdSn);
        Map<String, String> nmMap = userNmMap();
        Map<String, String> deptNmMap = deptNmMap();

        return toResponse(schedule, attds, nmMap, deptNmMap, currentUserId, null);
    }

    // ── 기간 조회 (f_schd_qry DB 함수 사용) ──────────────────────────────────

    /**
     * 지정 기간의 일정을 반환한다.
     *
     * <p>단일·반복 일정 통합 조회, 반복 발생일 전개, int_schd_excp 예외 처리를
     * 모두 {@code f_schd_qry} DB 함수에 위임한다.
     * 반환 결과는 참석자 등록 일정 + 전사 공통(dept_cd IS NULL) + 소속 부서 일정을 포함한다.</p>
     *
     * <p>{@code deptFilters}가 지정된 경우 DB 결과를 추가 필터링한다.
     * {@code mineOnly}는 f_schd_qry 가 이미 사용자 관련 일정만 반환하므로 무시된다.</p>
     */
    @Transactional(readOnly = true)
    public List<ScheduleResponse> findByRange(String stYmd, String endYmd,
                                              List<String> deptFilters,
                                              boolean mineOnly,
                                              String currentUserId) {
        // 사용자 부서 코드 조회 (f_schd_qry 인자)
        String deptCd = userRepository.findById(currentUserId)
                .map(User::getDeptCd)
                .orElse(null);

        // DB 함수 호출 — 단일+반복 통합, 발생일 전개, 예외 처리 모두 DB 내부 처리
        List<SchdQryRow> rows = scheduleRepository.findByFuncQry(
                currentUserId, deptCd, stYmd, endYmd);

        // 부서 필터 추가 적용 (캘린더 패널에서 특정 부서만 보고 싶을 때)
        if (deptFilters != null && !deptFilters.isEmpty()) {
            rows = rows.stream()
                    .filter(r -> r.getDeptCd() == null || deptFilters.contains(r.getDeptCd()))
                    .collect(Collectors.toList());
        }

        // 이름·부서명 맵 & 참석자 맵 (반환된 schdSn 기준으로만 로드)
        Map<String, String> nmMap    = userNmMap();
        Map<String, String> deptNmMap = deptNmMap();

        Set<Long> schdSns = rows.stream().map(SchdQryRow::getSchdSn).collect(Collectors.toSet());
        Map<Long, List<ScheduleAttd>> attdMap = buildAttdMapForSns(schdSns);

        return rows.stream()
                .map(row -> toResponseFromRow(row, attdMap, nmMap, deptNmMap, currentUserId))
                .collect(Collectors.toList());
    }

    /** f_schd_qry 결과 행 → ScheduleResponse 변환. */
    private ScheduleResponse toResponseFromRow(SchdQryRow row,
                                               Map<Long, List<ScheduleAttd>> attdMap,
                                               Map<String, String> nmMap,
                                               Map<String, String> deptNmMap,
                                               String currentUserId) {
        Long schdSn = row.getSchdSn();
        List<ScheduleAttd> attds = attdMap.getOrDefault(schdSn, Collections.emptyList());

        List<AttendeeDto> attendeeDtos = attds.stream()
                .map(a -> AttendeeDto.builder()
                        .attdUserId(a.getAttdUserId())
                        .attdUserName(nmMap.getOrDefault(a.getAttdUserId(), a.getAttdUserId()))
                        .userAttdYn(a.getUserAttdYn())
                        .userQryYn(a.getUserQryYn())
                        .build())
                .collect(Collectors.toList());

        String deptNm = (row.getDeptCd() != null) ? deptNmMap.get(row.getDeptCd()) : null;
        boolean isAllDay = (row.getSchdStHr() == null || row.getSchdStHr().isBlank());

        return ScheduleResponse.builder()
                .schdSn(schdSn)
                .userId(row.getWriterId())
                .userName(nmMap.getOrDefault(row.getWriterId(), row.getWriterId()))
                .deptCd(row.getDeptCd())
                .deptNm(deptNm)
                .schdNm(row.getSchdNm())
                .schdStYmd(row.getOccurStYmd())
                .schdStHr(row.getSchdStHr())
                .schdEndYmd(row.getOccurEndYmd())
                .schdEndHr(row.getSchdEndHr())
                .displayStYmd(row.getOccurStYmd())
                .displayEndYmd(row.getOccurEndYmd())
                .allday(isAllDay)
                .loopYn(row.getLoopYn())
                .loopSe(row.getLoopSe())
                .rmk(row.getRmk())
                .attendees(attendeeDtos)
                .occurrenceYmd(row.getOccurStYmd())
                .mine(currentUserId.equals(row.getWriterId()))
                .build();
    }

    // ── 조회 마킹 ─────────────────────────────────────────────────────────────

    @Transactional
    public void markViewed(Long schdSn, String userId) {
        scheduleAttdRepository.findById(new ScheduleAttdId(schdSn, userId))
                .ifPresent(attd -> {
                    attd.markViewed();
                    scheduleAttdRepository.save(attd);
                });
    }

    // ── 참석/불참 응답 ────────────────────────────────────────────────────────

    @Transactional
    public void respondAttendance(Long schdSn, String userId, boolean attended) {
        ScheduleAttd attd = scheduleAttdRepository.findById(new ScheduleAttdId(schdSn, userId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "참석자 정보를 찾을 수 없습니다."));
        attd.attend(attended);
        scheduleAttdRepository.save(attd);
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────────────

    private Schedule findOrThrow(Long schdSn) {
        return scheduleRepository.findById(schdSn)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."));
    }

    private void checkOwner(Schedule schedule, String currentUserId, boolean isAdmin) {
        if (!schedule.getUserId().equals(currentUserId) && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "수정/삭제 권한이 없습니다.");
        }
    }

    private void saveAttendees(Long schdSn, List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return;
        List<ScheduleAttd> attds = userIds.stream()
                .map(uid -> ScheduleAttd.builder()
                        .schdSn(schdSn)
                        .attdUserId(uid)
                        .userAttdYn("N")
                        .userQryYn("N")
                        .build())
                .collect(Collectors.toList());
        scheduleAttdRepository.saveAll(attds);
    }

    private void validateRepeatingSingleDay(String loopYn, String loopSe,
                                            String stYmd, String endYmd) {
        if (!"Y".equalsIgnoreCase(loopYn)) return;
        if (loopSe == null || loopSe.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "반복 주기를 선택해야 합니다.");
        }
        if (stYmd == null || endYmd == null || !stYmd.equals(endYmd)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "반복 일정은 하루 일정만 등록할 수 있습니다.");
        }
    }

    private Map<String, String> userNmMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(
                        User::getUserId,
                        u -> u.getUserNm() != null ? u.getUserNm() : u.getUserId(),
                        (a, b) -> a));
    }

    private Map<String, String> deptNmMap() {
        return departmentRepository.findAll().stream()
                .collect(Collectors.toMap(
                        Department::getDeptCd,
                        d -> d.getDeptNm() != null ? d.getDeptNm() : d.getDeptCd(),
                        (a, b) -> a));
    }

    /** 지정된 schdSn 집합에 해당하는 참석자만 맵으로 로드 (전체 로드 대신 범위 한정). */
    private Map<Long, List<ScheduleAttd>> buildAttdMapForSns(Set<Long> schdSns) {
        if (schdSns.isEmpty()) return Collections.emptyMap();
        return scheduleAttdRepository.findBySchdSnIn(schdSns).stream()
                .collect(Collectors.groupingBy(ScheduleAttd::getSchdSn));
    }

    private ScheduleResponse toResponse(Schedule s, List<ScheduleAttd> attds,
                                        Map<String, String> nmMap,
                                        Map<String, String> deptNmMap,
                                        String currentUserId,
                                        String occurrenceYmd) {
        List<AttendeeDto> attendeeDtos = attds.stream()
                .map(a -> AttendeeDto.builder()
                        .attdUserId(a.getAttdUserId())
                        .attdUserName(nmMap.getOrDefault(a.getAttdUserId(), a.getAttdUserId()))
                        .userAttdYn(a.getUserAttdYn())
                        .userQryYn(a.getUserQryYn())
                        .build())
                .collect(Collectors.toList());

        String deptNm = (s.getDeptCd() != null) ? deptNmMap.get(s.getDeptCd()) : null;
        String displayStYmd = (occurrenceYmd != null) ? occurrenceYmd : s.getSchdStYmd();
        String displayEndYmd = (occurrenceYmd != null) ? occurrenceYmd : s.getSchdEndYmd();

        return ScheduleResponse.builder()
                .schdSn(s.getSchdSn())
                .userId(s.getUserId())
                .userName(nmMap.getOrDefault(s.getUserId(), s.getUserId()))
                .deptCd(s.getDeptCd())
                .deptNm(deptNm)
                .schdNm(s.getSchdNm())
                .schdStYmd(s.getSchdStYmd())
                .schdStHr(s.getSchdStHr())
                .schdEndYmd(s.getSchdEndYmd())
                .schdEndHr(s.getSchdEndHr())
                .displayStYmd(displayStYmd)
                .displayEndYmd(displayEndYmd)
                .allday(s.isAllDay())
                .loopYn(s.getLoopYn())
                .loopSe(s.getLoopSe())
                .rmk(s.getRmk())
                .attendees(attendeeDtos)
                .occurrenceYmd(occurrenceYmd)
                .mine(s.getUserId().equals(currentUserId))
                .crtAt(s.getCrtAt())
                .updAt(s.getUpdAt())
                .build();
    }
}
