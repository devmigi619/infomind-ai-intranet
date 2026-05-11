package com.infomind.backend.domain.post;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, String> {

    /** 활성 게시판 목록 — ord 오름차순 */
    List<Board> findByUseYnOrderByOrdAsc(String useYn);

    /** 부서 게시판 목록 (특정 부서, 활성) */
    List<Board> findByDeptCdAndUseYn(String deptCd, String useYn);
}
