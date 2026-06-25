package cn.novelstudio.module.billing.support;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** 为 iDataRiver SKU 批量生成唯一兑换码（CDK），管理员只需填数量。 */
public final class IdrCdkGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] CHARSET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private static final String PREFIX = "NA-";

    private IdrCdkGenerator() {
    }

    public static List<String> generate(int count) {
        if (count <= 0) {
            return List.of();
        }
        Set<String> seen = new HashSet<>();
        List<String> out = new ArrayList<>(count);
        while (out.size() < count) {
            String code = PREFIX + randomSegment(4) + "-" + randomSegment(4) + "-" + randomSegment(4);
            if (seen.add(code)) {
                out.add(code);
            }
        }
        return out;
    }

    private static String randomSegment(int len) {
        char[] buf = new char[len];
        for (int i = 0; i < len; i++) {
            buf[i] = CHARSET[RANDOM.nextInt(CHARSET.length)];
        }
        return new String(buf);
    }
}
