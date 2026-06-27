package cn.novelstudio.module.notification.support;

import cn.novelstudio.platform.web.AuthRoleSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class NotificationUserDirectory {

    private final JdbcTemplate jdbcTemplate;

    public List<Long> listActiveUserIds() {
        return jdbcTemplate.queryForList(
            "SELECT id FROM auth_user WHERE is_active = true",
            Long.class
        );
    }

    /** Active users whose {@code auth_user.role} is {@link AuthRoleSupport#ROLE_ADMIN}. */
    public List<Long> listActiveAdminUserIds() {
        return jdbcTemplate.queryForList(
            "SELECT id FROM auth_user WHERE is_active = true AND role = ?",
            Long.class,
            AuthRoleSupport.ROLE_ADMIN
        );
    }
}
