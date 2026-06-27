package cn.novelstudio.module.auth.repository;

import cn.novelstudio.module.auth.entity.InviteCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCodeEntity, Long> {

    Optional<InviteCodeEntity> findByCodeIgnoreCase(String code);

    @Modifying
    @Query("""
        UPDATE InviteCodeEntity e
        SET e.usedCount = e.usedCount + 1
        WHERE e.id = :id
          AND e.status = 'active'
          AND (e.maxUses = 0 OR e.usedCount < e.maxUses)
        """)
    int incrementUsedCountIfAvailable(@Param("id") long id);
}
