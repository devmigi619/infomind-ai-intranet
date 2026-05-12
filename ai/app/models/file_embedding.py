"""파일첨부 임베딩 파이프라인용 Pydantic 모델.

Spring Boot에서 multipart로 업로드된 파일을 받아, 텍스트 추출 → 청킹 →
임베딩 → 키워드 추출을 수행한 결과를 JSON으로 응답할 때 사용한다.
"""

from pydantic import BaseModel


class ChunkResult(BaseModel):
    """단일 청크에 대한 임베딩 + 메타 결과."""

    embId: str  # 예: "chunk_0", "chunk_1" ...
    text: str  # 원본 청크 텍스트 (요약/저장 용도)
    vector: list[float]  # 1024차원 임베딩 벡터 (bge-m3)
    tags: list[str] = []  # LLM이 뽑아낸 키워드 N개


class FileProcessResponse(BaseModel):
    """파일 처리 응답."""

    model: str  # 임베딩 모델명 (예: "bge-m3")
    chunks: list[ChunkResult] = []
    # 문서 단위 1회 LLM 호출로 추출한 태그/메타. 모든 청크에 동일하게 복사되어 tag_rslt에 박힘.
    # 실패 시 {} — 검색 시 벡터 유사도만으로 동작
    docTags: dict = {}
