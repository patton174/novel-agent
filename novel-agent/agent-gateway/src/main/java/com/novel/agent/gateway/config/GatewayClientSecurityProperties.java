package com.novel.agent.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GatewayClientSecurityProperties {

    @Value("${auth.client-security.enabled:false}")
    private boolean enabled;

    @Value("${auth.client-security.aes-required:false}")
    private boolean aesRequired;

    @Value("${auth.client-security.encrypt-stream:false}")
    private boolean encryptStream;

    @Value("${auth.client-security.replay-window-seconds:120}")
    private long replayWindowSeconds;

    @Value("${auth.client-security.enforce-csrf:false}")
    private boolean enforceCsrf;

    @Value("${auth.client-security.heartbeat-max-silence-seconds:180}")
    private long heartbeatMaxSilenceSeconds;

    @Value("${auth.client-security.fingerprint-tolerance:0.15}")
    private double fingerprintTolerance;

    @Value("${auth.client-security.enforce-fingerprint:false}")
    private boolean enforceFingerprint;

    @Value("${auth.client-security.enforce-heartbeat:false}")
    private boolean enforceHeartbeat;

    public boolean enabled() {
        return enabled;
    }

    public boolean aesRequired() {
        return aesRequired;
    }

    public boolean encryptStream() {
        return encryptStream;
    }

    public long replayWindowSeconds() {
        return replayWindowSeconds;
    }

    public boolean enforceCsrf() {
        return enforceCsrf;
    }

    public long heartbeatMaxSilenceSeconds() {
        return heartbeatMaxSilenceSeconds;
    }

    public double fingerprintTolerance() {
        return fingerprintTolerance;
    }

    public boolean enforceFingerprint() {
        return enforceFingerprint;
    }

    public boolean enforceHeartbeat() {
        return enforceHeartbeat;
    }
}
