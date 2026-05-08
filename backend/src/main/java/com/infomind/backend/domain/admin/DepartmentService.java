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
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    // ─── 조회 ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DeptDto> getAll() {
        return departmentRepository.findAllByOrderByDeptLvlAscDeptCdAsc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    @Transactional
    public DeptDto create(CreateRequest req) {
        if (departmentRepository.existsByDeptCd(req.getDeptCd())) {
            throw new IllegalArgumentException("이미 존재하는 부서 코드입니다: " + req.getDeptCd());
        }

        // dept_lvl 자동 계산: 상위부서 없으면 1, 있으면 상위부서 lvl + 1
        int lvl = 1;
        if (req.getUpDeptCd() != null && !req.getUpDeptCd().isBlank()) {
            Department parent = departmentRepository.findById(req.getUpDeptCd())
                    .orElseThrow(() -> new IllegalArgumentException("상위 부서를 찾을 수 없습니다: " + req.getUpDeptCd()));
            lvl = (parent.getDeptLvl() != null ? parent.getDeptLvl() : 1) + 1;
        }

        Department dept = Department.builder()
                .deptCd(req.getDeptCd())
                .upDeptCd(req.getUpDeptCd() != null && !req.getUpDeptCd().isBlank() ? req.getUpDeptCd() : null)
                .deptNm(req.getDeptNm())
                .deptLvl(lvl)
                .build();

        return toDto(departmentRepository.save(dept));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public DeptDto update(String deptCd, UpdateRequest req) {
        Department dept = departmentRepository.findById(deptCd)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다."));
        dept.update(req.getDeptNm(), req.getUseYn());
        return toDto(dept);
    }

    // ─── 비활성화 (하위 부서 cascade) ─────────────────────────────────────

    @Transactional
    public void disable(String deptCd) {
        Department dept = departmentRepository.findById(deptCd)
                .orElseThrow(() -> new IllegalArgumentException("부서를 찾을 수 없습니다."));

        // 전체 목록을 메모리에 올려서 재귀 처리 (부서 수가 많지 않으므로 안전)
        List<Department> all = departmentRepository.findAll();
        disableRecursive(deptCd, all);
    }

    /** deptCd 및 모든 하위 부서를 재귀적으로 비활성화 */
    private void disableRecursive(String deptCd, List<Department> all) {
        all.stream()
                .filter(d -> deptCd.equals(d.getDeptCd()))
                .findFirst()
                .ifPresent(Department::disable);

        all.stream()
                .filter(d -> deptCd.equals(d.getUpDeptCd()))
                .forEach(child -> disableRecursive(child.getDeptCd(), all));
    }

    // ─── 매핑 ──────────────────────────────────────────────────────────────

    private DeptDto toDto(Department d) {
        return DeptDto.builder()
                .deptCd(d.getDeptCd())
                .upDeptCd(d.getUpDeptCd())
                .deptNm(d.getDeptNm())
                .deptLvl(d.getDeptLvl())
                .useYn(d.getUseYn())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class DeptDto {
        private String deptCd;
        private String upDeptCd;
        private String deptNm;
        private Integer deptLvl;
        private String useYn;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String deptCd;
        @NotBlank private String deptNm;
        private String upDeptCd; // null 허용 (최상위 부서)
    }

    @Getter
    public static class UpdateRequest {
        @NotBlank private String deptNm;
        private String useYn;
    }
}
