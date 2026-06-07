package com.novel.agent.content.service.crawl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.content.crawl.CrawlJobStatus;
import com.novel.agent.content.repository.CrawlJobRepository;
import com.novel.agent.content.service.crawl.dto.CrawlOrchestratorStateDTO;
import com.novel.agent.content.service.crawl.dto.OrchestratorDecisionDTO;
import com.novel.agent.content.service.crawl.dto.OrchestratorDecisionsDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlOrchestratorStateService {

    public static final int MAX_CONCURRENT_JOBS = 3;

    private static final Set<CrawlJobStatus> ACTIVE_JOB_STATUSES = Set.of(
        CrawlJobStatus.RUNNING,
        CrawlJobStatus.PAUSED
    );

    private static final String KEY = "crawl:orchestrator:state";
    private static final String DECISIONS_KEY = "crawl:orchestrator:decisions";
    private static final String DECISION_SEQ_KEY = "crawl:orchestrator:decision_seq";
    private static final int MAX_DECISIONS = 500;
    private static final Duration TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final CrawlJobRepository crawlJobRepository;

    public CrawlOrchestratorStateDTO getState() {
        String raw = redisTemplate.opsForValue().get(KEY);
        OrchestratorState state = parse(raw);
        int running = (int) crawlJobRepository.countByStatusIn(ACTIVE_JOB_STATUSES);
        return new CrawlOrchestratorStateDTO(
            state.goal(),
            state.status(),
            running,
            MAX_CONCURRENT_JOBS,
            state.lastDecision(),
            state.updatedAt(),
            null,
            null
        );
    }

    public CrawlOrchestratorStateDTO setGoal(String goal) {
        return setGoal(goal, true);
    }

    private CrawlOrchestratorStateDTO setGoal(String goal, boolean logDecision) {
        long now = System.currentTimeMillis();
        String trimmed = goal == null ? "" : goal.trim();
        OrchestratorState state = new OrchestratorState(
            trimmed,
            trimmed.isBlank() ? "SLEEPING" : "RUNNING",
            "",
            now
        );
        save(state);
        if (logDecision) {
            appendDecision("目标已设定：" + (trimmed.isBlank() ? "（空）" : trimmed));
        }
        return getState();
    }

    public CrawlOrchestratorStateDTO clearGoal() {
        clearDecisions();
        return setGoal("", false);
    }

    public void clearDecisions() {
        redisTemplate.delete(DECISIONS_KEY);
        redisTemplate.delete(DECISION_SEQ_KEY);
    }

    public CrawlOrchestratorStateDTO wake() {
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        if (state.goal() == null || state.goal().isBlank()) {
            return getState();
        }
        appendDecision("手动唤醒主编排");
        OrchestratorState next = new OrchestratorState(state.goal(), "RUNNING", state.lastDecision(), System.currentTimeMillis());
        save(next);
        return getState();
    }

    public void recordDecision(String decision) {
        String msg = decision == null ? "" : decision.trim();
        appendDecision(msg);
        OrchestratorState state = parse(redisTemplate.opsForValue().get(KEY));
        OrchestratorState next = new OrchestratorState(
            state.goal(),
            state.status(),
            msg.length() > 200 ? msg.substring(0, 200) : msg,
            System.currentTimeMillis()
        );
        save(next);
    }

    public OrchestratorDecisionsDTO listDecisions(long afterSeq, int limit) {
        int size = Math.max(1, Math.min(limit, 200));
        Long maxSeq = redisTemplate.opsForValue().increment(DECISION_SEQ_KEY, 0);
        long currentMax = maxSeq == null ? 0 : maxSeq;
        if (currentMax <= afterSeq) {
            return new OrchestratorDecisionsDTO(List.of(), currentMax);
        }
        List<String> raw = redisTemplate.opsForList().range(DECISIONS_KEY, 0, MAX_DECISIONS - 1);
        if (raw == null || raw.isEmpty()) {
            return new OrchestratorDecisionsDTO(List.of(), currentMax);
        }
        List<OrchestratorDecisionDTO> out = new ArrayList<>();
        for (String line : raw) {
            OrchestratorDecisionDTO dto = parseDecision(line);
            if (dto != null && dto.seq() > afterSeq) {
                out.add(dto);
            }
        }
        Collections.reverse(out);
        if (out.size() > size) {
            out = out.subList(out.size() - size, out.size());
        }
        return new OrchestratorDecisionsDTO(out, currentMax);
    }

    private void appendDecision(String message) {
        if (message == null || message.isBlank()) {
            return;
        }
        long seq = redisTemplate.opsForValue().increment(DECISION_SEQ_KEY);
        long ts = System.currentTimeMillis();
        try {
            String entry = objectMapper.writeValueAsString(Map.of("seq", seq, "ts", ts, "message", message));
            redisTemplate.opsForList().leftPush(DECISIONS_KEY, entry);
            redisTemplate.opsForList().trim(DECISIONS_KEY, 0, MAX_DECISIONS - 1);
            redisTemplate.expire(DECISIONS_KEY, TTL);
            redisTemplate.expire(DECISION_SEQ_KEY, TTL);
        } catch (JsonProcessingException e) {
            log.warn("orchestrator decision serialize failed: {}", e.getMessage());
        }
    }

    private OrchestratorDecisionDTO parseDecision(String raw) {
        try {
            Map<String, Object> map = objectMapper.readValue(raw, new TypeReference<>() {});
            long seq = ((Number) map.getOrDefault("seq", 0L)).longValue();
            long ts = ((Number) map.getOrDefault("ts", 0L)).longValue();
            String message = String.valueOf(map.getOrDefault("message", ""));
            return new OrchestratorDecisionDTO(seq, ts, message);
        } catch (Exception e) {
            return null;
        }
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
