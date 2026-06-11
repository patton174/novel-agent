package cn.novelstudio.module.agent.config;

import cn.novelstudio.kernel.observability.TraceIds;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TraceIdWebFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String traceId = TraceIds.resolveOrNew(exchange.getRequest().getHeaders().getFirst(TraceIds.HEADER));
        exchange.getResponse().getHeaders().set(TraceIds.HEADER, traceId);
        return chain.filter(
            exchange.mutate()
                .request(builder -> builder.header(TraceIds.HEADER, traceId))
                .build()
        ).doFirst(() -> MDC.put(TraceIds.MDC_KEY, traceId))
            .doFinally(signal -> MDC.remove(TraceIds.MDC_KEY));
    }
}
