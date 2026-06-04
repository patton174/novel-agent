package com.novel.agent.pyai.controller;

import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.service.AgentBridgeService;
import com.novel.agent.pyai.support.AgentStreamSsePrelude;
import jakarta.validation.Valid;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/agent")
public class AgentStreamController {

    private static final String USER_ID_HEADER = "X-User-Id";
    private final AgentBridgeService agentBridgeService;

    public AgentStreamController(AgentBridgeService agentBridgeService) {
        this.agentBridgeService = agentBridgeService;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Mono<Void> stream(
        @Valid @RequestBody AgentStreamRequest request,
        @RequestHeader(name = USER_ID_HEADER, required = false) String userIdHeader,
        @RequestParam(name = "contentOnly", defaultValue = "false") boolean contentOnly,
        ServerWebExchange exchange
    ) {
        Long userId = parseUserId(userIdHeader);
        ServerHttpResponse response = exchange.getResponse();
        response.getHeaders().setContentType(MediaType.TEXT_EVENT_STREAM);
        response.getHeaders().setCacheControl(CacheControl.noCache());
        response.getHeaders().add(HttpHeaders.CONNECTION, "keep-alive");
        response.getHeaders().add("X-Accel-Buffering", "no");

        DataBuffer prelude = response.bufferFactory()
            .wrap(AgentStreamSsePrelude.connectedFrame().getBytes(StandardCharsets.UTF_8));
        Flux<DataBuffer> upstream = agentBridgeService.stream(userId, request)
            .filter(frame -> !contentOnly || isContentFrame(frame))
            .map(frame -> response.bufferFactory().wrap(frame.getBytes(StandardCharsets.UTF_8)))
            .onErrorResume(ex -> {
                String msg = ex == null ? "stream error" : ex.getMessage();
                if (msg == null) {
                    msg = "stream error";
                }
                msg = msg.replace("\r", " ").replace("\n", " ");
                String json = String.format(
                    "{\"event_id\":\"evt_pyai_error\",\"type\":\"run.failed\",\"payload\":{\"error\":\"%s\"},\"source\":\"pyai\"}",
                    msg.replace("\"", "\\\"")
                );
                String frame = "event: agent-event\ndata: " + json + "\n\n";
                String end = "event: stream-end\ndata: done\n\n";
                return Flux.just(
                    response.bufferFactory().wrap(frame.getBytes(StandardCharsets.UTF_8)),
                    response.bufferFactory().wrap(end.getBytes(StandardCharsets.UTF_8))
                );
            });

        Flux<Flux<DataBuffer>> flushed = Flux.concat(
            Flux.just(Flux.just(prelude)),
            upstream.map(chunk -> Flux.just(chunk))
        );
        return response.writeAndFlushWith(flushed);
    }

    private boolean isContentFrame(String frame) {
        if (frame == null || frame.isBlank()) {
            return false;
        }
        if (frame.startsWith("event: stream-end")) {
            return true;
        }
        return frame.contains("\"type\":\"message.delta\"");
    }

    private static Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "未登录");
        }
        try {
            return Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "无效的用户标识");
        }
    }
}
