package cn.novelstudio.module.agent.support;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;

import java.util.List;

public final class AgentStreamSupport {

    private AgentStreamSupport() {}

    public static void applySseHeaders(ServerHttpResponse response) {
        response.getHeaders().setContentType(MediaType.TEXT_EVENT_STREAM);
        response.getHeaders().setCacheControl(CacheControl.noCache());
        response.getHeaders().add(HttpHeaders.CONNECTION, "keep-alive");
        response.getHeaders().add("X-Accel-Buffering", "no");
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

    public static List<String> errorFrames(Throwable ex) {
        String msg = ex == null ? "stream error" : ex.getMessage();
        if (msg == null) {
            msg = "stream error";
        }
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
