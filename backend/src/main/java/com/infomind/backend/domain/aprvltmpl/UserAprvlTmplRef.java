package com.infomind.backend.domain.aprvltmpl;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_USER_APRVL_REF")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class UserAprvlTmplRef extends BaseEntity {

    @EmbeddedId
    private UserAprvlTmplRefId id;
}
