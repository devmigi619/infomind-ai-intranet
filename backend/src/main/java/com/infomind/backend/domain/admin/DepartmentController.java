package com.infomind.backend.domain.admin;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentService.DeptDto>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DepartmentService.DeptDto>> create(
            @Valid @RequestBody DepartmentService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.create(request)));
    }

    @PutMapping("/{deptCd}")
    public ResponseEntity<ApiResponse<DepartmentService.DeptDto>> update(
            @PathVariable String deptCd,
            @Valid @RequestBody DepartmentService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.update(deptCd, request)));
    }

    @DeleteMapping("/{deptCd}")
    public ResponseEntity<ApiResponse<Void>> disable(@PathVariable String deptCd) {
        departmentService.disable(deptCd);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
