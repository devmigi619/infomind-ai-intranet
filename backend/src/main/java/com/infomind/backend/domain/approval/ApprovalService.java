package com.infomind.backend.domain.approval;

import com.infomind.backend.domain.user.User;
import com.infomind.backend.domain.user.UserRepository;
import com.infomind.backend.service.FcmService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ApprovalRepository approvalRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    @Transactional(readOnly = true)
    public Page<ApprovalSummaryDto> getMyApprovals(Long userId, Pageable pageable) {
        User user = getUser(userId);
        return approvalRepository.findByRequester(user, pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public List<ApprovalSummaryDto> getPendingForMe(Long userId) {
        User user = getUser(userId);
        return approvalRepository.findPendingForApprover(user).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ApprovalDetailDto getApprovalDetail(Long approvalId) {
        Approval approval = getApproval(approvalId);
        return toDetail(approval);
    }

    @Transactional
    public ApprovalDetailDto createApproval(Long requesterId, CreateApprovalRequest req) {
        User requester = getUser(requesterId);
        Approval approval = Approval.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .type(req.getType())
                .requester(requester)
                .build();
        Approval saved = approvalRepository.save(approval);

        List<Long> approverIds = req.getApproverIds();
        List<ApprovalLine> lines = new ArrayList<>();
        for (int i = 0; i < approverIds.size(); i++) {
            User approver = getUser(approverIds.get(i));
            ApprovalLine line = ApprovalLine.builder()
                    .approval(saved)
                    .approver(approver)
                    .seq(i + 1)
                    .build();
            lines.add(line);
        }
        approvalLineRepository.saveAll(lines);

        return toDetail(saved);
    }

    @Transactional
    public ApprovalDetailDto approve(Long approvalId, Long approverId, String comment) {
        Approval approval = getApproval(approvalId);
        User approver = getUser(approverId);

        ApprovalLine line = approvalLineRepository
                .findByApprovalAndApproverAndStatus(approval, approver, ApprovalStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("결재할 수 없는 상태입니다."));

        line.approve(comment);

        List<ApprovalLine> allLines = approvalLineRepository.findByApprovalOrderBySeqAsc(approval);
        ApprovalLine nextLine = allLines.stream()
                .filter(l -> l.getSeq() > line.getSeq() && l.getStatus() == ApprovalStatus.PENDING)
                .findFirst()
                .orElse(null);

        if (nextLine == null) {
            approval.updateStatus(ApprovalStatus.APPROVED);
            fcmService.sendNotification(
                    approval.getRequester().getFcmToken(),
                    "결재 완료",
                    "'" + approval.getTitle() + "' 결재가 최종 승인되었습니다."
            );
        } else {
            fcmService.sendNotification(
                    nextLine.getApprover().getFcmToken(),
                    "결재 요청",
                    "'" + approval.getTitle() + "' 결재를 검토해 주세요."
            );
        }

        return toDetail(approval);
    }

    @Transactional
    public ApprovalDetailDto reject(Long approvalId, Long approverId, String comment) {
        Approval approval = getApproval(approvalId);
        User approver = getUser(approverId);

        ApprovalLine line = approvalLineRepository
                .findByApprovalAndApproverAndStatus(approval, approver, ApprovalStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("결재할 수 없는 상태입니다."));

        line.reject(comment);
        approval.updateStatus(ApprovalStatus.REJECTED);

        fcmService.sendNotification(
                approval.getRequester().getFcmToken(),
                "결재 반려",
                "'" + approval.getTitle() + "' 결재가 반려되었습니다."
        );

        return toDetail(approval);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    private Approval getApproval(Long approvalId) {
        return approvalRepository.findById(approvalId)
                .orElseThrow(() -> new IllegalArgumentException("결재를 찾을 수 없습니다."));
    }

    private ApprovalSummaryDto toSummary(Approval approval) {
        return ApprovalSummaryDto.builder()
                .id(approval.getId())
                .title(approval.getTitle())
                .type(approval.getType())
                .status(approval.getStatus())
                .requesterName(approval.getRequester().getName())
                .createdAt(approval.getCreatedAt())
                .build();
    }

    private ApprovalDetailDto toDetail(Approval approval) {
        List<ApprovalLine> lines = approvalLineRepository.findByApprovalOrderBySeqAsc(approval);
        List<ApprovalLineDto> lineDtos = lines.stream()
                .map(l -> ApprovalLineDto.builder()
                        .seq(l.getSeq())
                        .approverName(l.getApprover().getName())
                        .status(l.getStatus())
                        .comment(l.getComment())
                        .decidedAt(l.getDecidedAt())
                        .build())
                .collect(Collectors.toList());

        return ApprovalDetailDto.builder()
                .id(approval.getId())
                .title(approval.getTitle())
                .content(approval.getContent())
                .type(approval.getType())
                .status(approval.getStatus())
                .requesterName(approval.getRequester().getName())
                .createdAt(approval.getCreatedAt())
                .approvalLines(lineDtos)
                .build();
    }

    // DTO classes

    @Getter
    @Builder
    public static class ApprovalSummaryDto {
        private Long id;
        private String title;
        private ApprovalType type;
        private ApprovalStatus status;
        private String requesterName;
        private LocalDateTime createdAt;
    }

    @Getter
    @Builder
    public static class ApprovalDetailDto {
        private Long id;
        private String title;
        private String content;
        private ApprovalType type;
        private ApprovalStatus status;
        private String requesterName;
        private LocalDateTime createdAt;
        private List<ApprovalLineDto> approvalLines;
    }

    @Getter
    @Builder
    public static class ApprovalLineDto {
        private int seq;
        private String approverName;
        private ApprovalStatus status;
        private String comment;
        private LocalDateTime decidedAt;
    }

    @Getter
    public static class CreateApprovalRequest {
        @NotBlank
        private String title;
        @NotBlank
        private String content;
        @NotNull
        private ApprovalType type;
        @NotNull
        private List<Long> approverIds;
    }

    @Getter
    public static class ApproveRequest {
        private String comment;
    }
}
