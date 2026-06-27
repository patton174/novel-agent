package cn.novelstudio.module.auth.repository;

import cn.novelstudio.module.auth.entity.InviteRedemptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InviteRedemptionRepository extends JpaRepository<InviteRedemptionEntity, Long> {

    List<InviteRedemptionEntity> findByInviteCodeIdOrderByRedeemedAtDesc(long inviteCodeId);
}
