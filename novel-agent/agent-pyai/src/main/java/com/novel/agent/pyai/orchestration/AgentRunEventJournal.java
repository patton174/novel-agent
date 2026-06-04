package com.novel.agent.pyai.orchestration;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory event log for host-mode runs: replay after SSE disconnect / status WS attach.
 */
@Component
public class AgentRunEventJournal {

    private static final int MAX_EVENTS_PER_RUN = 8_000;

    private static final class RunLog {
        final Long userId;
        final String sessionId;
        final List<String> payloadJsonLines = new ArrayList<>();

        RunLog(Long userId, String sessionId) {
            this.userId = userId;
            this.sessionId = sessionId;
        }
    }

    private final Map<String, RunLog> byRunId = new ConcurrentHashMap<>();
    private final Map<String, String> activeRunBySession = new ConcurrentHashMap<>();

    public void beginRun(String runId, Long userId, String sessionId) {
        if (runId == null || runId.isBlank() || sessionId == null || sessionId.isBlank()) {
            return;
        }
        RunLog log = new RunLog(userId, sessionId);
        byRunId.put(runId, log);
        if (userId != null) {
            activeRunBySession.put(sessionKey(userId, sessionId), runId);
        }
    }

    public void append(String runId, String payloadJson) {
        if (runId == null || runId.isBlank() || payloadJson == null || payloadJson.isBlank()) {
            return;
        }
        RunLog log = byRunId.get(runId);
        if (log == null) {
            return;
        }
        synchronized (log.payloadJsonLines) {
            if (log.payloadJsonLines.size() >= MAX_EVENTS_PER_RUN) {
                return;
            }
            log.payloadJsonLines.add(payloadJson);
        }
    }

    public List<String> replay(String runId) {
        RunLog log = byRunId.get(runId);
        if (log == null) {
            return List.of();
        }
        synchronized (log.payloadJsonLines) {
            return List.copyOf(log.payloadJsonLines);
        }
    }

    public String activeRunId(Long userId, String sessionId) {
        if (userId == null || sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return activeRunBySession.get(sessionKey(userId, sessionId));
    }

    public void completeRun(String runId) {
        if (runId == null || runId.isBlank()) {
            return;
        }
        RunLog log = byRunId.remove(runId);
        if (log == null) {
            return;
        }
        if (log.userId != null && log.sessionId != null) {
            activeRunBySession.remove(sessionKey(log.userId, log.sessionId), runId);
        }
    }

    private static String sessionKey(Long userId, String sessionId) {
        return userId + "::" + sessionId;
    }
}
