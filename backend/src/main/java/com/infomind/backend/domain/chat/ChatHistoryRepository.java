package com.infomind.backend.domain.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatHistoryRepository extends JpaRepository<ChatHistory, ChatHistoryId> {

    /** 세션 내 메시지 목록 (삭제 제외, chatSn 오름차순) */
    List<ChatHistory> findByIdUserIdAndIdSessIdAndDelYnOrderByIdChatSnAsc(
            String userId, String sessId, String delYn);

    /** 소프트 삭제용: 세션 내 전체 메시지 (delYn 무관) */
    List<ChatHistory> findByIdUserIdAndIdSessId(String userId, String sessId);

    /** 세션 내 최대 chatSn */
    @Query("SELECT MAX(c.id.chatSn) FROM ChatHistory c WHERE c.id.userId = :userId AND c.id.sessId = :sessId")
    Optional<Long> findMaxChatSn(@Param("userId") String userId, @Param("sessId") String sessId);

    /**
     * 사용자의 세션 목록 요약
     * 반환: [sess_id, title(첫 U 메시지), last_at(최신 chat_dt), msg_count]
     */
    @Query(nativeQuery = true, value = """
            SELECT
                h.sess_id,
                (SELECT h2.chat_desc
                 FROM int_chat_history h2
                 WHERE h2.user_id = h.user_id
                   AND h2.sess_id = h.sess_id
                   AND h2.chat_se = 'U'
                   AND h2.del_yn  = 'N'
                 ORDER BY h2.chat_sn ASC
                 LIMIT 1)          AS title,
                MAX(h.chat_dt)     AS last_at,
                COUNT(*)           AS msg_count
            FROM int_chat_history h
            WHERE h.user_id = :userId
              AND h.del_yn  = 'N'
            GROUP BY h.user_id, h.sess_id
            ORDER BY MAX(h.chat_dt) DESC
            """)
    List<Object[]> findSessionSummaries(@Param("userId") String userId);
}
