package cn.novelstudio.kernel.exception;

import cn.novelstudio.kernel.enums.ResultCode;

public class ForbiddenException extends BizException {

    public ForbiddenException(String message) {
        super(ResultCode.FORBIDDEN, message);
    }

    public ForbiddenException(ResultCode resultCode, String message) {
        super(resultCode, message);
    }

    protected ForbiddenException(ResultCode resultCode, String messageKey, Object[] messageArgs) {
        super(resultCode, messageKey, messageArgs, messageKey);
    }

    public static ForbiddenException keyed(ResultCode resultCode, String messageKey, Object... messageArgs) {
        return new ForbiddenException(resultCode, messageKey, messageArgs);
    }

    public static ForbiddenException keyed(String messageKey, Object... messageArgs) {
        return new ForbiddenException(ResultCode.FORBIDDEN, messageKey, messageArgs);
    }
}
