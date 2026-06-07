package com.novel.agent.pyai.support;

import com.novel.agent.common.core.exception.BizException;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.concurrent.ExecutionException;
import java.util.function.Supplier;

/**
 * Run blocking WebClient/HTTP work off Reactor event-loop threads.
 */
@Component
public class BlockingWebSupport {

    public <T> Mono<T> mono(Supplier<T> supplier) {
        return Mono.fromCallable(supplier::get).subscribeOn(Schedulers.boundedElastic());
    }

    public <T> T call(Supplier<T> supplier) {
        if (!Schedulers.isInNonBlockingThread()) {
            return supplier.get();
        }
        try {
            return mono(supplier).toFuture().get();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw PyaiExceptions.internalError("请求被中断");
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause() == null ? ex : ex.getCause();
            if (cause instanceof BizException biz) {
                throw biz;
            }
            if (cause instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw PyaiExceptions.internalError("请求处理失败");
        }
    }
}
