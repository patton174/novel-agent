package com.novel.agent.pyai.service;

import com.novel.agent.pyai.orchestration.AgentRunEventJournal;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AgentStatusHub {
    private final Map<String, Sinks.Many<String>> channels = new ConcurrentHashMap<>();
    private final AgentRunEventJournal eventJournal;

    public AgentStatusHub(AgentRunEventJournal eventJournal) {
        this.eventJournal = eventJournal;
    }

    public Flux<String> subscribe(Long userId, String sessionId) {
        String key = key(userId, sessionId);
        Sinks.Many<String> sink = channels.computeIfAbsent(
            key,
            k -> Sinks.many().multicast().directBestEffort()
        );
        String activeRunId = eventJournal.activeRunId(userId, sessionId);
        List<String> replay = activeRunId == null ? List.of() : eventJournal.replay(activeRunId);
        Flux<String> replayFlux = Flux.fromIterable(replay);
        return Flux.concat(replayFlux, sink.asFlux());
    }

    public void publish(Long userId, String sessionId, String payloadJson) {
        if (userId == null || sessionId == null || sessionId.isBlank() || payloadJson == null) {
            return;
        }
        String key = key(userId, sessionId);
        Sinks.Many<String> sink = channels.get(key);
        if (sink != null) {
            sink.tryEmitNext(payloadJson);
        }
    }

    private String key(Long userId, String sessionId) {
        return userId + "::" + sessionId;
    }
}
