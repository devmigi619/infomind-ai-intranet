package com.infomind.backend.domain.post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostRepository extends JpaRepository<Post, PostId> {

    /** 게시판 내 글 목록 — 삭제되지 않은 글, 공지 우선, 최신순 */
    List<Post> findByBrdIdAndDelYnOrderByNtcYnDescPstSnDesc(String brdId, String delYn);

    /** 다음 pstSn 계산용 — 게시판별 최댓값 (없으면 0) */
    @Query("SELECT COALESCE(MAX(p.pstSn), 0) FROM Post p WHERE p.brdId = :brdId")
    Long getMaxPstSn(@Param("brdId") String brdId);
}
