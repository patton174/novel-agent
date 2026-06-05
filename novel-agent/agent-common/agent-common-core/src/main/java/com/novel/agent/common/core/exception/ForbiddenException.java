package com.novel.agent.common.core.exception;

import com.novel.agent.common.core.enums.ResultCode;

public class ForbiddenException extends BizException {

    public ForbiddenException(String message) {
        super(ResultCode.FORBIDDEN, message);
    }

    public ForbiddenException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
