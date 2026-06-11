package cn.novelstudio.module.content.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ContentRuntimeProperties {

    @Value("${agent.runtime.pg-session-dual-write:false}")
    private boolean pgSessionDualWrite;

    @Value("${agent.runtime.read-pg-session-first:false}")
    private boolean readPgSessionFirst;

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String internalServiceKey;

    @Value("${agent.runtime.lease-ttl-seconds:900}")
    private long leaseTtlSeconds;

    public boolean isPgSessionDualWrite() {
        return pgSessionDualWrite;
    }

    public boolean isReadPgSessionFirst() {
        return readPgSessionFirst;
    }

    public String internalServiceKey() {
        return internalServiceKey;
    }

    public long leaseTtlSeconds() {
        return leaseTtlSeconds;
    }
}
