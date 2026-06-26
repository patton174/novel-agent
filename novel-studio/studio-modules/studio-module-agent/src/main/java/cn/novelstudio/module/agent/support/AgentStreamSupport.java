package cn.novelstudio.module.agent.support;

import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.platform.i18n.ResultLocalizer;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.List;

public final class AgentStreamSupport {

    /** SSE comment frame — keeps proxies/clients alive during long tool silence */
    public static final String KEEPALIVE_FRAME = ": keepalive\n\n";
    private static final Duration KEEPALIVE_INTERVAL = Duration.ofSeconds(15);

    private AgentStreamSupport() {}

    /** Merge periodic SSE comments until the agent stream completes. */
    public static Flux<String> withKeepalive(Flux<String> frames) {
        if (frames == null) {
            return Flux.empty();
        }
        // frames 是冷流（Flux.create），其内部在
        // 方法体里生成 runId/messageId 并闭包捕获。若直接被 merge + ignoreElements 各订阅
        // 一次，lambda 会执行两次，导致同一 runId/messageId 触发 createRun 主键冲突
        // → 事务 aborted → SSE bootstrap 失败 → 前端从开始就断线重连。share() 让多个
        // 订阅者共享一次上游订阅，避免冷流被重复触发。
        Flux<String> shared = frames.share();
        Flux<String> keepalive = Flux.interval(KEEPALIVE_INTERVAL)
            .map(tick -> KEEPALIVE_FRAME)
            .takeUntilOther(shared.ignoreElements().then(Mono.empty()));
        return Flux.merge(shared, keepalive);
    }

    public static void applySseHeaders(ServerHttpResponse response) {
        response.getHeaders().setContentType(MediaType.TEXT_EVENT_STREAM);
        response.getHeaders().setCacheControl(CacheControl.noCache());
        response.getHeaders().add(HttpHeaders.CONNECTION, "keep-alive");
        response.getHeaders().add("X-Accel-Buffering", "no");
    }

    public static void applySseHeaders(HttpServletResponse response) {
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setHeader(HttpHeaders.CACHE_CONTROL, CacheControl.noCache().getHeaderValue());
        response.setHeader(HttpHeaders.CONNECTION, "keep-alive");
        response.setHeader("X-Accel-Buffering", "no");
    }

    public static boolean isContentFrame(String frame) {
        if (frame == null || frame.isBlank()) {
            return false;
        }
        if (frame.startsWith("event: stream-end")) {
            return true;
        }
        return frame.contains("\"type\":\"message.delta\"");
    }

    public static String resolveStreamError(Throwable ex, ResultLocalizer localizer) {
        if (localizer == null) {
            return ex == null || ex.getMessage() == null ? "agent.stream.error" : ex.getMessage();
        }
        if (ex instanceof BizException biz) {
            return localizer.resolveException(biz);
        }
        if (ex == null || ex.getMessage() == null || ex.getMessage().isBlank()) {
            return localizer.resolveLiteral("agent.stream.error");
        }
        return localizer.resolveLiteral(ex.getMessage());
    }

    public static List<String> errorFrames(Throwable ex) {
        return errorFrames(ex == null || ex.getMessage() == null ? "agent.stream.error" : ex.getMessage());
    }

    public static List<String> errorFrames(String errorMessage) {
        String msg = errorMessage == null || errorMessage.isBlank() ? "agent.stream.error" : errorMessage;
        msg = msg.replace("\r", " ").replace("\n", " ");
        String json = String.format(
            "{\"event_id\":\"evt_pyai_error\",\"type\":\"run.failed\",\"payload\":{\"error\":\"%s\"},\"source\":\"pyai\"}",
            msg.replace("\"", "\\\"")
        );
        return List.of(
            "event: agent-event\ndata: " + json + "\n\n",
            "event: stream-end\ndata: done\n\n"
        );
    }
}
