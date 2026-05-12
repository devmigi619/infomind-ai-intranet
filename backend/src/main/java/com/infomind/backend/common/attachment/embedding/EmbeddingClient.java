package com.infomind.backend.common.attachment.embedding;

/**
 * 외부 임베딩 서비스(FastAPI {@code /ai/files/process}) 호출 추상화.
 */
public interface EmbeddingClient {

    /**
     * 파일을 FastAPI로 전송하여 청크 단위 임베딩 결과를 받는다.
     *
     * <p>{@code MultipartFile}은 HTTP 요청 컨텍스트에 묶인 1회성 리소스이므로,
     * 비동기 스레드에서 사용 불가. 호출자는 동기 단계에서 bytes/fileName을 미리 추출해
     * 이 메서드에 전달한다.</p>
     *
     * @param bytes    파일 바이트(동기 단계에서 추출 완료)
     * @param fileName 원본 파일명(없으면 {@code "file"} 로 대체됨)
     * @param afileId  첨부 그룹 ID
     * @param afileSn  그룹 내 일련번호
     * @return         모델명 + 청크별 임베딩/태그
     * @throws RuntimeException 호출 실패 시 — 호출자는 catch 후 로그만 남기는 정책
     */
    EmbeddingResult process(byte[] bytes, String fileName, String afileId, Long afileSn);
}
