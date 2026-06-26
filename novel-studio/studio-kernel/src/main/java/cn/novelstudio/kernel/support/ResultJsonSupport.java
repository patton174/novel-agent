package cn.novelstudio.kernel.support;

import java.util.Map;

public final class ResultJsonSupport {

    private ResultJsonSupport() {}

    @SuppressWarnings("unchecked")
    public static <T> T unwrap(Map<String, Object> json) {
        if (json == null) {
            throw new RuntimeException("result.json.empty");
        }
        Object successObj = json.get("success");
        if (successObj instanceof Boolean success && !success) {
            Object msg = json.get("msg");
            throw new RuntimeException(msg == null ? "result.json.request_failed" : String.valueOf(msg));
        }
        Object codeObj = json.get("code");
        if (codeObj instanceof Number codeNum) {
            int code = codeNum.intValue();
            if (code != 200) {
                Object msg = json.get("msg");
                throw new RuntimeException(msg == null ? "result.json.request_failed" : String.valueOf(msg));
            }
            return (T) json.get("data");
        }
        throw new RuntimeException("result.json.non_unified");
    }
}
