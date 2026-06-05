package com.novel.agent.content.service.auth.biz;

import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.content.entity.ChapterEntity;
import com.novel.agent.content.entity.NovelEntity;
import com.novel.agent.content.repository.ChapterRepository;
import com.novel.agent.content.repository.NovelRepository;
import com.novel.agent.content.repository.agent.AgentRunRepository;
import com.novel.agent.content.service.auth.resp.AuthDashboardSummaryResp;
import com.novel.agent.content.service.auth.resp.AuthRecentNovelResp;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthDashboardBiz extends BaseBiz {

    private static final int RECENT_NOVEL_LIMIT = 6;

    private final NovelRepository novelRepository;
    private final ChapterRepository chapterRepository;
    private final AgentRunRepository agentRunRepository;

    public Result<AuthDashboardSummaryResp> summary(Long userId) {
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        long novelCount = novelRepository.countByUserId(userId);
        long chapterCount = chapterRepository.countByUserId(userId);
        long weeklyWordCount = chapterRepository.sumWordCountByUserIdSince(userId, weekAgo);
        long agentRunCount = agentRunRepository.countByUserId(userId);
        return ok(new AuthDashboardSummaryResp(novelCount, chapterCount, weeklyWordCount, agentRunCount));
    }

    public Result<List<AuthRecentNovelResp>> recentNovels(Long userId) {
        List<NovelEntity> novels = novelRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return ok(novels.stream()
            .limit(RECENT_NOVEL_LIMIT)
            .map(this::toRecentNovel)
            .toList());
    }

    private AuthRecentNovelResp toRecentNovel(NovelEntity novel) {
        String lastChapterId = chapterRepository.findFirstByNovelIdOrderByUpdatedAtDesc(novel.getId())
            .map(ChapterEntity::getId)
            .orElse(null);
        return new AuthRecentNovelResp(
            novel.getId(),
            novel.getTitle(),
            lastChapterId,
            novel.getUpdatedAt()
        );
    }
}
