package com.novel.agent.pyai.support;

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
            throw new IllegalStateException("blocking web call interrupted", ex);
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause() == null ? ex : ex.getCause();
            if (cause instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new IllegalStateException("blocking web call failed", cause);
        }
    }
}
