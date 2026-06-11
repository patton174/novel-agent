package cn.novelstudio.platform.security;

/**
 * 路由脱敏：METHOD|/api/... 经 AES-GCM 加密后 base64url 放入 URL，浏览器不持有路由映射表。
 */
public final class RoutePathCodec {

    private RoutePathCodec() {
    }

    public static String encode(String method, String path, AesGcmCodec codec) {
        String normalized = method.toUpperCase() + "|" + path;
        return toBase64Url(codec.encryptToBase64(normalized));
    }

    public static RouteSpec decode(String ciphertextBase64Url, AesGcmCodec codec) {
        String plain = codec.decryptFromBase64(fromBase64Url(ciphertextBase64Url));
        int pipe = plain.indexOf('|');
        if (pipe <= 0 || pipe >= plain.length() - 1) {
            throw new IllegalArgumentException("invalid route payload");
        }
        return new RouteSpec(plain.substring(0, pipe), plain.substring(pipe + 1));
    }

    public static String toBase64Url(String standardBase64) {
        return standardBase64.replace('+', '-').replace('/', '_').replaceAll("=+$", "");
    }

    public static String fromBase64Url(String base64Url) {
        String b64 = base64Url.replace('-', '+').replace('_', '/');
        int mod = b64.length() % 4;
        if (mod > 0) {
            b64 += "=".repeat(4 - mod);
        }
        return b64;
    }

    public record RouteSpec(String method, String path) {
    }
}
