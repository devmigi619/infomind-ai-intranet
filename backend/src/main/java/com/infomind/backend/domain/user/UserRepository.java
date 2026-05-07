package com.infomind.backend.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    // PK = userId(String), findById(userId)로 직접 조회
}
