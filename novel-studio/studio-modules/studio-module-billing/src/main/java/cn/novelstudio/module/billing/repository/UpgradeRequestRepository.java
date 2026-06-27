package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UpgradeRequestRepository extends JpaRepository<UpgradeRequestEntity, String> {

    Page<UpgradeRequestEntity> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<UpgradeRequestEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<UpgradeRequestEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
}
