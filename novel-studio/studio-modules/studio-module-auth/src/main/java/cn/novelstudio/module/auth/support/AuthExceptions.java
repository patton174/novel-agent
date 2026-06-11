package cn.novelstudio.module.auth.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;

/**
 * auth 模块统一业务异常工厂。
 */
public final class AuthExceptions {

    private AuthExceptions() {}

    public static BizException internalError(String message) {
        return BizException.of(ResultCode.ERROR, message);
    }
}
