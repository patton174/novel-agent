package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class UnauthorizedException extends BizException {

    public UnauthorizedException(String message) {
        super(ResultCode.UNAUTHORIZED, message);
    }

    public UnauthorizedException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }

    protected UnauthorizedException(ResultCode resultCode, String messageKey, Object[] messageArgs) {
        super(resultCode, messageKey, messageArgs, messageKey);
    }

    public static UnauthorizedException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new UnauthorizedException(resultCode, messageKey, messageArgs);
    }

    public static UnauthorizedException keyed(String messageKey, Object... messageArgs) {
        return new UnauthorizedException(ResultCode.UNAUTHORIZED, messageKey, messageArgs);
    }
}
