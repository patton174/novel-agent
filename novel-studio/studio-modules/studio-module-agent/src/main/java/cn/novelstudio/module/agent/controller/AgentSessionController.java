package cn.novelstudio.module.agent.controller;

import cn.novelstudio.module.agent.dto.agent.SessionTitleRequest;
import cn.novelstudio.module.agent.dto.agent.SessionTitleResponse;
import cn.novelstudio.module.agent.service.biz.AgentSessionBiz;
import cn.novelstudio.module.agent.support.BlockingWebSupport;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/agent/session")
public class AgentSessionController {

    private final AgentSessionBiz biz;
    private final BlockingWebSupport blockingWebSupport;

    public AgentSessionController(AgentSessionBiz biz, BlockingWebSupport blockingWebSupport) {
        this.biz = biz;
        this.blockingWebSupport = blockingWebSupport;
    }

    @PostMapping("/title")
    public Mono<SessionTitleResponse> generateTitle(@Valid @RequestBody SessionTitleRequest request) {
        return blockingWebSupport.mono(() -> biz.generateTitle(request));
    }
}
