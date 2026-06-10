package com.infomind.backend.domain.chat;

import com.infomind.backend.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class AssistantCardController {

    private final AssistantCardService service;

    @GetMapping("/assistant/cards")
    public ResponseEntity<ApiResponse<AssistantCardResponse>> getAssistantCards(
            @AuthenticationPrincipal String userId,
            @RequestParam String intent) {
        return ResponseEntity.ok(ApiResponse.ok(service.getAssistantCards(userId, intent)));
    }
}
