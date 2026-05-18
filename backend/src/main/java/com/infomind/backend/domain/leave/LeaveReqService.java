package com.infomind.backend.domain.leave;

import com.infomind.backend.domain.admin.LeaveDtl;
import com.infomind.backend.domain.admin.LeaveDtlId;
import com.infomind.backend.domain.admin.LeaveDtlRepository;
import com.infomind.backend.domain.admin.LeaveMst;
import com.infomind.backend.domain.admin.LeaveMstRepository;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveReqService {

    private final LeaveReqMstRepository mstRepo;
    private final LeaveReqDtlRepository dtlRepo;
    private final LeaveReqAprvRepository aprvRepo;
    private final LeaveReqRefRepository  refRepo;
    private final LeaveMstRepository     leaveMstRepo;
    private final LeaveDtlRepository     leaveDtlRepo;
    private final UserRepository         userRepo;
    private final LeaveBalanceMapper     balanceMapper;

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    // ─── 목록 ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LeaveReqSummaryDto> getMyList(String userId) {
        return mstRepo.findByIdReqUserIdOrderByIdReqSnDesc(userId)
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveReqSummaryDto> getPendingForApprover(String aprvUserId) {
        return mstRepo.findPendingByApprover(aprvUserId)
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    // ─── 상세 ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LeaveReqDetailDto getDetail(String reqUserId, Long reqSn) {
        LeaveReqMst mst = findMst(reqUserId, reqSn);
        return toDetail(mst);
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveReqDetailDto create(String reqUserId, LeaveReqCreateRequest req) {
        Long nextSn = mstRepo.findMaxReqSn(reqUserId).map(n -> n + 1).orElse(1L);

        BigDecimal useDcnt = calcUseDcnt(req.getLeaveDtlCd(), req.getLeaveCd(),
                req.getDates(), req.getLeaveStHhmm(), req.getLeaveEndHhmm());

        LeaveReqMst mst = mstRepo.save(LeaveReqMst.builder()
                .id(new LeaveReqMstId(reqUserId, nextSn))
                .leaveRsn(req.getLeaveRsn())
                .leaveCd(req.getLeaveCd())
                .leaveDtlCd(req.getLeaveDtlCd())
                .leaveUseDcnt(useDcnt)
                .deptRefYn(req.getDeptRefYn() != null ? req.getDeptRefYn() : "N")
                .afileId(req.getAfileId())
                .aprvRsltSe("1")
                .build());

        saveDates(reqUserId, nextSn, req.getDates(), req.getLeaveStHhmm(), req.getLeaveEndHhmm());
        saveAprv(reqUserId, nextSn, req.getAprvList());
        saveRef(reqUserId, nextSn, req.getRefList());

        // 결재자가 있으면 즉시 '진행(2)' 상태로
        if (req.getAprvList() != null && !req.getAprvList().isEmpty()) {
            mst.updateStatus("2");
        }

        return toDetail(mst);
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveReqDetailDto update(String reqUserId, Long reqSn,
                                    String currentUserId, LeaveReqCreateRequest req) {
        LeaveReqMst mst = findMst(reqUserId, reqSn);
        if (!reqUserId.equals(currentUserId)) {
            throw new IllegalArgumentException("본인 신청만 수정할 수 있습니다.");
        }
        if (!"1".equals(mst.getAprvRsltSe())) {
            throw new IllegalStateException("신청(1) 상태에서만 수정할 수 있습니다.");
        }

        BigDecimal useDcnt = calcUseDcnt(req.getLeaveDtlCd(), req.getLeaveCd(),
                req.getDates(), req.getLeaveStHhmm(), req.getLeaveEndHhmm());
        mst.update(req.getLeaveRsn(), req.getLeaveCd(), req.getLeaveDtlCd(),
                   useDcnt, req.getDeptRefYn() != null ? req.getDeptRefYn() : "N",
                   req.getAfileId());

        dtlRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);
        aprvRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);
        refRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);

        saveDates(reqUserId, reqSn, req.getDates(), req.getLeaveStHhmm(), req.getLeaveEndHhmm());
        saveAprv(reqUserId, reqSn, req.getAprvList());
        saveRef(reqUserId, reqSn, req.getRefList());

        if (req.getAprvList() != null && !req.getAprvList().isEmpty()) {
            mst.updateStatus("2");
        }

        return toDetail(mst);
    }

    // ─── 취소 ──────────────────────────────────────────────────────────────────

    @Transactional
    public void cancel(String reqUserId, Long reqSn, String currentUserId) {
        LeaveReqMst mst = findMst(reqUserId, reqSn);
        if (!reqUserId.equals(currentUserId)) {
            throw new IllegalArgumentException("본인 신청만 취소할 수 있습니다.");
        }
        if (!"1".equals(mst.getAprvRsltSe())) {
            throw new IllegalStateException("신청(1) 상태에서만 취소할 수 있습니다.");
        }
        dtlRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);
        aprvRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);
        refRepo.deleteByIdReqUserIdAndIdReqSn(reqUserId, reqSn);
        mstRepo.delete(mst);
    }

    // ─── 승인 ──────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveReqDetailDto approve(String reqUserId, Long reqSn, String aprvUserId) {
        LeaveReqMst mst = findMst(reqUserId, reqSn);
        LeaveReqAprv myAprv = aprvRepo
                .findByIdReqUserIdAndIdReqSnAndIdAprvUserId(reqUserId, reqSn, aprvUserId)
                .orElseThrow(() -> new IllegalArgumentException("결재자로 등록되지 않았습니다."));

        if (myAprv.getAprvSe() != null) {
            throw new IllegalStateException("이미 처리된 건입니다.");
        }

        // aprv_ord 순서 보장: 내 앞 순서 결재자가 모두 처리됐는지 확인
        List<LeaveReqAprv> allAprvs = aprvRepo
                .findByIdReqUserIdAndIdReqSnOrderByAprvOrdAsc(reqUserId, reqSn);
        boolean prevUnprocessed = allAprvs.stream()
                .filter(a -> a.getAprvOrd() < myAprv.getAprvOrd())
                .anyMatch(a -> a.getAprvSe() == null);
        if (prevUnprocessed) {
            throw new IllegalStateException("이전 순서 결재자가 아직 처리하지 않았습니다.");
        }

        String today = LocalDate.now().format(YMD);
        myAprv.approve(today); // 엔티티 in-place 업데이트 → allAprvs에 반영됨

        // 모든 결재자 처리 완료 시 최종 승인 (방금 approve한 myAprv 포함)
        boolean allDone = allAprvs.stream().allMatch(a -> "3".equals(a.getAprvSe()));
        if (allDone) {
            mst.updateStatus("3");
        }

        return toDetail(mst);
    }

    // ─── 반려 ──────────────────────────────────────────────────────────────────

    @Transactional
    public LeaveReqDetailDto reject(String reqUserId, Long reqSn,
                                    String aprvUserId, String rmk) {
        LeaveReqMst mst = findMst(reqUserId, reqSn);
        LeaveReqAprv myAprv = aprvRepo
                .findByIdReqUserIdAndIdReqSnAndIdAprvUserId(reqUserId, reqSn, aprvUserId)
                .orElseThrow(() -> new IllegalArgumentException("결재자로 등록되지 않았습니다."));

        if (myAprv.getAprvSe() != null) {
            throw new IllegalStateException("이미 처리된 건입니다.");
        }

        // aprv_ord 순서 보장: 내 앞 순서 결재자가 모두 처리됐는지 확인
        List<LeaveReqAprv> allAprvs = aprvRepo
                .findByIdReqUserIdAndIdReqSnOrderByAprvOrdAsc(reqUserId, reqSn);
        boolean prevUnprocessed = allAprvs.stream()
                .filter(a -> a.getAprvOrd() < myAprv.getAprvOrd())
                .anyMatch(a -> a.getAprvSe() == null);
        if (prevUnprocessed) {
            throw new IllegalStateException("이전 순서 결재자가 아직 처리하지 않았습니다.");
        }

        String today = LocalDate.now().format(YMD);
        myAprv.reject(today, rmk);
        mst.updateStatus("9");

        return toDetail(mst);
    }

    // ─── 잔여 휴가 ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MyLeaveBalanceDto getMyLeaveBalance(String userId) {
        String curYear = String.valueOf(LocalDate.now().getYear());

        // DB 함수로 기본 휴가 부여일수 조회 (hire_ymd → 근속개월 → INT_LEAVE_POL 매칭)
        BigDecimal entitlement = balanceMapper.calcEntitlement(userId);
        if (entitlement == null) entitlement = BigDecimal.ZERO;

        // 연도별 승인된 차감 휴가 사용일수
        List<LeaveBalanceMapper.YearlyUsedDto> usedList = balanceMapper.getUsedByYear(userId);

        BigDecimal curUsed = usedList.stream()
                .filter(u -> curYear.equals(u.getYear()))
                .map(LeaveBalanceMapper.YearlyUsedDto::getUsedDcnt)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        BigDecimal remaining = entitlement.subtract(curUsed).max(BigDecimal.ZERO);
        int usedPct = entitlement.compareTo(BigDecimal.ZERO) > 0
                ? curUsed.multiply(BigDecimal.valueOf(100))
                         .divide(entitlement, 0, RoundingMode.HALF_UP)
                         .intValue()
                : 0;

        LeaveBalanceDto current = LeaveBalanceDto.builder()
                .year(curYear)
                .entitlementDcnt(entitlement)
                .usedDcnt(curUsed)
                .remainingDcnt(remaining)
                .usedPct(usedPct)
                .build();

        List<LeaveBalanceDto> history = usedList.stream()
                .filter(u -> !curYear.equals(u.getYear()))
                .map(u -> LeaveBalanceDto.builder()
                        .year(u.getYear())
                        .usedDcnt(u.getUsedDcnt())
                        .build())
                .collect(Collectors.toList());

        return MyLeaveBalanceDto.builder()
                .currentYear(current)
                .history(history)
                .build();
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private LeaveReqMst findMst(String reqUserId, Long reqSn) {
        return mstRepo.findById(new LeaveReqMstId(reqUserId, reqSn))
                .orElseThrow(() -> new IllegalArgumentException("휴가신청을 찾을 수 없습니다."));
    }

    private BigDecimal calcUseDcnt(String leaveDtlCd, String leaveCd, List<String> dates,
                                    String leaveStHhmm, String leaveEndHhmm) {
        if (dates == null || dates.isEmpty()) return BigDecimal.ZERO;
        BigDecimal perDay = BigDecimal.ONE;
        if (leaveDtlCd != null && leaveCd != null) {
            var dtlOpt = leaveDtlRepo.findById(new LeaveDtlId(leaveCd, leaveDtlCd));
            if (dtlOpt.isPresent() && "H".equals(dtlOpt.get().getLeaveSe())) {
                if (leaveStHhmm != null && leaveEndHhmm != null) {
                    int diffMin = parseHhmm(leaveEndHhmm) - parseHhmm(leaveStHhmm);
                    if (diffMin == 120) {
                        perDay = new BigDecimal("0.25");
                    } else if (diffMin == 240) {
                        perDay = new BigDecimal("0.5");
                    } else {
                        throw new IllegalArgumentException(
                                "시간 차이는 2시간(0.25일) 또는 4시간(0.5일)이어야 합니다.");
                    }
                } else {
                    perDay = new BigDecimal("0.5");
                }
            }
        }
        return perDay.multiply(new BigDecimal(dates.size()));
    }

    private static int parseHhmm(String hhmm) {
        return Integer.parseInt(hhmm.substring(0, 2)) * 60
             + Integer.parseInt(hhmm.substring(2, 4));
    }

    private void saveDates(String reqUserId, Long reqSn, List<String> dates,
                           String leaveStHhmm, String leaveEndHhmm) {
        if (dates == null) return;
        for (String ymd : dates) {
            dtlRepo.save(LeaveReqDtl.builder()
                    .id(new LeaveReqDtlId(reqUserId, reqSn, ymd))
                    .leaveStHhmm(leaveStHhmm)
                    .leaveEndHhmm(leaveEndHhmm)
                    .build());
        }
    }

    private void saveAprv(String reqUserId, Long reqSn, List<AprvEntryRequest> list) {
        if (list == null) return;
        for (int i = 0; i < list.size(); i++) {
            aprvRepo.save(LeaveReqAprv.builder()
                    .id(new LeaveReqAprvId(reqUserId, reqSn, list.get(i).getAprvUserId()))
                    .aprvOrd(i + 1)
                    .build());
        }
    }

    private void saveRef(String reqUserId, Long reqSn, List<String> refUserIds) {
        if (refUserIds == null) return;
        for (String refUserId : refUserIds) {
            refRepo.save(LeaveReqRef.builder()
                    .id(new LeaveReqRefId(reqUserId, reqSn, refUserId))
                    .build());
        }
    }

    private String resolveUserNm(String userId) {
        return userRepo.findById(userId).map(User::getUserNm).orElse(userId);
    }

    private LeaveReqSummaryDto toSummary(LeaveReqMst mst) {
        List<LeaveReqDtl> dtls = dtlRepo.findByIdReqUserIdAndIdReqSnOrderByIdLeaveUseYmdAsc(
                mst.getId().getReqUserId(), mst.getId().getReqSn());
        String startYmd = dtls.isEmpty() ? null : dtls.get(0).getId().getLeaveUseYmd();
        String endYmd   = dtls.isEmpty() ? null : dtls.get(dtls.size() - 1).getId().getLeaveUseYmd();

        String leaveMstNm = leaveMstRepo.findById(mst.getLeaveCd())
                .map(m -> m.getLeaveNm()).orElse(mst.getLeaveCd());
        String leaveDtlNm = null;
        if (mst.getLeaveDtlCd() != null) {
            leaveDtlNm = leaveDtlRepo.findById(new LeaveDtlId(mst.getLeaveCd(), mst.getLeaveDtlCd()))
                    .map(LeaveDtl::getLeaveDtlNm).orElse(null);
        }

        return LeaveReqSummaryDto.builder()
                .reqUserId(mst.getId().getReqUserId())
                .reqSn(mst.getId().getReqSn())
                .reqUserNm(resolveUserNm(mst.getId().getReqUserId()))
                .aprvRsltSe(mst.getAprvRsltSe())
                .leaveCd(mst.getLeaveCd())
                .leaveDtlCd(mst.getLeaveDtlCd())
                .leaveMstNm(leaveMstNm)
                .leaveDtlNm(leaveDtlNm)
                .leaveUseDcnt(mst.getLeaveUseDcnt())
                .startYmd(startYmd)
                .endYmd(endYmd)
                .crtAt(mst.getCrtAt() != null ? mst.getCrtAt().toString() : null)
                .build();
    }

    private LeaveReqDetailDto toDetail(LeaveReqMst mst) {
        List<LeaveReqDtl> dtls = dtlRepo.findByIdReqUserIdAndIdReqSnOrderByIdLeaveUseYmdAsc(
                mst.getId().getReqUserId(), mst.getId().getReqSn());
        List<LeaveReqAprv> aprvs = aprvRepo.findByIdReqUserIdAndIdReqSnOrderByAprvOrdAsc(
                mst.getId().getReqUserId(), mst.getId().getReqSn());
        List<LeaveReqRef> refs = refRepo.findByIdReqUserIdAndIdReqSn(
                mst.getId().getReqUserId(), mst.getId().getReqSn());

        String leaveMstNm = leaveMstRepo.findById(mst.getLeaveCd())
                .map(m -> m.getLeaveNm()).orElse(mst.getLeaveCd());
        String leaveDtlNm = null;
        if (mst.getLeaveDtlCd() != null) {
            leaveDtlNm = leaveDtlRepo.findById(new LeaveDtlId(mst.getLeaveCd(), mst.getLeaveDtlCd()))
                    .map(LeaveDtl::getLeaveDtlNm).orElse(null);
        }

        List<AprvDto> aprvDtos = aprvs.stream().map(a -> AprvDto.builder()
                .aprvUserId(a.getId().getAprvUserId())
                .aprvUserNm(resolveUserNm(a.getId().getAprvUserId()))
                .aprvOrd(a.getAprvOrd())
                .aprvSe(a.getAprvSe())
                .aprvYmd(a.getAprvYmd())
                .rmk(a.getRmk())
                .build()).collect(Collectors.toList());

        List<RefDto> refDtos = refs.stream().map(r -> RefDto.builder()
                .refUserId(r.getId().getRefUserId())
                .refUserNm(resolveUserNm(r.getId().getRefUserId()))
                .qryYn(r.getQryYn())
                .build()).collect(Collectors.toList());

        // 모든 날짜에 동일한 시간이 저장되므로 첫 번째 DTL에서 대표 시간 추출
        String leaveStHhmm  = dtls.isEmpty() ? null : dtls.get(0).getLeaveStHhmm();
        String leaveEndHhmm = dtls.isEmpty() ? null : dtls.get(0).getLeaveEndHhmm();

        return LeaveReqDetailDto.builder()
                .reqUserId(mst.getId().getReqUserId())
                .reqSn(mst.getId().getReqSn())
                .reqUserNm(resolveUserNm(mst.getId().getReqUserId()))
                .leaveRsn(mst.getLeaveRsn())
                .aprvRsltSe(mst.getAprvRsltSe())
                .leaveCd(mst.getLeaveCd())
                .leaveDtlCd(mst.getLeaveDtlCd())
                .leaveMstNm(leaveMstNm)
                .leaveDtlNm(leaveDtlNm)
                .leaveUseDcnt(mst.getLeaveUseDcnt())
                .deptRefYn(mst.getDeptRefYn())
                .afileId(mst.getAfileId())
                .leaveStHhmm(leaveStHhmm)
                .leaveEndHhmm(leaveEndHhmm)
                .dates(dtls.stream().map(d -> d.getId().getLeaveUseYmd()).collect(Collectors.toList()))
                .aprvList(aprvDtos)
                .refList(refDtos)
                .crtAt(mst.getCrtAt() != null ? mst.getCrtAt().toString() : null)
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────────

    @Getter @Builder
    public static class LeaveReqSummaryDto {
        private String reqUserId, reqUserNm;
        private Long reqSn;
        private String aprvRsltSe;
        private String leaveCd, leaveDtlCd, leaveMstNm, leaveDtlNm;
        private BigDecimal leaveUseDcnt;
        private String startYmd, endYmd, crtAt;
    }

    @Getter @Builder
    public static class LeaveReqDetailDto {
        private String reqUserId, reqUserNm;
        private Long reqSn;
        private String leaveRsn, aprvRsltSe;
        private String leaveCd, leaveDtlCd, leaveMstNm, leaveDtlNm;
        private BigDecimal leaveUseDcnt;
        private String deptRefYn, crtAt;
        private String afileId;
        /** 반일 신청 시작 시분 HHMM */
        private String leaveStHhmm;
        /** 반일 신청 종료 시분 HHMM */
        private String leaveEndHhmm;
        private List<String> dates;
        private List<AprvDto> aprvList;
        private List<RefDto>  refList;
    }

    @Getter @Builder
    public static class AprvDto {
        private String aprvUserId, aprvUserNm;
        private Integer aprvOrd;
        private String aprvSe, aprvYmd, rmk;
    }

    @Getter @Builder
    public static class RefDto {
        private String refUserId, refUserNm, qryYn;
    }

    @Getter
    public static class LeaveReqCreateRequest {
        @NotBlank private String leaveCd;
        private String leaveDtlCd;
        private String leaveRsn;
        private String deptRefYn;
        private String afileId;
        /** 반일(H) 신청 시 시작 시분 HHMM (예: "0900") */
        private String leaveStHhmm;
        /** 반일(H) 신청 시 종료 시분 HHMM (예: "1300") */
        private String leaveEndHhmm;
        private List<String>           dates;
        private List<AprvEntryRequest> aprvList;
        private List<String>           refList;
    }

    @Getter
    public static class AprvEntryRequest {
        @NotBlank private String aprvUserId;
    }

    @Getter
    public static class RejectRequest {
        private String rmk;
    }

    // ─── 잔여 휴가 DTOs ────────────────────────────────────────────────────────

    @Getter @Builder
    public static class LeaveBalanceDto {
        private String year;
        private BigDecimal entitlementDcnt;  // 올해만 포함
        private BigDecimal usedDcnt;
        private BigDecimal remainingDcnt;    // 올해만 포함
        private int usedPct;                 // 0~100, 올해만 유효
    }

    @Getter @Builder
    public static class MyLeaveBalanceDto {
        private LeaveBalanceDto       currentYear;
        private List<LeaveBalanceDto> history;
    }
}
