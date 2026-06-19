package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.UUID;

/**
 * Stable identity for this novel-studio JVM in a multi-instance cluster.
 */
@Component
public class RunProxyIdentity {

    private final String instanceId;
    private final String internalBaseUrl;

    public RunProxyIdentity(
        AgentRuntimeProperties runtimeProperties,
        @Value("${server.port:8080}") int serverPort,
        @Value("${agent.runtime.proxy-instance-id:}") String configuredInstanceId,
        @Value("${agent.runtime.proxy-internal-url:}") String configuredInternalUrl
    ) {
        this.instanceId = resolveInstanceId(configuredInstanceId);
        this.internalBaseUrl = resolveInternalUrl(configuredInternalUrl, runtimeProperties, serverPort);
    }

    public String instanceId() {
        return instanceId;
    }

    public String internalBaseUrl() {
        return internalBaseUrl;
    }

    public boolean isLocal(String ownerInstanceId) {
        return instanceId.equals(ownerInstanceId);
    }

    private static String resolveInstanceId(String configured) {
        if (configured != null && !configured.isBlank()) {
            return configured.trim();
        }
        String host = "unknown";
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (Exception ignored) {
            // keep default
        }
        return host + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private static String resolveInternalUrl(
        String configured,
        AgentRuntimeProperties runtimeProperties,
        int serverPort
    ) {
        if (configured != null && !configured.isBlank()) {
            return trimTrailingSlash(configured.trim());
        }
        String fromEnv = System.getenv("AGENT_PROXY_INTERNAL_URL");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return trimTrailingSlash(fromEnv.trim());
        }
        return "http://127.0.0.1:" + serverPort;
    }

    private static String trimTrailingSlash(String url) {
        if (url.endsWith("/")) {
            return url.substring(0, url.length() - 1);
        }
        return url;
    }
}
