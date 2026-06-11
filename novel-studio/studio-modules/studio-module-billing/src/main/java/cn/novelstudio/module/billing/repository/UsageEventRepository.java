package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UsageEventEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UsageEventRepository extends JpaRepository<UsageEventEntity, Long> {

    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<UsageEventEntity> findByIdempotencyKey(String idempotencyKey);

    Page<UsageEventEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<UsageEventEntity> findByUserIdAndRunIdOrderByCreatedAtDesc(Long userId, String runId, Pageable pageable);

    @Query(value = """
        SELECT CAST(created_at AS date) AS day,
               SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens),
               SUM(total_cost_micros)
        FROM usage_event
        WHERE user_id = :userId AND created_at >= :since
        GROUP BY day
        ORDER BY day
        """, nativeQuery = true)
    List<Object[]> sumDailySince(@Param("userId") long userId, @Param("since") Instant since);

    @Query(value = """
        SELECT CAST(created_at AS date) AS day,
               SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens),
               SUM(total_cost_micros)
        FROM usage_event
        WHERE created_at >= :since
        GROUP BY day
        ORDER BY day
        """, nativeQuery = true)
    List<Object[]> sumDailyPlatformSince(@Param("since") Instant since);

    @Query(value = """
        SELECT COALESCE(model, 'unknown') AS model,
               SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens),
               SUM(total_cost_micros)
        FROM usage_event
        WHERE created_at >= :since
        GROUP BY model
        ORDER BY SUM(total_cost_micros) DESC
        LIMIT 12
        """, nativeQuery = true)
    List<Object[]> sumByModelSince(@Param("since") Instant since);
}
