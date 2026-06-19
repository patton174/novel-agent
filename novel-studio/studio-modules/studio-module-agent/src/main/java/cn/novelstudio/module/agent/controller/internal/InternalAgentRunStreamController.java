package cn.novelstudio.module.agent.controller.internal;

import cn.novelstudio.module.agent.service.RunProxyResumeService;
import cn.novelstudio.module.agent.service.biz.AgentStreamBiz;
import cn.novelstudio.module.agent.support.AgentStreamSsePrelude;
import cn.novelstudio.module.agent.support.AgentStreamSupport;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

/**
 * Cluster-internal sticky resume: non-owner pods forward here.
 */
@RestController
@RequestMapping("/internal/agent/runs")
public class InternalAgentRunStreamController {

    private final RunProxyResumeService runProxyResumeService;

    public InternalAgentRunStreamController(RunProxyResumeService runProxyResumeService) {
        this.runProxyResumeService = runProxyResumeService;
    }

    @PostMapping(value = "/{runId}/stream/resume", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> resumeOnOwner(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        Long userId = PyaiRequestSupport.parseUserId(userIdHeader);
        AgentStreamBiz.StreamFrames session = runProxyResumeService.resumeOnOwner(
            userId,
            runId,
            afterSequence,
            false
        );
        StreamingResponseBody body = outputStream -> {
            writeFrame(outputStream, AgentStreamSsePrelude.connectedFrame());
            session.frames()
                .onErrorResume(ex -> Flux.fromIterable(AgentStreamSupport.errorFrames(ex)))
                .doOnNext(frame -> writeFrame(outputStream, frame))
                .blockLast();
        };
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_EVENT_STREAM)
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("X-Accel-Buffering", "no")
            .body(body);
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
