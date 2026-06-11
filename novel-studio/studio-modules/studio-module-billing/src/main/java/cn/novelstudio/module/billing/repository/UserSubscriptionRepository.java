package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscriptionEntity, Long> {

    Optional<UserSubscriptionEntity> findByUserId(Long userId);

    @Query("""
        SELECT p.code, COUNT(s)
        FROM UserSubscriptionEntity s
        JOIN ProductPlanEntity p ON s.planId = p.id
        WHERE s.status = 'active'
        GROUP BY p.code
        """)
    List<Object[]> countActiveByPlanCode();

    @Query("""
        SELECT COALESCE(SUM(p.priceCents), 0)
        FROM UserSubscriptionEntity s
        JOIN ProductPlanEntity p ON s.planId = p.id
        WHERE s.status = 'active' AND p.priceCents IS NOT NULL
        """)
    Long sumMrrCents();
}
