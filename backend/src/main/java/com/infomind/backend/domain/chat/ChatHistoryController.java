package com.infomind.backend.domain.chat;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatHistoryController {

    private final ChatHistoryService service;

    /** 세션 목록 (최근순) */
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatHistoryService.SessionListDto>>> getSessions(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSessionList(userId)));
    }

    /** 세션 메시지 목록 */
    @GetMapping("/sessions/{sessId}")
    public ResponseEntity<ApiResponse<List<ChatHistoryService.MessageDto>>> getMessages(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getSessionMessages(userId, sessId)));
    }

    /** 메시지 저장 (배치) */
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<Void>> saveMessages(
            @AuthenticationPrincipal String userId,
            @RequestBody ChatHistoryService.SaveRequest req) {
        service.saveMessages(userId, req.getSessId(), req.getEntries());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** 세션 소프트 삭제 */
    @DeleteMapping("/sessions/{sessId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessId) {
        service.deleteSession(userId, sessId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
