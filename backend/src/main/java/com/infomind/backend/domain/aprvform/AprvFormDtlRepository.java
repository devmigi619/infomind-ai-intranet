package com.infomind.backend.domain.aprvform;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AprvFormDtlRepository extends JpaRepository<AprvFormDtl, AprvFormDtlId> {

    List<AprvFormDtl> findAllByAprvFormIdAndDelYnOrderByAprvRefCd(String aprvFormId, String delYn);

    @Modifying
    @Query("UPDATE AprvFormDtl d SET d.delYn = 'Y' WHERE d.aprvFormId = :aprvFormId")
    void softDeleteByAprvFormId(@Param("aprvFormId") String aprvFormId);
}
