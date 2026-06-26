package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.NotFoundException;
import cn.novelstudio.module.agent.service.biz.AgentStreamBiz;
import cn.novelstudio.module.agent.support.AgentStreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Optional;

/**
 * Sticky resume: always reach the owner Java while its proxy lease is alive.
 */
@Service
public class RunProxyResumeService {

    private static final Logger log = LoggerFactory.getLogger(RunProxyResumeService.class);

    private final RunProxyRegistry runProxyRegistry;
    private final RunProxyForwarder runProxyForwarder;
    private final HostRunResumeStreamService hostRunResumeStreamService;
    private final RunProxyColdFailoverService runProxyColdFailoverService;

    public RunProxyResumeService(
        RunProxyRegistry runProxyRegistry,
        RunProxyForwarder runProxyForwarder,
        HostRunResumeStreamService hostRunResumeStreamService,
        RunProxyColdFailoverService runProxyColdFailoverService
    ) {
        this.runProxyRegistry = runProxyRegistry;
        this.runProxyForwarder = runProxyForwarder;
        this.hostRunResumeStreamService = hostRunResumeStreamService;
        this.runProxyColdFailoverService = runProxyColdFailoverService;
    }

    public AgentStreamBiz.StreamFrames resume(Long userId, String runId, int afterSequence, boolean contentOnly) {
        Optional<RunProxyOwner> owner = runProxyRegistry.findOwner(runId);
        if (owner.isPresent() && owner.get().isAlive(RunProxyRegistry.PROXY_TTL_MS, System.currentTimeMillis())) {
            Flux<String> frames;
            if (runProxyRegistry.isLocalOwner(runId)) {
                frames = localOwnerResume(userId, runId, afterSequence);
            } else {
                log.info(
                    "run SSE resume forward runId={} owner={} internal={}",
                    runId,
                    owner.get().instanceId(),
                    owner.get().internalBaseUrl()
                );
                frames = runProxyForwarder.forwardResume(
                    owner.get().internalBaseUrl(),
                    userId,
                    runId,
                    afterSequence
                );
            }
            frames = frames.filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
            return new AgentStreamBiz.StreamFrames(AgentStreamSupport.withKeepalive(frames), null);
        }
        log.info("run SSE cold failover runId={} afterSequence={}", runId, afterSequence);
        Flux<String> frames = runProxyColdFailoverService.resumeAfterOwnerLoss(userId, runId, afterSequence)
            .filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
        return new AgentStreamBiz.StreamFrames(AgentStreamSupport.withKeepalive(frames), null);
    }

    public AgentStreamBiz.StreamFrames resumeOnOwner(Long userId, String runId, int afterSequence, boolean contentOnly) {
        if (!runProxyRegistry.isLocalOwner(runId)) {
            throw NotFoundException.keyed(ResultCode.NOT_FOUND, "agent.run.not_proxy_owner");
        }
        Flux<String> frames = localOwnerResume(userId, runId, afterSequence)
            .filter(frame -> !contentOnly || AgentStreamSupport.isContentFrame(frame));
        return new AgentStreamBiz.StreamFrames(AgentStreamSupport.withKeepalive(frames), null);
    }

    private Flux<String> localOwnerResume(Long userId, String runId, int afterSequence) {
        return hostRunResumeStreamService.resumeStream(userId, runId, afterSequence);
    }
}
