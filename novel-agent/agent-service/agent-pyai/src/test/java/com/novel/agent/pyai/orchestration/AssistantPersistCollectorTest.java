package com.novel.agent.pyai.orchestration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssistantPersistCollectorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void collectsMessageDeltaOnly() {
        AssistantPersistCollector collector = new AssistantPersistCollector();
        collector.onFrame(
            "event: agent-event\ndata: {\"type\":\"message.delta\",\"payload\":{\"text\":\"交付正文\"}}\n\n",
            objectMapper
        );
        collector.onFrame(
            "event: agent-event\ndata: {\"type\":\"tool.completed\",\"payload\":{\"name\":\"Glob\",\"output_summary\":\"1 条路径\"}}\n\n",
            objectMapper
        );
        assertEquals("交付正文", collector.buildSanitized());
    }

    @Test
    void buildPersistedUserMessageFiltersToolAndAskUserLines() {
        AgentRunState state = new AgentRunState(
            1L,
            "session_1",
            "run_1",
            "message_1",
            new com.novel.agent.pyai.dto.agent.AgentStreamRequest(
                "继续写第三章",
                "auto",
                false,
                null,
                "session_1",
                null,
                null,
                null
            ),
            Map.of()
        );
        Map<String, Object> patch = new HashMap<>();
        patch.put(
            "user_interactions",
            List.of(
                Map.of("type", "ask_user", "text", "AskUser：等待你的回复"),
                Map.of("type", "interaction", "text", "Glob：列举 1 条章节"),
                Map.of("type", "interaction", "text", "我的回答：都可以")
            )
        );
        String persisted = state.buildPersistedUserMessage(patch);
        assertTrue(persisted.contains("继续写第三章"));
        assertTrue(persisted.contains("我的回答：都可以"));
        assertFalse(persisted.contains("Glob："));
        assertFalse(persisted.contains("AskUser"));
    }
}
