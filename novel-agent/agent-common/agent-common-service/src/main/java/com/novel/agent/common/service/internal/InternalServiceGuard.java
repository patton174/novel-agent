package com.novel.agent.common.service.internal;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.core.exception.ForbiddenException;
import com.novel.agent.common.core.exception.UnauthorizedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 服务间 internal API 鉴权（X-Internal-Service-Key）。
 */
@Component
public class InternalServiceGuard {

    @Value("${agent.internal.service-key:dev-internal-key-change-me}")
    private String configuredKey;

    public void requireValidKey(String presentedKey) {
        if (configuredKey == null || configuredKey.isBlank()) {
            throw BizException.of(ResultCode.INTERNAL_KEY_NOT_CONFIGURED);
        }
        if (presentedKey == null || !configuredKey.equals(presentedKey)) {
            throw new UnauthorizedException(ResultCode.INTERNAL_KEY_INVALID, "invalid internal key");
        }
    }

    /** crypto manifest 等接口：密钥错误统一返回 403 forbidden */
    public void requireValidKeyOrForbidden(String presentedKey) {
        if (configuredKey == null || configuredKey.isBlank()
            || presentedKey == null || !configuredKey.equals(presentedKey)) {
            throw new ForbiddenException(ResultCode.INTERNAL_FORBIDDEN, "forbidden");
        }
    }
}
