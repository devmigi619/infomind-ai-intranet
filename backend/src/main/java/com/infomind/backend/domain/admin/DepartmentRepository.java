package com.infomind.backend.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, String> {

    /** 전체 목록 — 레벨 오름차순, 동일 레벨 내 코드 오름차순 */
    List<Department> findAllByOrderByDeptLvlAscDeptCdAsc();

    /** 특정 상위부서의 직속 하위 부서 */
    List<Department> findByUpDeptCd(String upDeptCd);

    /** 코드 중복 체크 */
    boolean existsByDeptCd(String deptCd);
}
