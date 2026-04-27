package com.infomind.backend.security;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class JwtTokenDto {
    private String token;
    private String refreshToken;
}
