package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveDtlRepository extends JpaRepository<LeaveDtl, LeaveDtlId> {
    List<LeaveDtl> findByIdLeaveCdOrderByIdLeaveDtlCdAsc(String leaveCd);
    boolean existsById(LeaveDtlId id);
}
