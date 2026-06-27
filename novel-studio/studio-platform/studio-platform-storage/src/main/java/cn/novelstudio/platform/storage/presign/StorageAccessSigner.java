package cn.novelstudio.platform.storage.presign;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Component
public class StorageAccessSigner {

    static final Duration DEFAULT_TTL = Duration.ofHours(1);

    private final byte[] secretBytes;

    public StorageAccessSigner(
        @Value("${auth.jwt.secret:novel-agent-dev-secret-change-in-production-32}") String secret
    ) {
        if (secret == null || secret.length() < 16) {
            throw new IllegalArgumentException("auth.jwt.secret_too_short");
        }
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    }

    public long defaultExpiresAtEpochSec() {
        return Instant.now().plus(DEFAULT_TTL).getEpochSecond();
    }

    public String sign(String storageKey, long userId, long expiresAtEpochSec) {
        return hmacBase64Url(payload(storageKey, userId, expiresAtEpochSec));
    }

    public boolean verify(String storageKey, long userId, long expiresAtEpochSec, String signature) {
        if (signature == null || signature.isBlank()) {
            return false;
        }
        if (Instant.now().getEpochSecond() > expiresAtEpochSec) {
            return false;
        }
        String expected = sign(storageKey, userId, expiresAtEpochSec);
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            signature.getBytes(StandardCharsets.UTF_8)
        );
    }

    static String payload(String storageKey, long userId, long expiresAtEpochSec) {
        return storageKey + "|" + userId + "|" + expiresAtEpochSec;
    }

    private String hmacBase64Url(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("storage.access.sign_failed", ex);
        }
    }
}
