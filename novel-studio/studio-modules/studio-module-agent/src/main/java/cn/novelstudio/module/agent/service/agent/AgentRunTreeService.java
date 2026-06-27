package cn.novelstudio.module.agent.service.agent;

import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.dto.agent.RunTreeNode;
import cn.novelstudio.module.content.entity.agent.AgentRunEntity;
import cn.novelstudio.module.content.repository.agent.AgentRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AgentRunTreeService {

    private final AgentRunRepository runRepository;

    public AgentRunTreeService(AgentRunRepository runRepository) {
        this.runRepository = runRepository;
    }

    @Transactional(readOnly = true)
    public RunTreeNode buildTree(String rootRunId, Long userId) {
        AgentRunEntity root = runRepository.findByIdAndUserId(rootRunId, userId)
            .orElseThrow(() -> NotFoundException.keyed("agent.run.not_found", rootRunId));
        Map<String, List<AgentRunEntity>> childrenByParent = loadChildrenMap(rootRunId);
        return toNode(root, childrenByParent);
    }

    private Map<String, List<AgentRunEntity>> loadChildrenMap(String rootRunId) {
        Map<String, List<AgentRunEntity>> byParent = new HashMap<>();
        List<String> frontier = new ArrayList<>();
        frontier.add(rootRunId);
        while (!frontier.isEmpty()) {
            String parentId = frontier.remove(frontier.size() - 1);
            List<AgentRunEntity> children = runRepository.findByParentRunIdOrderByCreatedAtAsc(parentId);
            if (children.isEmpty()) {
                continue;
            }
            byParent.put(parentId, children);
            for (AgentRunEntity child : children) {
                frontier.add(child.getId());
            }
        }
        return byParent;
    }

    private RunTreeNode toNode(AgentRunEntity run, Map<String, List<AgentRunEntity>> childrenByParent) {
        List<RunTreeNode> children = childrenByParent.getOrDefault(run.getId(), List.of()).stream()
            .map(child -> toNode(child, childrenByParent))
            .toList();
        return new RunTreeNode(
            run.getId(),
            run.getProfileId(),
            run.getRoleLabel(),
            run.getStatus() == null ? null : run.getStatus().name(),
            run.getStartedAt(),
            run.getCompletedAt(),
            children
        );
    }

    public void assertRunOwned(String runId, Long userId) {
        if (runRepository.findByIdAndUserId(runId, userId).isEmpty()) {
            throw ForbiddenException.keyed("agent.run.forbidden");
        }
    }
}
