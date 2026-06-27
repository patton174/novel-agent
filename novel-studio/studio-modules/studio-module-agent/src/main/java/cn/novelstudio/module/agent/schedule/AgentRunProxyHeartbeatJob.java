package cn.novelstudio.module.agent.schedule;

import cn.novelstudio.module.agent.config.RunProxySchedulingConfig;
import cn.novelstudio.platform.scheduling.StudioScheduledJob;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentRunProxyHeartbeatJob implements StudioScheduledJob {

    private final RunProxySchedulingConfig runProxySchedulingConfig;

    @Override
    public String jobId() {
        return "agent-run-proxy-heartbeat";
    }

    @Override
    public long initialDelayMs() {
        return 15_000;
    }

    @Override
    public long fixedDelayMs() {
        return 15_000;
    }

    @Override
    public void run() {
        runProxySchedulingConfig.renewRunProxyLeases();
    }
}
