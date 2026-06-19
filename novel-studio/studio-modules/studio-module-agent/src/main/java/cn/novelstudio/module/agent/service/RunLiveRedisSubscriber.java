package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 订阅 Redis {@code run:live:*}，供断线恢复 / 多实例 fanout（Phase 2）。
 */
@Component
public class RunLiveRedisSubscriber implements MessageListener {

    private static final PatternTopic RUN_LIVE_PATTERN = new PatternTopic("run:live:*");

    private final RedisMessageListenerContainer listenerContainer;
    private final AgentRuntimeProperties runtimeProperties;
    private final AgentStatusHub statusHub;
    private final RunLiveSseFanout runLiveSseFanout;
    private final AgentRunEventJournal eventJournal;
    private final ObjectMapper objectMapper;
    private final Map<String, LiveSubscription> subscriptions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> localEchoPayloads = new ConcurrentHashMap<>();

    public RunLiveRedisSubscriber(
        RedisMessageListenerContainer listenerContainer,
        AgentRuntimeProperties runtimeProperties,
        AgentStatusHub statusHub,
        RunLiveSseFanout runLiveSseFanout,
        AgentRunEventJournal eventJournal,
        ObjectMapper objectMapper
    ) {
        this.listenerContainer = listenerContainer;
        this.runtimeProperties = runtimeProperties;
        this.statusHub = statusHub;
        this.runLiveSseFanout = runLiveSseFanout;
        this.eventJournal = eventJournal;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        if (!runtimeProperties.isPgRunEnabled()) {
            return;
        }
        listenerContainer.addMessageListener(this, RUN_LIVE_PATTERN);
    }

    public void subscribe(Long userId, String sessionId, String runId) {
        if (!runtimeProperties.isPgRunEnabled()) {
            return;
        }
        subscriptions.put(runId, new LiveSubscription(userId, sessionId));
    }

    public void unsubscribe(String runId) {
        subscriptions.remove(runId);
        localEchoPayloads.remove(runId);
    }

    public void onLocalPayload(String runId, String payload) {
        if (runId == null || runId.isBlank() || payload == null || payload.isBlank()) {
            return;
        }
        localEchoPayloads
            .computeIfAbsent(runId, ignored -> ConcurrentHashMap.newKeySet())
            .add(runLiveSseFanout.payloadKey(payload));
        handlePayload(runId, payload);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        if (message.getChannel() == null || message.getBody() == null) {
            return;
        }
        String channel = new String(message.getChannel());
        String runId = channel.substring(channel.lastIndexOf(':') + 1);
        String payload = new String(message.getBody());

        if (consumeLocalEcho(runId, payload)) {
            return;
        }
        handlePayload(runId, payload);
    }

    private void handlePayload(String runId, String payload) {
        Long userId = null;
        String sessionId = null;
        LiveSubscription sub = subscriptions.get(runId);
        if (sub != null) {
            userId = sub.userId();
            sessionId = sub.sessionId();
        } else {
            AgentRunEventJournal.RunMeta meta = eventJournal.readMeta(runId);
            if (meta != null) {
                userId = meta.userId();
                sessionId = meta.sessionId();
            }
        }
        if (userId == null || sessionId == null || sessionId.isBlank()) {
            return;
        }

        boolean delivered = runLiveSseFanout.onLivePayload(runId, payload);
        if (!delivered) {
            return;
        }
        eventJournal.append(runId, payload);
        statusHub.publish(userId, sessionId, payload);
    }

    private boolean consumeLocalEcho(String runId, String payload) {
        Set<String> keys = localEchoPayloads.get(runId);
        if (keys == null || keys.isEmpty()) {
            return false;
        }
        boolean removed = keys.remove(runLiveSseFanout.payloadKey(payload));
        if (keys.isEmpty()) {
            localEchoPayloads.remove(runId, keys);
        }
        return removed;
    }

    private record LiveSubscription(Long userId, String sessionId) {
    }
}
