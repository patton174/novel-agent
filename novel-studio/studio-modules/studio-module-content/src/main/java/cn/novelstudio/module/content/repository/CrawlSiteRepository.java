package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlSiteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrawlSiteRepository extends JpaRepository<CrawlSiteEntity, String> {

    List<CrawlSiteEntity> findByEnabledTrueOrderByNameAsc();
}
