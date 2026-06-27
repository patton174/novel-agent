package cn.novelstudio.platform.storage.presign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StorageAccessSignerTest {

    private final StorageAccessSigner signer =
        new StorageAccessSigner("novel-agent-dev-secret-change-in-production-32");

    @Test
    void signAndVerify_roundTrip() {
        String key = "covers/42/novel-1/123.png";
        long userId = 42L;
        long exp = signer.defaultExpiresAtEpochSec();
        String sig = signer.sign(key, userId, exp);
        assertTrue(signer.verify(key, userId, exp, sig));
    }

    @Test
    void verify_rejectsTamperedKey() {
        String key = "covers/42/novel-1/123.png";
        long userId = 42L;
        long exp = signer.defaultExpiresAtEpochSec();
        String sig = signer.sign(key, userId, exp);
        assertFalse(signer.verify("covers/42/other.png", userId, exp, sig));
    }
}
