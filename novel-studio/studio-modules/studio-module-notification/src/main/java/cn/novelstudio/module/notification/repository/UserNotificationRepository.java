package cn.novelstudio.module.notification.repository;

import cn.novelstudio.module.notification.entity.UserNotificationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserNotificationRepository extends JpaRepository<UserNotificationEntity, Long> {

    List<UserNotificationEntity> findByUserIdOrderByCreatedAtDescIdDesc(Long userId, Pageable pageable);

    List<UserNotificationEntity> findByUserIdAndIdLessThanOrderByCreatedAtDescIdDesc(
        Long userId,
        Long cursor,
        Pageable pageable
    );

    long countByUserIdAndReadAtIsNull(Long userId);

    Optional<UserNotificationEntity> findByIdAndUserId(Long id, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        UPDATE UserNotificationEntity n
        SET n.readAt = :readAt
        WHERE n.userId = :userId AND n.readAt IS NULL
        """)
    int markAllRead(@Param("userId") Long userId, @Param("readAt") Instant readAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        WITH doomed AS (
            SELECT id FROM user_notification
            WHERE created_at < :cutoff
            ORDER BY id
            LIMIT :limit
        )
        DELETE FROM user_notification n
        USING doomed d
        WHERE n.id = d.id
        """, nativeQuery = true)
    int deleteOlderThan(@Param("cutoff") Instant cutoff, @Param("limit") int limit);
}
