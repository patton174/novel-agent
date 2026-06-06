package com.novel.agent.content.repository;

import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.entity.CrawlJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrawlJobRepository extends JpaRepository<CrawlJobEntity, String> {

    Page<CrawlJobEntity> findByStatusOrderByUpdatedAtDesc(CrawlJobStatus status, Pageable pageable);

    Page<CrawlJobEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}
