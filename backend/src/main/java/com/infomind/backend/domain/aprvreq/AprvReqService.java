package com.infomind.backend.domain.aprvreq;

import com.infomind.backend.domain.aprvform.AprvFormDtl;
import com.infomind.backend.domain.aprvform.AprvFormDtlRepository;
import com.infomind.backend.domain.aprvform.AprvFormMst;
import com.infomind.backend.domain.aprvform.AprvFormMstRepository;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AprvReqService {

    private final AprvReqRepository     reqRepo;
    private final AprvReqAprvRepository aprvRepo;
    private final AprvReqRefRepository  refRepo;
    private final AprvFormMstRepository formMstRepo;
    private final AprvFormDtlRepository formDtlRepo;
    private final UserRepository        userRepo;

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");

    // ─── 내 결재함 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SummaryDto> getMine(String userId) {
        Map<String, String> formNames = buildFormNameMap();
        Map<String, String> userNames = buildUserNameMap();

        return reqRepo.findByReqUserIdAndDelYnOrderByCrtAtDesc(userId, "N")
                .stream()
                .map(r -> toSummary(r, formNames, userNames, null))
                .collect(Collectors.toList());
    }

    // ─── 결재 대기함 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SummaryDto> getPending(String userId) {
        Map<String, String> formNames = buildFormNameMap();
        Map<String, String> userNames = buildUserNameMap();

        return reqRepo.findPendingForMe(userId)
                .stream()
                .map(r -> {
                    List<AprvReqAprv> pendingList =
                            aprvRepo.findPendingByKey(r.getAprvFormId(), r.getReqUserId(), r.getAprvReqSn());
                    String currentAprvUserNm = pendingList.isEmpty() ? null
                            : userNames.get(pendingList.get(0).getAprvUserId());
                    return toSummary(r, formNames, userNames, currentAprvUserNm);
                })
                .collect(Collectors.toList());
    }

    // ─── 상세 조회 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DetailDto getDetail(String aprvFormId, String reqUserId, Long aprvReqSn) {
        AprvReq req = findReq(aprvFormId, reqUserId, aprvReqSn);
        AprvFormMst form = formMstRepo.findById(aprvFormId)
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다."));

        List<FormFieldDto> dtlFields = formDtlRepo
                .findAllByAprvFormIdAndDelYnOrderByAprvRefCd(aprvFormId, "N")
                .stream()
                .map(d -> new FormFieldDto(d.getAprvRefCd(), d.getAprvRefNm(), d.getAprvRefSe(), d.getReqdYn()))
                .collect(Collectors.toList());

        Map<String, String> userNames = buildUserNameMap();

        List<AprvLineDto> aprvList = aprvRepo
                .findByAprvFormIdAndReqUserIdAndAprvReqSnOrderByAprvOrdAsc(aprvFormId, reqUserId, aprvReqSn)
                .stream()
                .map(a -> AprvLineDto.builder()
                        .aprvUserId(a.getAprvUserId())
                        .aprvUserNm(userNames.getOrDefault(a.getAprvUserId(), a.getAprvUserId()))
                        .aprvOrd(a.getAprvOrd() != null ? a.getAprvOrd().intValue() : 0)
                        .aprvSe(a.getAprvSe())
                        .aprvYmd(a.getAprvYmd())
                        .rmk(a.getRmk())
                        .build())
                .collect(Collectors.toList());

        List<RefDto> refList = refRepo
                .findByAprvFormIdAndReqUserIdAndAprvReqSn(aprvFormId, reqUserId, aprvReqSn)
                .stream()
                .map(r -> new RefDto(r.getRefUserId(),
                        userNames.getOrDefault(r.getRefUserId(), r.getRefUserId()),
                        r.getQryYn()))
                .collect(Collectors.toList());

        String reqUserNm = userNames.getOrDefault(req.getReqUserId(), req.getReqUserId());

        return DetailDto.builder()
                .aprvFormId(req.getAprvFormId())
                .aprvFormNm(form.getAprvFormNm())
                .reqUserId(req.getReqUserId())
                .reqUserNm(reqUserNm)
                .aprvReqSn(req.getAprvReqSn())
                .reqSum(req.getReqSum())
                .reqYmd(req.getReqYmd())
                .aprvRsltSe(req.getAprvRsltSe())
                .crtAt(req.getCrtAt())
                .aprvReqDesc(req.getAprvReqDesc())
                .dtlFields(dtlFields)
                .fileYn(form.getFileYn())
                .afileId(req.getAfileId())
                .deptRefYn(req.getDeptRefYn())
                .aprvList(aprvList)
                .refList(refList)
                .build();
    }

    // ─── 결재 신청 ────────────────────────────────────────────────────────────

    @Transactional
    public DetailDto create(String reqUserId, CreateRequest req) {
        formMstRepo.findByAprvFormIdAndDelYn(req.getAprvFormId(), "N")
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다: " + req.getAprvFormId()));

        Long sn = reqRepo.nextSn(req.getAprvFormId(), reqUserId);
        String today = LocalDate.now().format(YMD);

        AprvReq aprvReq = AprvReq.builder()
                .aprvFormId(req.getAprvFormId())
                .reqUserId(reqUserId)
                .aprvReqSn(sn)
                .reqSum(req.getReqSum())
                .reqYmd(req.getReqYmd() != null ? req.getReqYmd() : today)
                .aprvReqDesc(req.getAprvReqDesc())
                .deptRefYn(req.getDeptRefYn() != null ? req.getDeptRefYn() : "N")
                .aprvRsltSe("1")
                .build();
        reqRepo.save(aprvReq);

        if (req.getAprvList() != null) {
            for (AprvEntryReq entry : req.getAprvList()) {
                aprvRepo.save(AprvReqAprv.builder()
                        .aprvFormId(req.getAprvFormId())
                        .reqUserId(reqUserId)
                        .aprvReqSn(sn)
                        .aprvUserId(entry.getAprvUserId())
                        .aprvOrd((long) entry.getAprvOrd())
                        .build());
            }
        }

        if (req.getRefUserIds() != null) {
            for (String refUserId : req.getRefUserIds()) {
                refRepo.save(AprvReqRef.builder()
                        .aprvFormId(req.getAprvFormId())
                        .reqUserId(reqUserId)
                        .aprvReqSn(sn)
                        .refUserId(refUserId)
                        .build());
            }
        }

        return getDetail(req.getAprvFormId(), reqUserId, sn);
    }

    // ─── 승인 ─────────────────────────────────────────────────────────────────

    @Transactional
    public DetailDto approve(String aprvFormId, String reqUserId, Long aprvReqSn,
                             String approverId, String rmk) {
        AprvReq req = findReq(aprvFormId, reqUserId, aprvReqSn);
        validateActive(req);

        AprvReqAprv myLine = aprvRepo
                .findByAprvFormIdAndReqUserIdAndAprvReqSnAndAprvUserId(aprvFormId, reqUserId, aprvReqSn, approverId)
                .orElseThrow(() -> new IllegalArgumentException("결재 권한이 없습니다."));

        if (myLine.getAprvSe() != null) throw new IllegalStateException("이미 처리된 결재입니다.");

        String today = LocalDate.now().format(YMD);
        myLine.approve(rmk, today);

        // 다음 결재자 확인
        List<AprvReqAprv> nextPending = aprvRepo.findPendingByKey(aprvFormId, reqUserId, aprvReqSn)
                .stream()
                .filter(a -> !a.getAprvUserId().equals(approverId))
                .collect(Collectors.toList());

        if (nextPending.isEmpty()) {
            // 모든 결재 완료 → 승인 확정
            req.updateStatus("3");
        } else {
            req.updateStatus("2");
        }

        return getDetail(aprvFormId, reqUserId, aprvReqSn);
    }

    // ─── 반려 ─────────────────────────────────────────────────────────────────

    @Transactional
    public DetailDto reject(String aprvFormId, String reqUserId, Long aprvReqSn,
                            String approverId, String rmk) {
        AprvReq req = findReq(aprvFormId, reqUserId, aprvReqSn);
        validateActive(req);

        AprvReqAprv myLine = aprvRepo
                .findByAprvFormIdAndReqUserIdAndAprvReqSnAndAprvUserId(aprvFormId, reqUserId, aprvReqSn, approverId)
                .orElseThrow(() -> new IllegalArgumentException("결재 권한이 없습니다."));

        if (myLine.getAprvSe() != null) throw new IllegalStateException("이미 처리된 결재입니다.");

        myLine.reject(rmk, LocalDate.now().format(YMD));
        req.updateStatus("9");

        return getDetail(aprvFormId, reqUserId, aprvReqSn);
    }

    // ─── 취소 (신청자, 진행 전만) ─────────────────────────────────────────────

    @Transactional
    public void cancel(String aprvFormId, String reqUserId, Long aprvReqSn, String callerId) {
        AprvReq req = findReq(aprvFormId, reqUserId, aprvReqSn);
        if (!req.getReqUserId().equals(callerId)) throw new IllegalArgumentException("취소 권한이 없습니다.");
        if (!"1".equals(req.getAprvRsltSe())) throw new IllegalStateException("진행 중이거나 완료된 결재는 취소할 수 없습니다.");
        req.cancel();
    }

    // ─── 내부 유틸 ────────────────────────────────────────────────────────────

    private AprvReq findReq(String formId, String reqUserId, Long sn) {
        return reqRepo.findByAprvFormIdAndReqUserIdAndAprvReqSnAndDelYn(formId, reqUserId, sn, "N")
                .orElseThrow(() -> new IllegalArgumentException("결재 건을 찾을 수 없습니다."));
    }

    private void validateActive(AprvReq req) {
        if ("3".equals(req.getAprvRsltSe())) throw new IllegalStateException("이미 승인 완료된 결재입니다.");
        if ("9".equals(req.getAprvRsltSe())) throw new IllegalStateException("이미 반려된 결재입니다.");
    }

    private Map<String, String> buildFormNameMap() {
        return formMstRepo.findAllByDelYnOrderByCrtAtDesc("N")
                .stream()
                .collect(Collectors.toMap(
                        AprvFormMst::getAprvFormId,
                        AprvFormMst::getAprvFormNm,
                        (a, b) -> a));
    }

    private Map<String, String> buildUserNameMap() {
        return userRepo.findAll()
                .stream()
                .collect(Collectors.toMap(
                        User::getUserId,
                        u -> u.getUserNm() != null ? u.getUserNm() : u.getUserId(),
                        (a, b) -> a));
    }

    private SummaryDto toSummary(AprvReq r, Map<String, String> formNames,
                                  Map<String, String> userNames, String currentAprvUserNm) {
        return SummaryDto.builder()
                .aprvFormId(r.getAprvFormId())
                .aprvFormNm(formNames.getOrDefault(r.getAprvFormId(), r.getAprvFormId()))
                .reqUserId(r.getReqUserId())
                .reqUserNm(userNames.getOrDefault(r.getReqUserId(), r.getReqUserId()))
                .aprvReqSn(r.getAprvReqSn())
                .reqSum(r.getReqSum())
                .reqYmd(r.getReqYmd())
                .aprvRsltSe(r.getAprvRsltSe())
                .crtAt(r.getCrtAt())
                .currentAprvUserNm(currentAprvUserNm)
                .build();
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    @Getter @Builder
    public static class SummaryDto {
        private String aprvFormId;
        private String aprvFormNm;
        private String reqUserId;
        private String reqUserNm;
        private Long aprvReqSn;
        private String reqSum;
        private String reqYmd;
        private String aprvRsltSe;
        private java.time.LocalDateTime crtAt;
        private String currentAprvUserNm;
    }

    @Getter @Builder
    public static class DetailDto {
        private String aprvFormId;
        private String aprvFormNm;
        private String reqUserId;
        private String reqUserNm;
        private Long aprvReqSn;
        private String reqSum;
        private String reqYmd;
        private String aprvRsltSe;
        private java.time.LocalDateTime crtAt;
        private Map<String, Object> aprvReqDesc;
        private List<FormFieldDto> dtlFields;
        private String fileYn;
        private String afileId;
        private String deptRefYn;
        private List<AprvLineDto> aprvList;
        private List<RefDto> refList;
    }

    @Getter @Builder
    public static class FormFieldDto {
        private String aprvRefCd;
        private String aprvRefNm;
        private String aprvRefSe;
        private String reqdYn;

        public FormFieldDto(String aprvRefCd, String aprvRefNm, String aprvRefSe, String reqdYn) {
            this.aprvRefCd = aprvRefCd;
            this.aprvRefNm = aprvRefNm;
            this.aprvRefSe = aprvRefSe;
            this.reqdYn = reqdYn;
        }
    }

    @Getter @Builder
    public static class AprvLineDto {
        private String aprvUserId;
        private String aprvUserNm;
        private int aprvOrd;
        private String aprvSe;
        private String aprvYmd;
        private String rmk;
    }

    @Getter
    public static class RefDto {
        private final String refUserId;
        private final String refUserNm;
        private final String qryYn;

        public RefDto(String refUserId, String refUserNm, String qryYn) {
            this.refUserId = refUserId;
            this.refUserNm = refUserNm;
            this.qryYn = qryYn;
        }
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String aprvFormId;
        @NotBlank private String reqSum;
        private String reqYmd;
        private Map<String, Object> aprvReqDesc;
        private String deptRefYn;
        private List<AprvEntryReq> aprvList;
        private List<String> refUserIds;
    }

    @Getter
    public static class AprvEntryReq {
        private String aprvUserId;
        private int aprvOrd;
    }

    @Getter
    public static class ApproveRequest {
        private String rmk;
    }
}
