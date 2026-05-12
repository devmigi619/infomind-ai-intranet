"""파일첨부 임베딩 엔드포인트.

Spring Boot가 업로드 직후 시스템 JWT로 호출 → 텍스트 추출/청킹/임베딩/키워드 추출 결과를
JSON으로 반환. 저장(pgvector)은 Spring 측 책임.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.auth import verify_token
from app.core.config import settings
from app.models.file_embedding import FileProcessResponse
from app.services.embedding import embed_chunks, extract_doc_tags
from app.services.file_extract import extract_text

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/files/process", response_model=FileProcessResponse)
async def process_file(
    file: UploadFile = File(...),
    afile_id: str = Form(...),
    afile_sn: int = Form(...),
    _user=Depends(verify_token),
):
    """업로드된 파일을 추출/청킹/임베딩한다.

    응답 chunks가 비어 있으면 호출자(Spring)는 저장을 skip한다.
    """
    raw = await file.read()
    text = extract_text(raw, file.filename or "")
    if not text.strip():
        logger.info(
            "텍스트 추출 결과 없음 — skip (afile_id=%s, sn=%s, filename=%s)",
            afile_id,
            afile_sn,
            file.filename,
        )
        return FileProcessResponse(model=settings.embedding_model, chunks=[])

    chunks = await embed_chunks(text)
    # 문서 단위 태그 1회 추출 — 실패 시 {}. 호출자(Spring)가 모든 청크의 tag_rslt에 동일하게 복사
    doc_tags = await extract_doc_tags(text)
    logger.info(
        "파일 임베딩 완료: afile_id=%s, sn=%s, chunks=%d, doc_tags_keys=%s",
        afile_id,
        afile_sn,
        len(chunks),
        list(doc_tags.keys()) if doc_tags else [],
    )
    return FileProcessResponse(
        model=settings.embedding_model,
        chunks=chunks,
        docTags=doc_tags,
    )
