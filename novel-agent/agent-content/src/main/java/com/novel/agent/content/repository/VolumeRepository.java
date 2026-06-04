package com.novel.agent.content.repository;

import com.novel.agent.content.entity.VolumeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VolumeRepository extends JpaRepository<VolumeEntity, String> {
    List<VolumeEntity> findByNovelIdOrderBySortOrderAscCreatedAtAsc(String novelId);

    Optional<VolumeEntity> findByIdAndNovelId(String id, String novelId);

    int countByNovelId(String novelId);
}
