package com.novel.agent.billing.repository;

import com.novel.agent.billing.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    @Query("""
        SELECT a FROM AuditLogEntity a
        WHERE (:action IS NULL OR :action = '' OR a.action = :action)
          AND (:actorId IS NULL OR a.actorId = :actorId)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLogEntity> search(
        @Param("action") String action,
        @Param("actorId") Long actorId,
        Pageable pageable
    );
}
