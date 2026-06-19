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

    @Value("${agent.runtime.proxy-internal-url:}")
    private String proxyInternalUrl;

    @Value("${agent.runtime.proxy-instance-id:}")
    private String proxyInstanceId;

    @Value("${agent.billing.enabled:true}")
    private boolean billingEnabled;

    @Value("${agent.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    @Value("${agent.runtime.warmup-enabled:true}")
    private boolean warmupEnabled;

    @Value("${agent.runtime.warmup-redis-ping:true}")
    private boolean warmupRedisPing;

    @Value("${agent.runtime.warmup-python-ping:true}")
    private boolean warmupPythonPing;

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

    public boolean warmupEnabled() {
        return warmupEnabled;
    }

    public boolean warmupRedisPing() {
        return warmupRedisPing;
    }

    public boolean warmupPythonPing() {
        return warmupPythonPing;
    }
}
