package com.novel.agent.auth.service.internal;

import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.auth.service.crm.resp.CrmPlatformStatsResp;
import com.novel.agent.auth.service.crm.biz.CrmStatsBiz;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.common.core.tools.DateParseSupport;
import com.novel.agent.feign.auth.dto.FeignTrendPointDto;
import com.novel.agent.feign.auth.dto.FeignUserStatsOverviewDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class InternalUserStatsBiz extends BaseBiz {

    private static final int DEFAULT_TREND_DAYS = 30;
    private static final int MAX_TREND_DAYS = 365;

    private final CrmStatsBiz crmStatsBiz;
    private final AuthUserRepository authUserRepository;

    public FeignUserStatsOverviewDto overview() {
        CrmPlatformStatsResp stats = crmStatsBiz.overview().data();
        return new FeignUserStatsOverviewDto(
            stats.totalUsers(),
            stats.todayRegistrations(),
            stats.activeUsers()
        );
    }

    public List<FeignTrendPointDto> registrationTrends(int days) {
        int trendDays = normalizeTrendDays(days);
        LocalDate startDate = LocalDate.now(ZoneOffset.UTC).minusDays(trendDays - 1L);
        Instant since = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();

        Map<LocalDate, Long> countsByDate = toDailyCountMap(authUserRepository.countDailyRegistrationsSince(since));
        List<FeignTrendPointDto> series = new ArrayList<>(trendDays);
        for (int i = 0; i < trendDays; i++) {
            LocalDate date = startDate.plusDays(i);
            series.add(new FeignTrendPointDto(date, countsByDate.getOrDefault(date, 0L)));
        }
        return series;
    }

    private int normalizeTrendDays(int days) {
        if (days <= 0) {
            return DEFAULT_TREND_DAYS;
        }
        return Math.min(days, MAX_TREND_DAYS);
    }

    private Map<LocalDate, Long> toDailyCountMap(List<Object[]> rows) {
        Map<LocalDate, Long> countsByDate = new HashMap<>();
        for (Object[] row : rows) {
            LocalDate date = DateParseSupport.toLocalDateUtc(row[0]);
            long count = ((Number) row[1]).longValue();
            countsByDate.put(date, count);
        }
        return countsByDate;
    }

}
