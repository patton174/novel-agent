package com.novel.agent.pyai.service.biz;

import com.novel.agent.common.core.biz.BaseBiz;
import com.novel.agent.pyai.dto.agent.AgentStreamRequest;
import com.novel.agent.pyai.service.AgentBridgeService;
import com.novel.agent.pyai.service.QuotaGateService;
import com.novel.agent.pyai.service.QuotaGateResult;
import com.novel.agent.pyai.support.AgentStreamSupport;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

@Component
public class AgentStreamBiz extends BaseBiz {

    private final AgentBridgeService agentBridgeService;
    private final QuotaGateService quotaGateService;

    public AgentStreamBiz(AgentBridgeService agentBridgeService, QuotaGateService quotaGateService) {
        this.agentBridgeService = agentBridgeService;
        this.quotaGateService = quotaGateService;
    }

    public record StreamFrames(Flux<String> frames, String quotaWarningHeader) {}

    public StreamFrames streamFrames(Long userId, AgentStreamRequest request, boolean contentOnly) {
        QuotaGateResult gate = quotaGateService.assertCanStartRun(userId);
        Flux<String> frames = agentBridgeService.stream(userId, request)
            .filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
        return new StreamFrames(frames, gate.quotaWarningHeader());
    }
}
