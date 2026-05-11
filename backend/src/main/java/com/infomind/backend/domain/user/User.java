package com.infomind.backend.domain.user;

import com.infomind.backend.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "INT_USER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class User extends BaseEntity {

    @Id
    @Column(name = "USER_ID", length = 100)
    private String userId;          // PK = 로그인 ID

    @Column(name = "USER_NM", length = 100)
    private String userNm;

    @Column(name = "PWD", length = 500)
    private String pwd;

    @Column(name = "MTELNO", length = 30)
    private String mtelno;

    @Column(name = "TELNO", length = 30)
    private String telno;

    @Column(name = "GNDR_SE", length = 20)
    private String gndrSe;

    @Column(name = "BRDT", length = 8)
    private String brdt;

    @Column(name = "EML", length = 40)
    private String eml;

    @Column(name = "ADDR", length = 255)
    private String addr;

    @Column(name = "DADDR", length = 255)
    private String daddr;

    @Column(name = "ZIP", length = 10)
    private String zip;

    @Column(name = "USER_SE", length = 20)
    private String userSe;          // 사용자 구분 (ADMIN / USER 등)

    @Column(name = "JBGD_CD", length = 20)
    private String jbgdCd;          // 직급 코드

    @Column(name = "DEPT_CD", length = 100)
    private String deptCd;          // 부서 코드

    @Column(name = "HIRE_YMD", length = 8)
    private String hireYmd;         // 입사일자 (YYYYMMDD)

    @Column(name = "RESG_YMD", length = 8)
    private String resgYmd;         // 퇴사일자 (YYYYMMDD)

    public void update(String userNm, String userSe, String deptCd, String jbgdCd,
                       String eml, String mtelno, String hireYmd) {
        this.userNm  = userNm;
        this.userSe  = userSe != null ? userSe : this.userSe;
        this.deptCd  = deptCd;
        this.jbgdCd  = jbgdCd;
        this.eml     = eml;
        this.mtelno  = mtelno;
        this.hireYmd = hireYmd;
    }

    public void disable() { this.userSe = "INVALID"; }
    public void enable()  { this.userSe = "USER"; }
    public void resetPassword(String encodedPwd) { this.pwd = encodedPwd; }
}
