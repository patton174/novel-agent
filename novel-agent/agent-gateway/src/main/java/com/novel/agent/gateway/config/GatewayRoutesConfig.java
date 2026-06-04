package com.novel.agent.gateway.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 网关路由配置
 *
 * 路由仅由 Nacos（agent-gateway.yaml）或 application-local.yml 提供。
 * 不再注册硬编码 Fallback 路由，避免与 Nacos 同 id 冲突导致 lb:// 503。
 */
@Configuration
@Profile("!local")
public class GatewayRoutesConfig {
}