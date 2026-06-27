package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RedemptionCodeRepository extends JpaRepository<RedemptionCodeEntity, String> {

    Optional<RedemptionCodeEntity> findByCode(String code);

    Page<RedemptionCodeEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** 原子占用一个使用名额（used_count < max_uses 才 +1）。返回受影响行数。 */
    @Modifying
    @Query("""
        UPDATE RedemptionCodeEntity c
        SET c.usedCount = c.usedCount + 1
        WHERE c.id = :id AND c.usedCount < c.maxUses
        """)
    int consumeOne(String id);
}
