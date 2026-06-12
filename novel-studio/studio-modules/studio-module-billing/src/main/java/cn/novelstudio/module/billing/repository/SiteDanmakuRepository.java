package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SiteDanmakuRepository extends JpaRepository<SiteDanmakuEntity, Long> {

    List<SiteDanmakuEntity> findTop120ByOrderByCreatedAtDesc();
}
