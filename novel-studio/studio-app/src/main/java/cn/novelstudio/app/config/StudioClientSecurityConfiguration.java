package cn.novelstudio.app.config;

import cn.novelstudio.platform.web.clientsecurity.ClientSecurityProperties;
import cn.novelstudio.platform.web.clientsecurity.EncryptedRouteServletFilter;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

/**
 * 兜底：AutoConfiguration 未加载时，于 Redis 就绪后显式注册 client-security Filter 链。
 */
@Configuration
@AutoConfigureAfter(RedisAutoConfiguration.class)
@ConditionalOnProperty(prefix = "auth.client-security", name = "enabled", havingValue = "true")
@ConditionalOnMissingBean(EncryptedRouteServletFilter.class)
@EnableConfigurationProperties(ClientSecurityProperties.class)
@ComponentScan(basePackages = "cn.novelstudio.platform.web.clientsecurity")
public class StudioClientSecurityConfiguration {
}
