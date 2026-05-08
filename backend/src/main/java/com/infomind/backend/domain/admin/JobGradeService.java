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
public class JobGradeService {

    private final JobGradeRepository jobGradeRepository;

    @Transactional(readOnly = true)
    public List<JobGradeDto> getAll() {
        return jobGradeRepository.findAllByOrderByJbgdSnAscJbgdCdAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public JobGradeDto create(CreateRequest req) {
        if (jobGradeRepository.existsByJbgdCd(req.getJbgdCd())) {
            throw new IllegalArgumentException("이미 존재하는 직급 코드입니다: " + req.getJbgdCd());
        }
        JobGrade jobGrade = JobGrade.builder()
                .jbgdCd(req.getJbgdCd())
                .jbgdNm(req.getJbgdNm())
                .jbgdSn(req.getJbgdSn())
                .rmk(req.getRmk())
                .build();
        return toDto(jobGradeRepository.save(jobGrade));
    }

    @Transactional
    public JobGradeDto update(String jbgdCd, UpdateRequest req) {
        JobGrade jobGrade = jobGradeRepository.findById(jbgdCd)
                .orElseThrow(() -> new IllegalArgumentException("직급을 찾을 수 없습니다."));
        jobGrade.update(req.getJbgdNm(), req.getJbgdSn(), req.getUseYn(), req.getRmk());
        return toDto(jobGrade);
    }

    @Transactional
    public void delete(String jbgdCd) {
        JobGrade jobGrade = jobGradeRepository.findById(jbgdCd)
                .orElseThrow(() -> new IllegalArgumentException("직급을 찾을 수 없습니다."));
        jobGrade.disable();
    }

    private JobGradeDto toDto(JobGrade j) {
        return JobGradeDto.builder()
                .jbgdCd(j.getJbgdCd())
                .jbgdNm(j.getJbgdNm())
                .jbgdSn(j.getJbgdSn())
                .useYn(j.getUseYn())
                .rmk(j.getRmk())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class JobGradeDto {
        private String jbgdCd;
        private String jbgdNm;
        private Integer jbgdSn;
        private String useYn;
        private String rmk;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String jbgdCd;
        @NotBlank private String jbgdNm;
        private Integer jbgdSn;
        private String rmk;
    }

    @Getter
    public static class UpdateRequest {
        @NotBlank private String jbgdNm;
        private Integer jbgdSn;
        private String useYn;
        private String rmk;
    }
}
