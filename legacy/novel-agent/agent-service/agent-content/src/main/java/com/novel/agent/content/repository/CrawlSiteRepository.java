package com.novel.agent.content.repository;

import com.novel.agent.content.entity.CrawlSiteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrawlSiteRepository extends JpaRepository<CrawlSiteEntity, String> {

    List<CrawlSiteEntity> findByEnabledTrueOrderByNameAsc();
}
