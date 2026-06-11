package cn.novelstudio.platform.security;

/**
 * 浏览器指纹比对：精确相等或字符级相似度（warn 模式用）。
 */
public final class FingerprintMatcher {

    private FingerprintMatcher() {
    }

    public static boolean matches(String bound, String presented, double tolerance) {
        if (bound == null || bound.isBlank() || presented == null || presented.isBlank()) {
            return false;
        }
        if (bound.equals(presented)) {
            return true;
        }
        if (tolerance <= 0) {
            return false;
        }
        int maxLen = Math.max(bound.length(), presented.length());
        if (maxLen == 0) {
            return true;
        }
        int distance = charDistance(bound, presented);
        return (1.0 - (double) distance / maxLen) >= (1.0 - tolerance);
    }

    private static int charDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                    Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[a.length()][b.length()];
    }
}
