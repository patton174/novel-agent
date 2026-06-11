package cn.novelstudio.module.agent.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executor;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Configuration
public class AgentSideEffectExecutorConfig {

    public static final String BEAN_NAME = "agentSideEffectExecutor";

    private static final int CORE_POOL = 2;
    private static final int MAX_POOL = 8;
    private static final int QUEUE_CAPACITY = 64;

    @Bean(name = BEAN_NAME)
    public Executor agentSideEffectExecutor() {
        return new ThreadPoolExecutor(
            CORE_POOL,
            MAX_POOL,
            60L,
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(QUEUE_CAPACITY),
            r -> {
                Thread t = new Thread(r, "pyai-side-effect");
                t.setDaemon(true);
                return t;
            },
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
