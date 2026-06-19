package com.novel.agent.pyai.support;

import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;

/**
 * PyAI 模块统一业务异常工厂。
 */
public final class PyaiExceptions {

    private PyaiExceptions() {}

    public static BizException internalError(String message) {
        return BizException.of(ResultCode.ERROR, message);
    }
}
