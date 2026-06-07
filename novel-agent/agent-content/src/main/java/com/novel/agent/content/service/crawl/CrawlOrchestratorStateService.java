package com.novel.agent.content.service.crawl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.service.crawl.dto.CrawlOrchestratorStateDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlOrchestratorStateService {

    public static final int MAX_CONCURRENT_JOBS = 10;

    private static final String KEY = "crawl:orchestrator:state";
    private static final Duration TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final CrawlJobRepository crawlJobRepository;

    public CrawlOrchestratorStateDTO getState() {
        String raw = redisTemplate.opsForValue().get(KEY);
        OrchestratorState state = parse(raw);
        int running = (int) crawlJobRepository.countByStatus(CrawlJobStatus.RUNNING);
        return new CrawlOrchestratorStateDTO(
            state.goal(),
            state.status(),
            running,
            MAX_CONCURRENT_JOBS,
            state.lastDecision(),
            state.updatedAt()
        );
    }

    public CrawlOrchestratorStateDTO setGoal(String goal) {
        long now = System.currentTimeMillis();
        OrchestratorState state = new OrchestratorState(
            goal == null ? "" : goal.trim(),
            goal == null || goal.isBlank() ? "SLEEPING" : "RUNNING",
            "",
            now
        );
        save(state);
        return getState();
    }

    public CrawlOrchestratorStateDTO clearGoal() {
        return setGoal("");
    }

    public CrawlOrchestratorStateDTO wake() {
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        if (state.goal() == null || state.goal().isBlank()) {
            return getState();
        }
        OrchestratorState next = new OrchestratorState(state.goal(), "RUNNING", state.lastDecision(), System.currentTimeMillis());
        save(next);
        return getState();
    }

    public void recordDecision(String decision) {
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        OrchestratorState next = new OrchestratorState(
            state.goal(),
            state.status(),
            decision == null ? "" : decision.trim(),
            System.currentTimeMillis()
        );
        save(next);
    }

    public void markSleeping() {
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        OrchestratorState next = new OrchestratorState(state.goal(), "SLEEPING", state.lastDecision(), System.currentTimeMillis());
        save(next);
    }

    public void markRunning() {
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        OrchestratorState next = new OrchestratorState(state.goal(), "RUNNING", state.lastDecision(), System.currentTimeMillis());
        save(next);
    }

    private void save(OrchestratorState state) {
        try {
            redisTemplate.opsForValue().set(KEY, objectMapper.writeValueAsString(state), TTL);
        } catch (JsonProcessingException e) {
            log.warn("orchestrator state serialize failed: {}", e.getMessage());
        }
    }

    private OrchestratorState parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return new OrchestratorState("", "SLEEPING", "", System.currentTimeMillis());
        }
        try {
            return objectMapper.readValue(raw, OrchestratorState.class);
        } catch (JsonProcessingException e) {
            log.warn("orchestrator state parse failed: {}", e.getMessage());
            return new OrchestratorState("", "SLEEPING", "", System.currentTimeMillis());
        }
    }

    private record OrchestratorState(String goal, String status, String lastDecision, long updatedAt) {}
}
