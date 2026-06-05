package com.novel.agent.content.repository.agent;

import com.novel.agent.content.entity.agent.AgentMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgentMessageRepository extends JpaRepository<AgentMessageEntity, String> {

    List<AgentMessageEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
