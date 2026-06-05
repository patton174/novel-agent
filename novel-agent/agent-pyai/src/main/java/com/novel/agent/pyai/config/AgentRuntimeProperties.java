package com.novel.agent.pyai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AgentRuntimeProperties {

    /** legacy | queued — queued 时创建 PG Run + 发 MQ（Worker 尚未接管执行） */
    @Value("${agent.runtime.mode:legacy}")
    private String mode;

    @Value("${agent.runtime.pg-run-enabled:false}")
    private boolean pgRunEnabled;

    @Value("${agent.content.base-url:http://127.0.0.1:8091}")
    private String contentBaseUrl;

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String internalServiceKey;

    public boolean isPgRunEnabled() {
        return pgRunEnabled || "queued".equalsIgnoreCase(mode);
    }

    public String mode() {
        return mode;
    }

    public boolean isQueuedMode() {
        return "queued".equalsIgnoreCase(mode);
    }

    public String contentBaseUrl() {
        return contentBaseUrl;
    }

    public String internalServiceKey() {
        return internalServiceKey;
    }

    @Value("${agent.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    public String pythonBaseUrl() {
        return pythonBaseUrl;
    }
}
