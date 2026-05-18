package com.infomind.backend.domain.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveAdminService {

    private final LeaveMstRepository mstRepo;
    private final LeaveDtlRepository dtlRepo;
    private final LeavePolRepository polRepo;

    // ─── MST ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MstDto> getAllMst() {
        return mstRepo.findAllByOrderByLeaveCdAsc()
                .stream().map(this::toMstDto).collect(Collectors.toList());
    }

    @Transactional
    public MstDto createMst(MstCreateRequest req) {
        if (mstRepo.existsByLeaveCd(req.getLeaveCd())) {
            throw new IllegalArgumentException("이미 존재하는 휴가 코드입니다: " + req.getLeaveCd());
        }
        return toMstDto(mstRepo.save(LeaveMst.builder()
                .leaveCd(req.getLeaveCd())
                .leaveNm(req.getLeaveNm())
                .dedYn(req.getDedYn())
                .paidYn(req.getPaidYn())
                .useYn(req.getUseYn() != null ? req.getUseYn() : "Y")
                .build()));
    }

    @Transactional
    public MstDto updateMst(String leaveCd, MstUpdateRequest req) {
        LeaveMst mst = mstRepo.findById(leaveCd)
                .orElseThrow(() -> new IllegalArgumentException("휴가 유형을 찾을 수 없습니다."));
        mst.update(req.getLeaveNm(), req.getDedYn(), req.getPaidYn(), req.getUseYn());
        return toMstDto(mst);
    }

    @Transactional
    public void deleteMst(String leaveCd) {
        LeaveMst mst = mstRepo.findById(leaveCd)
                .orElseThrow(() -> new IllegalArgumentException("휴가 유형을 찾을 수 없습니다."));
        mstRepo.delete(mst);
    }

    // ─── DTL ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DtlDto> getDtlByLeaveCd(String leaveCd) {
        return dtlRepo.findByIdLeaveCdOrderByIdLeaveDtlCdAsc(leaveCd)
                .stream().map(this::toDtlDto).collect(Collectors.toList());
    }

    @Transactional
    public DtlDto createDtl(DtlCreateRequest req) {
        LeaveDtlId id = new LeaveDtlId(req.getLeaveCd(), req.getLeaveDtlCd());
        if (dtlRepo.existsById(id)) {
            throw new IllegalArgumentException("이미 존재하는 세부 코드입니다: " + req.getLeaveDtlCd());
        }
        LeaveMst mst = mstRepo.findById(req.getLeaveCd())
                .orElseThrow(() -> new IllegalArgumentException("휴가 유형을 찾을 수 없습니다."));
        return toDtlDto(dtlRepo.save(LeaveDtl.builder()
                .id(id)
                .leaveMst(mst)
                .leaveDtlNm(req.getLeaveDtlNm())
                .leaveDtlDesc(req.getLeaveDtlDesc())
                .leaveSe(req.getLeaveSe())
                .useAvlDcnt(req.getUseAvlDcnt())
                .useYn(req.getUseYn() != null ? req.getUseYn() : "Y")
                .build()));
    }

    @Transactional
    public DtlDto updateDtl(String leaveCd, String leaveDtlCd, DtlUpdateRequest req) {
        LeaveDtl dtl = dtlRepo.findById(new LeaveDtlId(leaveCd, leaveDtlCd))
                .orElseThrow(() -> new IllegalArgumentException("세부 유형을 찾을 수 없습니다."));
        dtl.update(req.getLeaveDtlNm(), req.getLeaveDtlDesc(),
                   req.getLeaveSe(), req.getUseAvlDcnt(), req.getUseYn());
        return toDtlDto(dtl);
    }

    @Transactional
    public void deleteDtl(String leaveCd, String leaveDtlCd) {
        LeaveDtl dtl = dtlRepo.findById(new LeaveDtlId(leaveCd, leaveDtlCd))
                .orElseThrow(() -> new IllegalArgumentException("세부 유형을 찾을 수 없습니다."));
        dtlRepo.delete(dtl);
    }

    // ─── POL ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PolDto> getAllPol() {
        return polRepo.findAllByOrderByPolStMonAsc()
                .stream().map(this::toPolDto).collect(Collectors.toList());
    }

    @Transactional
    public PolDto createPol(PolCreateRequest req) {
        if (polRepo.existsByLeavePolCd(req.getLeavePolCd())) {
            throw new IllegalArgumentException("이미 존재하는 정책 코드입니다: " + req.getLeavePolCd());
        }
        return toPolDto(polRepo.save(LeavePol.builder()
                .leavePolCd(req.getLeavePolCd())
                .leavePolNm(req.getLeavePolNm())
                .leavePolDesc(req.getLeavePolDesc())
                .polStMon(req.getPolStMon())
                .polEndMon(req.getPolEndMon())
                .leaveDcnt(req.getLeaveDcnt())
                .addDcnt(req.getAddDcnt())
                .addCycMon(req.getAddCycMon())
                .maxDcnt(req.getMaxDcnt())
                .useYn(req.getUseYn() != null ? req.getUseYn() : "Y")
                .build()));
    }

    @Transactional
    public PolDto updatePol(String leavePolCd, PolUpdateRequest req) {
        LeavePol pol = polRepo.findById(leavePolCd)
                .orElseThrow(() -> new IllegalArgumentException("정책을 찾을 수 없습니다."));
        pol.update(req.getLeavePolNm(), req.getLeavePolDesc(),
                   req.getPolStMon(), req.getPolEndMon(),
                   req.getLeaveDcnt(), req.getAddDcnt(),
                   req.getAddCycMon(), req.getMaxDcnt(), req.getUseYn());
        return toPolDto(pol);
    }

    @Transactional
    public void deletePol(String leavePolCd) {
        LeavePol pol = polRepo.findById(leavePolCd)
                .orElseThrow(() -> new IllegalArgumentException("정책을 찾을 수 없습니다."));
        polRepo.delete(pol);
    }

    // ─── toDto ────────────────────────────────────────────────────────────────

    private MstDto toMstDto(LeaveMst m) {
        return MstDto.builder()
                .leaveCd(m.getLeaveCd()).leaveNm(m.getLeaveNm())
                .dedYn(m.getDedYn()).paidYn(m.getPaidYn()).useYn(m.getUseYn())
                .build();
    }

    private DtlDto toDtlDto(LeaveDtl d) {
        return DtlDto.builder()
                .leaveCd(d.getId().getLeaveCd())
                .leaveDtlCd(d.getId().getLeaveDtlCd())
                .leaveDtlNm(d.getLeaveDtlNm())
                .leaveDtlDesc(d.getLeaveDtlDesc())
                .leaveSe(d.getLeaveSe())
                .useAvlDcnt(d.getUseAvlDcnt())
                .useYn(d.getUseYn())
                .build();
    }

    private PolDto toPolDto(LeavePol p) {
        return PolDto.builder()
                .leavePolCd(p.getLeavePolCd()).leavePolNm(p.getLeavePolNm())
                .leavePolDesc(p.getLeavePolDesc())
                .polStMon(p.getPolStMon()).polEndMon(p.getPolEndMon())
                .leaveDcnt(p.getLeaveDcnt()).addDcnt(p.getAddDcnt())
                .addCycMon(p.getAddCycMon()).maxDcnt(p.getMaxDcnt())
                .useYn(p.getUseYn())
                .build();
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    @Getter @Builder
    public static class MstDto {
        private String leaveCd, leaveNm, dedYn, paidYn, useYn;
    }

    @Getter
    public static class MstCreateRequest {
        @NotBlank private String leaveCd;
        @NotBlank private String leaveNm;
        @NotBlank private String dedYn;
        @NotBlank private String paidYn;
        private String useYn;
    }

    @Getter
    public static class MstUpdateRequest {
        @NotBlank private String leaveNm;
        @NotBlank private String dedYn;
        @NotBlank private String paidYn;
        @NotBlank private String useYn;
    }

    @Getter @Builder
    public static class DtlDto {
        private String leaveCd, leaveDtlCd, leaveDtlNm, leaveDtlDesc, leaveSe, useYn;
        private BigDecimal useAvlDcnt;
    }

    @Getter
    public static class DtlCreateRequest {
        @NotBlank private String leaveCd;
        @NotBlank private String leaveDtlCd;
        private String leaveDtlNm;
        private String leaveDtlDesc;
        private String leaveSe;
        private BigDecimal useAvlDcnt;
        private String useYn;
    }

    @Getter
    public static class DtlUpdateRequest {
        private String leaveDtlNm;
        private String leaveDtlDesc;
        private String leaveSe;
        private BigDecimal useAvlDcnt;
        @NotBlank private String useYn;
    }

    @Getter @Builder
    public static class PolDto {
        private String leavePolCd, leavePolNm, leavePolDesc, useYn;
        private Integer polStMon, polEndMon, addCycMon;
        private BigDecimal leaveDcnt, addDcnt, maxDcnt;
    }

    @Getter
    public static class PolCreateRequest {
        @NotBlank private String leavePolCd;
        @NotBlank private String leavePolNm;
        private String leavePolDesc;
        private Integer polStMon;
        private Integer polEndMon;
        private BigDecimal leaveDcnt;
        private BigDecimal addDcnt;
        private Integer addCycMon;
        private BigDecimal maxDcnt;
        private String useYn;
    }

    @Getter
    public static class PolUpdateRequest {
        @NotBlank private String leavePolNm;
        private String leavePolDesc;
        private Integer polStMon;
        private Integer polEndMon;
        private BigDecimal leaveDcnt;
        private BigDecimal addDcnt;
        private Integer addCycMon;
        private BigDecimal maxDcnt;
        @NotBlank private String useYn;
    }
}
