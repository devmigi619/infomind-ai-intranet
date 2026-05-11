package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CommonCodeRepository extends JpaRepository<CommonCode, CommonCodeId> {

    // 전체 상위코드(카테고리) — upCd == cd 인 row
    @Query("SELECT c FROM CommonCode c WHERE c.upCd = c.cd ORDER BY c.cdOrd ASC NULLS LAST, c.upCd ASC")
    List<CommonCode> findAllCategories();

    // 특정 카테고리의 하위코드 목록 (cd != upCd, 비활성 포함)
    @Query("SELECT c FROM CommonCode c WHERE c.upCd = :upCd AND c.cd <> c.upCd ORDER BY c.cdOrd ASC NULLS LAST, c.cd ASC")
    List<CommonCode> findCodesByUpCd(String upCd);

    // 활성(USE_YN = 'Y') 하위코드 목록 — 폼 콤보박스용
    @Query("SELECT c FROM CommonCode c WHERE c.upCd = :upCd AND c.cd <> c.upCd AND c.useYn = 'Y' ORDER BY c.cdOrd ASC NULLS LAST, c.cd ASC")
    List<CommonCode> findActiveCodesByUpCd(String upCd);
}
