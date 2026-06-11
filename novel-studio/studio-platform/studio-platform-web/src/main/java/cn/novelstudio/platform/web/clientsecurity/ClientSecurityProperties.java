package cn.novelstudio.platform.web.clientsecurity;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "auth.client-security")
public class ClientSecurityProperties {

    private boolean enabled = false;
    private boolean aesRequired = false;
    private boolean encryptStream = false;
    private boolean routeObfuscation = false;
    private boolean fieldEncryption = false;
    private long replayWindowSeconds = 120;
    private boolean enforceCsrf = false;
    private boolean enforceFingerprint = false;
    private boolean enforceHeartbeat = false;
    private long heartbeatMaxSilenceSeconds = 180;
    private double fingerprintTolerance = 0.15;

    public boolean enabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean aesRequired() {
        return aesRequired;
    }

    public void setAesRequired(boolean aesRequired) {
        this.aesRequired = aesRequired;
    }

    public boolean encryptStream() {
        return encryptStream;
    }

    public void setEncryptStream(boolean encryptStream) {
        this.encryptStream = encryptStream;
    }

    public boolean routeObfuscation() {
        return routeObfuscation;
    }

    public void setRouteObfuscation(boolean routeObfuscation) {
        this.routeObfuscation = routeObfuscation;
    }

    public boolean fieldEncryption() {
        return fieldEncryption;
    }

    public void setFieldEncryption(boolean fieldEncryption) {
        this.fieldEncryption = fieldEncryption;
    }

    public long replayWindowSeconds() {
        return replayWindowSeconds;
    }

    public void setReplayWindowSeconds(long replayWindowSeconds) {
        this.replayWindowSeconds = replayWindowSeconds;
    }

    public boolean enforceCsrf() {
        return enforceCsrf;
    }

    public void setEnforceCsrf(boolean enforceCsrf) {
        this.enforceCsrf = enforceCsrf;
    }

    public boolean enforceFingerprint() {
        return enforceFingerprint;
    }

    public void setEnforceFingerprint(boolean enforceFingerprint) {
        this.enforceFingerprint = enforceFingerprint;
    }

    public boolean enforceHeartbeat() {
        return enforceHeartbeat;
    }

    public void setEnforceHeartbeat(boolean enforceHeartbeat) {
        this.enforceHeartbeat = enforceHeartbeat;
    }

    public long heartbeatMaxSilenceSeconds() {
        return heartbeatMaxSilenceSeconds;
    }

    public void setHeartbeatMaxSilenceSeconds(long heartbeatMaxSilenceSeconds) {
        this.heartbeatMaxSilenceSeconds = heartbeatMaxSilenceSeconds;
    }

    public double fingerprintTolerance() {
        return fingerprintTolerance;
    }

    public void setFingerprintTolerance(double fingerprintTolerance) {
        this.fingerprintTolerance = fingerprintTolerance;
    }
}
