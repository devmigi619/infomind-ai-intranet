package com.infomind.backend.common.attachment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, AttachmentId> {

    /** 첨부 그룹의 활성 파일 목록 — 삭제되지 않은 것, afileSn 오름차순 */
    List<Attachment> findByAfileIdAndDelYnOrderByAfileSnAsc(String afileId, String delYn);
}
