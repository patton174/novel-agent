package cn.novelstudio.module.agent.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.UnauthorizedException;
import cn.novelstudio.kernel.exception.ValidationException;

/**
 * PyAI 请求解析（WebFlux，仅依赖 common-core）。
 */
public final class PyaiRequestSupport {

    public static final String USER_ID_HEADER = "X-User-Id";

    private PyaiRequestSupport() {
    }

    public static Long parseUserId(String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isBlank()) {
            throw UnauthorizedException.keyed("result.framework.not_logged_in");
        }
        try {
            long userId = Long.parseLong(userIdHeader.trim());
            if (userId <= 0) {
                throw ValidationException.keyed("result.framework.invalid_user_id");
            }
            return userId;
        } catch (NumberFormatException ex) {
            throw ValidationException.keyed(ResultCode.BAD_REQUEST, "result.framework.invalid_user_id");
        }
    }
}
