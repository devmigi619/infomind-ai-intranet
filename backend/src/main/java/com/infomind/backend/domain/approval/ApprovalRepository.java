package com.infomind.backend.domain.approval;

import com.infomind.backend.domain.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ApprovalRepository extends JpaRepository<Approval, Long> {

    Page<Approval> findByRequester(User requester, Pageable pageable);

    @Query("SELECT a FROM Approval a JOIN a.approvalLines al WHERE al.approver = :approver AND al.status = 'PENDING' AND a.status = 'PENDING'")
    List<Approval> findPendingForApprover(@Param("approver") User approver);
}
