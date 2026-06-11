package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.crawl.CrawlJobStatus;
import cn.novelstudio.module.content.entity.CrawlJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface CrawlJobRepository extends JpaRepository<CrawlJobEntity, String> {

    Page<CrawlJobEntity> findByStatusOrderByUpdatedAtDesc(CrawlJobStatus status, Pageable pageable);

    Page<CrawlJobEntity> findAllByOrderByUpdatedAtDesc(Pageable pageable);

    long countByStatus(CrawlJobStatus status);

    long countByStatusIn(Collection<CrawlJobStatus> statuses);

    @Query("""
        SELECT j FROM CrawlJobEntity j
        WHERE j.chaptersTotal IS NOT NULL
          AND j.chaptersDone < j.chaptersTotal
          AND j.status <> cn.novelstudio.module.content.crawl.CrawlJobStatus.CANCELLED
        ORDER BY j.updatedAt DESC
        """)
    List<CrawlJobEntity> findIncompleteJobs(Pageable pageable);

    List<CrawlJobEntity> findByCatalogNovelIdOrderByUpdatedAtDesc(String catalogNovelId);
}
