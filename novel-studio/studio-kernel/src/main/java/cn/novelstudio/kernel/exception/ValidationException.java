package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class ValidationException extends BizException {

    public ValidationException(String message) {
        super(ResultCode.BAD_REQUEST, message);
    }

    public ValidationException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
