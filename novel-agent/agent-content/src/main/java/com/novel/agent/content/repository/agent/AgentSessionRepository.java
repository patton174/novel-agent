package com.novel.agent.content.repository.agent;

import com.novel.agent.content.entity.agent.AgentSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgentSessionRepository extends JpaRepository<AgentSessionEntity, String> {

    List<AgentSessionEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);

    List<AgentSessionEntity> findByUserIdAndNovelIdOrderByUpdatedAtDesc(Long userId, String novelId);
}
