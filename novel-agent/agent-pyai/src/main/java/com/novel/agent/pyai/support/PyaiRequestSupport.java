package com.novel.agent.pyai.support;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.UnauthorizedException;
import com.novel.agent.common.core.exception.ValidationException;

/**
 * PyAI 请求解析（WebFlux，仅依赖 common-core）。
 */
public final class PyaiRequestSupport {

    public static final String USER_ID_HEADER = "X-User-Id";

    private PyaiRequestSupport() {}

    public static Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw new UnauthorizedException("未登录");
        }
        try {
            long userId = Long.parseLong(userIdHeader.trim());
            if (userId <= 0) {
                throw new ValidationException("用户标识无效");
            }
            return userId;
        } catch (NumberFormatException ex) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "无效的用户标识");
        }
    }
}
