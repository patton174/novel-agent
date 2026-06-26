package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.PaymentOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrderEntity, Long> {

    Optional<PaymentOrderEntity> findByIdrOrderId(String idrOrderId);

    Optional<PaymentOrderEntity> findByIdAndUserId(Long id, Long userId);

    Optional<PaymentOrderEntity> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    @Query("""
        SELECT p FROM PaymentOrderEntity p
        WHERE (:status IS NULL OR :status = '' OR p.status = :status)
          AND (:userId IS NULL OR p.userId = :userId)
          AND (:planId IS NULL OR p.planId = :planId)
          AND (:planCode IS NULL OR :planCode = '' OR p.planCode = :planCode)
          AND (
            :orderQuery IS NULL OR :orderQuery = ''
            OR p.idrOrderId LIKE CONCAT('%', :orderQuery, '%')
            OR CAST(p.id AS string) = :orderQuery
          )
        ORDER BY p.createdAt DESC
        """)
    Page<PaymentOrderEntity> search(
        @Param("status") String status,
        @Param("userId") Long userId,
        @Param("planId") Long planId,
        @Param("planCode") String planCode,
        @Param("orderQuery") String orderQuery,
        Pageable pageable
    );

    @Query("""
        SELECT p FROM PaymentOrderEntity p
        WHERE p.planId = :planId
           OR (p.planId IS NULL AND p.planCode = :planCode)
        ORDER BY p.createdAt DESC
        """)
    Page<PaymentOrderEntity> findLinkedToPlan(
        @Param("planId") Long planId,
        @Param("planCode") String planCode,
        Pageable pageable
    );

    @Query("""
        SELECT p.status, COUNT(p)
        FROM PaymentOrderEntity p
        WHERE p.planId = :planId
           OR (p.planId IS NULL AND p.planCode = :planCode)
        GROUP BY p.status
        """)
    List<Object[]> countGroupedByStatusForPlan(
        @Param("planId") Long planId,
        @Param("planCode") String planCode
    );

    @Query("""
        SELECT COUNT(p) FROM PaymentOrderEntity p
        WHERE (p.planId = :planId OR (p.planId IS NULL AND p.planCode = :planCode))
          AND p.status = :status
        """)
    long countLinkedByStatus(
        @Param("planId") Long planId,
        @Param("planCode") String planCode,
        @Param("status") String status
    );
}
