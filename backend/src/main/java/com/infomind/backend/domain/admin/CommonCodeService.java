package com.infomind.backend.domain.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommonCodeService {

    private final CommonCodeRepository commonCodeRepository;

    @Transactional(readOnly = true)
    public List<CommonCodeDto> getCategories() {
        return commonCodeRepository.findAllCategories()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CommonCodeDto> getCodes(String upCd) {
        return commonCodeRepository.findCodesByUpCd(upCd)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** 활성(USE_YN = 'Y') 코드 목록 — 폼 콤보박스 전용 */
    @Transactional(readOnly = true)
    public List<CommonCodeDto> getActiveCodes(String upCd) {
        return commonCodeRepository.findActiveCodesByUpCd(upCd)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public CommonCodeDto createCode(CreateRequest req) {
        if (commonCodeRepository.existsById(new CommonCodeId(req.getUpCd(), req.getCd()))) {
            throw new IllegalArgumentException("이미 존재하는 코드입니다: " + req.getUpCd() + "/" + req.getCd());
        }
        CommonCode code = CommonCode.builder()
                .upCd(req.getUpCd())
                .cd(req.getCd())
                .cdNm(req.getCdNm())
                .cdLvl(req.getUpCd().equals(req.getCd()) ? 1 : 2)
                .cdOrd(req.getCdOrd())
                .cdRmk(req.getCdRmk())
                .engCdNm(req.getEngCdNm())
                .build();
        return toDto(commonCodeRepository.save(code));
    }

    @Transactional
    public CommonCodeDto updateCode(String upCd, String cd, UpdateRequest req) {
        CommonCode code = commonCodeRepository.findById(new CommonCodeId(upCd, cd))
                .orElseThrow(() -> new IllegalArgumentException("코드를 찾을 수 없습니다."));
        code.update(req.getCdNm(), req.getUseYn() != null ? req.getUseYn() : code.getUseYn(),
                req.getCdOrd(), req.getCdRmk(), req.getEngCdNm());
        return toDto(code);
    }

    @Transactional
    public void deleteCode(String upCd, String cd) {
        CommonCode code = commonCodeRepository.findById(new CommonCodeId(upCd, cd))
                .orElseThrow(() -> new IllegalArgumentException("코드를 찾을 수 없습니다."));
        code.disable();
    }

    private CommonCodeDto toDto(CommonCode c) {
        return CommonCodeDto.builder()
                .upCd(c.getUpCd())
                .cd(c.getCd())
                .cdNm(c.getCdNm())
                .cdLvl(c.getCdLvl())
                .cdOrd(c.getCdOrd())
                .useYn(c.getUseYn())
                .cdRmk(c.getCdRmk())
                .engCdNm(c.getEngCdNm())
                .build();
    }

    // DTO

    @Getter
    @Builder
    public static class CommonCodeDto {
        private String upCd;
        private String cd;
        private String cdNm;
        private Integer cdLvl;
        private Integer cdOrd;
        private String useYn;
        private String cdRmk;
        private String engCdNm;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String upCd;
        @NotBlank private String cd;
        @NotBlank private String cdNm;
        private Integer cdOrd;
        private String cdRmk;
        private String engCdNm;
    }

    @Getter
    public static class UpdateRequest {
        @NotBlank private String cdNm;
        private String useYn;
        private Integer cdOrd;
        private String cdRmk;
        private String engCdNm;
    }
}
