package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.entity.ChapterEntity;
import cn.novelstudio.module.content.entity.NovelEntity;
import cn.novelstudio.module.content.repository.ChapterRepository;
import cn.novelstudio.module.content.repository.NovelRepository;
import cn.novelstudio.module.content.repository.agent.AgentRunRepository;
import cn.novelstudio.module.content.service.auth.resp.AuthDashboardActivityDayResp;
import cn.novelstudio.module.content.service.auth.resp.AuthDashboardActivityResp;
import cn.novelstudio.module.content.service.auth.resp.AuthDashboardSummaryResp;
import cn.novelstudio.module.content.service.auth.resp.AuthRecentNovelResp;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import cn.novelstudio.kernel.tools.DateParseSupport;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthDashboardBiz extends BaseBiz {

    private static final int RECENT_NOVEL_LIMIT = 6;
    private static final int DEFAULT_ACTIVITY_DAYS = 365;
    private static final int MAX_ACTIVITY_DAYS = 365;

    private final NovelRepository novelRepository;
    private final ChapterRepository chapterRepository;
    private final AgentRunRepository agentRunRepository;

    public Result<AuthDashboardSummaryResp> summary(Long userId) {
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        long novelCount = novelRepository.countByUserId(userId);
        long chapterCount = chapterRepository.countByUserId(userId);
        long weeklyWordCount = chapterRepository.sumWordCountByUserIdSince(userId, weekAgo);
        long agentRunCount = countAgentRunsSafe(userId);
        return ok(new AuthDashboardSummaryResp(novelCount, chapterCount, weeklyWordCount, agentRunCount));
    }

    private long countAgentRunsSafe(Long userId) {
        try {
            return agentRunRepository.countByUserId(userId);
        } catch (Exception ex) {
            log.warn("agent run count failed userId={}: {}", userId, ex.getMessage());
            return 0L;
        }
    }

    public Result<List<AuthRecentNovelResp>> recentNovels(Long userId) {
        List<NovelEntity> novels = novelRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return ok(novels.stream()
            .limit(RECENT_NOVEL_LIMIT)
            .map(this::toRecentNovel)
            .toList());
    }

    public Result<AuthDashboardActivityResp> activity(Long userId, int days) {
        int activityDays = normalizeActivityDays(days);
        LocalDate startDate = LocalDate.now(ZoneOffset.UTC).minusDays(activityDays - 1L);
        Instant since = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();

        Map<LocalDate, Long> wordsByDate = toDailyLongMap(
            chapterRepository.sumDailyWordsByUserIdSince(userId, since)
        );
        Map<LocalDate, Long> runsByDate = toDailyLongMap(
            agentRunRepository.countDailyByUserIdSince(userId, since)
        );

        List<AuthDashboardActivityDayResp> series = new ArrayList<>(activityDays);
        long totalWritingWords = 0L;
        long totalAgentRuns = 0L;

        for (int i = 0; i < activityDays; i++) {
            LocalDate date = startDate.plusDays(i);
            long writingWords = wordsByDate.getOrDefault(date, 0L);
            long agentRuns = runsByDate.getOrDefault(date, 0L);
            totalWritingWords += writingWords;
            totalAgentRuns += agentRuns;
            series.add(new AuthDashboardActivityDayResp(
                date.toString(),
                writingWords,
                agentRuns
            ));
        }

        return ok(new AuthDashboardActivityResp(series, totalWritingWords, totalAgentRuns));
    }

    private int normalizeActivityDays(int days) {
        if (days <= 0) {
            return DEFAULT_ACTIVITY_DAYS;
        }
        return Math.min(days, MAX_ACTIVITY_DAYS);
    }

    private Map<LocalDate, Long> toDailyLongMap(List<Object[]> rows) {
        Map<LocalDate, Long> countsByDate = new HashMap<>();
        for (Object[] row : rows) {
            LocalDate date = DateParseSupport.toLocalDateUtc(row[0]);
            long count = ((Number) row[1]).longValue();
            countsByDate.put(date, count);
        }
        return countsByDate;
    }

    private AuthRecentNovelResp toRecentNovel(NovelEntity novel) {
        String lastChapterId = chapterRepository.findFirstByNovelIdOrderByUpdatedAtDesc(novel.getId())
            .map(ChapterEntity::getId)
            .orElse(null);
        return new AuthRecentNovelResp(
            novel.getId(),
            novel.getTitle(),
            lastChapterId,
            novel.getCoverUrl(),
            novel.getUpdatedAt().toEpochMilli()
        );
    }
}
