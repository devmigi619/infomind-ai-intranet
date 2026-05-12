package com.infomind.backend.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuRepository extends JpaRepository<Menu, String> {

    /** 활성(use_yn='Y') 메뉴 전체 — adm_yn 오름차순(N→Y), menu_sn 오름차순 */
    List<Menu> findByUseYnOrderByAdmYnAscMenuSnAsc(String useYn);
}
