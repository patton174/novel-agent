package cn.novelstudio.platform.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** 邮箱验证链接签名：token|userId|exp，与 HTTP 请求 bootstrap 加解密独立。 */
public final class EmailVerifyLinkCodec {

    private EmailVerifyLinkCodec() {
    }

    public static String canonical(String token, long userId, long expEpochSec) {
        return "email-verify|" + token + "|" + userId + "|" + expEpochSec;
    }

    public static String signBase64(String token, long userId, long expEpochSec, String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("auth.email_link.secret_not_configured");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal(canonical(token, userId, expEpochSec).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (Exception ex) {
            throw new IllegalStateException("auth.email_link.sign_failed", ex);
        }
    }

    public static boolean verify(String token, long userId, long expEpochSec, String secret, String presentedSign) {
        if (presentedSign == null || presentedSign.isBlank()) {
            return false;
        }
        String expected = signBase64(token, userId, expEpochSec, secret);
        return constantTimeEquals(expected, presentedSign.trim());
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
