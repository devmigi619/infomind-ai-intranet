package com.infomind.backend.domain.chat;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ChatHistoryRepository repo;

    // ─── 세션 목록 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SessionListDto> getSessionList(String userId) {
        return repo.findSessionSummaries(userId).stream()
                .map(row -> {
                    String sessId  = (String) row[0];
                    String rawTitle = (String) row[1];
                    LocalDateTime lastAt = toLocalDateTime(row[2]);
                    long msgCount = ((Number) row[3]).longValue();
                    return SessionListDto.builder()
                            .sessId(sessId)
                            .title(truncate(rawTitle, 60))
                            .lastAt(lastAt)
                            .msgCount(msgCount)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─── 세션 메시지 목록 ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MessageDto> getSessionMessages(String userId, String sessId) {
        return repo.findByIdUserIdAndIdSessIdAndDelYnOrderByIdChatSnAsc(userId, sessId, "N")
                .stream()
                .map(m -> MessageDto.builder()
                        .chatSn(m.getId().getChatSn())
                        .chatSe(m.getChatSe())
                        .chatDesc(m.getChatDesc())
                        .chatDt(m.getChatDt())
                        .build())
                .collect(Collectors.toList());
    }

    // ─── 메시지 저장 (배치) ───────────────────────────────────────────────────

    @Transactional
    public void saveMessages(String userId, String sessId, List<MessageEntry> entries) {
        if (entries == null || entries.isEmpty()) return;
        long nextSn = repo.findMaxChatSn(userId, sessId).orElse(0L);
        LocalDateTime now = LocalDateTime.now();
        for (MessageEntry e : entries) {
            nextSn++;
            repo.save(ChatHistory.builder()
                    .id(new ChatHistoryId(userId, sessId, nextSn))
                    .chatSe(e.getChatSe())
                    .chatDesc(e.getChatDesc())
                    .chatDt(now)
                    .grdlYn("N")
                    .delYn("N")
                    .build());
        }
    }

    // ─── 세션 삭제 (소프트) ───────────────────────────────────────────────────

    @Transactional
    public void deleteSession(String userId, String sessId) {
        repo.findByIdUserIdAndIdSessId(userId, sessId)
                .forEach(ChatHistory::softDelete);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private LocalDateTime toLocalDateTime(Object val) {
        if (val instanceof Timestamp ts) return ts.toLocalDateTime();
        if (val instanceof LocalDateTime ldt) return ldt;
        return LocalDateTime.now();
    }

    private String truncate(String s, int max) {
        if (s == null || s.isBlank()) return "(새 대화)";
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }

    // ─── DTOs & Requests ──────────────────────────────────────────────────────

    @Getter @Builder
    public static class SessionListDto {
        private String sessId;
        private String title;
        private LocalDateTime lastAt;
        private Long msgCount;
    }

    @Getter @Builder
    public static class MessageDto {
        private Long chatSn;
        private String chatSe;
        private String chatDesc;
        private LocalDateTime chatDt;
    }

    @Getter
    public static class SaveRequest {
        private String sessId;
        private List<MessageEntry> entries;
    }

    @Getter
    public static class MessageEntry {
        private String chatSe;
        private String chatDesc;
    }
}
