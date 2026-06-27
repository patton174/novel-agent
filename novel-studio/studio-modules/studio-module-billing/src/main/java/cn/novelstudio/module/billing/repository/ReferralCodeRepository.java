package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.ReferralCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReferralCodeRepository extends JpaRepository<ReferralCodeEntity, Long> {

    Optional<ReferralCodeEntity> findByCodeIgnoreCase(String code);

    Optional<ReferralCodeEntity> findByUserId(long userId);

    boolean existsByCodeIgnoreCase(String code);
}
