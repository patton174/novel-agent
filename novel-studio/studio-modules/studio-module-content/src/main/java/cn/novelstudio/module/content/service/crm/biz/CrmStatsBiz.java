package cn.novelstudio.module.content.service.crm.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.tools.DateParseSupport;
import cn.novelstudio.module.auth.service.internal.InternalUserStatsBiz;
import cn.novelstudio.module.content.repository.ChapterRepository;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.repository.agent.AgentRunRepository;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsOverviewResp;
import cn.novelstudio.module.content.service.crm.resp.CrmStatsTrendResp;
import cn.novelstudio.module.content.service.crm.resp.CrmTrendPointResp;
import cn.novelstudio.module.auth.dto.UserTrendPointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrmStatsBiz extends BaseBiz {

    private static final int DEFAULT_TREND_DAYS = 30;
    private static final int MAX_TREND_DAYS = 365;

    private final NovelRepository novelRepository;
    private final ChapterRepository chapterRepository;
    private final AgentRunRepository agentRunRepository;
    private final InternalUserStatsBiz internalUserStatsBiz;

    public Result<CrmStatsOverviewResp> overview() {
        return ok(new CrmStatsOverviewResp(
            novelRepository.countAll(),
            chapterRepository.countAll(),
            agentRunRepository.countAll()
        ));
    }

    public Result<CrmStatsTrendResp> trends(int days) {
        int trendDays = normalizeTrendDays(days);
        LocalDate startDate = LocalDate.now(ZoneOffset.UTC).minusDays(trendDays - 1L);
        Instant since = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();

        Map<LocalDate, Long> countsByDate = toDailyCountMap(agentRunRepository.countDailySince(since));
        List<CrmTrendPointResp> agentRunTrend = buildDailySeries(startDate, trendDays, countsByDate);

        List<CrmTrendPointResp> registrationTrend = fetchRegistrationTrend(trendDays);

        return ok(new CrmStatsTrendResp(registrationTrend, agentRunTrend));
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

    private List<CrmTrendPointResp> fetchRegistrationTrend(int trendDays) {
        try {
            return internalUserStatsBiz.registrationTrends(trendDays).stream()
                .map(this::toTrendPoint)
                .toList();
        } catch (Exception ex) {
            log.warn("registration trend feign failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private CrmTrendPointResp toTrendPoint(UserTrendPointDto point) {
        return new CrmTrendPointResp(point.date() == null ? "" : point.date().toString(), point.count());
    }

    private List<CrmTrendPointResp> buildDailySeries(
        LocalDate startDate,
        int trendDays,
        Map<LocalDate, Long> countsByDate
    ) {
        List<CrmTrendPointResp> series = new ArrayList<>(trendDays);
        for (int i = 0; i < trendDays; i++) {
            LocalDate date = startDate.plusDays(i);
            series.add(new CrmTrendPointResp(date.toString(), countsByDate.getOrDefault(date, 0L)));
        }
        return series;
    }
}
