package com.infomind.backend.domain.mtgr;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MtgrReservationId implements Serializable {
    private String mtgrId;
    private Long rsvSn;
}
