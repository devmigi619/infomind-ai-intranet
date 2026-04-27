package com.infomind.backend.domain.post;

import com.infomind.backend.domain.user.Role;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<PostController.PostSummaryDto> getPosts(String category, Pageable pageable) {
        Page<Post> posts;
        if (StringUtils.hasText(category)) {
            posts = postRepository.findByCategory(PostCategory.valueOf(category.toUpperCase()), pageable);
        } else {
            posts = postRepository.findAll(pageable);
        }
        return posts.map(this::toSummary);
    }

    @Transactional
    public PostController.PostDetailDto getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        post.incrementViewCount();
        return toDetail(post);
    }

    @Transactional
    public PostController.PostDetailDto createPost(Long authorId, PostController.PostRequest request) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        Post post = Post.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(PostCategory.valueOf(request.getCategory().toUpperCase()))
                .author(author)
                .build();
        return toDetail(postRepository.save(post));
    }

    @Transactional
    public PostController.PostDetailDto updatePost(Long postId, Long userId, PostController.PostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        if (!post.getAuthor().getId().equals(userId)) {
            throw new SecurityException("수정 권한이 없습니다.");
        }
        post.update(request.getTitle(), request.getContent(),
                PostCategory.valueOf(request.getCategory().toUpperCase()));
        return toDetail(post);
    }

    @Transactional
    public void deletePost(Long postId, Long userId, String userRole) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        boolean isAdmin = Role.ADMIN.name().equals(userRole);
        if (!post.getAuthor().getId().equals(userId) && !isAdmin) {
            throw new SecurityException("삭제 권한이 없습니다.");
        }
        postRepository.delete(post);
    }

    private PostController.PostSummaryDto toSummary(Post post) {
        return PostController.PostSummaryDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .authorName(post.getAuthor().getName())
                .category(post.getCategory().name())
                .viewCount(post.getViewCount())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private PostController.PostDetailDto toDetail(Post post) {
        return PostController.PostDetailDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .authorName(post.getAuthor().getName())
                .category(post.getCategory().name())
                .viewCount(post.getViewCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
