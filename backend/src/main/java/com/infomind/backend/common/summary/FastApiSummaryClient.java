package com.infomind.backend.common.summary;

import com.infomind.backend.security.SystemJwtIssuer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Component
public class FastApiSummaryClient implements SummaryClient {

    private static final Duration TIMEOUT = Duration.ofMinutes(5);
    private final WebClient webClient;
    private final SystemJwtIssuer systemJwtIssuer;

    public FastApiSummaryClient(WebClient.Builder builder, SystemJwtIssuer systemJwtIssuer,
                                @Value("${fastapi.base-url}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.systemJwtIssuer = systemJwtIssuer;
    }

    @Override
    public String summarize(String purpose, String content) {
        SummaryResponse response = webClient.post()
                .uri("/ai/summaries")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + systemJwtIssuer.issueSystemToken())
                .bodyValue(new SummaryRequest(purpose, content))
                .retrieve()
                .bodyToMono(SummaryResponse.class)
                .block(TIMEOUT);
        if (response == null || response.summary() == null || response.summary().isBlank()) {
            throw new IllegalStateException("요약 결과가 비어 있습니다.");
        }
        return response.summary();
    }

    private record SummaryRequest(String purpose, String content) {}
    private record SummaryResponse(String summary) {}
}
