package com.infomind.backend.common.attachment.embedding;

import com.infomind.backend.security.SystemJwtIssuer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;

/**
 * FastAPI {@code POST /ai/files/process}를 호출하는 {@link EmbeddingClient} 구현.
 *
 * <ul>
 *   <li>WebClient — base URL은 {@code fastapi.base-url} 설정</li>
 *   <li>인증 — {@link SystemJwtIssuer}가 발급한 시스템 JWT를 {@code Authorization: Bearer ...}</li>
 *   <li>본문 — multipart: {@code file}, {@code afile_id}, {@code afile_sn}</li>
 * </ul>
 */
@Component
public class FastApiEmbeddingClient implements EmbeddingClient {

    private static final Duration TIMEOUT = Duration.ofMinutes(5);
    /** 응답 본문 인메모리 한도(16MB). 청크 N개 × 1024차원 float JSON이 기본 256KB를 쉽게 넘김. */
    private static final int MAX_IN_MEMORY_SIZE = 16 * 1024 * 1024;

    private final WebClient webClient;
    private final SystemJwtIssuer systemJwtIssuer;

    public FastApiEmbeddingClient(WebClient.Builder webClientBuilder,
                                  SystemJwtIssuer systemJwtIssuer,
                                  @Value("${fastapi.base-url}") String baseUrl) {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(c -> c.defaultCodecs().maxInMemorySize(MAX_IN_MEMORY_SIZE))
                .build();
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .exchangeStrategies(strategies)
                .build();
        this.systemJwtIssuer = systemJwtIssuer;
    }

    @Override
    public EmbeddingResult process(byte[] bytes, String fileName, String afileId, Long afileSn) {
        String token = systemJwtIssuer.issueSystemToken();

        // ByteArrayResource를 사용해 filename을 명시적으로 보존
        String filename = fileName != null ? fileName : "file";
        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", resource)
                .filename(filename)
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        builder.part("afile_id", afileId);
        builder.part("afile_sn", afileSn.toString());

        try {
            return webClient.post()
                    .uri("/ai/files/process")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(EmbeddingResult.class)
                    .block(TIMEOUT);
        } catch (WebClientResponseException e) {
            throw new EmbeddingException(
                    "FastAPI 호출 실패 (status=" + e.getStatusCode() + "): " + e.getMessage(), e);
        } catch (Exception e) {
            throw new EmbeddingException("FastAPI 호출 중 오류: " + e.getMessage(), e);
        }
    }

    /** EmbeddingClient 호출 실패 시 던지는 런타임 예외. 호출자가 잡아 로그만 남김. */
    public static class EmbeddingException extends RuntimeException {
        public EmbeddingException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
