package com.novel.agent.common.core.exception;

import com.novel.agent.common.core.enums.ResultCode;

public class UnauthorizedException extends BizException {

    public UnauthorizedException(String message) {
        super(ResultCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
