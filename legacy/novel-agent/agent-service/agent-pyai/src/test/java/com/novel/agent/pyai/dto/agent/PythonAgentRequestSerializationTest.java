package com.novel.agent.pyai.dto.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PythonAgentRequestSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldSerializeTraceOptionsWithSnakeCaseFields() throws Exception {
        PythonAgentRequest request = new PythonAgentRequest(
            "run_test",
            "session_test",
            "message_test",
            new PythonAgentRequest.UserContext(1L, List.of("writer")),
            new PythonAgentRequest.InputPayload("hello", "continue"),
            Map.of(),
            new PythonAgentRequest.TraceOptions(true, false, true, false)
        );

        String json = objectMapper.writeValueAsString(request);

        assertTrue(json.contains("\"run_id\":\"run_test\""));
        assertTrue(json.contains("\"emit_think\":true"));
        assertTrue(json.contains("\"emit_tool\":false"));
        assertTrue(json.contains("\"emit_skill\":true"));
        assertTrue(json.contains("\"emit_mcp\":false"));
        assertTrue(json.contains("\"force_think\":false"));
        assertTrue(json.contains("\"think_intensity\":\"medium\""));
        assertFalse(json.contains("emitThink"));
        assertFalse(json.contains("emitTool"));
    }
}
