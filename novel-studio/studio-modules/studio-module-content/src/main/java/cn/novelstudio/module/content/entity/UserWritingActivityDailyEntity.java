package cn.novelstudio.module.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "user_writing_activity_daily")
@IdClass(UserWritingActivityDailyId.class)
@Getter
@Setter
public class UserWritingActivityDailyEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Id
    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "words_added", nullable = false)
    private Long wordsAdded = 0L;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
