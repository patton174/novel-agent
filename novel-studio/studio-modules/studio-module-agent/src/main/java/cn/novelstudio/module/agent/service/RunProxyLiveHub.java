package cn.novelstudio.module.agent.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.function.Consumer;

/**
 * Owner-pod local fanout: reconnecting browsers attach here while Python SSE keeps running.
 */
@Component
public class RunProxyLiveHub {

    private final Map<String, Set<Consumer<String>>> sinks = new ConcurrentHashMap<>();
    private final Map<String, Boolean> terminal = new ConcurrentHashMap<>();

    public void attach(String runId, Consumer<String> sink) {
        if (runId == null || runId.isBlank() || sink == null) {
            return;
        }
        if (Boolean.TRUE.equals(terminal.get(runId))) {
            return;
        }
        sinks.computeIfAbsent(runId, ignored -> new CopyOnWriteArraySet<>()).add(sink);
    }

    public void detach(String runId, Consumer<String> sink) {
        if (runId == null || sink == null) {
            return;
        }
        Set<Consumer<String>> bucket = sinks.get(runId);
        if (bucket != null) {
            bucket.remove(sink);
            if (bucket.isEmpty()) {
                sinks.remove(runId, bucket);
            }
        }
    }

    public void publish(String runId, String frame) {
        if (runId == null || runId.isBlank() || frame == null || frame.isBlank()) {
            return;
        }
        if (Boolean.TRUE.equals(terminal.get(runId))) {
            return;
        }
        Set<Consumer<String>> bucket = sinks.get(runId);
        if (bucket == null || bucket.isEmpty()) {
            if (frame.startsWith("event: stream-end")) {
                markTerminal(runId);
            }
            return;
        }
        for (Consumer<String> sink : bucket) {
            try {
                sink.accept(frame);
            } catch (Exception ignored) {
                // detached sink
            }
        }
        if (frame.startsWith("event: stream-end")) {
            markTerminal(runId);
        }
    }

    public void complete(String runId) {
        markTerminal(runId);
    }

    public boolean hasAttachedClients(String runId) {
        Set<Consumer<String>> bucket = sinks.get(runId);
        return bucket != null && !bucket.isEmpty();
    }

    private void markTerminal(String runId) {
        terminal.put(runId, Boolean.TRUE);
        sinks.remove(runId);
    }
}
