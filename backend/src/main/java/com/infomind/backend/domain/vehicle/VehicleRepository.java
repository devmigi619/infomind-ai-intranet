package com.infomind.backend.domain.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    /** 사용중인 차량 목록 (이름순) */
    List<Vehicle> findByUseYnOrderByVehNmAsc(String useYn);
}
