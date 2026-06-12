package cn.novelstudio.platform.web.clientsecurity;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration(after = RedisAutoConfiguration.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "auth.client-security", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(ClientSecurityProperties.class)
@ComponentScan(basePackages = "cn.novelstudio.platform.web.clientsecurity")
public class ClientSecurityAutoConfiguration {
}
