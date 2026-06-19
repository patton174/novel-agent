package cn.novelstudio.platform.web;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 角色校验工具：CRM 端点无 Spring Security 角色门，手动解析 {@code X-User-Roles} 头校验 admin。
 * 头格式为逗号分隔的角色名（如 {@code "user,admin"}），由上游 JWT filter 注入。
 */
public final class AuthRoleSupport {

    /** admin 角色名。 */
    public static final String ROLE_ADMIN = "admin";

    private AuthRoleSupport() {}

    /** 解析 {@code X-User-Roles} 头为角色集合；null/空白返回空集。 */
    public static Set<String> parseRoles(String rolesHeader) {
        if (rolesHeader == null || rolesHeader.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(rolesHeader.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toSet());
    }

    /** 校验 roles 头含 admin，否则抛 403 FORBIDDEN。 */
    public static void requireAdmin(String rolesHeader) {
        if (!parseRoles(rolesHeader).contains(ROLE_ADMIN)) {
            throw BizException.of(ResultCode.FORBIDDEN);
        }
    }
}
