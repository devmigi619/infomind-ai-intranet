package com.infomind.backend.domain.post;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminBoardService {

    private final BoardRepository boardRepository;

    // ─── 목록 조회 ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BoardService.BoardDto> getList(String keyword, String status) {
        List<Board> boards = boardRepository.findAll();

        // 키워드 검색 (brdId / brdNm)
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();
            boards = boards.stream()
                    .filter(b -> (b.getBrdId() != null && b.getBrdId().toLowerCase().contains(kw))
                            || (b.getBrdNm() != null && b.getBrdNm().toLowerCase().contains(kw)))
                    .collect(Collectors.toList());
        }

        // 상태 필터
        boards = switch (status == null ? "ALL" : status.toUpperCase()) {
            case "ACTIVE"   -> boards.stream()
                    .filter(b -> "Y".equals(b.getUseYn()))
                    .collect(Collectors.toList());
            case "INACTIVE" -> boards.stream()
                    .filter(b -> !"Y".equals(b.getUseYn()))
                    .collect(Collectors.toList());
            default         -> boards; // ALL
        };

        // ord 오름차순 (null은 뒤로)
        boards = boards.stream()
                .sorted((a, b) -> {
                    Integer ao = a.getOrd();
                    Integer bo = b.getOrd();
                    if (ao == null && bo == null) return 0;
                    if (ao == null) return 1;
                    if (bo == null) return -1;
                    return ao.compareTo(bo);
                })
                .collect(Collectors.toList());

        return boards.stream().map(this::toDto).collect(Collectors.toList());
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    @Transactional
    public BoardService.BoardDto create(BoardService.CreateRequest req) {
        if (boardRepository.existsById(req.getBrdId())) {
            throw new IllegalArgumentException("이미 존재하는 게시판 ID입니다: " + req.getBrdId());
        }
        Board board = Board.builder()
                .brdId(req.getBrdId())
                .brdSe(req.getBrdSe())
                .brdNm(req.getBrdNm())
                .brdDesc(req.getBrdDesc())
                .deptCd(req.getDeptCd())
                .ord(req.getOrd())
                .fileUseYn(req.getFileUseYn() != null ? req.getFileUseYn() : "Y")
                .cmtUseYn(req.getCmtUseYn() != null ? req.getCmtUseYn() : "Y")
                .useYn("Y")
                .build();
        return toDto(boardRepository.save(board));
    }

    // ─── 수정 ──────────────────────────────────────────────────────────────

    @Transactional
    public BoardService.BoardDto update(String brdId, BoardService.UpdateRequest req) {
        Board board = findBoard(brdId);
        board.update(req.getBrdSe(), req.getBrdNm(), req.getBrdDesc(), req.getDeptCd(),
                req.getOrd(), req.getFileUseYn(), req.getCmtUseYn(), req.getUseYn());
        return toDto(board);
    }

    // ─── 비활성화 / 활성화 ───────────────────────────────────────────────

    @Transactional
    public void disable(String brdId) {
        Board board = findBoard(brdId);
        board.disable();
    }

    @Transactional
    public void enable(String brdId) {
        Board board = findBoard(brdId);
        board.update(null, null, board.getBrdDesc(), board.getDeptCd(),
                board.getOrd(), null, null, "Y");
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────

    private Board findBoard(String brdId) {
        return boardRepository.findById(brdId)
                .orElseThrow(() -> new IllegalArgumentException("게시판을 찾을 수 없습니다: " + brdId));
    }

    private BoardService.BoardDto toDto(Board b) {
        return BoardService.BoardDto.builder()
                .brdId(b.getBrdId())
                .brdSe(b.getBrdSe())
                .brdNm(b.getBrdNm())
                .brdDesc(b.getBrdDesc())
                .deptCd(b.getDeptCd())
                .ord(b.getOrd())
                .fileUseYn(b.getFileUseYn())
                .cmtUseYn(b.getCmtUseYn())
                .useYn(b.getUseYn())
                .build();
    }
}
