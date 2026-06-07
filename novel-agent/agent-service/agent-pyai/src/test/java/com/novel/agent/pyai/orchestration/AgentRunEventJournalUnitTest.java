package com.novel.agent.pyai.orchestration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.StreamOperations;

import java.time.Duration;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentRunEventJournalUnitTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private StreamOperations<String, Object, Object> streamOperations;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private AgentRunEventJournal journal;

    @BeforeEach
    void setUp() {
        journal = new AgentRunEventJournal(redisTemplate);
    }

    @Test
    @SuppressWarnings("unchecked")
    void append_writesPayloadToRedisStream() {
        when(redisTemplate.opsForStream()).thenReturn((StreamOperations) streamOperations);

        journal.append("r1", "{\"e\":1}");

        ArgumentCaptor<MapRecord<String, Object, Object>> captor = ArgumentCaptor.forClass(MapRecord.class);
        verify(streamOperations).add(captor.capture());
        assertEquals("{\"e\":1}", String.valueOf(captor.getValue().getValue().get("payload")));
        verify(redisTemplate).expire(eq(AgentRunEventJournal.streamKey("r1")), eq(Duration.ofHours(24)));
    }

    @Test
    @SuppressWarnings("unchecked")
    void beginRun_setsActiveMapping() {
        when(redisTemplate.opsForHash()).thenReturn((HashOperations) hashOperations);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        journal.beginRun("r1", 9L, "s1");

        verify(valueOperations).set(
            eq(AgentRunEventJournal.activeKey(9L, "s1")),
            eq("r1"),
            eq(Duration.ofHours(24))
        );
    }
}
