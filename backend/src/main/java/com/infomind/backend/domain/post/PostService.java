package com.infomind.backend.domain.post;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;

    // ─── 조회 ──────────────────────────────────────────────────────────────

    /** 게시판 내 글 목록 — 삭제되지 않은 것 + 공지 우선 + pst_sn DESC */
    @Transactional(readOnly = true)
    public List<PostDto> getList(String brdId) {
        return postRepository.findByBrdIdAndDelYnOrderByNtcYnDescPstSnDesc(brdId, "N")
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** 단건 조회 — 호출 시 조회수 1 증가 */
    @Transactional
    public PostDto getOne(String brdId, Long pstSn) {
        Post post = postRepository.findById(new PostId(brdId, pstSn))
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        post.incrementQryCnt();
        return toDto(post);
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    /**
     * 게시글 생성. pstSn 은 게시판별로 1부터 증가.
     *
     * 동시성 한계: getMaxPstSn + INSERT 사이에 다른 트랜잭션이 끼면 PK 충돌 가능.
     * 35명 규모에서는 거의 발생하지 않지만, 운영기에서는 게시판별 시퀀스 / advisory lock /
     * 재시도 로직 도입 검토 필요.
     */
    @Transactional
    public PostDto create(String brdId, CreateRequest req) {
        Long nextSn = postRepository.getMaxPstSn(brdId) + 1L;

        Post post = Post.builder()
                .brdId(brdId)
                .pstSn(nextSn)
                .pstTtl(req.getPstTtl())
                .pstDesc(req.getPstDesc())
                .userId(req.getUserId())
                .ntcYn(req.getNtcYn() != null ? req.getNtcYn() : "N")
                .delYn("N")
                .qryCnt(0)
                .likeNum(0)
                .pstRmk(req.getPstRmk())
                .pstOrd(req.getPstOrd())
                .pubStYmd(req.getPubStYmd())
                .pubEndYmd(req.getPubEndYmd())
                .afileId(req.getAfileId())
                .build();

        return toDto(postRepository.save(post));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public PostDto update(String brdId, Long pstSn, UpdateRequest req) {
        Post post = postRepository.findById(new PostId(brdId, pstSn))
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        post.update(req.getPstTtl(), req.getPstDesc(), req.getNtcYn(), req.getPstRmk(),
                req.getPstOrd(), req.getPubStYmd(), req.getPubEndYmd(), req.getAfileId());
        return toDto(post);
    }

    // ─── 삭제 (소프트) ────────────────────────────────────────────────────

    /**
     * 소프트 삭제. del_yn='Y', pst_del_se = isAdmin ? '관리자삭제' : '작성자삭제'.
     * 작성자 본인이 아니고 관리자도 아니면 권한 예외.
     */
    @Transactional
    public void softDelete(String brdId, Long pstSn, String deleterUserId, boolean isAdmin) {
        Post post = postRepository.findById(new PostId(brdId, pstSn))
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));

        boolean isOwner = post.getUserId() != null && post.getUserId().equals(deleterUserId);
        if (!isOwner && !isAdmin) {
            throw new SecurityException("삭제 권한이 없습니다.");
        }

        post.softDelete(isAdmin ? "관리자삭제" : "작성자삭제");
    }

    // ─── 좋아요 ────────────────────────────────────────────────────────────

    /** 좋아요 1 증가 (선택 기능 — 중복 체크는 별도 테이블 필요, 일단 단순 증가만) */
    @Transactional
    public PostDto incrementLike(String brdId, Long pstSn) {
        Post post = postRepository.findById(new PostId(brdId, pstSn))
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다."));
        post.incrementLike();
        return toDto(post);
    }

    // ─── 매핑 ──────────────────────────────────────────────────────────────

    private PostDto toDto(Post p) {
        return PostDto.builder()
                .brdId(p.getBrdId())
                .pstSn(p.getPstSn())
                .pstTtl(p.getPstTtl())
                .pstDesc(p.getPstDesc())
                .userId(p.getUserId())
                .ntcYn(p.getNtcYn())
                .delYn(p.getDelYn())
                .pstDelSe(p.getPstDelSe())
                .qryCnt(p.getQryCnt())
                .likeNum(p.getLikeNum())
                .pstRmk(p.getPstRmk())
                .pstOrd(p.getPstOrd())
                .pubStYmd(p.getPubStYmd())
                .pubEndYmd(p.getPubEndYmd())
                .afileId(p.getAfileId())
                .crtAt(p.getCrtAt())
                .crtBy(p.getCrtBy())
                .updAt(p.getUpdAt())
                .updBy(p.getUpdBy())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class PostDto {
        private String brdId;
        private Long pstSn;
        private String pstTtl;
        private String pstDesc;
        private String userId;
        private String ntcYn;
        private String delYn;
        private String pstDelSe;
        private Integer qryCnt;
        private Integer likeNum;
        private String pstRmk;
        private Integer pstOrd;
        private String pubStYmd;
        private String pubEndYmd;
        private String afileId;
        private LocalDateTime crtAt;
        private String crtBy;
        private LocalDateTime updAt;
        private String updBy;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String pstTtl;
        @NotBlank private String pstDesc;
        @NotBlank private String userId; // 인증 통합 전 임시 — 추후 Principal로 교체
        private String ntcYn;
        private String pstRmk;
        private Integer pstOrd;
        private String pubStYmd;
        private String pubEndYmd;
        private String afileId;
    }

    @Getter
    public static class UpdateRequest {
        @NotBlank private String pstTtl;
        @NotBlank private String pstDesc;
        private String ntcYn;
        private String pstRmk;
        private Integer pstOrd;
        private String pubStYmd;
        private String pubEndYmd;
        private String afileId;
    }
}
