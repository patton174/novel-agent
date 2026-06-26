package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import cn.novelstudio.module.agent.orchestration.AgentRunRegistry;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * Host-mode resume on the owner Java pod: journal replay + local live hub (Python SSE unchanged).
 */
@Service
public class HostRunResumeStreamService {

    private static final Logger log = LoggerFactory.getLogger(HostRunResumeStreamService.class);

    private final AgentRunEventJournal eventJournal;
    private final RunLiveSseFanout runLiveSseFanout;
    private final RunProxyLiveHub runProxyLiveHub;
    private final AgentRunRegistry runRegistry;
    private final ContentInternalClient contentInternalClient;
    private final ObjectMapper objectMapper;

    public HostRunResumeStreamService(
        AgentRunEventJournal eventJournal,
        RunLiveSseFanout runLiveSseFanout,
        RunProxyLiveHub runProxyLiveHub,
        AgentRunRegistry runRegistry,
        ContentInternalClient contentInternalClient,
        ObjectMapper objectMapper
    ) {
        this.eventJournal = eventJournal;
        this.runLiveSseFanout = runLiveSseFanout;
        this.runProxyLiveHub = runProxyLiveHub;
        this.runRegistry = runRegistry;
        this.contentInternalClient = contentInternalClient;
        this.objectMapper = objectMapper;
    }

    public Flux<String> resumeStream(Long userId, String runId, int afterSequence) {
        return Flux.<String>create(sink -> Schedulers.boundedElastic().schedule(() -> {
            try {
                log.info("host run SSE resume start userId={} runId={} afterSequence={}", userId, runId, afterSequence);
                assertOwned(userId, runId);
                ReplayResult replay = replayJournal(runId, afterSequence);
                for (String frame : replay.frames()) {
                    sink.next(frame);
                }
                if (replay.terminal() || isTerminalInStore(runId) || runRegistry.get(runId) == null) {
                    sink.next("event: stream-end\ndata: done\n\n");
                    sink.complete();
                    return;
                }

                AtomicBoolean completed = new AtomicBoolean(false);
                Consumer<String> liveSink = frame -> {
                    if (completed.get()) {
                        return;
                    }
                    sink.next(frame);
                    if (frame.startsWith("event: stream-end")) {
                        completed.set(true);
                        sink.complete();
                    }
                };
                runProxyLiveHub.attach(runId, liveSink);
                sink.onDispose(() -> runProxyLiveHub.detach(runId, liveSink));
                sink.onCancel(() -> runProxyLiveHub.detach(runId, liveSink));
            } catch (Exception ex) {
                log.warn("host run SSE resume failed runId={}: {}", runId, ex.getMessage());
                sink.error(ex);
            }
        })).subscribeOn(Schedulers.boundedElastic());
    }

    private void assertOwned(Long userId, String runId) {
        AgentRunEventJournal.RunMeta meta = eventJournal.readMeta(runId);
        if (meta != null && meta.userId() != null && meta.userId().equals(userId)) {
            return;
        }
        AgentRunDTO run = contentInternalClient.getRun(runId);
        if (run == null) {
            throw NotFoundException.keyed(ResultCode.AGENT_RUN_NOT_FOUND, "result.content.agent_run_not_found");
        }
        if (userId == null || run.getUserId() == null || !userId.equals(run.getUserId())) {
            throw ForbiddenException.keyed(ResultCode.AGENT_RUN_FORBIDDEN, "result.content.agent_run_forbidden");
        }
    }

    private boolean isTerminalInStore(String runId) {
        AgentRunDTO run = contentInternalClient.getRun(runId);
        return run != null && isTerminalStatus(run.getStatus());
    }

    private ReplayResult replayJournal(String runId, int afterSequence) {
        List<String> payloads = eventJournal.replay(runId);
        java.util.ArrayList<String> frames = new java.util.ArrayList<>();
        boolean terminal = false;
        for (String payloadJson : payloads) {
            if (parseSequence(payloadJson) <= afterSequence) {
                continue;
            }
            String frame = runLiveSseFanout.toClientSseFrame(payloadJson);
            if (frame != null) {
                frames.add(frame);
            }
            if (isTerminalPayload(payloadJson)) {
                terminal = true;
            }
        }
        return new ReplayResult(List.copyOf(frames), terminal);
    }

    private int parseSequence(String payloadJson) {
        try {
            JsonNode root = objectMapper.readTree(payloadJson);
            return root.path("sequence").asInt(0);
        } catch (Exception ignored) {
            return 0;
        }
    }

    private boolean isTerminalPayload(String payloadJson) {
        try {
            String type = objectMapper.readTree(payloadJson).path("type").asText("");
            return "run.completed".equals(type) || "run.failed".equals(type) || "stream-end".equals(type);
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean isTerminalStatus(cn.novelstudio.module.content.agent.AgentRunStatus status) {
        return status == cn.novelstudio.module.content.agent.AgentRunStatus.COMPLETED
            || status == cn.novelstudio.module.content.agent.AgentRunStatus.FAILED
            || status == cn.novelstudio.module.content.agent.AgentRunStatus.ABORTED;
    }

    private record ReplayResult(List<String> frames, boolean terminal) {}
}
