package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.dto.agent.PythonAgentRunRequest;
import reactor.core.publisher.Flux;

public interface PythonAgentRunClient {

    Flux<String> runStream(PythonAgentRunRequest request);

    void submitInteraction(String runId, java.util.Map<String, Object> payload);

    void abortRun(String runId);

    void pauseRun(String runId);

    void resumeRun(String runId);
}
