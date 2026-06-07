package com.novel.agent.content.repository.agent;

import com.novel.agent.content.entity.agent.AgentRunEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgentRunEventRepository extends JpaRepository<AgentRunEventEntity, String> {

    List<AgentRunEventEntity> findByRunIdAndSequenceGreaterThanOrderBySequenceAsc(String runId, int afterSequence);

    List<AgentRunEventEntity> findByRunIdOrderBySequenceAsc(String runId);

    int countByRunId(String runId);
}
