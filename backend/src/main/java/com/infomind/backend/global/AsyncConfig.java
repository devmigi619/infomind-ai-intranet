package com.infomind.backend.global;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * {@code @Async} 활성화. 기본 {@code SimpleAsyncTaskExecutor}로 시작하며,
 * 트래픽이 늘면 {@code ThreadPoolTaskExecutor} 빈으로 교체.
 *
 * <p>인증/보안과 무관한 비동기 기능 설정만 담당.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
