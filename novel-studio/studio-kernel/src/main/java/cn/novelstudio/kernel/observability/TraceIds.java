package cn.novelstudio.kernel.observability;

import java.util.UUID;

public final class TraceIds {

    public static final String HEADER = "X-Trace-Id";
    public static final String MDC_KEY = "trace_id";

    private TraceIds() {}

    public static String resolveOrNew(String incoming) {
        if (incoming != null && !incoming.isBlank()) {
            return incoming.trim();
        }
        return newTraceId();
    }

    public static String newTraceId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
