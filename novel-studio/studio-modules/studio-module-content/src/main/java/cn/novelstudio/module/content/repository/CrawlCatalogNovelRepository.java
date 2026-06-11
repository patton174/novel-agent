package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlCatalogNovelEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CrawlCatalogNovelRepository extends JpaRepository<CrawlCatalogNovelEntity, String> {

    Page<CrawlCatalogNovelEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    @Query("""
        SELECT n FROM CrawlCatalogNovelEntity n
        WHERE n.coverUrl IS NULL OR n.coverUrl = ''
        ORDER BY n.updatedAt DESC
        """)
    Page<CrawlCatalogNovelEntity> findMissingCover(Pageable pageable);
}
