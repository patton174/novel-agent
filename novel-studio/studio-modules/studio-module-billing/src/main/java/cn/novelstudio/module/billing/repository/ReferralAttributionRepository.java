package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.ReferralAttributionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReferralAttributionRepository extends JpaRepository<ReferralAttributionEntity, Long> {

    Optional<ReferralAttributionEntity> findByReferredUserId(long referredUserId);

    long countByReferrerUserId(long referrerUserId);

    long countByReferrerUserIdAndFirstPaidOrderIdIsNotNull(long referrerUserId);

    @Query("""
        SELECT a.referrerUserId,
               COUNT(a),
               SUM(CASE WHEN a.firstPaidOrderId IS NOT NULL THEN 1 ELSE 0 END)
        FROM ReferralAttributionEntity a
        GROUP BY a.referrerUserId
        ORDER BY COUNT(a) DESC, a.referrerUserId ASC
        """)
    List<Object[]> summarizeByReferrer();

    List<ReferralAttributionEntity> findByReferrerUserIdOrderByRegisteredAtDesc(long referrerUserId);
}
