package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class TooManyRequestsException extends BizException {

    public TooManyRequestsException(String message) {
        super(ResultCode.TOO_MANY_REQUESTS, message);
    }

    public TooManyRequestsException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }

    protected TooManyRequestsException(ResultCode resultCode, String messageKey, Object[] messageArgs) {
        super(resultCode, messageKey, messageArgs, messageKey);
    }

    public static TooManyRequestsException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new TooManyRequestsException(resultCode, messageKey, messageArgs);
    }
}
