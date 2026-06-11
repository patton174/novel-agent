package cn.novelstudio.module.content.agent;

import cn.novelstudio.module.content.support.ContentExceptions;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Component
public class AgentRunStateMachine {

    private static final Map<AgentRunStatus, Set<AgentRunStatus>> TRANSITIONS = Map.of(
        AgentRunStatus.QUEUED, EnumSet.of(AgentRunStatus.RUNNING, AgentRunStatus.ABORTED, AgentRunStatus.FAILED),
        AgentRunStatus.RUNNING, EnumSet.of(
            AgentRunStatus.WAITING_USER,
            AgentRunStatus.COMPLETED,
            AgentRunStatus.FAILED,
            AgentRunStatus.ABORTED,
            AgentRunStatus.QUEUED
        ),
        AgentRunStatus.WAITING_USER, EnumSet.of(AgentRunStatus.RUNNING, AgentRunStatus.ABORTED, AgentRunStatus.FAILED),
        AgentRunStatus.COMPLETED, EnumSet.noneOf(AgentRunStatus.class),
        AgentRunStatus.FAILED, EnumSet.noneOf(AgentRunStatus.class),
        AgentRunStatus.ABORTED, EnumSet.noneOf(AgentRunStatus.class)
    );

    public void assertTransition(AgentRunStatus from, AgentRunStatus to) {
        if (from == to) {
            return;
        }
        Set<AgentRunStatus> allowed = TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw ContentExceptions.agentRunTransitionInvalid(from, to);
        }
    }

    public boolean canTransition(AgentRunStatus from, AgentRunStatus to) {
        if (from == to) {
            return true;
        }
        return TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    public boolean isTerminal(AgentRunStatus status) {
        return status == AgentRunStatus.COMPLETED
            || status == AgentRunStatus.FAILED
            || status == AgentRunStatus.ABORTED;
    }
}
