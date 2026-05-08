package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobGradeRepository extends JpaRepository<JobGrade, String> {

    List<JobGrade> findAllByOrderByJbgdSnAscJbgdCdAsc();

    boolean existsByJbgdCd(String jbgdCd);
}
