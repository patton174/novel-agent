package cn.novelstudio.module.content.repository.agent;

import cn.novelstudio.module.content.entity.agent.CrewRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CrewRunRepository extends JpaRepository<CrewRunEntity, UUID> {

    Optional<CrewRunEntity> findFirstByRootRunIdOrderByCreatedAtDesc(String rootRunId);
}
