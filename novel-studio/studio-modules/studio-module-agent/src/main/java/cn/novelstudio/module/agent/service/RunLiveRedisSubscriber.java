package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Map;
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
    private final Map<String, LiveSubscription> subscriptions = new ConcurrentHashMap<>();

    public RunLiveRedisSubscriber(
        RedisMessageListenerContainer listenerContainer,
        AgentRuntimeProperties runtimeProperties,
        AgentStatusHub statusHub,
        RunLiveSseFanout runLiveSseFanout
    ) {
        this.listenerContainer = listenerContainer;
        this.runtimeProperties = runtimeProperties;
        this.statusHub = statusHub;
        this.runLiveSseFanout = runLiveSseFanout;
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
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        if (message.getChannel() == null || message.getBody() == null) {
            return;
        }
        String channel = new String(message.getChannel());
        String runId = channel.substring(channel.lastIndexOf(':') + 1);
        LiveSubscription sub = subscriptions.get(runId);
        if (sub == null) {
            return;
        }
        statusHub.publish(sub.userId(), sub.sessionId(), new String(message.getBody()));
        runLiveSseFanout.onLivePayload(runId, new String(message.getBody()));
    }

    private record LiveSubscription(Long userId, String sessionId) {
    }
}
