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
public class PostCommentService {

    private final PostCommentRepository postCommentRepository;

    // ─── 조회 ──────────────────────────────────────────────────────────────

    /**
     * 글의 댓글 목록 — 삭제되지 않은 것, cmtSn ASC.
     * 대댓글 트리는 클라이언트가 cmtLvl / upCmtSn 보고 렌더링.
     */
    @Transactional(readOnly = true)
    public List<PostCommentDto> getList(String brdId, Long pstSn) {
        return postCommentRepository.findByBrdIdAndPstSnAndDelYnOrderByCmtSnAsc(brdId, pstSn, "N")
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    /**
     * 댓글 생성. cmtSn 은 글별로 1부터 증가.
     * (Post.create와 동일한 동시성 한계 — 운영기 시퀀스 검토 필요)
     */
    @Transactional
    public PostCommentDto create(String brdId, Long pstSn, CreateRequest req) {
        Integer nextSn = postCommentRepository.getMaxCmtSn(brdId, pstSn) + 1;

        PostComment cmt = PostComment.builder()
                .brdId(brdId)
                .pstSn(pstSn)
                .cmtSn(nextSn)
                .cmtLvl(req.getCmtLvl() != null ? req.getCmtLvl() : 1)
                .upCmtSn(req.getUpCmtSn())
                .cmtTtl(req.getCmtTtl())
                .cmtDesc(req.getCmtDesc())
                .userId(req.getUserId())
                .delYn("N")
                .likeCnt(0)
                .build();

        return toDto(postCommentRepository.save(cmt));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public PostCommentDto update(String brdId, Long pstSn, Integer cmtSn, UpdateRequest req) {
        PostComment cmt = postCommentRepository.findById(new PostCommentId(brdId, pstSn, cmtSn))
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        cmt.update(req.getCmtTtl(), req.getCmtDesc());
        return toDto(cmt);
    }

    // ─── 삭제 (소프트) ────────────────────────────────────────────────────

    /**
     * 소프트 삭제. del_yn='Y', cmt_del_se = isAdmin ? '관리자삭제' : '본인삭제'.
     * 작성자 본인이 아니고 관리자도 아니면 권한 예외.
     */
    @Transactional
    public void softDelete(String brdId, Long pstSn, Integer cmtSn, String deleterUserId, boolean isAdmin) {
        PostComment cmt = postCommentRepository.findById(new PostCommentId(brdId, pstSn, cmtSn))
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));

        boolean isOwner = cmt.getUserId() != null && cmt.getUserId().equals(deleterUserId);
        if (!isOwner && !isAdmin) {
            throw new SecurityException("삭제 권한이 없습니다.");
        }

        cmt.softDelete(isAdmin ? "관리자삭제" : "본인삭제");
    }

    // ─── 매핑 ──────────────────────────────────────────────────────────────

    private PostCommentDto toDto(PostComment c) {
        return PostCommentDto.builder()
                .brdId(c.getBrdId())
                .pstSn(c.getPstSn())
                .cmtSn(c.getCmtSn())
                .cmtLvl(c.getCmtLvl())
                .upCmtSn(c.getUpCmtSn())
                .cmtTtl(c.getCmtTtl())
                .cmtDesc(c.getCmtDesc())
                .userId(c.getUserId())
                .delYn(c.getDelYn())
                .cmtDelSe(c.getCmtDelSe())
                .likeCnt(c.getLikeCnt())
                .crtAt(c.getCrtAt())
                .crtBy(c.getCrtBy())
                .updAt(c.getUpdAt())
                .updBy(c.getUpdBy())
                .build();
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class PostCommentDto {
        private String brdId;
        private Long pstSn;
        private Integer cmtSn;
        private Integer cmtLvl;
        private Integer upCmtSn;
        private String cmtTtl;
        private String cmtDesc;
        private String userId;
        private String delYn;
        private String cmtDelSe;
        private Integer likeCnt;
        private LocalDateTime crtAt;
        private String crtBy;
        private LocalDateTime updAt;
        private String updBy;
    }

    @Getter
    public static class CreateRequest {
        private String cmtTtl;
        @NotBlank private String cmtDesc;
        @NotBlank private String userId; // 인증 통합 전 임시
        private Integer cmtLvl;   // 대댓글이면 2, 댓글이면 1 (기본 1)
        private Integer upCmtSn;  // 대댓글일 때 부모 cmtSn
    }

    @Getter
    public static class UpdateRequest {
        private String cmtTtl;
        @NotBlank private String cmtDesc;
    }
}
