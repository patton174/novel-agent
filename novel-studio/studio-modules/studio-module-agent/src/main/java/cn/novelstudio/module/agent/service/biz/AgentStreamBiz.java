package cn.novelstudio.module.agent.service.biz;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.agent.dto.agent.AgentStreamRequest;
import cn.novelstudio.module.agent.service.AgentBridgeService;
import cn.novelstudio.module.agent.service.QuotaGateService;
import cn.novelstudio.module.agent.service.QuotaGateResult;
import cn.novelstudio.module.agent.support.AgentStreamSupport;
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
