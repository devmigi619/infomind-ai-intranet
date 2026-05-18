package com.infomind.backend.global;

/**
 * 리프레시 토큰이 유효하지 않거나 만료된 경우 던지는 예외.
 * GlobalExceptionHandler에서 HTTP 419로 매핑한다.
 */
public class InvalidRefreshTokenException extends RuntimeException {
    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
