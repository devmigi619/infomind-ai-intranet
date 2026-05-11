package com.infomind.backend.domain.post;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards/{brdId}/posts/{pstSn}/comments")
@RequiredArgsConstructor
public class PostCommentController {

    private final PostCommentService postCommentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostCommentService.PostCommentDto>>> getList(
            @PathVariable String brdId,
            @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.ok(postCommentService.getList(brdId, pstSn)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostCommentService.PostCommentDto>> create(
            @PathVariable String brdId,
            @PathVariable Long pstSn,
            @Valid @RequestBody PostCommentService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(postCommentService.create(brdId, pstSn, request)));
    }

    @PutMapping("/{cmtSn}")
    public ResponseEntity<ApiResponse<PostCommentService.PostCommentDto>> update(
            @PathVariable String brdId,
            @PathVariable Long pstSn,
            @PathVariable Integer cmtSn,
            @Valid @RequestBody PostCommentService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(postCommentService.update(brdId, pstSn, cmtSn, request)));
    }

    @DeleteMapping("/{cmtSn}")
    public ResponseEntity<ApiResponse<Void>> softDelete(
            @PathVariable String brdId,
            @PathVariable Long pstSn,
            @PathVariable Integer cmtSn,
            @Valid @RequestBody DeleteRequest request) {
        postCommentService.softDelete(brdId, pstSn, cmtSn, request.getUserId(), request.isAdmin());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 삭제 요청 페이로드 — userId, isAdmin (인증 통합 전 임시) */
    @Getter
    public static class DeleteRequest {
        @NotBlank private String userId;
        private boolean admin;

        public boolean isAdmin() {
            return admin;
        }
    }
}
