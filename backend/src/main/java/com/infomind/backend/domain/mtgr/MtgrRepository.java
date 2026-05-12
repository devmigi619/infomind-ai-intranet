package com.infomind.backend.domain.mtgr;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MtgrRepository extends JpaRepository<Mtgr, String> {
    List<Mtgr> findByUseYnOrderByMtgrNmAsc(String useYn);
}
