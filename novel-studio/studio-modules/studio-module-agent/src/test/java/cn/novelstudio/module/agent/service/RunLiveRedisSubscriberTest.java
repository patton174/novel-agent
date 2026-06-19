package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RunLiveRedisSubscriberTest {

    @Test
    void localPayloadSkipsRedisEchoOnSameJvm() {
        AgentRuntimeProperties runtimeProperties = mock(AgentRuntimeProperties.class);
        when(runtimeProperties.isPgRunEnabled()).thenReturn(true);
        AgentStatusHub statusHub = mock(AgentStatusHub.class);
        AgentRunEventJournal eventJournal = mock(AgentRunEventJournal.class);
        RunLiveSseFanout fanout = new RunLiveSseFanout(new ObjectMapper());
        RunLiveRedisSubscriber subscriber = new RunLiveRedisSubscriber(
            mock(RedisMessageListenerContainer.class),
            runtimeProperties,
            statusHub,
            fanout,
            eventJournal,
            new ObjectMapper()
        );
        List<String> frames = new ArrayList<>();
        String payload = """
            {"event_id":"evt_1","type":"message.delta","sequence":3,"payload":{"text":"hi"}}
            """.trim();

        subscriber.subscribe(7L, "session_1", "run_1");
        fanout.register("run_1", frames::add);
        subscriber.onLocalPayload("run_1", payload);
        subscriber.onMessage(message("run:live:run_1", payload), null);

        verify(eventJournal, times(1)).append("run_1", payload);
        verify(statusHub, times(1)).publish(7L, "session_1", payload);
        org.junit.jupiter.api.Assertions.assertEquals(1, frames.size());
    }

    private Message message(String channel, String body) {
        Message message = mock(Message.class);
        org.mockito.Mockito.when(message.getChannel()).thenReturn(channel.getBytes(StandardCharsets.UTF_8));
        org.mockito.Mockito.when(message.getBody()).thenReturn(body.getBytes(StandardCharsets.UTF_8));
        return message;
    }
}
