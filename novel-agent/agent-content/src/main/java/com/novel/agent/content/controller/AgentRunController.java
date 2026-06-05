package com.novel.agent.content.controller;

import com.novel.agent.content.dto.agent.AgentEventDTO;
import com.novel.agent.content.dto.agent.AgentRunDTO;
import com.novel.agent.content.service.agent.AgentRunService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/content/agent")
@RequiredArgsConstructor
public class AgentRunController {

    private final AgentRunService agentRunService;

    @GetMapping("/sessions/{sessionId}/active-run")
    public ResponseEntity<AgentRunDTO> activeRun(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String sessionId
    ) {
        AgentRunDTO run = agentRunService.getActiveRunForSession(sessionId);
        if (run == null) {
            return ResponseEntity.noContent().build();
        }
        Long userId = Long.parseLong(userIdHeader.trim());
        if (!userId.equals(run.getUserId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(run);
    }

    @GetMapping("/runs/{runId}")
    public ResponseEntity<AgentRunDTO> getRun(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId
    ) {
        AgentRunDTO run = agentRunService.getRun(runId);
        if (run == null) {
            return ResponseEntity.notFound().build();
        }
        Long userId = Long.parseLong(userIdHeader.trim());
        if (!userId.equals(run.getUserId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(run);
    }

    @GetMapping("/runs/{runId}/events")
    public ResponseEntity<List<AgentEventDTO>> listEvents(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        AgentRunDTO run = agentRunService.getRun(runId);
        if (run == null) {
            return ResponseEntity.notFound().build();
        }
        Long userId = Long.parseLong(userIdHeader.trim());
        if (!userId.equals(run.getUserId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(agentRunService.listEvents(runId, afterSequence));
    }

    @GetMapping("/runs/{runId}/timeline")
    public ResponseEntity<List<AgentEventDTO>> timeline(
        @RequestHeader(name = "X-User-Id") String userIdHeader,
        @PathVariable String runId,
        @RequestParam(name = "after_sequence", defaultValue = "-1") int afterSequence
    ) {
        return listEvents(userIdHeader, runId, afterSequence);
    }
}
