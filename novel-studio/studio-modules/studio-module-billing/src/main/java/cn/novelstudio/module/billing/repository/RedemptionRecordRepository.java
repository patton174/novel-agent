package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.RedemptionRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RedemptionRecordRepository extends JpaRepository<RedemptionRecordEntity, Long> {

    boolean existsByCodeIdAndUserId(String codeId, Long userId);
}
