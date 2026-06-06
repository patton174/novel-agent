package com.novel.agent.content.repository;

import com.novel.agent.content.entity.CrawlCatalogNovelEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrawlCatalogNovelRepository extends JpaRepository<CrawlCatalogNovelEntity, String> {

    Page<CrawlCatalogNovelEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
