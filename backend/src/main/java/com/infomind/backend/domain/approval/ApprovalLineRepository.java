package com.infomind.backend.domain.approval;

import com.infomind.backend.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {

    List<ApprovalLine> findByApprovalOrderBySeqAsc(Approval approval);

    Optional<ApprovalLine> findByApprovalAndApproverAndStatus(Approval approval, User approver, ApprovalStatus status);
}
