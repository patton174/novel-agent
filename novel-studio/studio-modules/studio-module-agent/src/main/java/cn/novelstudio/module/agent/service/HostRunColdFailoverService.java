package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.dto.agent.AgentRunContextDto;
import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.orchestration.AgentRunCoordinator;
import cn.novelstudio.module.agent.orchestration.AgentRunEventJournal;
import cn.novelstudio.module.agent.orchestration.AgentRunRegistry;
import cn.novelstudio.module.agent.orchestration.AgentRunState;
import cn.novelstudio.module.agent.orchestration.AssistantPersistCollector;
import cn.novelstudio.module.agent.orchestration.HostModeEventFanout;
import cn.novelstudio.module.content.dto.agent.AgentCheckpointDTO;
import cn.novelstudio.module.agent.client.ContentInternalClient;
import cn.novelstudio.module.content.dto.agent.AgentRunDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import cn.novelstudio.module.agent.config.AgentRuntimeProperties;
import cn.novelstudio.module.agent.config.AgentSideEffectExecutorConfig;
import cn.novelstudio.module.agent.mq.AgentRunMqPublisher;
import cn.novelstudio.module.agent.orchestration.PgRunEventFanout;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.Map;
import java.util.concurrent.Executor;

/**
 * Legacy host mode: restart Java↔Python SSE on a new pod using PG checkpoint.
 */
@Service
public class HostRunColdFailoverService {

    private static final Logger log = LoggerFactory.getLogger(HostRunColdFailoverService.class);

    private final ContentInternalClient contentInternalClient;
    private final RunColdFailoverContextBuilder contextBuilder;
    private final RunProxyRegistry runProxyRegistry;
    private final RunProxyLiveHub runProxyLiveHub;
    private final AgentRunRegistry runRegistry;
    private final PythonAgentRunClient runClient;
    private final ObjectMapper objectMapper;
    private final ChapterSideEffectService chapterSideEffectService;
    private final AgentRunEventJournal eventJournal;
    private final AgentStatusHub statusHub;
    private final HostRunResumeStreamService hostRunResumeStreamService;
    private final Executor sideEffectExecutor;
    private final AgentRunMqPublisher runMqPublisher;
    private final AgentRuntimeProperties runtimeProperties;

    public HostRunColdFailoverService(
        ContentInternalClient contentInternalClient,
        RunColdFailoverContextBuilder contextBuilder,
        RunProxyRegistry runProxyRegistry,
        RunProxyLiveHub runProxyLiveHub,
        AgentRunRegistry runRegistry,
        PythonAgentRunClient runClient,
        ObjectMapper objectMapper,
        ChapterSideEffectService chapterSideEffectService,
        AgentRunEventJournal eventJournal,
        AgentStatusHub statusHub,
        HostRunResumeStreamService hostRunResumeStreamService,
        @Qualifier(AgentSideEffectExecutorConfig.BEAN_NAME) Executor sideEffectExecutor,
        AgentRunMqPublisher runMqPublisher,
        AgentRuntimeProperties runtimeProperties
    ) {
        this.contentInternalClient = contentInternalClient;
        this.contextBuilder = contextBuilder;
        this.runProxyRegistry = runProxyRegistry;
        this.runProxyLiveHub = runProxyLiveHub;
        this.runRegistry = runRegistry;
        this.runClient = runClient;
        this.objectMapper = objectMapper;
        this.chapterSideEffectService = chapterSideEffectService;
        this.eventJournal = eventJournal;
        this.statusHub = statusHub;
        this.hostRunResumeStreamService = hostRunResumeStreamService;
        this.sideEffectExecutor = sideEffectExecutor;
        this.runMqPublisher = runMqPublisher;
        this.runtimeProperties = runtimeProperties;
    }

    public Flux<String> resumeWithDirectPython(
        Long userId,
        String runId,
        int afterSequence,
        AgentRunDTO run
    ) {
        if (runRegistry.get(runId) != null) {
            return hostRunResumeStreamService.resumeStream(userId, runId, afterSequence);
        }
        AgentCheckpointDTO checkpoint = contentInternalClient.getCheckpoint(runId);
        if (checkpoint == null || checkpoint.getTranscriptRef() == null || checkpoint.getTranscriptRef().isBlank()) {
            throw new NotFoundException(ResultCode.NOT_FOUND, "缺少 checkpoint，无法冷恢复");
        }
        runProxyRegistry.claim(runId);
        AgentRunEventJournal.RunMeta meta = eventJournal.readMeta(runId);
        if (meta == null) {
            eventJournal.beginRun(runId, userId, run.getSessionId());
        }
        startCoordinatorAsync(userId, runId, run, checkpoint);
        return hostRunResumeStreamService.resumeStream(userId, runId, afterSequence);
    }

    private void startCoordinatorAsync(
        Long userId,
        String runId,
        AgentRunDTO run,
        AgentCheckpointDTO checkpoint
    ) {
        if (runRegistry.get(runId) != null) {
            return;
        }
        Schedulers.boundedElastic().schedule(() -> {
            try {
                Map<String, Object> assembled = contextBuilder.assembledContextFromCheckpoint(checkpoint);
                if (assembled.isEmpty()) {
                    log.warn("cold host restart missing assembled context runId={}", runId);
                    return;
                }
                AgentRunContextDto ctxDto = contextBuilder.fromCheckpoint(run, checkpoint);
                String userMessage = ctxDto == null ? "" : ctxDto.userMessage();
                String mode = ctxDto == null ? run.getMode() : ctxDto.mode();
                String messageId = ctxDto == null || ctxDto.messageId() == null || ctxDto.messageId().isBlank()
                    ? AgentRunState.newMessageId()
                    : ctxDto.messageId();
                AgentStreamRequest request = new AgentStreamRequest(
                    userMessage,
                    mode,
                    true,
                    null,
                    run.getSessionId(),
                    ctxDto == null ? null : ctxDto.novelId(),
                    ctxDto == null ? null : ctxDto.currentChapterId(),
                    null,
                    runId,
                    null
                );
                AgentRunState state = new AgentRunState(
                    userId,
                    run.getSessionId(),
                    runId,
                    messageId,
                    request,
                    assembled
                );
                state.restoreFromCheckpoint(ctxDto);
                AgentRunCoordinator coordinator = new AgentRunCoordinator(
                    state,
                    runClient,
                    objectMapper,
                    chapterSideEffectService,
                    sideEffectExecutor
                );
                runRegistry.register(coordinator);
                HostModeEventFanout fanout = new HostModeEventFanout(
                    eventJournal, statusHub, objectMapper, userId, run.getSessionId(), runId
                );
                PgRunEventFanout pgFanout = runtimeProperties.isPgRunEnabled()
                    ? new PgRunEventFanout(runMqPublisher, run.getSessionId(), runId)
                    : null;
                AssistantPersistCollector assistantCollector = new AssistantPersistCollector();
                log.info("cold host restart coordinator runId={}", runId);
                coordinator.run(frame -> {
                    assistantCollector.onFrame(frame, objectMapper);
                    if (pgFanout != null) {
                        pgFanout.onFrame(frame);
                    }
                    fanout.onFrame(frame);
                    runProxyLiveHub.publish(runId, frame);
                });
            } catch (Exception ex) {
                log.error("cold host restart failed runId={}: {}", runId, ex.getMessage());
            } finally {
                runRegistry.unregister(runId);
                runProxyRegistry.release(runId);
                runProxyLiveHub.complete(runId);
                eventJournal.completeRun(runId);
            }
        });
    }
}
