package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.PlanFeatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanFeatureRepository extends JpaRepository<PlanFeatureEntity, Long> {

    List<PlanFeatureEntity> findByPlanIdAndEnabledTrue(Long planId);

    List<PlanFeatureEntity> findByPlanId(Long planId);

    boolean existsByPlanIdAndFeatureKeyAndEnabledTrue(Long planId, String featureKey);

    void deleteByPlanId(Long planId);
}
