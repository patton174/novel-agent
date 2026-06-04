package com.novel.agent.gateway.config;

import org.springframework.context.annotation.Configuration;

/**
 * Sa-Token 配置
 * 网关负责统一鉴权，验证token有效性，不验证具体权限
 */
@Configuration
public class SaTokenConfig {
    // StpInterface is provided solely by SaTokenPermissionConfig to avoid duplicate beans.
}
