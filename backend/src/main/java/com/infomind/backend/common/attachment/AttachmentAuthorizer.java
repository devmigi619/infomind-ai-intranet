package com.infomind.backend.common.attachment;

/**
 * 도메인별 첨부 파일 접근 권한 위임 인터페이스.
 *
 * <p>afileId는 {@code "PREFIX_yyyyMMddHHmmss_xxxxxxxx"} 형식이며, 앞의 PREFIX로
 * 어느 도메인에 속한 첨부인지 식별한다. 각 도메인은 본 인터페이스를 구현하여
 * 자신의 prefix를 선언하고 권한 판단 로직을 제공한다.</p>
 *
 * <p>Spring이 모든 구현체를 {@code List<AttachmentAuthorizer>}로 주입하면
 * {@link AttachmentService}가 prefix → 구현체 Map으로 변환해 라우팅한다.</p>
 */
public interface AttachmentAuthorizer {

    /** 이 Authorizer가 담당하는 afileId prefix (예: "BRD", "APV", "RPT") */
    String supportedPrefix();

    /**
     * 사용자가 해당 첨부 그룹에 접근(다운로드/조회/삭제) 가능한지 판단.
     *
     * @param userId 인증된 사용자 ID
     * @param afileId 첨부 그룹 ID
     * @return 접근 가능하면 true
     */
    boolean canAccess(String userId, String afileId);
}
