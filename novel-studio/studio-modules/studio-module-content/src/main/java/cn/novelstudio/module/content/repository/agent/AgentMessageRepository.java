package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AgentMessageRepository extends JpaRepository<AgentMessageEntity, String> {

    List<AgentMessageEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
}
