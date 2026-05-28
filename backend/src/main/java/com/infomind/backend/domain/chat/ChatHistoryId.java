package com.infomind.backend.domain.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ChatHistoryId implements Serializable {

    @Column(name = "USER_ID", length = 100)
    private String userId;

    @Column(name = "SESS_ID", length = 100)
    private String sessId;

    @Column(name = "CHAT_SN")
    private Long chatSn;
}
