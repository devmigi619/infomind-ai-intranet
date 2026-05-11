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
@RequestMapping("/api/boards/{brdId}/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PostService.PostDto>>> getList(
            @PathVariable String brdId) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getList(brdId)));
    }

    @GetMapping("/{pstSn}")
    public ResponseEntity<ApiResponse<PostService.PostDto>> getOne(
            @PathVariable String brdId,
            @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getOne(brdId, pstSn)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostService.PostDto>> create(
            @PathVariable String brdId,
            @Valid @RequestBody PostService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(postService.create(brdId, request)));
    }

    @PutMapping("/{pstSn}")
    public ResponseEntity<ApiResponse<PostService.PostDto>> update(
            @PathVariable String brdId,
            @PathVariable Long pstSn,
            @Valid @RequestBody PostService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(postService.update(brdId, pstSn, request)));
    }

    @DeleteMapping("/{pstSn}")
    public ResponseEntity<ApiResponse<Void>> softDelete(
            @PathVariable String brdId,
            @PathVariable Long pstSn,
            @Valid @RequestBody DeleteRequest request) {
        postService.softDelete(brdId, pstSn, request.getUserId(), request.isAdmin());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{pstSn}/like")
    public ResponseEntity<ApiResponse<PostService.PostDto>> incrementLike(
            @PathVariable String brdId,
            @PathVariable Long pstSn) {
        return ResponseEntity.ok(ApiResponse.ok(postService.incrementLike(brdId, pstSn)));
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
