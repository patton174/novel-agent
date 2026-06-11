package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.AgentRunCheckpointEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRunCheckpointRepository extends JpaRepository<AgentRunCheckpointEntity, String> {
}
