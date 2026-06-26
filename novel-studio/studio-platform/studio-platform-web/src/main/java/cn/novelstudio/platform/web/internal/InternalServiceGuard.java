package cn.novelstudio.platform.web.internal;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;

/**
 * 服务间 internal API 鉴权（X-Internal-Service-Key）。
 * 由 {@link cn.novelstudio.platform.web.config.CommonServiceAutoConfiguration} 注册。
 */
public class InternalServiceGuard {

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String configuredKey;

    public void requireValidKey(String presentedKey) {
        if (configuredKey == null || configuredKey.isBlank()) {
            throw BizException.of(ResultCode.INTERNAL_KEY_NOT_CONFIGURED);
        }
        if (presentedKey == null || !configuredKey.equals(presentedKey)) {
            throw UnauthorizedException.keyed(
                ResultCode.INTERNAL_KEY_INVALID,
                ResultCode.INTERNAL_KEY_INVALID.getMessageKey()
            );
        }
    }

    /** crypto manifest 等接口：密钥错误统一返回 403 forbidden */
    public void requireValidKeyOrForbidden(String presentedKey) {
        if (configuredKey == null || configuredKey.isBlank()
            || presentedKey == null || !configuredKey.equals(presentedKey)) {
            throw ForbiddenException.keyed(
                ResultCode.INTERNAL_FORBIDDEN,
                ResultCode.INTERNAL_FORBIDDEN.getMessageKey()
            );
        }
    }
}
