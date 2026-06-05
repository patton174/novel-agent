package com.novel.agent.pyai.service.biz;

import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.service.AgentBridgeService;
import com.novel.agent.pyai.support.AgentStreamSupport;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

@Component
public class AgentStreamBiz extends BaseBiz {

    private final AgentBridgeService agentBridgeService;

    public AgentStreamBiz(AgentBridgeService agentBridgeService) {
        this.agentBridgeService = agentBridgeService;
    }

    public Flux<String> streamFrames(Long userId, AgentStreamRequest request, boolean contentOnly) {
        return agentBridgeService.stream(userId, request)
            .filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
    }
}
