package cn.novelstudio.platform.web;

import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRoleSupportTest {

    @Test
    void parseRoles_splitsByComma() {
        assertThat(AuthRoleSupport.parseRoles("user,admin")).contains("admin", "user");
    }

    @Test
    void parseRoles_emptyAndBlankReturnEmpty() {
        assertThat(AuthRoleSupport.parseRoles(null)).isEmpty();
        assertThat(AuthRoleSupport.parseRoles("")).isEmpty();
        assertThat(AuthRoleSupport.parseRoles("   ")).isEmpty();
    }

    @Test
    void parseRoles_trimsAndDropsBlanks() {
        assertThat(AuthRoleSupport.parseRoles(" user , , admin ")).containsExactlyInAnyOrder("user", "admin");
    }

    @Test
    void requireAdmin_passes_whenAdminPresent() {
        AuthRoleSupport.requireAdmin("user,admin"); // no throw
    }

    @Test
    void requireAdmin_throws_whenAdminAbsent() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin("user"))
            .isInstanceOf(BizException.class);
    }

    @Test
    void requireAdmin_throws_whenNull() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin(null))
            .isInstanceOf(BizException.class);
    }
}
