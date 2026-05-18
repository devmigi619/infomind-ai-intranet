package com.infomind.backend.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {

    /** 이름 또는 아이디로 검색 (대소문자 무시) */
    List<User> findByUserIdContainingIgnoreCaseOrUserNmContainingIgnoreCase(
            String userId, String userNm);

    /** 특정 user_se를 제외한 전체 목록 */
    List<User> findByUserSeNot(String userSe);

    /** 특정 user_se만 조회 */
    List<User> findByUserSe(String userSe);

    /** 부서 코드 목록에 속한 사용자 조회 (부서원 자동포함용) */
    List<User> findByDeptCdIn(Collection<String> deptCds);
}
