package com.novel.agent.content.repository.agent;

import com.novel.agent.content.agent.AgentRunStatus;
import com.novel.agent.content.entity.agent.AgentRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AgentRunRepository extends JpaRepository<AgentRunEntity, String> {

    List<AgentRunEntity> findBySessionIdOrderByCreatedAtDesc(String sessionId);

    Optional<AgentRunEntity> findFirstBySessionIdAndStatusInOrderByCreatedAtDesc(
        String sessionId,
        List<AgentRunStatus> statuses
    );

    long countByUserId(Long userId);

    @Query("SELECT COUNT(r) FROM AgentRunEntity r")
    long countAll();

    @Query(value = """
        SELECT DATE(created_at AT TIME ZONE 'UTC') AS run_day, COUNT(*) AS run_count
        FROM agent_run
        WHERE created_at >= :since
        GROUP BY DATE(created_at AT TIME ZONE 'UTC')
        ORDER BY run_day
        """, nativeQuery = true)
    List<Object[]> countDailySince(@Param("since") Instant since);
}
