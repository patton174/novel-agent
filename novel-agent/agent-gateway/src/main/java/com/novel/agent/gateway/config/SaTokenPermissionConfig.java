package com.novel.agent.gateway.config;

import cn.dev33.satoken.stp.StpInterface;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Sa-Token 权限接口实现
 *
 * 网关统一鉴权：
 * 1. token验证：sa-token 自动从 Redis 校验
 * 2. 权限获取：从 Redis 读用户权限
 * 3. 权限不足：RPC 去 auth 服务查
 */
@Slf4j
@Component
public class SaTokenPermissionConfig implements StpInterface {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired(required = false)
    private AuthClient authClient;  // RPC 调用 auth 服务

    private static final String PERMISSION_KEY_PREFIX = "user:permissions:";
    private static final String ROLE_KEY_PREFIX = "user:role:";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        try {
            Long userId = Long.valueOf(loginId.toString());

            // 1. 先从 Redis 取权限
            String permKey = PERMISSION_KEY_PREFIX + userId;
            String permissions = redisTemplate.opsForValue().get(permKey);

            if (permissions != null && !permissions.isEmpty()) {
                // Redis 有，直接返回
                return Arrays.asList(objectMapper.readValue(permissions, String[].class));
            }

            // 2. Redis 没有，RPC 去 auth 服务查
            if (authClient != null) {
                try {
                    permissions = authClient.getPermissions(userId);
                    if (permissions != null) {
                        // 重新存回 Redis，缓存起来
                        redisTemplate.opsForValue().set(permKey, permissions);
                        return Arrays.asList(objectMapper.readValue(permissions, String[].class));
                    }
                } catch (Exception e) {
                    log.warn("RPC获取权限失败: userId={}, error={}", userId, e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("获取权限列表失败: loginId={}", loginId, e);
        }

        return new ArrayList<>();
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        try {
            Long userId = Long.valueOf(loginId.toString());
            String roleKey = ROLE_KEY_PREFIX + userId;
            String role = redisTemplate.opsForValue().get(roleKey);

            if (role != null) {
                return Arrays.asList(role);
            }

            // 兜底：RPC 去 auth 服务查
            if (authClient != null) {
                role = authClient.getRole(userId);
                if (role != null) {
                    redisTemplate.opsForValue().set(roleKey, role);
                    return Arrays.asList(role);
                }
            }

        } catch (Exception e) {
            log.error("获取角色列表失败: loginId={}", loginId, e);
        }

        return new ArrayList<>();
    }

    /**
     * 内部类：RPC 调用 auth 服务
     */
    @Component
    public static class AuthClient {
        public String getPermissions(Long userId) {
            return null;
        }

        public String getRole(Long userId) {
            return null;
        }
    }
}