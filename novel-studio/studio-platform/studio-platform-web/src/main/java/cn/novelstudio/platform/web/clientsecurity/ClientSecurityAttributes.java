package cn.novelstudio.platform.web.clientsecurity;

public final class ClientSecurityAttributes {

    public static final String CRYPTO_NONCE = "studio.crypto.nonce";
    public static final String CRYPTO_TS = "studio.crypto.ts";
    public static final String CRYPTO_KID = "studio.crypto.kid";
    public static final String REPLAY_GUARD_PASSED = "studio.replay.guard.passed";
    private static final String REPLAY_GUARD_LOCK = "studio.replay.guard.lock";

    private ClientSecurityAttributes() {
    }

    public static Object replayGuardLock(jakarta.servlet.http.HttpServletRequest request) {
        Object lock = request.getAttribute(REPLAY_GUARD_LOCK);
        if (lock == null) {
            lock = new Object();
            request.setAttribute(REPLAY_GUARD_LOCK, lock);
        }
        return lock;
    }
}
