package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgIngestErrorEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KgIngestErrorRepository extends JpaRepository<KgIngestErrorEntity, Long> {

    long countByNovelId(String novelId);

    Page<KgIngestErrorEntity> findByNovelIdOrderByCreatedAtDesc(String novelId, Pageable pageable);
}
