package cn.novelstudio.module.content.service.agent;

import cn.novelstudio.module.content.agent.AgentRunStateMachine;
import cn.novelstudio.module.content.agent.AgentRunStatus;
import cn.novelstudio.module.content.config.ContentRuntimeProperties;
import cn.novelstudio.module.content.dto.agent.*;
import cn.novelstudio.module.content.entity.agent.*;
import cn.novelstudio.kernel.tools.IdWorker;
import cn.novelstudio.module.content.support.ContentExceptions;
import cn.novelstudio.platform.i18n.StudioMessages;
import cn.novelstudio.module.content.repository.agent.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentRunService {

    private final AgentRunRepository runRepository;
    private final AgentRunCheckpointRepository checkpointRepository;
    private final AgentRunEventRepository eventRepository;
    private final AgentRunCommandRepository commandRepository;
    private final AgentSessionPgService sessionPgService;
    private final AgentRunStateMachine stateMachine;
    private final ContentRuntimeProperties runtimeProperties;
    private final RunLivePublisher runLivePublisher;
    private final StudioMessages messages;

    @Transactional
    public AgentRunDTO createRun(CreateAgentRunRequest request) {
        String runId = blankOr(request.getRunId(), IdWorker.prefixed("run_"));
        return runRepository.findById(runId)
            .map(this::toDto)
            .orElseGet(() -> insertRun(request, runId));
    }

    private AgentRunDTO insertRun(CreateAgentRunRequest request, String runId) {
        String userMessageId = blankOr(request.getUserMessageId(), IdWorker.prefixed("message_"));
        String assistantMessageId = blankOr(request.getAssistantMessageId(), IdWorker.prefixed("message_"));

        sessionPgService.upsertSession(request.getUserId(), request.getSessionId(), null, null);
        sessionPgService.appendMessage(
            request.getUserId(),
            request.getSessionId(),
            userMessageId,
            "user",
            request.getUserMessageContent(),
            "completed",
            runId
        );
        sessionPgService.appendMessage(
            request.getUserId(),
            request.getSessionId(),
            assistantMessageId,
            "assistant",
            "",
            "streaming",
            runId
        );

        AgentRunEntity run = new AgentRunEntity();
        run.setId(runId);
        run.setSessionId(request.getSessionId());
        run.setUserId(request.getUserId());
        run.setUserMessageId(userMessageId);
        run.setAssistantMessageId(assistantMessageId);
        run.setStatus(AgentRunStatus.QUEUED);
        run.setMode(request.getMode());
        runRepository.save(run);

        AgentRunCheckpointEntity checkpoint = new AgentRunCheckpointEntity();
        checkpoint.setRunId(runId);
        checkpoint.setStepIndex(0);
        checkpoint.setContextPatch("{}");
        checkpointRepository.save(checkpoint);

        return toDto(run);
    }

    @Transactional(readOnly = true)
    public AgentRunDTO getRun(String runId) {
        return runRepository.findById(runId).map(this::toDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public AgentRunDTO getActiveRunForSession(String sessionId) {
        return runRepository.findFirstBySessionIdAndStatusInOrderByCreatedAtDesc(
            sessionId,
            List.of(AgentRunStatus.QUEUED, AgentRunStatus.RUNNING, AgentRunStatus.WAITING_USER)
        ).map(this::toDto).orElse(null);
    }

    @Transactional
    public AgentRunDTO transition(String runId, TransitionAgentRunRequest request) {
        AgentRunEntity run = runRepository.findById(runId)
            .orElseThrow(ContentExceptions::agentRunNotFound);
        AgentRunStatus target = request.getStatus();
        stateMachine.assertTransition(run.getStatus(), target);
        run.setStatus(target);
        if (request.getErrorMessage() != null) {
            run.setErrorMessage(request.getErrorMessage());
        }
        if (request.getWorkerId() != null) {
            run.setWorkerId(request.getWorkerId());
        }
        Instant now = Instant.now();
        if (target == AgentRunStatus.RUNNING && run.getStartedAt() == null) {
            run.setStartedAt(now);
        }
        if (stateMachine.isTerminal(target)) {
            run.setCompletedAt(now);
            run.setLeaseExpiresAt(null);
        }
        runRepository.save(run);
        return toDto(run);
    }

    @Transactional
    public AgentRunLeaseDTO tryLease(String runId, String workerId) {
        AgentRunEntity run = runRepository.findById(runId).orElse(null);
        if (run == null) {
            return AgentRunLeaseDTO.builder()
                .acquired(false)
                .runId(runId)
                .message(messages.get("agent.run.lease_not_found"))
                .build();
        }
        Instant now = Instant.now();
        if (run.getLeaseExpiresAt() != null
            && run.getLeaseExpiresAt().isAfter(now)
            && run.getWorkerId() != null
            && !run.getWorkerId().equals(workerId)) {
            return AgentRunLeaseDTO.builder()
                .acquired(false)
                .runId(runId)
                .workerId(run.getWorkerId())
                .leaseExpiresAt(toEpochMillis(run.getLeaseExpiresAt()))
                .message(messages.get("agent.run.leased_by_other"))
                .build();
        }

        AgentRunStatus target = run.getStatus() == AgentRunStatus.WAITING_USER
            || run.getStatus() == AgentRunStatus.QUEUED
            ? AgentRunStatus.RUNNING
            : run.getStatus();
        if (run.getStatus() != target) {
            stateMachine.assertTransition(run.getStatus(), target);
            run.setStatus(target);
        }
        if (run.getStartedAt() == null) {
            run.setStartedAt(now);
        }
        Instant leaseExpires = now.plusSeconds(runtimeProperties.leaseTtlSeconds());
        run.setWorkerId(workerId);
        run.setLeaseExpiresAt(leaseExpires);
        runRepository.save(run);

        return AgentRunLeaseDTO.builder()
            .acquired(true)
            .runId(runId)
            .workerId(workerId)
            .leaseExpiresAt(toEpochMillis(leaseExpires))
            .build();
    }

    @Transactional
    public AgentRunLeaseDTO renewLease(String runId, String workerId) {
        AgentRunEntity run = runRepository.findById(runId).orElse(null);
        if (run == null || run.getWorkerId() == null || !run.getWorkerId().equals(workerId)) {
            return AgentRunLeaseDTO.builder()
                .acquired(false)
                .runId(runId)
                .message(messages.get("agent.run.not_lease_owner"))
                .build();
        }
        Instant leaseExpires = Instant.now().plusSeconds(runtimeProperties.leaseTtlSeconds());
        run.setLeaseExpiresAt(leaseExpires);
        runRepository.save(run);
        return AgentRunLeaseDTO.builder()
            .acquired(true)
            .runId(runId)
            .workerId(workerId)
            .leaseExpiresAt(toEpochMillis(leaseExpires))
            .build();
    }

    @Transactional
    public void releaseLease(String runId, String workerId) {
        runRepository.findById(runId).ifPresent(run -> {
            if (workerId == null || workerId.equals(run.getWorkerId())) {
                run.setLeaseExpiresAt(null);
                runRepository.save(run);
            }
        });
    }

    @Transactional
    public AgentEventDTO appendEvent(String runId, AppendAgentEventRequest request) {
        if (request.getEventId() != null && !request.getEventId().isBlank()) {
            var existing = eventRepository.findById(request.getEventId());
            if (existing.isPresent()) {
                return toEventDto(existing.get());
            }
        }
        AgentRunEntity run = runRepository.findById(runId)
            .orElseThrow(ContentExceptions::agentRunNotFound);
        int sequence = eventRepository.countByRunId(runId);
        AgentRunEventEntity event = new AgentRunEventEntity();
        event.setId(blankOr(request.getEventId(), IdWorker.prefixed("evt_")));
        event.setRunId(runId);
        event.setSessionId(run.getSessionId());
        event.setSequence(sequence);
        event.setEventType(request.getEventType());
        event.setSource(request.getSource() == null ? "worker" : request.getSource());
        event.setPayload(request.getPayloadJson() == null ? "{}" : request.getPayloadJson());
        eventRepository.save(event);
        AgentEventDTO dto = toEventDto(event);
        runLivePublisher.publish(runId, event.getPayload());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<AgentEventDTO> listEvents(String runId, int afterSequence) {
        return eventRepository.findByRunIdAndSequenceGreaterThanOrderBySequenceAsc(runId, afterSequence).stream()
            .map(this::toEventDto)
            .toList();
    }

    @Transactional
    public AgentCommandDTO recordCommand(String runId, RecordAgentCommandRequest request) {
        if (request.getCommandId() == null || request.getCommandId().isBlank()) {
            throw ContentExceptions.commandIdRequired();
        }
        var existing = commandRepository.findByRunIdAndId(runId, request.getCommandId());
        if (existing.isPresent()) {
            AgentRunCommandEntity cmd = existing.get();
            return AgentCommandDTO.builder()
                .id(cmd.getId())
                .runId(cmd.getRunId())
                .commandType(cmd.getCommandType())
                .payloadJson(cmd.getPayload())
                .status(cmd.getStatus())
                .createdAt(cmd.getCreatedAt())
                .duplicate(true)
                .build();
        }
        AgentRunCommandEntity cmd = new AgentRunCommandEntity();
        cmd.setId(request.getCommandId());
        cmd.setRunId(runId);
        cmd.setCommandType(request.getCommandType());
        cmd.setPayload(request.getPayloadJson() == null ? "{}" : request.getPayloadJson());
        cmd.setStatus("accepted");
        commandRepository.save(cmd);
        return AgentCommandDTO.builder()
            .id(cmd.getId())
            .runId(cmd.getRunId())
            .commandType(cmd.getCommandType())
            .payloadJson(cmd.getPayload())
            .status(cmd.getStatus())
            .createdAt(cmd.getCreatedAt())
            .duplicate(false)
            .build();
    }

    @Transactional
    public AgentCheckpointDTO upsertCheckpoint(String runId, UpsertAgentCheckpointRequest request) {
        boolean existed = checkpointRepository.findById(runId).isPresent();
        AgentRunCheckpointEntity checkpoint = checkpointRepository.findById(runId)
            .orElseGet(() -> {
                AgentRunCheckpointEntity created = new AgentRunCheckpointEntity();
                created.setRunId(runId);
                created.setContextPatch("{}");
                return created;
            });
        checkpoint.setStepIndex(request.getStepIndex());
        checkpoint.setLastAction(truncateField(request.getLastAction(), 32));
        if (request.getContextPatchJson() != null) {
            checkpoint.setContextPatch(request.getContextPatchJson());
        }
        checkpoint.setTranscriptRef(truncateField(request.getTranscriptRef(), 128));
        checkpoint.setVersion(existed ? checkpoint.getVersion() + 1 : 1);
        checkpointRepository.save(checkpoint);
        return toCheckpointDto(checkpoint);
    }

    @Transactional(readOnly = true)
    public AgentCheckpointDTO getCheckpoint(String runId) {
        return checkpointRepository.findById(runId).map(this::toCheckpointDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public AgentCommandDTO getCommand(String runId, String commandId) {
        return commandRepository.findByRunIdAndId(runId, commandId)
            .map(cmd -> AgentCommandDTO.builder()
                .id(cmd.getId())
                .runId(cmd.getRunId())
                .commandType(cmd.getCommandType())
                .payloadJson(cmd.getPayload())
                .status(cmd.getStatus())
                .createdAt(cmd.getCreatedAt())
                .duplicate(false)
                .build())
            .orElse(null);
    }

    private AgentRunDTO toDto(AgentRunEntity run) {
        return AgentRunDTO.builder()
            .id(run.getId())
            .sessionId(run.getSessionId())
            .userId(run.getUserId())
            .userMessageId(run.getUserMessageId())
            .assistantMessageId(run.getAssistantMessageId())
            .status(run.getStatus())
            .mode(run.getMode())
            .errorMessage(run.getErrorMessage())
            .workerId(run.getWorkerId())
            .leaseExpiresAt(toEpochMillis(run.getLeaseExpiresAt()))
            .startedAt(toEpochMillis(run.getStartedAt()))
            .completedAt(toEpochMillis(run.getCompletedAt()))
            .createdAt(toEpochMillis(run.getCreatedAt()))
            .updatedAt(toEpochMillis(run.getUpdatedAt()))
            .build();
    }

    private static Long toEpochMillis(Instant instant) {
        return instant == null ? null : instant.toEpochMilli();
    }

    private AgentEventDTO toEventDto(AgentRunEventEntity event) {
        return AgentEventDTO.builder()
            .id(event.getId())
            .runId(event.getRunId())
            .sessionId(event.getSessionId())
            .sequence(event.getSequence())
            .eventType(event.getEventType())
            .source(event.getSource())
            .payloadJson(event.getPayload())
            .createdAt(event.getCreatedAt())
            .build();
    }

    private AgentCheckpointDTO toCheckpointDto(AgentRunCheckpointEntity checkpoint) {
        return AgentCheckpointDTO.builder()
            .runId(checkpoint.getRunId())
            .stepIndex(checkpoint.getStepIndex())
            .lastAction(checkpoint.getLastAction())
            .contextPatchJson(checkpoint.getContextPatch())
            .transcriptRef(checkpoint.getTranscriptRef())
            .version(checkpoint.getVersion())
            .updatedAt(checkpoint.getUpdatedAt())
            .build();
    }

    private static String blankOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String truncateField(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLen) {
            return trimmed;
        }
        return trimmed.substring(0, maxLen);
    }
}
