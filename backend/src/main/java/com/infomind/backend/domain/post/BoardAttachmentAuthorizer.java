package com.infomind.backend.domain.post;

import com.infomind.backend.common.attachment.AttachmentAuthorizer;
import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 게시판(BRD prefix) 첨부 권한 판단.
 *
 * <ul>
 *   <li>해당 afileId를 참조하는 게시글이 없으면 거부</li>
 *   <li>게시글 작성자 본인이면 항상 허용</li>
 *   <li>게시판이 부서 한정({@code deptCd}이 있음)이면 사용자 부서 일치 시 허용</li>
 *   <li>그 외(부서 한정 아님 — 전체 공개)에는 허용</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class BoardAttachmentAuthorizer implements AttachmentAuthorizer {

    private final PostRepository postRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;

    @Override
    public String supportedPrefix() {
        return "BRD";
    }

    @Override
    public boolean canAccess(String userId, String afileId) {
        if (userId == null || afileId == null) {
            return false;
        }

        Optional<Post> postOpt = postRepository.findByAfileId(afileId);
        if (postOpt.isEmpty()) {
            return false;
        }
        Post post = postOpt.get();

        // 작성자 본인은 항상 허용
        if (userId.equals(post.getUserId())) {
            return true;
        }

        // 게시판 정보 확인
        Optional<Board> boardOpt = boardRepository.findById(post.getBrdId());
        if (boardOpt.isEmpty()) {
            return false;
        }
        Board board = boardOpt.get();

        String boardDeptCd = board.getDeptCd();
        // 부서 한정 게시판이 아니면(전체 공개) 허용
        if (boardDeptCd == null || boardDeptCd.isBlank()) {
            return true;
        }

        // 부서 한정 — 사용자 부서 일치 확인
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }
        return boardDeptCd.equals(userOpt.get().getDeptCd());
    }
}
