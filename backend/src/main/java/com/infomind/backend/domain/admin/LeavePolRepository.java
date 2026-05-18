package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeavePolRepository extends JpaRepository<LeavePol, String> {
    List<LeavePol> findAllByOrderByPolStMonAsc();
    boolean existsByLeavePolCd(String leavePolCd);
}
