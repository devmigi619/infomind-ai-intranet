package com.infomind.backend.domain.post;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;

    // ─── 조회 ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BoardDto> getAll() {
        return boardRepository.findAll()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BoardDto> getActive() {
        return boardRepository.findByUseYnOrderByOrdAsc("Y")
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BoardDto getById(String brdId) {
        Board board = boardRepository.findById(brdId)
                .orElseThrow(() -> new IllegalArgumentException("게시판을 찾을 수 없습니다: " + brdId));
        return toDto(board);
    }

    // ─── 생성 ──────────────────────────────────────────────────────────────

    @Transactional
    public BoardDto create(CreateRequest req) {
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
    public BoardDto update(String brdId, UpdateRequest req) {
        Board board = boardRepository.findById(brdId)
                .orElseThrow(() -> new IllegalArgumentException("게시판을 찾을 수 없습니다: " + brdId));
        board.update(req.getBrdSe(), req.getBrdNm(), req.getBrdDesc(), req.getDeptCd(),
                req.getOrd(), req.getFileUseYn(), req.getCmtUseYn(), req.getUseYn());
        return toDto(board);
    }

    // ─── 비활성화 ─────────────────────────────────────────────────────────

    @Transactional
    public void disable(String brdId) {
        Board board = boardRepository.findById(brdId)
                .orElseThrow(() -> new IllegalArgumentException("게시판을 찾을 수 없습니다: " + brdId));
        board.disable();
    }

    // ─── 매핑 ──────────────────────────────────────────────────────────────

    private BoardDto toDto(Board b) {
        return BoardDto.builder()
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

    // ─── DTOs ──────────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class BoardDto {
        private String brdId;
        private String brdSe;
        private String brdNm;
        private String brdDesc;
        private String deptCd;
        private Integer ord;
        private String fileUseYn;
        private String cmtUseYn;
        private String useYn;
    }

    @Getter
    public static class CreateRequest {
        @NotBlank private String brdId;
        @NotBlank private String brdSe;
        @NotBlank private String brdNm;
        private String brdDesc;
        private String deptCd;
        private Integer ord;
        private String fileUseYn;
        private String cmtUseYn;
    }

    @Getter
    public static class UpdateRequest {
        private String brdSe;
        private String brdNm;
        private String brdDesc;
        private String deptCd;
        private Integer ord;
        private String fileUseYn;
        private String cmtUseYn;
        private String useYn;
    }
}
