package com.infomind.backend.global;

import com.infomind.backend.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * @Valid 검증 실패 (400)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst()
                .orElse("입력값이 올바르지 않습니다.");
        log.warn("[VALIDATION] {}", message);
        return ResponseEntity.badRequest().body(ApiResponse.fail(message));
    }

    /**
     * 리프레시 토큰 거부 (419) — 만료·무효·미보유
     */
    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidRefreshToken(InvalidRefreshTokenException e) {
        log.warn("[REFRESH_TOKEN_REJECTED] {}", e.getMessage());
        return ResponseEntity.status(HttpStatusCode.valueOf(419))
                .body(ApiResponse.fail(e.getMessage()));
    }

    /**
     * 비즈니스 로직 오류 (400) — 중복 코드, 존재하지 않는 리소스 등
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
        log.warn("[BAD_REQUEST] {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.fail(e.getMessage()));
    }

    /**
     * 그 외 모든 예외 (500)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("[INTERNAL_ERROR] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail("서버 오류가 발생했습니다."));
    }
}
