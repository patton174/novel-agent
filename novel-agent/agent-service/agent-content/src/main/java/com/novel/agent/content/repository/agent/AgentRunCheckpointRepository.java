package com.novel.agent.content.repository.agent;

import com.novel.agent.content.entity.agent.AgentRunCheckpointEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRunCheckpointRepository extends JpaRepository<AgentRunCheckpointEntity, String> {
}
