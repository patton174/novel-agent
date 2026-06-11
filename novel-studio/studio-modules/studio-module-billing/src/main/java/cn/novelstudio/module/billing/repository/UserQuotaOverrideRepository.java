package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserQuotaOverrideEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface UserQuotaOverrideRepository extends JpaRepository<UserQuotaOverrideEntity, Long> {

    @Query("""
        SELECT o FROM UserQuotaOverrideEntity o
        WHERE o.userId = :userId
          AND (o.expiresAt IS NULL OR o.expiresAt > :now)
        ORDER BY o.createdAt DESC
        """)
    List<UserQuotaOverrideEntity> findActiveByUserId(@Param("userId") long userId, @Param("now") Instant now);
}
