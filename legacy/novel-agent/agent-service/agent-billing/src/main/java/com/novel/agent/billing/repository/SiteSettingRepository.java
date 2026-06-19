package com.novel.agent.billing.repository;

import com.novel.agent.billing.entity.SiteSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingRepository extends JpaRepository<SiteSettingEntity, String> {
}
