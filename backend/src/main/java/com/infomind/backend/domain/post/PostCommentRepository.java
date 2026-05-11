package com.infomind.backend.domain.post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostCommentRepository extends JpaRepository<PostComment, PostCommentId> {

    /** 게시글의 댓글 목록 — 삭제되지 않은 것, 작성순 (cmtSn ASC) */
    List<PostComment> findByBrdIdAndPstSnAndDelYnOrderByCmtSnAsc(String brdId, Long pstSn, String delYn);

    /** 다음 cmtSn 계산용 — 글별 최댓값 (없으면 0) */
    @Query("SELECT COALESCE(MAX(c.cmtSn), 0) FROM PostComment c WHERE c.brdId = :brdId AND c.pstSn = :pstSn")
    Integer getMaxCmtSn(@Param("brdId") String brdId, @Param("pstSn") Long pstSn);
}
