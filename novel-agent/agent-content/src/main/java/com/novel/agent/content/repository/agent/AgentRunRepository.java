package com.novel.agent.content.repository.agent;

import com.novel.agent.content.agent.AgentRunStatus;
import com.novel.agent.content.entity.agent.AgentRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AgentRunRepository extends JpaRepository<AgentRunEntity, String> {

    List<AgentRunEntity> findBySessionIdOrderByCreatedAtDesc(String sessionId);

    Optional<AgentRunEntity> findFirstBySessionIdAndStatusInOrderByCreatedAtDesc(
        String sessionId,
        List<AgentRunStatus> statuses
    );
}
