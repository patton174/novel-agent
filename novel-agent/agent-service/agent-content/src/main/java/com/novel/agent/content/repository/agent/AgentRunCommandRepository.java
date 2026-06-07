package com.novel.agent.content.repository.agent;

import com.novel.agent.content.entity.agent.AgentRunCommandEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgentRunCommandRepository extends JpaRepository<AgentRunCommandEntity, String> {

    Optional<AgentRunCommandEntity> findByRunIdAndId(String runId, String id);
}
