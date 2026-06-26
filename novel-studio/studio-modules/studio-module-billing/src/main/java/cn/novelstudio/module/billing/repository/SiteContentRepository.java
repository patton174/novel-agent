package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteContentEntity;
import cn.novelstudio.module.billing.entity.SiteContentId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteContentRepository extends JpaRepository<SiteContentEntity, SiteContentId> {

    Optional<SiteContentEntity> findByIdContentKeyAndIdLocale(String contentKey, String locale);

    List<SiteContentEntity> findAllByOrderByIdContentKeyAscIdLocaleAsc();
}
