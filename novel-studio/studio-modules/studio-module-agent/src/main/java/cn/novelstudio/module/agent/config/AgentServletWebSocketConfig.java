package cn.novelstudio.module.agent.config;

import cn.novelstudio.module.agent.ws.AgentRunServletWebSocketHandler;
import cn.novelstudio.module.agent.ws.AgentStatusServletWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Servlet/Tomcat WebSocket — novel-studio 单体使用 spring-boot-starter-web，
 * WebFlux {@code WebSocketHandlerAdapter} 不会在 Tomcat 上注册 upgrade 路由。
 */
@Configuration
@EnableWebSocket
public class AgentServletWebSocketConfig implements WebSocketConfigurer {

    private final AgentStatusServletWebSocketHandler statusHandler;
    private final AgentRunServletWebSocketHandler runHandler;

    public AgentServletWebSocketConfig(
        AgentStatusServletWebSocketHandler statusHandler,
        AgentRunServletWebSocketHandler runHandler
    ) {
        this.statusHandler = statusHandler;
        this.runHandler = runHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(statusHandler, "/api/agent/chat/status/ws")
            .setAllowedOriginPatterns("*");
        registry.addHandler(runHandler, "/api/agent/run/ws")
            .setAllowedOriginPatterns("*");
    }
}
