package com.infomind.backend.domain.aprvltmpl;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAprvlTmplAprvRepository extends JpaRepository<UserAprvlTmplAprv, UserAprvlTmplAprvId> {

    List<UserAprvlTmplAprv> findByIdAprvlIdAndIdUserIdOrderByAprvOrdAsc(String aprvlId, String userId);

    void deleteByIdAprvlIdAndIdUserId(String aprvlId, String userId);
}
