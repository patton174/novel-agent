package com.novel.agent.pyai.config;

import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BoundedSideEffectPoolTest {

    @Test
    void executorIsBoundedThreadPool() {
        AgentSideEffectExecutorConfig config = new AgentSideEffectExecutorConfig();
        Executor executor = config.agentSideEffectExecutor();
        assertInstanceOf(ThreadPoolExecutor.class, executor);
        ThreadPoolExecutor pool = (ThreadPoolExecutor) executor;
        assertEquals(2, pool.getCorePoolSize());
        assertEquals(8, pool.getMaximumPoolSize());
        assertEquals(64, pool.getQueue().remainingCapacity() + pool.getQueue().size());
    }

    @Test
    void runsSubmittedTasksWithoutLoss() throws Exception {
        AgentSideEffectExecutorConfig config = new AgentSideEffectExecutorConfig();
        ThreadPoolExecutor pool = (ThreadPoolExecutor) config.agentSideEffectExecutor();
        int taskCount = 12;
        CountDownLatch done = new CountDownLatch(taskCount);
        AtomicInteger completed = new AtomicInteger();

        for (int i = 0; i < taskCount; i++) {
            pool.execute(() -> {
                completed.incrementAndGet();
                done.countDown();
            });
        }

        assertTrue(done.await(5, TimeUnit.SECONDS));
        assertEquals(taskCount, completed.get());
        assertTrue(pool.getPoolSize() <= pool.getMaximumPoolSize());
    }
}
