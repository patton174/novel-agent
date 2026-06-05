package com.novel.agent.common.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 请求签名：POST 在 body envelope.sign；GET/PUT/DELETE 等在 URL query（_na_t/_na_n/_na_k/_na_s）。 */
public final class RequestSignCodec {

    /** @deprecated 改用 URL query / body.sign */
    @Deprecated
    public static final String HEADER_TS = "X-Novel-Agent-Ts";
    @Deprecated
    public static final String HEADER_NONCE = "X-Novel-Agent-Nonce";
    @Deprecated
    public static final String HEADER_SIGN = "X-Novel-Agent-Sign";
    @Deprecated
    public static final String HEADER_KID = "X-Novel-Agent-Kid";

    public static final String Q_TS = "_na_t";
    public static final String Q_NONCE = "_na_n";
    public static final String Q_KID = "_na_k";
    public static final String Q_SIGN = "_na_s";

    private static final List<String> SIGN_QUERY_KEYS = List.of(Q_TS, Q_NONCE, Q_KID, Q_SIGN);

    private RequestSignCodec() {
    }

    public static boolean hasSignQuery(Map<String, List<String>> params) {
        return first(params, Q_SIGN) != null && first(params, Q_TS) != null;
    }

    /** 验签用 path+业务 query（不含 _na_* 签名参数） */
    public static String businessPathWithQuery(URI uri) {
        String path = uri.getPath() == null ? "" : uri.getPath();
        Map<String, List<String>> params = parseQuery(uri.getRawQuery());
        StringBuilder business = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : params.entrySet()) {
            if (SIGN_QUERY_KEYS.contains(entry.getKey())) {
                continue;
            }
            for (String value : entry.getValue()) {
                if (business.length() > 0) {
                    business.append('&');
                }
                business.append(entry.getKey());
                if (value != null && !value.isBlank()) {
                    business.append('=').append(value);
                }
            }
        }
        if (business.length() == 0) {
            return path;
        }
        return path + "?" + business;
    }

    public static URI stripSignQuery(URI uri) {
        Map<String, List<String>> params = parseQuery(uri.getRawQuery());
        SIGN_QUERY_KEYS.forEach(params::remove);
        String query = buildQuery(params);
        try {
            return new URI(
                uri.getScheme(),
                uri.getAuthority(),
                uri.getPath(),
                query,
                uri.getFragment()
            );
        } catch (Exception ex) {
            throw new IllegalStateException("strip sign query failed", ex);
        }
    }

    public static String mergeBusinessAndSignQuery(String businessQuery, Map<String, List<String>> originalParams) {
        StringBuilder sb = new StringBuilder();
        if (businessQuery != null && !businessQuery.isBlank()) {
            sb.append(businessQuery);
        }
        for (String key : SIGN_QUERY_KEYS) {
            String value = first(originalParams, key);
            if (value == null || value.isBlank()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(key).append('=').append(value);
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    public static Map<String, List<String>> parseQuery(String rawQuery) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return out;
        }
        for (String pair : rawQuery.split("&")) {
            if (pair.isBlank()) {
                continue;
            }
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            String value = eq >= 0 ? pair.substring(eq + 1) : "";
            out.computeIfAbsent(key, ignored -> new ArrayList<>()).add(value);
        }
        return out;
    }

    private static String buildQuery(Map<String, List<String>> params) {
        if (params.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : params.entrySet()) {
            for (String value : entry.getValue()) {
                if (sb.length() > 0) {
                    sb.append('&');
                }
                sb.append(entry.getKey());
                if (value != null && !value.isBlank()) {
                    sb.append('=').append(value);
                }
            }
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private static String first(Map<String, List<String>> params, String key) {
        List<String> values = params.get(key);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.get(0);
    }

    public static String canonical(
        String method,
        String pathWithOptionalQuery,
        long ts,
        String nonce,
        byte[] body
    ) {
        String path = pathWithOptionalQuery == null ? "" : pathWithOptionalQuery;
        String bodyHash = sha256Hex(body == null ? new byte[0] : body);
        return method.toUpperCase() + "|" + path + "|" + ts + "|" + nonce + "|" + bodyHash;
    }

    public static String signBase64(String canonical, String aesKeyB64) {
        try {
            byte[] key = Base64.getDecoder().decode(aesKeyB64);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            byte[] sig = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (Exception ex) {
            throw new IllegalStateException("sign failed", ex);
        }
    }

    public static boolean verify(
        String method,
        String pathWithOptionalQuery,
        long ts,
        String nonce,
        byte[] body,
        String aesKeyB64,
        String presentedSign
    ) {
        if (presentedSign == null || presentedSign.isBlank()) {
            return false;
        }
        String expected = signBase64(canonical(method, pathWithOptionalQuery, ts, nonce, body), aesKeyB64);
        return constantTimeEquals(expected, presentedSign.trim());
    }

    private static String sha256Hex(byte[] data) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(data);
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("hash failed", ex);
        }
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
