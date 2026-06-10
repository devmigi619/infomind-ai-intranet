package com.infomind.backend.domain.chat;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class AssistantCardResponse {
    private String intent;
    private List<AssistantCardDto> cards;
}
