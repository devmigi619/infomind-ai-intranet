package com.infomind.backend.domain.vehicle;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VehicleReservationId implements Serializable {
    private String vehId;
    private Long rsvSn;
}
