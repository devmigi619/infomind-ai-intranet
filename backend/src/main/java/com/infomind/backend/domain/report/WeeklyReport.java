package com.infomind.backend.domain.report;

import com.infomind.backend.common.BaseEntity;
import com.infomind.backend.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "weekly_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class WeeklyReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @Column(nullable = false)
    private LocalDate weekStart;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String thisWeek;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String nextWeek;

    @Column(columnDefinition = "TEXT")
    private String issues;

    public void update(String thisWeek, String nextWeek, String issues) {
        this.thisWeek = thisWeek;
        this.nextWeek = nextWeek;
        this.issues = issues;
    }
}
