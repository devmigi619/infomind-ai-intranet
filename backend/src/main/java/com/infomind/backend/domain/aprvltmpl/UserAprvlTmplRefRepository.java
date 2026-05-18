package com.infomind.backend.domain.aprvltmpl;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserAprvlTmplRefRepository extends JpaRepository<UserAprvlTmplRef, UserAprvlTmplRefId> {

    List<UserAprvlTmplRef> findByIdAprvlIdAndIdUserId(String aprvlId, String userId);

    void deleteByIdAprvlIdAndIdUserId(String aprvlId, String userId);
}
