package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class TooManyRequestsException extends BizException {

    public TooManyRequestsException(String message) {
        super(ResultCode.TOO_MANY_REQUESTS, message);
    }

    public TooManyRequestsException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }
}
