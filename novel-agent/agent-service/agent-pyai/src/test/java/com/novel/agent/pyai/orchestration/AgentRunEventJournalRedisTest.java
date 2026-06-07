package com.novel.agent.pyai.orchestration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Integration test against a local Redis (default 127.0.0.1:6379).
 * Skipped automatically when Redis is unreachable.
 */
class AgentRunEventJournalRedisTest {

    private LettuceConnectionFactory factory;
    private StringRedisTemplate redisTemplate;
    private AgentRunEventJournal journal;

    @BeforeEach
    void setUp() {
        factory = new LettuceConnectionFactory("127.0.0.1", 6379);
        factory.afterPropertiesSet();
        redisTemplate = new StringRedisTemplate(factory);
        redisTemplate.afterPropertiesSet();
        assumeTrue(ping(redisTemplate), "local Redis not available on 127.0.0.1:6379");
        journal = new AgentRunEventJournal(redisTemplate);
        journal.completeRun("r1");
    }

    @AfterEach
    void tearDown() {
        if (journal != null) {
            journal.completeRun("r1");
        }
        if (factory != null) {
            factory.destroy();
        }
    }

    @Test
    void appendAndReplay() {
        journal.beginRun("r1", 1L, "s1");
        journal.append("r1", "{\"e\":1}");
        journal.append("r1", "{\"e\":2}");

        List<String> replay = journal.replay("r1");
        assertEquals(List.of("{\"e\":1}", "{\"e\":2}"), replay);
        assertEquals("r1", journal.activeRunId(1L, "s1"));

        journal.completeRun("r1");
        assertEquals(List.of(), journal.replay("r1"));
        assertNull(journal.activeRunId(1L, "s1"));
    }

    private static boolean ping(StringRedisTemplate template) {
        try {
            RedisConnectionFactory connectionFactory = template.getConnectionFactory();
            if (connectionFactory == null) {
                return false;
            }
            String pong = connectionFactory.getConnection().ping();
            return "PONG".equalsIgnoreCase(pong);
        } catch (Exception ex) {
            return false;
        }
    }
}
