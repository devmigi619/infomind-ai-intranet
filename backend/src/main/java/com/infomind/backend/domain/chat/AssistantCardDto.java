package com.infomind.backend.domain.chat;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class AssistantCardDto {
    private String type;
    private String icon;
    private String title;
    
    // Action card fields
    private String link;
    private String subtitle;
    
    // Info card fields
    private List<String> summaryItems;
    private String fullLink;
    private String tag;
    private String tagColor;
    
    // Status card fields
    private String value;
}
