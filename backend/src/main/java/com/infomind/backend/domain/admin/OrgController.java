package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import com.infomind.backend.domain.user.UserController;
import com.infomind.backend.domain.user.UserService;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 인증된 모든 사용자가 접근 가능한 조직도 READ 전용 엔드포인트.
 * 부서/직급/사용자 정보를 결재선 지정 UI 등에서 활용한다.
 */
@RestController
@RequestMapping("/api/org")
@RequiredArgsConstructor
public class OrgController {

    private final DepartmentRepository departmentRepository;
    private final JobGradeRepository jobGradeRepository;
    private final UserService userService;

    /** 사용 중인 부서 전체 (계층 구조 재조립은 프론트에서) */
    @GetMapping("/departments")
    public ResponseEntity<ApiResponse<List<DeptDto>>> getDepartments() {
        List<DeptDto> list = departmentRepository.findAllByOrderByDeptLvlAscDeptCdAsc()
                .stream()
                .filter(d -> "Y".equals(d.getUseYn()))
                .map(d -> DeptDto.builder()
                        .deptCd(d.getDeptCd())
                        .upDeptCd(d.getUpDeptCd())
                        .deptNm(d.getDeptNm())
                        .deptLvl(d.getDeptLvl())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    /** 사용 중인 직급 전체 */
    @GetMapping("/job-grades")
    public ResponseEntity<ApiResponse<List<JbgdDto>>> getJobGrades() {
        List<JbgdDto> list = jobGradeRepository.findAllByOrderByJbgdSnAscJbgdCdAsc()
                .stream()
                .filter(j -> "Y".equals(j.getUseYn()))
                .map(j -> JbgdDto.builder()
                        .jbgdCd(j.getJbgdCd())
                        .jbgdNm(j.getJbgdNm())
                        .jbgdSn(j.getJbgdSn())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class DeptDto {
        private String deptCd;
        private String upDeptCd;
        private String deptNm;
        private Integer deptLvl;
    }

    @Getter
    @Builder
    public static class JbgdDto {
        private String jbgdCd;
        private String jbgdNm;
        private Integer jbgdSn;
    }
}
