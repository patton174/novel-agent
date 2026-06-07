package com.novel.agent.content.repository;

import com.novel.agent.content.entity.CrawlCatalogChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrawlCatalogChapterRepository extends JpaRepository<CrawlCatalogChapterEntity, String> {

    List<CrawlCatalogChapterEntity> findByCatalogNovelIdOrderBySortOrderAsc(String catalogNovelId);

    int countByCatalogNovelId(String catalogNovelId);

    void deleteByCatalogNovelId(String catalogNovelId);
}
