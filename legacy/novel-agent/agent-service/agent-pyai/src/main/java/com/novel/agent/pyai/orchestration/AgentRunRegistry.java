package com.novel.agent.pyai.orchestration;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AgentRunRegistry {

    private final Map<String, AgentRunCoordinator> active = new ConcurrentHashMap<>();

    public void register(AgentRunCoordinator coordinator) {
        active.put(coordinator.getRunId(), coordinator);
    }

    public void unregister(String runId) {
        if (runId != null) {
            active.remove(runId);
        }
    }

    public AgentRunCoordinator get(String runId) {
        return active.get(runId);
    }
}
