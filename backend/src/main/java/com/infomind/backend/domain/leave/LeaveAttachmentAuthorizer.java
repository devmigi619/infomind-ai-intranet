package com.infomind.backend.domain.leave;

import com.infomind.backend.common.attachment.AttachmentAuthorizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 휴가신청(LEAVE prefix) 첨부 권한 판단.
 *
 * <ul>
 *   <li>해당 afileId를 참조하는 휴가신청이 없으면 거부</li>
 *   <li>신청자 본인이면 허용</li>
 *   <li>결재자로 등록된 사용자이면 허용</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class LeaveAttachmentAuthorizer implements AttachmentAuthorizer {

    private final LeaveReqMstRepository mstRepo;
    private final LeaveReqAprvRepository aprvRepo;

    @Override
    public String supportedPrefix() {
        return "LEAVE";
    }

    @Override
    public boolean canAccess(String userId, String afileId) {
        if (userId == null || afileId == null) return false;

        return mstRepo.findByAfileId(afileId).map(mst -> {
            String reqUserId = mst.getId().getReqUserId();
            Long   reqSn     = mst.getId().getReqSn();

            // 신청자 본인
            if (userId.equals(reqUserId)) return true;

            // 결재자 중 한 명
            return aprvRepo.findByIdReqUserIdAndIdReqSnOrderByAprvOrdAsc(reqUserId, reqSn)
                    .stream()
                    .anyMatch(a -> userId.equals(a.getId().getAprvUserId()));
        }).orElse(false);
    }
}
