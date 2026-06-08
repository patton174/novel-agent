package com.novel.agent.billing.repository;

import com.novel.agent.billing.entity.SiteContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteContentRepository extends JpaRepository<SiteContentEntity, String> {

    List<SiteContentEntity> findAllByOrderByContentKeyAsc();
}
