package com.infomind.backend.common.attachment.embedding;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * FastAPI {@code POST /ai/files/process} 응답 DTO.
 *
 * <pre>{@code
 * {
 *   "model": "bge-m3",
 *   "chunks": [
 *     { "embId": "chunk_0", "text": "...", "vector": [0.123, ...], "tags": [] }
 *   ],
 *   "docTags": { "doc_type": "policy", "topics": [...], "keywords": [...], "summary": "..." }
 * }
 * }</pre>
 *
 * <p>{@code docTags}는 문서 단위 1회 LLM 호출 결과. 호출자가 모든 청크의 {@code tag_rslt}에 동일하게 복사.</p>
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class EmbeddingResult {

    private String model;
    private List<ChunkResult> chunks;
    private Map<String, Object> docTags;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChunkResult {
        private String embId;
        private String text;
        private float[] vector;
        private List<String> tags;
    }
}
