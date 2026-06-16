package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import cn.novelstudio.module.content.agent.AgentRunStatus;
import cn.novelstudio.module.content.dto.agent.AgentEventDTO;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Queued mode: 浏览器 SSE 断线后重连同一 run（Java↔Python Worker 不受影响）。
 * 先 replay Redis journal / PG events，再挂接 {@link RunLiveSseFanout} 追 live。
 */
@Service
public class PgRunResumeStreamService {

    private static final Logger log = LoggerFactory.getLogger(PgRunResumeStreamService.class);

    private final AgentRuntimeProperties runtimeProperties;
    private final ContentInternalClient contentInternalClient;
    private final AgentRunEventJournal eventJournal;
    private final RunLiveRedisSubscriber runLiveRedisSubscriber;
    private final RunLiveSseFanout runLiveSseFanout;
    private final ObjectMapper objectMapper;

    public PgRunResumeStreamService(
        AgentRuntimeProperties runtimeProperties,
        ContentInternalClient contentInternalClient,
        AgentRunEventJournal eventJournal,
        RunLiveRedisSubscriber runLiveRedisSubscriber,
        RunLiveSseFanout runLiveSseFanout,
        ObjectMapper objectMapper
    ) {
        this.runtimeProperties = runtimeProperties;
        this.contentInternalClient = contentInternalClient;
        this.eventJournal = eventJournal;
        this.runLiveRedisSubscriber = runLiveRedisSubscriber;
        this.runLiveSseFanout = runLiveSseFanout;
        this.objectMapper = objectMapper;
    }

    public Flux<String> resumeStream(Long userId, String runId, int afterSequence) {
        if (!runtimeProperties.isQueuedMode()) {
            return Flux.error(new NotFoundException(ResultCode.NOT_FOUND, "当前运行模式不支持 run SSE 重连"));
        }
        return Flux.<String>create(sink -> Schedulers.boundedElastic().schedule(() -> {
            try {
                AgentRunDTO run = requireOwnedRun(userId, runId);
                List<String> payloads = loadReplayPayloads(runId, afterSequence);
                boolean sawTerminalPayload = false;
                int lastSequence = afterSequence;
                for (String payloadJson : payloads) {
                    int sequence = parseSequence(payloadJson);
                    if (sequence <= afterSequence) {
                        continue;
                    }
                    lastSequence = Math.max(lastSequence, sequence);
                    String frame = runLiveSseFanout.toClientSseFrame(payloadJson);
                    if (frame != null) {
                        sink.next(frame);
                    }
                    if (isTerminalPayload(payloadJson)) {
                        sawTerminalPayload = true;
                    }
                }

                if (sawTerminalPayload || isTerminalStatus(run.getStatus())) {
                    sink.next("event: stream-end\ndata: done\n\n");
                    sink.complete();
                    return;
                }

                AgentRunEventJournal.RunMeta meta = eventJournal.readMeta(runId);
                if (meta != null && meta.userId() != null && meta.sessionId() != null) {
                    runLiveRedisSubscriber.subscribe(meta.userId(), meta.sessionId(), runId);
                }

                AtomicBoolean completed = new AtomicBoolean(false);
                runLiveSseFanout.register(runId, frame -> {
                    if (completed.get()) {
                        return;
                    }
                    if (shouldSkipLiveFrame(frame, lastSequence)) {
                        return;
                    }
                    sink.next(frame);
                    if (frame.startsWith("event: stream-end")) {
                        completed.set(true);
                        sink.complete();
                    }
                });
                sink.onDispose(() -> runLiveSseFanout.unregisterSink(runId));
                sink.onCancel(() -> runLiveSseFanout.unregisterSink(runId));
            } catch (Exception ex) {
                log.warn("run SSE resume failed runId={}: {}", runId, ex.getMessage());
                sink.error(ex);
            }
        })).subscribeOn(Schedulers.boundedElastic());
    }

    private AgentRunDTO requireOwnedRun(Long userId, String runId) {
        AgentRunDTO run = contentInternalClient.getRun(runId);
        if (run == null) {
            throw new NotFoundException(ResultCode.AGENT_RUN_NOT_FOUND, "运行记录不存在");
        }
        if (userId == null || run.getUserId() == null || !userId.equals(run.getUserId())) {
            throw new ForbiddenException(ResultCode.AGENT_RUN_FORBIDDEN, "无权访问该运行记录");
        }
        return run;
    }

    private List<String> loadReplayPayloads(String runId, int afterSequence) {
        List<String> redisReplay = eventJournal.replay(runId);
        if (!redisReplay.isEmpty()) {
            return redisReplay;
        }
        List<AgentEventDTO> pgEvents = contentInternalClient.listEvents(runId, afterSequence);
        List<String> out = new ArrayList<>(pgEvents.size());
        for (AgentEventDTO event : pgEvents) {
            if (event.getPayloadJson() != null && !event.getPayloadJson().isBlank()) {
                out.add(event.getPayloadJson());
            }
        }
        return out;
    }

    private boolean shouldSkipLiveFrame(String frame, int afterSequence) {
        if (frame == null || frame.isBlank() || frame.startsWith("event: stream-end")) {
            return false;
        }
        try {
            String data = frame;
            int dataIdx = frame.indexOf("data: ");
            if (dataIdx >= 0) {
                data = frame.substring(dataIdx + 6).trim();
            }
            return parseSequence(data) <= afterSequence;
        } catch (Exception ignored) {
            return false;
        }
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
            return "run.completed".equals(type) || "run.failed".equals(type);
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean isTerminalStatus(AgentRunStatus status) {
        return status == AgentRunStatus.COMPLETED
            || status == AgentRunStatus.FAILED
            || status == AgentRunStatus.ABORTED;
    }
}
