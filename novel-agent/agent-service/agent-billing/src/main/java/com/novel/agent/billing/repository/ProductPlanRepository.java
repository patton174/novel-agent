package com.novel.agent.billing.repository;

import com.novel.agent.billing.entity.ProductPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductPlanRepository extends JpaRepository<ProductPlanEntity, Long> {

    Optional<ProductPlanEntity> findByCodeAndIsActiveTrue(String code);

    Optional<ProductPlanEntity> findByCode(String code);

    List<ProductPlanEntity> findByIsActiveTrueOrderBySortOrderAsc();

    List<ProductPlanEntity> findAllByOrderBySortOrderAsc();
}
