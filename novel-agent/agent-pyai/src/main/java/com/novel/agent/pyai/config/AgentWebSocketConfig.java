package com.novel.agent.pyai.config;

import com.novel.agent.pyai.ws.AgentRunWebSocketHandler;
import com.novel.agent.pyai.ws.AgentStatusWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class AgentWebSocketConfig {
    @Bean
    public HandlerMapping webSocketMapping(
        AgentStatusWebSocketHandler statusHandler,
        AgentRunWebSocketHandler runHandler
    ) {
        Map<String, Object> map = new HashMap<>();
        map.put("/api/agent/chat/status/ws", statusHandler);
        map.put("/api/agent/run/ws", runHandler);
        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setOrder(Ordered.HIGHEST_PRECEDENCE);
        mapping.setUrlMap(map);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}
