package com.novel.agent.pyai.controller;

import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.service.biz.AgentStreamBiz;
import com.novel.agent.pyai.support.AgentStreamSsePrelude;
import com.novel.agent.pyai.support.AgentStreamSupport;
import com.novel.agent.pyai.support.PyaiRequestSupport;
import jakarta.validation.Valid;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/agent")
public class AgentStreamController {

    private final AgentStreamBiz biz;

    public AgentStreamController(AgentStreamBiz biz) {
        this.biz = biz;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Mono<Void> stream(
        @Valid @RequestBody AgentStreamRequest request,
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @RequestParam(name = "contentOnly", defaultValue = "false") boolean contentOnly,
        ServerWebExchange exchange
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        ServerHttpResponse response = exchange.getResponse();
        AgentStreamSupport.applySseHeaders(response);

        AgentStreamBiz.StreamFrames session = biz.streamFrames(userId, request, contentOnly);
        String quotaWarning = session.quotaWarningHeader();
        if (quotaWarning != null && !quotaWarning.isBlank()) {
            response.getHeaders().set("X-Quota-Warning", quotaWarning);
        }

        DataBuffer prelude = response.bufferFactory()
            .wrap(AgentStreamSsePrelude.connectedFrame().getBytes(StandardCharsets.UTF_8));
        Flux<DataBuffer> upstream = session.frames()
            .map(frame -> response.bufferFactory().wrap(frame.getBytes(StandardCharsets.UTF_8)))
            .onErrorResume(ex -> Flux.fromIterable(AgentStreamSupport.errorFrames(ex))
                .map(frame -> response.bufferFactory().wrap(frame.getBytes(StandardCharsets.UTF_8))));

        Flux<Flux<DataBuffer>> flushed = Flux.concat(
            Flux.just(Flux.just(prelude)),
            upstream.map(chunk -> Flux.just(chunk))
        );
        return response.writeAndFlushWith(flushed);
    }
}
