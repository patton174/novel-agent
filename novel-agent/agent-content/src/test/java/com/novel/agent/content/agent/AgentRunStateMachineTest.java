package com.novel.agent.content.agent;

import com.novel.agent.common.core.exception.ValidationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgentRunStateMachineTest {

    private final AgentRunStateMachine machine = new AgentRunStateMachine();

    @Test
    void queuedToRunningIsAllowed() {
        assertDoesNotThrow(() -> machine.assertTransition(AgentRunStatus.QUEUED, AgentRunStatus.RUNNING));
    }

    @Test
    void completedIsTerminal() {
        assertTrue(machine.isTerminal(AgentRunStatus.COMPLETED));
        assertThrows(ValidationException.class, () ->
            machine.assertTransition(AgentRunStatus.COMPLETED, AgentRunStatus.RUNNING));
    }

    @Test
    void waitingUserCanResume() {
        assertDoesNotThrow(() -> machine.assertTransition(AgentRunStatus.WAITING_USER, AgentRunStatus.RUNNING));
    }
}
