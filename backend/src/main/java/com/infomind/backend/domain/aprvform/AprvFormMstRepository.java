package com.infomind.backend.domain.aprvform;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AprvFormMstRepository extends JpaRepository<AprvFormMst, String> {

    List<AprvFormMst> findAllByDelYnOrderByCrtAtDesc(String delYn);

    Optional<AprvFormMst> findByAprvFormIdAndDelYn(String aprvFormId, String delYn);

    boolean existsByAprvFormId(String aprvFormId);
}
