package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SiteDanmakuRepository extends JpaRepository<SiteDanmakuEntity, Long> {

    List<SiteDanmakuEntity> findTop120ByOrderByCreatedAtDesc();

    List<SiteDanmakuEntity> findByOrderByCreatedAtDesc(Pageable pageable);

    List<SiteDanmakuEntity> findByIdLessThanOrderByCreatedAtDesc(Long beforeId, Pageable pageable);

    boolean existsByUserId(Long userId);
}
