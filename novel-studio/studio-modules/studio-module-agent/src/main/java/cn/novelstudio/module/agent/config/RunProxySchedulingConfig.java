package cn.novelstudio.module.agent.config;

import cn.novelstudio.module.agent.service.RunProxyRegistry;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RunProxySchedulingConfig {

    private final RunProxyRegistry runProxyRegistry;

    public RunProxySchedulingConfig(RunProxyRegistry runProxyRegistry) {
        this.runProxyRegistry = runProxyRegistry;
    }

    public void renewRunProxyLeases() {
        for (String runId : runProxyRegistry.localRunIds()) {
            runProxyRegistry.renew(runId);
        }
    }
}
