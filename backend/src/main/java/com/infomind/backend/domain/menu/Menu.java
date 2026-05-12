package com.infomind.backend.domain.menu;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_MENU")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Menu extends BaseEntity {

    @Id
    @Column(name = "MENU_ID", length = 100)
    private String menuId;

    @Column(name = "MENU_NM", length = 100)
    private String menuNm;

    @Column(name = "MENU_SN")
    private Integer menuSn;

    @Column(name = "ADM_YN", length = 1)
    private String admYn;

    @Column(name = "USE_YN", length = 1)
    @Builder.Default
    private String useYn = "Y";
}
