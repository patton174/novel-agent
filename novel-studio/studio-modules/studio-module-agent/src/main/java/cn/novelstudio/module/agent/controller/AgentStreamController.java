package cn.novelstudio.module.agent.controller;

import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.service.biz.AgentStreamBiz;
import cn.novelstudio.module.agent.support.AgentStreamSsePrelude;
import cn.novelstudio.module.agent.support.AgentStreamSupport;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/agent")
public class AgentStreamController {

    private final AgentStreamBiz biz;

    public AgentStreamController(AgentStreamBiz biz) {
        this.biz = biz;
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> stream(
        @Valid @RequestBody AgentStreamRequest request,
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER, required = false) String userIdHeader,
        @RequestParam(name = "contentOnly", defaultValue = "false") boolean contentOnly
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        AgentStreamBiz.StreamFrames session = biz.streamFrames(userId, request, contentOnly);

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
            .contentType(MediaType.TEXT_EVENT_STREAM)
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("X-Accel-Buffering", "no");
        String quotaWarning = session.quotaWarningHeader();
        if (quotaWarning != null && !quotaWarning.isBlank()) {
            builder.header("X-Quota-Warning", quotaWarning);
        }

        StreamingResponseBody body = outputStream -> {
            writeFrame(outputStream, AgentStreamSsePrelude.connectedFrame());
            session.frames()
                .onErrorResume(ex -> Flux.fromIterable(AgentStreamSupport.errorFrames(ex)))
                .doOnNext(frame -> writeFrame(outputStream, frame))
                .blockLast();
        };
        return builder.body(body);
    }

    private static void writeFrame(OutputStream outputStream, String frame) {
        try {
            outputStream.write(frame.getBytes(StandardCharsets.UTF_8));
            outputStream.flush();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
