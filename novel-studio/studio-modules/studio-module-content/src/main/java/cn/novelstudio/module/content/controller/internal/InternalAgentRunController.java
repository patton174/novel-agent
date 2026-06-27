package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.module.content.dto.ContentMessageDTO;
import cn.novelstudio.module.content.dto.SaveRunTraceRequest;
import cn.novelstudio.module.content.dto.agent.*;
import cn.novelstudio.module.content.service.agent.RunLiveLocalEvent;
import cn.novelstudio.module.content.service.internal.InternalAgentRunBiz;
import cn.novelstudio.module.content.service.internal.InternalAgentRunContextBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/agent")
@RequiredArgsConstructor
public class InternalAgentRunController extends BaseController {

    private final InternalAgentRunBiz biz;
    private final InternalAgentRunContextBiz contextBiz;
    private final ApplicationEventPublisher eventPublisher;

    @PostMapping("/run-context")
    public Map<String, Object> runContext(@RequestBody AgentRunContextRequest request) {
        return contextBiz.aggregate(
            request.userId(),
            request.novelId(),
            request.chapterId(),
            request.sessionId()
        );
    }

    @PostMapping("/runs")
    public AgentRunDTO createRun(@RequestBody CreateAgentRunRequest request) {
        return biz.createRun(request);
    }

    @GetMapping("/runs/{runId}")
    public ResponseEntity<AgentRunDTO> getRun(@PathVariable String runId) {
        return biz.getRun(runId);
    }

    @PostMapping("/runs/{runId}/transition")
    public AgentRunDTO transition(@PathVariable String runId, @RequestBody TransitionAgentRunRequest request) {
        return biz.transition(runId, request);
    }

    @PostMapping("/runs/{runId}/lease")
    public AgentRunLeaseDTO lease(@PathVariable String runId, @RequestBody AgentRunLeaseRequest request) {
        return biz.lease(runId, request);
    }

    @PostMapping("/runs/{runId}/lease/renew")
    public AgentRunLeaseDTO renewLease(@PathVariable String runId, @RequestBody AgentRunLeaseRequest request) {
        return biz.renewLease(runId, request);
    }

    @DeleteMapping("/runs/{runId}/lease")
    public ResponseEntity<Void> releaseLease(@PathVariable String runId, @RequestParam String workerId) {
        biz.releaseLease(runId, workerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/runs/{runId}/events")
    public AgentEventDTO appendEvent(@PathVariable String runId, @RequestBody AppendAgentEventRequest request) {
        eventPublisher.publishEvent(new RunLiveLocalEvent(runId, request.getPayloadJson()));
        return biz.appendEvent(runId, request);
    }

    @GetMapping("/runs/{runId}/events")
    public List<AgentEventDTO> listEvents(
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        return biz.listEvents(runId, afterSequence);
    }

    @PostMapping("/runs/{runId}/commands")
    public AgentCommandDTO recordCommand(@PathVariable String runId, @RequestBody RecordAgentCommandRequest request) {
        return biz.recordCommand(runId, request);
    }

    @GetMapping("/runs/{runId}/checkpoint")
    public ResponseEntity<AgentCheckpointDTO> getCheckpoint(@PathVariable String runId) {
        return biz.getCheckpoint(runId);
    }

    @PutMapping("/runs/{runId}/checkpoint")
    public AgentCheckpointDTO upsertCheckpoint(@PathVariable String runId, @RequestBody UpsertAgentCheckpointRequest request) {
        return biz.upsertCheckpoint(runId, request);
    }

    @GetMapping("/runs/{runId}/commands/{commandId}")
    public ResponseEntity<AgentCommandDTO> getCommand(@PathVariable String runId, @PathVariable String commandId) {
        return biz.getCommand(runId, commandId);
    }

    @PostMapping("/sessions/{sessionId}/upsert")
    public ResponseEntity<Void> upsertSession(@PathVariable String sessionId, @RequestBody Map<String, Object> body) {
        biz.upsertSession(sessionId, body);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions/{sessionId}/runs/{runId}/trace")
    public Map<String, Object> saveRunTrace(
        @PathVariable String sessionId,
        @PathVariable String runId,
        @RequestParam Long userId,
        @RequestBody SaveRunTraceRequest request
    ) {
        biz.saveRunTrace(sessionId, runId, userId, request);
        return Map.of("ok", true);
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public List<ContentMessageDTO> listSessionMessages(
        @PathVariable String sessionId,
        @RequestParam Long userId,
        @RequestParam(name = "limit", defaultValue = "100") int limit,
        @RequestParam(name = "run_id", required = false) String runId
    ) {
        return biz.listSessionMessages(userId, sessionId, limit, runId);
    }

    @GetMapping("/sessions/{sessionId}/runs/{runId}/trace")
    public Map<String, Object> getRunTrace(
        @PathVariable String sessionId,
        @PathVariable String runId,
        @RequestParam Long userId
    ) {
        String trace = biz.getRunTrace(userId, sessionId, runId);
        if (trace == null || trace.isBlank()) {
            return Map.of("trace_json", "");
        }
        return Map.of("trace_json", trace);
    }
}
