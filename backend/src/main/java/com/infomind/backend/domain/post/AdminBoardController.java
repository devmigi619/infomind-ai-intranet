package com.infomind.backend.domain.post;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/boards")
@RequiredArgsConstructor
public class AdminBoardController {

    private final AdminBoardService adminBoardService;

    /** 목록 조회 (keyword: 이름/ID, status: ALL|ACTIVE|INACTIVE) */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BoardService.BoardDto>>> getList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        return ResponseEntity.ok(ApiResponse.ok(adminBoardService.getList(keyword, status)));
    }

    /** 생성 */
    @PostMapping
    public ResponseEntity<ApiResponse<BoardService.BoardDto>> create(
            @Valid @RequestBody BoardService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(adminBoardService.create(request)));
    }

    /** 수정 */
    @PutMapping("/{brdId}")
    public ResponseEntity<ApiResponse<BoardService.BoardDto>> update(
            @PathVariable String brdId,
            @Valid @RequestBody BoardService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(adminBoardService.update(brdId, request)));
    }

    /** 비활성화 (soft delete, useYn = 'N') */
    @DeleteMapping("/{brdId}")
    public ResponseEntity<ApiResponse<Void>> disable(@PathVariable String brdId) {
        adminBoardService.disable(brdId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 활성화 복원 (useYn = 'Y') */
    @PutMapping("/{brdId}/enable")
    public ResponseEntity<ApiResponse<Void>> enable(@PathVariable String brdId) {
        adminBoardService.enable(brdId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
