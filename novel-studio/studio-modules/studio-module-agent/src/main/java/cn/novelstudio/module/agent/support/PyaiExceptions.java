package cn.novelstudio.module.agent.support;

import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;

/**
 * PyAI 模块统一业务异常工厂。
 */
public final class PyaiExceptions {

    private PyaiExceptions() {}

    public static BizException internalError(String messageKey) {
        return BizException.keyed(ResultCode.ERROR, messageKey);
    }
}
