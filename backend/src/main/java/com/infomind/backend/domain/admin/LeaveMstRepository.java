package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveMstRepository extends JpaRepository<LeaveMst, String> {
    List<LeaveMst> findAllByOrderByLeaveCdAsc();
    boolean existsByLeaveCd(String leaveCd);
}
