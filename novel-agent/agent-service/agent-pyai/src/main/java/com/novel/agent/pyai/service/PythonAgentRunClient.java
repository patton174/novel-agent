package com.novel.agent.pyai.service;

import com.novel.agent.pyai.dto.agent.PythonAgentRunRequest;
import reactor.core.publisher.Flux;

public interface PythonAgentRunClient {

    Flux<String> runStream(PythonAgentRunRequest request);

    void submitInteraction(String runId, java.util.Map<String, Object> payload);

    void abortRun(String runId);
}
