package cn.novelstudio.platform.scheduling;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

/** 订阅 {@link SchedulingRedisKeys#JOBS_RELOAD_CHANNEL}，触发 {@link StudioJobRegistrar#reload()}。 */
@Component
@RequiredArgsConstructor
public class StudioJobReloadListener implements MessageListener {

    private static final Logger log = LoggerFactory.getLogger(StudioJobReloadListener.class);
    private static final ChannelTopic RELOAD_TOPIC = new ChannelTopic(SchedulingRedisKeys.JOBS_RELOAD_CHANNEL);

    private final RedisMessageListenerContainer listenerContainer;
    private final StudioJobRegistrar registrar;

    @PostConstruct
    void init() {
        listenerContainer.addMessageListener(this, RELOAD_TOPIC);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        log.info("received scheduled jobs reload signal");
        registrar.reload();
    }
}
