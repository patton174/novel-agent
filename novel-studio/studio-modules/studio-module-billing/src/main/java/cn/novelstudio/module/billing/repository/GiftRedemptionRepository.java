package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.GiftRedemptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GiftRedemptionRepository extends JpaRepository<GiftRedemptionEntity, Long> {

    List<GiftRedemptionEntity> findByCampaignIdOrderByCreatedAtDesc(Long campaignId);

    Optional<GiftRedemptionEntity> findByCode(String code);

    boolean existsByCampaignIdAndUserIdAndStatus(Long campaignId, Long userId, String status);

    int countByCampaignIdAndStatus(Long campaignId, String status);
}
