package com.infomind.backend.domain.post;

import com.infomind.backend.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BoardService.BoardDto>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getActive()));
    }

    @GetMapping("/{brdId}")
    public ResponseEntity<ApiResponse<BoardService.BoardDto>> getById(@PathVariable String brdId) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getById(brdId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BoardService.BoardDto>> create(
            @Valid @RequestBody BoardService.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.create(request)));
    }

    @PutMapping("/{brdId}")
    public ResponseEntity<ApiResponse<BoardService.BoardDto>> update(
            @PathVariable String brdId,
            @Valid @RequestBody BoardService.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.update(brdId, request)));
    }

    @DeleteMapping("/{brdId}")
    public ResponseEntity<ApiResponse<Void>> disable(@PathVariable String brdId) {
        boardService.disable(brdId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
