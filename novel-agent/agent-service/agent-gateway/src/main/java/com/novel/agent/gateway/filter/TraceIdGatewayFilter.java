package com.novel.agent.gateway.filter;

import com.novel.agent.common.core.observability.TraceIds;
import org.slf4j.MDC;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class TraceIdGatewayFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String traceId = TraceIds.resolveOrNew(exchange.getRequest().getHeaders().getFirst(TraceIds.HEADER));
        ServerHttpRequest request = exchange.getRequest().mutate()
            .header(TraceIds.HEADER, traceId)
            .build();
        exchange.getResponse().getHeaders().set(TraceIds.HEADER, traceId);
        return chain.filter(exchange.mutate().request(request).build())
            .doOnEach(signal -> {
                if (signal.isOnComplete() || signal.isOnError()) {
                    MDC.remove(TraceIds.MDC_KEY);
                }
            })
            .doFirst(() -> MDC.put(TraceIds.MDC_KEY, traceId));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
