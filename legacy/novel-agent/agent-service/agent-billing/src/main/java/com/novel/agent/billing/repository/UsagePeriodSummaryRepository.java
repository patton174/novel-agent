package com.novel.agent.billing.repository;

import com.novel.agent.billing.entity.UsagePeriodSummaryEntity;
import com.novel.agent.billing.entity.UsagePeriodSummaryId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UsagePeriodSummaryRepository extends JpaRepository<UsagePeriodSummaryEntity, UsagePeriodSummaryId> {

    @Query("""
        SELECT COALESCE(SUM(s.tokensUsed), 0), COALESCE(SUM(s.costMicros), 0)
        FROM UsagePeriodSummaryEntity s
        WHERE s.periodYyyyMm = :period
        """)
    Object[] sumByPeriod(@Param("period") String period);
}
