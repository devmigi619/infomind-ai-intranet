package com.infomind.backend.domain.report;

import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserReportService {

    private final ReportFormRepository formRepository;
    private final ReportRoundRepository roundRepository;
    private final ReportDescRepository descRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<MyReportRoundDto> getMyRounds(String userId) {
        User user = getActiveUser(userId);
        Map<ReportDescId, ReportDesc> descMap = descRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(d -> new ReportDescId(d.getRptFormId(), d.getRoundSn(), d.getUserId()), Function.identity()));
        return formRepository.findByDeptCdAndUseYn(user.getDeptCd(), "Y").stream()
                .flatMap(form -> roundRepository.findByRptFormIdOrderByRoundSnDesc(form.getRptFormId()).stream()
                        .map(round -> toMyRoundDto(form, round, descMap.get(new ReportDescId(form.getRptFormId(), round.getRoundSn(), userId)))))
                .sorted(Comparator.comparing(MyReportRoundDto::roundYmd, Comparator.nullsLast(String::compareTo)).reversed()
                        .thenComparing(MyReportRoundDto::rptTtl))
                .toList();
    }

    @Transactional(readOnly = true)
    public MyReportRoundDto getMyRound(String userId, String formId, Long roundSn) {
        User user = getActiveUser(userId);
        ReportForm form = getTargetForm(user, formId);
        ReportRound round = getRound(formId, roundSn);
        ReportDesc desc = descRepository.findById(new ReportDescId(formId, roundSn, userId)).orElse(null);
        return toMyRoundDto(form, round, desc);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> getSubmissions(String userId, String formId, Long roundSn) {
        User user = getActiveUser(userId);
        ReportForm form = getTargetForm(user, formId);
        getRound(formId, roundSn);
        Map<String, ReportDesc> descMap = descRepository.findByRptFormIdAndRoundSn(formId, roundSn)
                .stream().collect(Collectors.toMap(ReportDesc::getUserId, Function.identity()));
        return userRepository.findByDeptCdIn(List.of(form.getDeptCd())).stream()
                .filter(u -> !"INVALID".equals(u.getUserSe()))
                .sorted(Comparator.comparing(User::getUserNm, Comparator.nullsLast(String::compareTo)))
                .map(u -> toSubmissionDto(u, descMap.get(u.getUserId())))
                .toList();
    }

    @Transactional
    public MyReportRoundDto saveDraft(String userId, String formId, Long roundSn, ReportWriteRequest req) {
        User user = getActiveUser(userId);
        ReportForm form = getTargetForm(user, formId);
        ReportRound round = getRound(formId, roundSn);
        ReportDesc desc = getOrCreateDesc(userId, formId, roundSn);
        if ("Y".equals(desc.getSbmtYn())) {
            throw new IllegalArgumentException("제출 완료된 보고는 수정할 수 없습니다.");
        }
        desc.saveDraft(req.execDesc(), req.planDesc());
        return toMyRoundDto(form, round, desc);
    }

    @Transactional
    public MyReportRoundDto submit(String userId, String formId, Long roundSn, ReportWriteRequest req) {
        User user = getActiveUser(userId);
        ReportForm form = getTargetForm(user, formId);
        ReportRound round = getRound(formId, roundSn);
        ReportDesc desc = getOrCreateDesc(userId, formId, roundSn);
        if ("Y".equals(desc.getSbmtYn())) {
            throw new IllegalArgumentException("이미 제출 완료된 보고입니다.");
        }
        if (isBlank(req.execDesc()) || isBlank(req.planDesc())) {
            throw new IllegalArgumentException("수행 내용과 예정 내용을 모두 입력해주세요.");
        }
        desc.submit(req.execDesc().trim(), req.planDesc().trim(), LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE));
        return toMyRoundDto(form, round, desc);
    }

    private ReportDesc getOrCreateDesc(String userId, String formId, Long roundSn) {
        return descRepository.findById(new ReportDescId(formId, roundSn, userId))
                .orElseGet(() -> descRepository.save(ReportDesc.builder()
                        .rptFormId(formId)
                        .roundSn(roundSn)
                        .userId(userId)
                        .sbmtYn("N")
                        .build()));
    }

    private User getActiveUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        if ("INVALID".equals(user.getUserSe())) {
            throw new IllegalArgumentException("비활성 사용자는 보고를 작성할 수 없습니다.");
        }
        return user;
    }

    private ReportForm getTargetForm(User user, String formId) {
        ReportForm form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("보고 양식을 찾을 수 없습니다."));
        if (!"Y".equals(form.getUseYn())) {
            throw new IllegalArgumentException("비활성 보고 양식입니다.");
        }
        if (!form.getDeptCd().equals(user.getDeptCd())) {
            throw new IllegalArgumentException("보고 대상자가 아닙니다.");
        }
        return form;
    }

    private ReportRound getRound(String formId, Long roundSn) {
        return roundRepository.findById(new ReportRoundId(formId, roundSn))
                .orElseThrow(() -> new IllegalArgumentException("보고 회차를 찾을 수 없습니다."));
    }

    private MyReportRoundDto toMyRoundDto(ReportForm form, ReportRound round, ReportDesc desc) {
        String status = desc == null ? "NOT_WRITTEN" : "Y".equals(desc.getSbmtYn()) ? "SUBMITTED" : "DRAFT";
        return new MyReportRoundDto(
                form.getRptFormId(), form.getRptTtl(), form.getRptDesc(), form.getRptDtSe(),
                round.getRoundSn(), round.getRoundNm(), round.getRoundYmd(),
                status, desc == null ? null : desc.getExecDesc(), desc == null ? null : desc.getPlanDesc(),
                desc == null ? null : desc.getSbmtYmd(),
                targetCount(form.getDeptCd()),
                submittedCount(form.getRptFormId(), round.getRoundSn())
        );
    }

    private SubmissionDto toSubmissionDto(User u, ReportDesc d) {
        if (d == null) return new SubmissionDto(u.getUserId(), u.getUserNm(), "NOT_WRITTEN", null, null, null);
        return new SubmissionDto(u.getUserId(), u.getUserNm(), "Y".equals(d.getSbmtYn()) ? "SUBMITTED" : "DRAFT",
                d.getSbmtYmd(), d.getExecDesc(), d.getPlanDesc());
    }

    private long targetCount(String deptCd) {
        return userRepository.findByDeptCdIn(List.of(deptCd)).stream()
                .filter(u -> !"INVALID".equals(u.getUserSe()))
                .count();
    }

    private long submittedCount(String formId, Long roundSn) {
        return descRepository.findByRptFormIdAndRoundSnAndSbmtYn(formId, roundSn, "Y").size();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record MyReportRoundDto(String rptFormId, String rptTtl, String rptDesc, String rptDtSe,
                                   Long roundSn, String roundNm, String roundYmd, String status,
                                   String execDesc, String planDesc, String sbmtYmd,
                                   long targetCount, long submittedCount) {}
    public record SubmissionDto(String userId, String userNm, String status, String sbmtYmd,
                                String execDesc, String planDesc) {}
    public record ReportWriteRequest(@NotNull String execDesc, @NotNull String planDesc) {}
}
