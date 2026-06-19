package cn.novelstudio.module.agent.config;

import cn.novelstudio.module.agent.service.RunProxyRegistry;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
public class RunProxySchedulingConfig {

    private final RunProxyRegistry runProxyRegistry;

    public RunProxySchedulingConfig(RunProxyRegistry runProxyRegistry) {
        this.runProxyRegistry = runProxyRegistry;
    }

    @Scheduled(fixedRate = 15_000)
    void renewRunProxyLeases() {
        for (String runId : runProxyRegistry.localRunIds()) {
            runProxyRegistry.renew(runId);
        }
    }
}
