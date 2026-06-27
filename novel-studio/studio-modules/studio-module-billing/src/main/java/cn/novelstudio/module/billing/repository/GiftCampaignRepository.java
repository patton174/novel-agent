package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.GiftCampaignEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GiftCampaignRepository extends JpaRepository<GiftCampaignEntity, Long> {

    List<GiftCampaignEntity> findAllByOrderByCreatedAtDesc();
}
