package com.novel.agent.common.core.exception;

import com.novel.agent.common.core.enums.ResultCode;

public class ValidationException extends BizException {

    public ValidationException(String message) {
        super(ResultCode.BAD_REQUEST, message);
    }

    public ValidationException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
