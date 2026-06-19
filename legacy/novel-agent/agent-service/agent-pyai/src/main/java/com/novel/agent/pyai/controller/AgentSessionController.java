package com.novel.agent.pyai.controller;

import com.novel.agent.pyai.dto.agent.SessionTitleRequest;
import com.novel.agent.pyai.dto.agent.SessionTitleResponse;
import com.novel.agent.pyai.service.biz.AgentSessionBiz;
import com.novel.agent.pyai.support.BlockingWebSupport;
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
