package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.SiteDanmakuEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SiteDanmakuRepository extends JpaRepository<SiteDanmakuEntity, Long> {

    @Query("""
        SELECT d FROM SiteDanmakuEntity d
        WHERE d.messageEn IS NULL OR TRIM(d.messageEn) = ''
        ORDER BY d.createdAt ASC
        """)
    List<SiteDanmakuEntity> findPendingEnglishTranslation(Pageable pageable);

    List<SiteDanmakuEntity> findTop120ByOrderByCreatedAtDesc();

    List<SiteDanmakuEntity> findByOrderByCreatedAtDesc(Pageable pageable);

    List<SiteDanmakuEntity> findByIdLessThanOrderByCreatedAtDesc(Long beforeId, Pageable pageable);

    boolean existsByUserId(Long userId);
}
