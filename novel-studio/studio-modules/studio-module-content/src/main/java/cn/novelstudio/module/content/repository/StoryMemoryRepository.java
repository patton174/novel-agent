package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.StoryMemoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoryMemoryRepository extends JpaRepository<StoryMemoryEntity, StoryMemoryEntity.StoryMemoryId> {

    Optional<StoryMemoryEntity> findByUserIdAndSessionId(Long userId, String sessionId);
}
