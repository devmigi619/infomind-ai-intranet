package com.infomind.backend.domain.aprvform;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AprvFormService {

    private final AprvFormMstRepository mstRepository;
    private final AprvFormDtlRepository dtlRepository;

    // ─── 목록 ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SummaryDto> getList() {
        return mstRepository.findAllByDelYnOrderByCrtAtDesc("N")
                .stream()
                .map(mst -> {
                    int dtlCount = dtlRepository
                            .findAllByAprvFormIdAndDelYnOrderByAprvRefCd(mst.getAprvFormId(), "N")
                            .size();
                    return toSummaryDto(mst, dtlCount);
                })
                .collect(Collectors.toList());
    }

    // ─── 상세 ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DetailDto getDetail(String aprvFormId) {
        AprvFormMst mst = mstRepository.findByAprvFormIdAndDelYn(aprvFormId, "N")
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다: " + aprvFormId));

        List<DtlDto> dtls = dtlRepository
                .findAllByAprvFormIdAndDelYnOrderByAprvRefCd(aprvFormId, "N")
                .stream()
                .map(this::toDtlDto)
                .collect(Collectors.toList());

        return toDetailDto(mst, dtls);
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    @Transactional
    public DetailDto create(CreateRequest req) {
        if (mstRepository.existsByAprvFormId(req.getAprvFormId())) {
            throw new IllegalArgumentException("이미 존재하는 양식 ID입니다: " + req.getAprvFormId());
        }

        AprvFormMst mst = AprvFormMst.builder()
                .aprvFormId(req.getAprvFormId())
                .aprvFormNm(req.getAprvFormNm())
                .fileYn(req.getFileYn() != null ? req.getFileYn() : "N")
                .rmk(req.getRmk())
                .build();
        mstRepository.save(mst);

        List<DtlDto> dtls = saveDtls(req.getAprvFormId(), req.getDtls());
        return toDetailDto(mst, dtls);
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public DetailDto update(String aprvFormId, UpdateRequest req) {
        AprvFormMst mst = mstRepository.findByAprvFormIdAndDelYn(aprvFormId, "N")
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다: " + aprvFormId));

        mst.update(req.getAprvFormNm(), req.getFileYn(), req.getRmk());

        // 기존 DTL soft-delete 후 새로 저장
        dtlRepository.softDeleteByAprvFormId(aprvFormId);
        List<DtlDto> dtls = saveDtls(aprvFormId, req.getDtls());

        return toDetailDto(mst, dtls);
    }

    // ─── 삭제 ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(String aprvFormId) {
        AprvFormMst mst = mstRepository.findByAprvFormIdAndDelYn(aprvFormId, "N")
                .orElseThrow(() -> new IllegalArgumentException("양식을 찾을 수 없습니다: " + aprvFormId));
        mst.delete();
        dtlRepository.softDeleteByAprvFormId(aprvFormId);
    }

    // ─── 내부 유틸 ─────────────────────────────────────────────────────────

    private List<DtlDto> saveDtls(String aprvFormId, List<DtlRequest> dtlRequests) {
        if (dtlRequests == null || dtlRequests.isEmpty()) {
            return List.of();
        }
        return dtlRequests.stream()
                .map(d -> {
                    AprvFormDtl dtl = AprvFormDtl.builder()
                            .aprvFormId(aprvFormId)
                            .aprvRefCd(d.getAprvRefCd())
                            .aprvRefNm(d.getAprvRefNm())
                            .aprvRefSe(d.getAprvRefSe())
                            .reqdYn(d.getReqdYn() != null ? d.getReqdYn() : "N")
                            .build();
                    return toDtlDto(dtlRepository.save(dtl));
                })
                .collect(Collectors.toList());
    }

    private SummaryDto toSummaryDto(AprvFormMst mst, int dtlCount) {
        return SummaryDto.builder()
                .aprvFormId(mst.getAprvFormId())
                .aprvFormNm(mst.getAprvFormNm())
                .fileYn(mst.getFileYn())
                .dtlCount(dtlCount)
                .crtAt(mst.getCrtAt())
                .build();
    }

    private DetailDto toDetailDto(AprvFormMst mst, List<DtlDto> dtls) {
        return DetailDto.builder()
                .aprvFormId(mst.getAprvFormId())
                .aprvFormNm(mst.getAprvFormNm())
                .fileYn(mst.getFileYn())
                .rmk(mst.getRmk())
                .dtls(dtls)
                .build();
    }

    private DtlDto toDtlDto(AprvFormDtl d) {
        return DtlDto.builder()
                .aprvRefCd(d.getAprvRefCd())
                .aprvRefNm(d.getAprvRefNm())
                .aprvRefSe(d.getAprvRefSe())
                .reqdYn(d.getReqdYn())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class SummaryDto {
        private String aprvFormId;
        private String aprvFormNm;
        private String fileYn;
        private int dtlCount;
        private LocalDateTime crtAt;
    }

    @Getter
    @Builder
    public static class DetailDto {
        private String aprvFormId;
        private String aprvFormNm;
        private String fileYn;
        private String rmk;
        private List<DtlDto> dtls;
    }

    @Getter
    @Builder
    public static class DtlDto {
        private String aprvRefCd;
        private String aprvRefNm;
        private String aprvRefSe;
        private String reqdYn;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String aprvFormId;
        @NotBlank private String aprvFormNm;
        private String fileYn;
        private String rmk;
        private List<DtlRequest> dtls;
    }

    @Getter
    public static class UpdateRequest {
        @NotBlank private String aprvFormNm;
        private String fileYn;
        private String rmk;
        private List<DtlRequest> dtls;
    }

    @Getter
    public static class DtlRequest {
        @NotBlank private String aprvRefCd;
        @NotBlank private String aprvRefNm;
        private String aprvRefSe;
        private String reqdYn;
    }
}
