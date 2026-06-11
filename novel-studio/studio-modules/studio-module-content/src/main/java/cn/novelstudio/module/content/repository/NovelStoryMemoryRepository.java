package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.NovelStoryMemoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NovelStoryMemoryRepository extends JpaRepository<NovelStoryMemoryEntity, NovelStoryMemoryEntity.NovelStoryMemoryId> {

    Optional<NovelStoryMemoryEntity> findByUserIdAndNovelId(Long userId, String novelId);
}
