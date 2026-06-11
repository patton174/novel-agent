package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingRepository extends JpaRepository<SiteSettingEntity, String> {
}
