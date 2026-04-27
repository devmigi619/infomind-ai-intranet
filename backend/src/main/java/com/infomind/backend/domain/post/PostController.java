package com.infomind.backend.domain.post;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostSummaryDto>>> getPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String category) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ApiResponse.ok(postService.getPosts(category, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailDto>> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(postService.getPost(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostDetailDto>> createPost(
            Authentication authentication,
            @Valid @RequestBody PostRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(postService.createPost(userId, request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailDto>> updatePost(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody PostRequest request) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(postService.updatePost(id, userId, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String role = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("USER");
        postService.deletePost(id, userId, role);
        return ResponseEntity.noContent().build();
    }

    @Getter
    public static class PostRequest {
        @NotBlank
        private String title;
        @NotBlank
        private String content;
        @NotBlank
        private String category;
    }

    @Getter
    @Builder
    public static class PostSummaryDto {
        private Long id;
        private String title;
        private String authorName;
        private String category;
        private int viewCount;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    public static class PostDetailDto {
        private Long id;
        private String title;
        private String content;
        private String authorName;
        private String category;
        private int viewCount;
        private LocalDateTime createdAt;
    }
}
