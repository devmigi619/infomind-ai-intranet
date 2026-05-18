package com.infomind.backend.domain.aprvltmpl;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAprvlTmplRepository extends JpaRepository<UserAprvlTmpl, UserAprvlTmplId> {

    /** 특정 사용자의 템플릿 목록 (최신 생성순) */
    List<UserAprvlTmpl> findByIdUserIdOrderByCrtAtDesc(String userId);
}
