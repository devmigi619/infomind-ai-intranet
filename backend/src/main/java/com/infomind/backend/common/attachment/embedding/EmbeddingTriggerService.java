package com.infomind.backend.common.attachment.embedding;

import com.pgvector.PGvector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 첨부파일 업로드 직후 임베딩 파이프라인을 비동기로 트리거한다.
 *
 * <p>{@link AttachmentService}와 별도 컴포넌트로 분리한 이유:
 * {@code @Async}는 같은 클래스 내부 호출 시 스프링 프록시를 우회해 동기 실행되므로,
 * 비동기 동작을 보장하려면 외부 빈에서 호출해야 한다.</p>
 *
 * <p>실패 시 정책: 재시도 없이 {@code log.warn}만 남기고 종료.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingTriggerService {

    /** AttachmentEmbedding.emb_ttl 컬럼 한도 */
    private static final int EMB_TTL_MAX = 300;

    private final EmbeddingClient embeddingClient;
    private final AttachmentEmbeddingRepository embeddingRepository;

    /**
     * 임베딩 비동기 트리거. 호출자(동기 단계)에서 {@code bytes}/{@code fileName}을 미리 추출해 전달해야 한다.
     * {@code MultipartFile}은 요청 컨텍스트가 닫히면 더 이상 읽을 수 없으므로 여기까지 들고 오면 안 됨.
     */
    @Async
    public void triggerEmbedding(byte[] bytes, String fileName, String afileId, Long afileSn) {
        EmbeddingResult result;
        try {
            result = embeddingClient.process(bytes, fileName, afileId, afileSn);
        } catch (Exception e) {
            log.warn("임베딩 호출 실패 — skip (afileId={}, sn={}, file={}): {}",
                    afileId, afileSn, fileName, e.getMessage());
            return;
        }

        if (result == null || result.getChunks() == null || result.getChunks().isEmpty()) {
            log.info("임베딩 결과 비어 있음 — skip (afileId={}, sn={})", afileId, afileSn);
            return;
        }

        String model = result.getModel();
        // 문서 단위 1회 추출된 docTags를 모든 청크의 tag_rslt에 동일하게 복사 (혁준 노트북 패턴)
        Map<String, Object> docTags = result.getDocTags() != null ? result.getDocTags() : Map.of();
        List<AttachmentEmbedding> entities = new ArrayList<>(result.getChunks().size());
        for (EmbeddingResult.ChunkResult chunk : result.getChunks()) {
            entities.add(toEntity(afileId, afileSn.intValue(), model, chunk, docTags));
        }

        try {
            embeddingRepository.saveAll(entities);
            log.info("임베딩 저장 완료 (afileId={}, sn={}, chunks={})", afileId, afileSn, entities.size());
        } catch (Exception e) {
            log.warn("임베딩 저장 실패 (afileId={}, sn={}): {}", afileId, afileSn, e.getMessage());
        }
    }

    private AttachmentEmbedding toEntity(String afileId,
                                         Integer afileSn,
                                         String model,
                                         EmbeddingResult.ChunkResult chunk,
                                         Map<String, Object> docTags) {
        String text = chunk.getText() != null ? chunk.getText() : "";
        String embTtl = text.length() > EMB_TTL_MAX ? text.substring(0, EMB_TTL_MAX) : text;

        // 문서 단위 태그를 그대로 복사. docTags가 비어 있으면 빈 객체 박힘 — 검색은 벡터만으로 가능.
        Map<String, Object> tagJson = new HashMap<>(docTags);

        return AttachmentEmbedding.builder()
                .afileId(afileId)
                .afileSn(afileSn)
                .embId(chunk.getEmbId())
                .embRslt(toPgvector(chunk.getVector()))
                .embTtl(embTtl)
                .embModel(model)
                .tagRslt(tagJson)
                .oriDesc(text)
                .build();
    }

    private PGvector toPgvector(float[] vector) {
        if (vector == null) {
            return null;
        }
        return new PGvector(vector);
    }
}
