package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteContentRepository extends JpaRepository<SiteContentEntity, String> {

    List<SiteContentEntity> findAllByOrderByContentKeyAsc();
}
