package com.infomind.backend.common.attachment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentBlobRepository extends JpaRepository<AttachmentBlob, AttachmentId> {

    /**
     * 첨부 그룹의 활성 BLOB 파일 목록 — 삭제되지 않은 것, afileSn 오름차순.
     * (2단계에서 추가 — 그룹 메타 조회 / 그룹 일괄 soft delete에 필요)
     */
    List<AttachmentBlob> findByAfileIdAndDelYnOrderByAfileSnAsc(String afileId, String delYn);
}
