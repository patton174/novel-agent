package cn.novelstudio.module.worker.support;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Active admin users from {@code auth_user} (role column).
 */
@Component
@RequiredArgsConstructor
public class AdminUserDirectory {

    private final JdbcTemplate jdbcTemplate;

    public List<Long> listActiveAdminUserIds() {
        return jdbcTemplate.queryForList(
            "SELECT id FROM auth_user WHERE is_active = true AND role = 'admin'",
            Long.class
        );
    }
}
