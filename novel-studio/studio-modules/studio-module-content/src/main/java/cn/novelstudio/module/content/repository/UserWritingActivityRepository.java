package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UserWritingActivityDailyEntity;
import cn.novelstudio.module.content.entity.UserWritingActivityDailyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserWritingActivityRepository
    extends JpaRepository<UserWritingActivityDailyEntity, UserWritingActivityDailyId> {

    Optional<UserWritingActivityDailyEntity> findByUserIdAndActivityDate(Long userId, LocalDate activityDate);

    @Query(value = """
        SELECT activity_date, COALESCE(words_added, 0)
        FROM user_writing_activity_daily
        WHERE user_id = :userId AND activity_date >= :startDate
        ORDER BY activity_date
        """, nativeQuery = true)
    List<Object[]> sumDailyByUserIdSince(
        @Param("userId") Long userId,
        @Param("startDate") LocalDate startDate
    );
}
