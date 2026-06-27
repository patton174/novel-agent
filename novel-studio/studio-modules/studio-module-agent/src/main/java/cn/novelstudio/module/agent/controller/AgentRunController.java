package cn.novelstudio.module.agent.controller;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.agent.dto.agent.RunTreeNode;
import cn.novelstudio.module.agent.service.agent.AgentRunTreeService;
import cn.novelstudio.module.agent.support.PyaiRequestSupport;
import cn.novelstudio.platform.web.BaseController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent/runs")
public class AgentRunController extends BaseController {

    private final AgentRunTreeService runTreeService;

    public AgentRunController(AgentRunTreeService runTreeService) {
        this.runTreeService = runTreeService;
    }

    @GetMapping("/{runId}/tree")
    public Result<RunTreeNode> tree(
        @RequestHeader(name = PyaiRequestSupport.USER_ID_HEADER) String userIdHeader,
        @PathVariable String runId
    ) {
        return ok(runTreeService.buildTree(runId, parseUserId(userIdHeader)));
    }
}
