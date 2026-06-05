package com.novel.agent.content.controller.internal;

import com.novel.agent.content.dto.agent.*;
import com.novel.agent.content.service.agent.AgentRunService;
import com.novel.agent.content.service.agent.AgentSessionPgService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/agent")
@RequiredArgsConstructor
public class InternalAgentRunController {

    private final AgentRunService agentRunService;
    private final AgentSessionPgService agentSessionPgService;

    @PostMapping("/runs")
    public AgentRunDTO createRun(@RequestBody CreateAgentRunRequest request) {
        return agentRunService.createRun(request);
    }

    @GetMapping("/runs/{runId}")
    public ResponseEntity<AgentRunDTO> getRun(@PathVariable String runId) {
        AgentRunDTO run = agentRunService.getRun(runId);
        return run == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(run);
    }

    @PostMapping("/runs/{runId}/transition")
    public AgentRunDTO transition(@PathVariable String runId, @RequestBody TransitionAgentRunRequest request) {
        return agentRunService.transition(runId, request);
    }

    @PostMapping("/runs/{runId}/lease")
    public AgentRunLeaseDTO lease(
        @PathVariable String runId,
        @RequestBody AgentRunLeaseRequest request
    ) {
        return agentRunService.tryLease(runId, request.getWorkerId());
    }

    @PostMapping("/runs/{runId}/lease/renew")
    public AgentRunLeaseDTO renewLease(
        @PathVariable String runId,
        @RequestBody AgentRunLeaseRequest request
    ) {
        return agentRunService.renewLease(runId, request.getWorkerId());
    }

    @DeleteMapping("/runs/{runId}/lease")
    public ResponseEntity<Void> releaseLease(
        @PathVariable String runId,
        @RequestParam String workerId
    ) {
        agentRunService.releaseLease(runId, workerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/runs/{runId}/events")
    public AgentEventDTO appendEvent(
        @PathVariable String runId,
        @RequestBody AppendAgentEventRequest request
    ) {
        return agentRunService.appendEvent(runId, request);
    }

    @GetMapping("/runs/{runId}/events")
    public List<AgentEventDTO> listEvents(
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        return agentRunService.listEvents(runId, afterSequence);
    }

    @PostMapping("/runs/{runId}/commands")
    public AgentCommandDTO recordCommand(
        @PathVariable String runId,
        @RequestBody RecordAgentCommandRequest request
    ) {
        return agentRunService.recordCommand(runId, request);
    }

    @GetMapping("/runs/{runId}/checkpoint")
    public ResponseEntity<AgentCheckpointDTO> getCheckpoint(@PathVariable String runId) {
        AgentCheckpointDTO dto = agentRunService.getCheckpoint(runId);
        return dto == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(dto);
    }

    @PutMapping("/runs/{runId}/checkpoint")
    public AgentCheckpointDTO upsertCheckpoint(
        @PathVariable String runId,
        @RequestBody UpsertAgentCheckpointRequest request
    ) {
        return agentRunService.upsertCheckpoint(runId, request);
    }

    @GetMapping("/runs/{runId}/commands/{commandId}")
    public ResponseEntity<AgentCommandDTO> getCommand(
        @PathVariable String runId,
        @PathVariable String commandId
    ) {
        AgentCommandDTO cmd = agentRunService.getCommand(runId, commandId);
        return cmd == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(cmd);
    }

    @PostMapping("/sessions/{sessionId}/upsert")
    public ResponseEntity<Void> upsertSession(
        @PathVariable String sessionId,
        @RequestBody Map<String, Object> body
    ) {
        Long userId = longVal(body.get("userId"));
        String title = stringVal(body.get("title"));
        String novelId = stringVal(body.get("novelId"));
        agentSessionPgService.upsertSession(userId, sessionId, title, novelId);
        return ResponseEntity.noContent().build();
    }

    private static Long longVal(Object raw) {
        if (raw == null) {
            return null;
        }
        return Long.parseLong(String.valueOf(raw));
    }

    private static String stringVal(Object raw) {
        return raw == null ? null : String.valueOf(raw);
    }
}
