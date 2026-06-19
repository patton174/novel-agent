package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.PlanFeatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlanFeatureRepository extends JpaRepository<PlanFeatureEntity, Long> {

    List<PlanFeatureEntity> findByPlanIdAndEnabledTrue(Long planId);

    List<PlanFeatureEntity> findByPlanId(Long planId);

    boolean existsByPlanIdAndFeatureKeyAndEnabledTrue(Long planId, String featureKey);

    void deleteByPlanId(Long planId);

    /** 取某套餐某 feature 启用时的 limit_value（null=不适用/无限）。 */
    @Query("SELECT f.limitValue FROM PlanFeatureEntity f WHERE f.planId = :planId AND f.featureKey = :key AND f.enabled = true")
    Optional<Integer> findLimitValueByPlanAndKey(@Param("planId") Long planId, @Param("key") String key);
}
