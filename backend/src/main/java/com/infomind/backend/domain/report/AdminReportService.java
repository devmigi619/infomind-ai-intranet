package com.infomind.backend.domain.report;

import com.infomind.backend.common.summary.SummaryClient;
import com.infomind.backend.domain.admin.CommonCodeService;
import com.infomind.backend.domain.admin.DepartmentRepository;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminReportService {

    private static final String REPORT_DATE_CODE = "RPT_DT_SE";

    private final ReportFormRepository formRepository;
    private final ReportRoundRepository roundRepository;
    private final ReportDescRepository descRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final CommonCodeService commonCodeService;
    private final SummaryClient summaryClient;

    @Transactional(readOnly = true)
    public List<FormDto> getForms() {
        return formRepository.findAllByOrderByCrtAtDesc().stream().map(this::toFormDto).toList();
    }

    @Transactional
    public FormDto createForm(FormRequest req) {
        if (formRepository.existsById(req.rptFormId())) {
            throw new IllegalArgumentException("이미 존재하는 보고 양식 ID입니다.");
        }
        validateFormReferences(req);
        ReportForm form = ReportForm.builder()
                .rptFormId(req.rptFormId()).rptTtl(req.rptTtl()).rptDesc(req.rptDesc())
                .rptDtSe(req.rptDtSe()).rptAdmId(req.rptAdmId()).stYmd(blankToNull(req.stYmd()))
                .deptCd(req.deptCd()).openYn(yn(req.openYn(), "Y")).useYn(yn(req.useYn(), "Y"))
                .rmk(req.rmk()).build();
        return toFormDto(formRepository.save(form));
    }

    @Transactional
    public FormDto updateForm(String formId, FormRequest req) {
        ReportForm form = getForm(formId);
        validateFormReferences(req);
        String stYmd = blankToNull(req.stYmd());
        if (roundRepository.existsByRptFormId(formId)) {
            if (!Objects.equals(form.getRptDtSe(), req.rptDtSe())
                    || !Objects.equals(form.getDeptCd(), req.deptCd())
                    || !Objects.equals(form.getStYmd(), stYmd)) {
                throw new IllegalArgumentException("회차가 생성된 양식은 보고 주기, 대상 부서, 시작일을 수정할 수 없습니다.");
            }
            form.updateOperatingValues(req.rptTtl(), req.rptDesc(), req.rptAdmId(),
                    yn(req.openYn(), "Y"), yn(req.useYn(), "Y"), req.rmk());
        } else {
            form.updateAll(req.rptTtl(), req.rptDesc(), req.rptDtSe(), req.rptAdmId(),
                    stYmd, req.deptCd(), yn(req.openYn(), "Y"), yn(req.useYn(), "Y"), req.rmk());
        }
        return toFormDto(form);
    }

    @Transactional
    public FormDto setFormEnabled(String formId, boolean enabled) {
        ReportForm form = getForm(formId);
        form.setUseYn(enabled ? "Y" : "N");
        return toFormDto(form);
    }

    @Transactional(readOnly = true)
    public List<RoundDto> getRounds(String formId) {
        getForm(formId);
        return roundRepository.findByRptFormIdOrderByRoundSnDesc(formId).stream()
                .map(this::toRoundDto).toList();
    }

    @Transactional
    public RoundDto createRound(String formId, RoundRequest req) {
        getForm(formId);
        if (roundRepository.existsByRptFormIdAndRoundYmd(formId, req.roundYmd())) {
            throw new IllegalArgumentException("같은 기준일의 회차가 이미 존재합니다.");
        }
        ReportRound round = ReportRound.builder()
                .rptFormId(formId).roundSn(roundRepository.nextRoundSn(formId))
                .roundNm(req.roundNm()).roundYmd(req.roundYmd()).build();
        return toRoundDto(roundRepository.save(round));
    }

    @Transactional
    public RoundDto updateRound(String formId, Long roundSn, RoundRequest req) {
        ReportRound round = getRound(formId, roundSn);
        ensureRoundEditable(formId, roundSn);
        if (!Objects.equals(round.getRoundYmd(), req.roundYmd())
                && roundRepository.existsByRptFormIdAndRoundYmd(formId, req.roundYmd())) {
            throw new IllegalArgumentException("같은 기준일의 회차가 이미 존재합니다.");
        }
        round.update(req.roundNm(), req.roundYmd());
        return toRoundDto(round);
    }

    @Transactional
    public void deleteRound(String formId, Long roundSn) {
        ReportRound round = getRound(formId, roundSn);
        ensureRoundEditable(formId, roundSn);
        roundRepository.delete(round);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> getSubmissions(String formId, Long roundSn) {
        ReportForm form = getForm(formId);
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
    public RoundDto generateSummary(String formId, Long roundSn) {
        ReportRound round = getRound(formId, roundSn);
        Map<String, String> names = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getUserId, User::getUserNm, (a, b) -> a));
        List<ReportDesc> submitted = descRepository.findByRptFormIdAndRoundSnAndSbmtYn(formId, roundSn, "Y");
        if (submitted.isEmpty()) {
            throw new IllegalArgumentException("제출 완료된 보고가 없어 요약할 수 없습니다.");
        }
        String content = submitted.stream()
                .map(d -> "[작성자] " + names.getOrDefault(d.getUserId(), d.getUserId())
                        + "\n[수행 내용]\n" + nullToEmpty(d.getExecDesc())
                        + "\n[예정 내용]\n" + nullToEmpty(d.getPlanDesc()))
                .collect(Collectors.joining("\n\n---\n\n"));
        String summary = summaryClient.summarize("주간 업무보고 회차 요약", content);
        round.updateSummary(summary);
        return toRoundDto(round);
    }

    @Transactional
    public RoundDto updateSummary(String formId, Long roundSn, SummaryRequest req) {
        ReportRound round = getRound(formId, roundSn);
        round.updateSummary(req.summary());
        return toRoundDto(round);
    }

    private void validateFormReferences(FormRequest req) {
        boolean validCode = commonCodeService.getActiveCodes(REPORT_DATE_CODE).stream()
                .anyMatch(c -> c.getCd().equals(req.rptDtSe()));
        if (!validCode) throw new IllegalArgumentException("유효하지 않은 보고 주기입니다.");
        if (!departmentRepository.existsById(req.deptCd())) throw new IllegalArgumentException("부서를 찾을 수 없습니다.");
        User admin = userRepository.findById(req.rptAdmId())
                .orElseThrow(() -> new IllegalArgumentException("보고 관리자를 찾을 수 없습니다."));
        if ("INVALID".equals(admin.getUserSe())) throw new IllegalArgumentException("비활성 사용자는 보고 관리자로 지정할 수 없습니다.");
    }

    private void ensureRoundEditable(String formId, Long roundSn) {
        if (descRepository.existsByRptFormIdAndRoundSn(formId, roundSn)) {
            throw new IllegalArgumentException("작성 데이터가 있는 회차는 수정하거나 삭제할 수 없습니다.");
        }
    }

    private ReportForm getForm(String formId) {
        return formRepository.findById(formId).orElseThrow(() -> new IllegalArgumentException("보고 양식을 찾을 수 없습니다."));
    }

    private ReportRound getRound(String formId, Long roundSn) {
        return roundRepository.findById(new ReportRoundId(formId, roundSn))
                .orElseThrow(() -> new IllegalArgumentException("보고 회차를 찾을 수 없습니다."));
    }

    private FormDto toFormDto(ReportForm f) {
        return new FormDto(f.getRptFormId(), f.getRptTtl(), f.getRptDesc(), f.getRptDtSe(),
                f.getRptAdmId(), f.getStYmd(), f.getDeptCd(), f.getOpenYn(), f.getUseYn(), f.getRmk(),
                roundRepository.existsByRptFormId(f.getRptFormId()));
    }

    private RoundDto toRoundDto(ReportRound r) {
        List<ReportDesc> descs = descRepository.findByRptFormIdAndRoundSn(r.getRptFormId(), r.getRoundSn());
        long submitted = descs.stream().filter(d -> "Y".equals(d.getSbmtYn())).count();
        return new RoundDto(r.getRptFormId(), r.getRoundSn(), r.getRoundNm(), r.getRoundYmd(), r.getRptSum(),
                !descs.isEmpty(), descs.size(), submitted);
    }

    private SubmissionDto toSubmissionDto(User u, ReportDesc d) {
        if (d == null) return new SubmissionDto(u.getUserId(), u.getUserNm(), "NOT_WRITTEN", null, null, null);
        return new SubmissionDto(u.getUserId(), u.getUserNm(), "Y".equals(d.getSbmtYn()) ? "SUBMITTED" : "DRAFT",
                d.getSbmtYmd(), d.getExecDesc(), d.getPlanDesc());
    }

    private String yn(String value, String defaultValue) {
        String resolved = value == null ? defaultValue : value;
        if (!"Y".equals(resolved) && !"N".equals(resolved)) throw new IllegalArgumentException("Y/N 값만 허용됩니다.");
        return resolved;
    }

    private String nullToEmpty(String value) { return value == null ? "" : value; }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value; }

    public record FormDto(String rptFormId, String rptTtl, String rptDesc, String rptDtSe,
                          String rptAdmId, String stYmd, String deptCd, String openYn,
                          String useYn, String rmk, boolean hasRounds) {}
    public record RoundDto(String rptFormId, Long roundSn, String roundNm, String roundYmd,
                           String rptSum, boolean locked, long writtenCount, long submittedCount) {}
    public record SubmissionDto(String userId, String userNm, String status, String sbmtYmd,
                                String execDesc, String planDesc) {}
    public record FormRequest(@NotBlank String rptFormId, @NotBlank String rptTtl,
                              @NotBlank String rptDesc, @NotBlank String rptDtSe,
                              @NotBlank String rptAdmId, String stYmd, @NotBlank String deptCd,
                              String openYn, String useYn, String rmk) {}
    public record RoundRequest(@NotBlank String roundNm, @NotBlank String roundYmd) {}
    public record SummaryRequest(@NotBlank String summary) {}
}
