package cn.novelstudio.module.agent.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AgentRuntimeProperties {

    /** legacy | queued — queued 时创建 PG Run + 发 MQ */
    @Value("${agent.runtime.mode:legacy}")
    private String mode;

    @Value("${agent.runtime.pg-run-enabled:false}")
    private boolean pgRunEnabled;

    @Value("${agent.billing.enabled:true}")
    private boolean billingEnabled;

    @Value("${agent.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    public boolean isPgRunEnabled() {
        return pgRunEnabled || "queued".equalsIgnoreCase(mode);
    }

    public String mode() {
        return mode;
    }

    public boolean isQueuedMode() {
        return "queued".equalsIgnoreCase(mode);
    }

    public boolean billingEnabled() {
        return billingEnabled;
    }

    public String pythonBaseUrl() {
        return pythonBaseUrl;
    }
}
